import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { parseRustProject, convertToGraphData } from '@/lib/parsers/rust-parser-simple';
import { GraphData, HierarchicalData, TreeNode } from '@/types/rust-types';

// Base directory for project storage
const PROJECTS_DIR = path.join(process.cwd(), 'projects');

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const projectDir = path.join(PROJECTS_DIR, id);
    
    if (!fs.existsSync(projectDir)) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    
    const { searchParams } = new URL(request.url);
    const view = searchParams.get('view') || '3d-force';
    
    // Check if we have cached data for this view
    const viewDataPath = path.join(projectDir, `${view}-data.json`);
    
    if (fs.existsSync(viewDataPath)) {
      const viewData = JSON.parse(fs.readFileSync(viewDataPath, 'utf8'));
      return NextResponse.json(viewData);
    }
    
    // If no cached data, check if we have the basic graph data
    const graphDataPath = path.join(projectDir, 'graph-data.json');
    
    if (fs.existsSync(graphDataPath)) {
      const graphData = JSON.parse(fs.readFileSync(graphDataPath, 'utf8'));
      
      // Process graph data for the specific view (customize graph for view type)
      let viewData = graphData;
      
      switch (view) {
        case 'hierarchical':
          // Transform to hierarchical structure
          viewData = convertToHierarchical(graphData);
          break;
        case 'module-dependency':
          // Filter to show only module dependencies
          viewData = filterModuleDependencies(graphData);
          break;
        case 'call-graph':
          // Filter to show only function calls
          viewData = filterCallGraph(graphData);
          break;
        // Default is 3d-force, no transformation needed
      }
      
      // Cache the view-specific data
      fs.writeFileSync(viewDataPath, JSON.stringify(viewData, null, 2));
      
      return NextResponse.json(viewData);
    }
    
    // If we don't have graph data, check if we have project data
    const projectDataPath = path.join(projectDir, 'project-data.json');
    
    if (fs.existsSync(projectDataPath)) {
      const rustProject = JSON.parse(fs.readFileSync(projectDataPath, 'utf8'));
      const graphData = convertToGraphData(rustProject);
      
      // Save the basic graph data
      fs.writeFileSync(graphDataPath, JSON.stringify(graphData, null, 2));
      
      // Process for the specific view
      let viewData: GraphData | HierarchicalData = graphData;
      
      switch (view) {
        case 'hierarchical':
          viewData = convertToHierarchical(graphData);
          break;
        case 'module-dependency':
          viewData = filterModuleDependencies(graphData);
          break;
        case 'call-graph':
          viewData = filterCallGraph(graphData);
          break;
      }
      
      // Cache the view-specific data
      fs.writeFileSync(viewDataPath, JSON.stringify(viewData, null, 2));
      
      return NextResponse.json(viewData);
    }
    
    // If neither graph data nor project data exists, parse the project
    const metadataPath = path.join(projectDir, 'metadata.json');
    
    if (fs.existsSync(metadataPath)) {
      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
      const rustProject = await parseRustProject(metadata.path);
      
      // Save the project data
      fs.writeFileSync(
        projectDataPath,
        JSON.stringify(rustProject, null, 2)
      );
      
      // Convert to graph data
      const graphData = convertToGraphData(rustProject);
      
      // Save the basic graph data
      fs.writeFileSync(graphDataPath, JSON.stringify(graphData, null, 2));
      
      // Process for the specific view
      let viewData: GraphData | HierarchicalData = graphData;
      
      switch (view) {
        case 'hierarchical':
          viewData = convertToHierarchical(graphData);
          break;
        case 'module-dependency':
          viewData = filterModuleDependencies(graphData);
          break;
        case 'call-graph':
          viewData = filterCallGraph(graphData);
          break;
      }
      
      // Cache the view-specific data
      fs.writeFileSync(viewDataPath, JSON.stringify(viewData, null, 2));
      
      return NextResponse.json(viewData);
    }
    
    return NextResponse.json({ error: 'Project data not found' }, { status: 404 });
  } catch (error) {
    console.error('Error analyzing project:', error);
    return NextResponse.json({ 
      error: 'Failed to analyze project',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

// Helper function to convert graph data to hierarchical structure
function convertToHierarchical(graphData: GraphData): HierarchicalData {
  // Group nodes by module/path
  const modules: Record<string, TreeNode> = {};
  
  for (const node of graphData.nodes) {
    const pathParts = (node.path || '').split('::');
    let currentPath = '';
    
    for (let i = 0; i < pathParts.length; i++) {
      const part = pathParts[i];
      const newPath = currentPath ? `${currentPath}::${part}` : part;
      
      if (!modules[newPath]) {
        modules[newPath] = {
          id: `module:${newPath}`,
          name: part,
          path: newPath,
          type: 'module',
          children: []
        };
        
        // If not the root, add as child to parent
        if (currentPath && modules[currentPath]) {
          modules[currentPath].children.push(modules[newPath]);
        }
      }
      
      currentPath = newPath;
    }
    
    // Add leaf node (function, struct, etc.) to its module
    if (node.type !== 'module' && node.path) {
      const modulePath = node.path.substring(0, node.path.lastIndexOf('::'));
      
      if (modules[modulePath]) {
        modules[modulePath].children.push({
          ...node,
          children: []
        } as TreeNode);
      }
    }
  }
  
  // Find the root modules (those without a parent)
  const rootModules = Object.values(modules).filter((mod: TreeNode) => {
    const pathParts = mod.path?.split('::') || [];
    return pathParts.length === 1;
  });
  
  return {
    name: 'root',
    children: rootModules
  };
}

// Helper function to filter for module dependencies
function filterModuleDependencies(graphData: GraphData): GraphData {
  // Create module-to-module links based on dependencies between their children
  const moduleLinks: {source: string; target: string; type: string; value: number}[] = [];
  const moduleMap = new Map<string, string>();
  
  // Map node IDs to their module
  for (const node of graphData.nodes) {
    if (node.path) {
      const pathParts = node.path.split('::');
      if (pathParts.length > 0) {
        moduleMap.set(node.id, pathParts[0]);
      }
    }
  }
  
  // Find links between modules
  for (const link of graphData.links) {
    const sourceModule = moduleMap.get(link.source);
    const targetModule = moduleMap.get(link.target);
    
    if (sourceModule && targetModule && sourceModule !== targetModule) {
      // Check if this link already exists
      const existingLink = moduleLinks.find(
        (l) => l.source === sourceModule && l.target === targetModule
      );
      
      if (existingLink) {
        existingLink.value += 1;
      } else {
        moduleLinks.push({
          source: sourceModule,
          target: targetModule,
          type: 'contains',
          value: 1
        });
      }
    }
  }
  
  // Create module nodes
  const uniqueModules = Array.from(new Set(moduleMap.values()));
  const nodes = uniqueModules.map((moduleName) => ({
    id: moduleName,
    name: moduleName,
    type: 'module',
    val: 10,
    color: '#FF9800'
  }));
  
  return {
    nodes,
    links: moduleLinks
  };
}

// Helper function to filter for function call graph
function filterCallGraph(graphData: GraphData): GraphData {
  // Filter only function nodes
  const functionNodes = graphData.nodes.filter((node) => node.type === 'function');
  
  // Filter only call dependencies
  const callLinks = graphData.links.filter((link) => {
    return link.type === 'calls';
  });
  
  return {
    nodes: functionNodes,
    links: callLinks
  };
}
