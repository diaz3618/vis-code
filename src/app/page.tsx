'use client';

import React, { useState } from 'react';
import axios from 'axios';
import ProjectUploader from '@/components/ProjectUploader';
import ProjectSelector from '@/components/ProjectSelector';
import ForceGraph3D from '@/components/ForceGraph3D';
import HierarchicalView from '@/components/HierarchicalView';
import NodeInfoPanel from '@/components/NodeInfoPanel';
import VisibilityControls from '@/components/VisibilityControls';
import LanguageSelector from '@/components/LanguageSelector';
import { GraphData, HierarchicalData, ViewMode, TreeNode, CodeLanguage } from '@/types/common-types';

export default function Home() {
  // Main state
  const [activeView, setActiveView] = useState<ViewMode>('3d-force');
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [projectName, setProjectName] = useState<string>('');
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [hierarchicalData, setHierarchicalData] = useState<HierarchicalData | null>(null);
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentLanguage, setCurrentLanguage] = useState<CodeLanguage>('rust');
  const [availableLanguages, setAvailableLanguages] = useState<CodeLanguage[]>(['rust']);
  
  // Visibility state for filtering graph components
  const [visibleNodeTypes, setVisibleNodeTypes] = useState<Set<string>>(new Set([
    'function', 'struct', 'enum', 'trait', 'impl', 'module', 'constant', 'macro', 'use'
  ]));
  const [visibleEdgeTypes, setVisibleEdgeTypes] = useState<Set<string>>(new Set([
    'calls', 'implements', 'uses', 'contains', 'extends'
  ]));
  
  // Track loading state
  const [isLoading, setIsLoading] = useState(false);
  
  // Handle project selection
  const handleSelectProject = async (projectId: string) => {
    try {
      setSelectedProject(projectId);
      setGraphData(null);
      setHierarchicalData(null);
      setSelectedNode(null);
      setIsLoading(true);
      setError(null);
      
      // Fetch project metadata
      const metadataResponse = await axios.get(`/api/projects/metadata?projectId=${projectId}`);
      const metadata = metadataResponse.data;
      
      if (metadata.name) {
        setProjectName(metadata.name);
      }
      
      // Set available languages based on metadata
      const languages: CodeLanguage[] = [];
      if (metadata.language) {
        languages.push(metadata.language as CodeLanguage);
        setCurrentLanguage(metadata.language as CodeLanguage);
      } else {
        // Default to Rust if no language specified
        languages.push('rust');
        setCurrentLanguage('rust');
      }
      
      // Always include Rust for backward compatibility
      if (!languages.includes('rust')) {
        languages.push('rust');
      }
      
      setAvailableLanguages(languages);
      
      // Update visible node types based on language
      if (metadata.language === 'python') {
        setVisibleNodeTypes(new Set([
          'function', 'class', 'method', 'module', 'import', 'variable', 'constant', 'decorator'
        ]));
        setVisibleEdgeTypes(new Set([
          'calls', 'imports', 'inherits', 'contains', 'uses'
        ]));
      } else {
        // Default Rust node types
        setVisibleNodeTypes(new Set([
          'function', 'struct', 'enum', 'trait', 'impl', 'module', 'constant', 'macro', 'use'
        ]));
        setVisibleEdgeTypes(new Set([
          'calls', 'implements', 'uses', 'contains', 'extends'
        ]));
      }
      
      // Fetch the graph data for the selected view
      const graphResponse = await axios.get(`/api/projects/${projectId}/analysis?view=${activeView}`);
      
      if (activeView === 'hierarchical') {
        setHierarchicalData(graphResponse.data);
      } else {
        setGraphData(graphResponse.data);
      }
      
    } catch (error) {
      console.error('Error loading project:', error);
      setError('Failed to load project data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle view mode change
  const handleViewChange = async (view: ViewMode) => {
    if (!selectedProject) return;
    
    setActiveView(view);
    setIsLoading(true);
    setGraphData(null);
    setHierarchicalData(null);
    
    try {
      const response = await axios.get(`/api/projects/${selectedProject}/analysis?view=${view}`);
      
      if (view === 'hierarchical') {
        setHierarchicalData(response.data);
      } else {
        setGraphData(response.data);
      }
    } catch (error) {
      console.error('Error changing view:', error);
      setError('Failed to load visualization. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle node click in the visualization
  const handleNodeClick = (node: TreeNode | { id: string; name: string; type: string; [key: string]: unknown }) => {
    setSelectedNode(normalizeNodeForDisplay(node));
  };
  
  // Handle project upload completion
  const handleUploadComplete = (projectId: string) => {
    handleSelectProject(projectId);
  };
  
  // Toggle visibility of a node type
  const handleNodeTypeToggle = (type: string) => {
    const newVisibleNodeTypes = new Set(visibleNodeTypes);
    if (newVisibleNodeTypes.has(type)) {
      newVisibleNodeTypes.delete(type);
    } else {
      newVisibleNodeTypes.add(type);
    }
    setVisibleNodeTypes(newVisibleNodeTypes);
  };
  
  // Toggle visibility of an edge type
  const handleEdgeTypeToggle = (type: string) => {
    const newVisibleEdgeTypes = new Set(visibleEdgeTypes);
    if (newVisibleEdgeTypes.has(type)) {
      newVisibleEdgeTypes.delete(type);
    } else {
      newVisibleEdgeTypes.add(type);
    }
    setVisibleEdgeTypes(newVisibleEdgeTypes);
  };
  
  // Toggle all node and edge types visible or hidden
  const handleToggleAll = (showAll: boolean) => {
    if (showAll) {
      setVisibleNodeTypes(new Set([
        'function', 'struct', 'enum', 'trait', 'impl', 'module', 'constant', 'macro', 'use'
      ]));
      setVisibleEdgeTypes(new Set([
        'calls', 'implements', 'uses', 'contains', 'extends'
      ]));
    } else {
      setVisibleNodeTypes(new Set());
      setVisibleEdgeTypes(new Set());
    }
  };
  
  // Handle language change
  const handleLanguageChange = async (language: string) => {
    if (selectedProject && (language === 'rust' || language === 'python')) {
      setCurrentLanguage(language as CodeLanguage);
      setIsLoading(true);
      
      try {
        // Fetch data for the selected language
        const response = await axios.get(`/api/projects?projectId=${selectedProject}&language=${language}`);
        const data = response.data;
        
        setGraphData(data);
        
        // Convert to hierarchical data for tree view
        const convertedData = convertToHierarchicalData(data);
        setHierarchicalData(convertedData);
        
        // Update visible node types based on language
        if (language === 'python') {
          setVisibleNodeTypes(new Set([
            'function', 'class', 'method', 'module', 'import', 'variable', 'constant', 'decorator'
          ]));
          setVisibleEdgeTypes(new Set([
            'calls', 'imports', 'inherits', 'contains', 'uses'
          ]));
        } else {
          // Default Rust node types
          setVisibleNodeTypes(new Set([
            'function', 'struct', 'enum', 'trait', 'impl', 'module', 'constant', 'macro', 'use'
          ]));
          setVisibleEdgeTypes(new Set([
            'calls', 'implements', 'uses', 'contains', 'extends'
          ]));
        }
      } catch (error) {
        console.error(`Error fetching ${language} data:`, error);
        setError(`Failed to load ${language} visualization data.`);
      } finally {
        setIsLoading(false);
      }
    }
  };
  
  // Helper function to convert graph data to hierarchical format
  const convertToHierarchicalData = (data: GraphData): HierarchicalData => {
    const moduleMap = new Map<string, TreeNode>();
    
    // Create a map of all modules/paths
    for (const node of data.nodes) {
      const path = node.path || '';
      const parts = path.split('.');
      
      let currentPath = '';
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (!part) continue;
        
        currentPath = currentPath ? `${currentPath}.${part}` : part;
        
        if (!moduleMap.has(currentPath)) {
          moduleMap.set(currentPath, {
            id: `module:${currentPath}`,
            name: part,
            type: 'module',
            path: currentPath,
            children: []
          });
        }
      }
    }
    
    // Build module hierarchy
    const rootModules: TreeNode[] = [];
    
    moduleMap.forEach((module, modulePath) => {
      const lastDotIndex = modulePath.lastIndexOf('.');
      
      if (lastDotIndex === -1) {
        // This is a root module
        rootModules.push(module);
      } else {
        // This is a child module
        const parentPath = modulePath.substring(0, lastDotIndex);
        const parentModule = moduleMap.get(parentPath);
        
        if (parentModule) {
          parentModule.children.push(module);
        }
      }
    });
    
    // Add nodes to their respective modules
    for (const node of data.nodes) {
      if (node.type === 'module') continue;
      
      const path = node.path || '';
      const moduleNode = moduleMap.get(path);
      
      if (moduleNode) {
        moduleNode.children.push({
          id: node.id,
          name: node.name,
          type: node.type,
          path: node.path,
          file: node.file,
          signature: node.signature,
          children: []
        });
      }
    }
    
    return {
      name: projectName || 'Project',
      children: rootModules
    };
  };
  
  // Type guard to check if a node is a TreeNode
  const isTreeNode = (node: unknown): node is TreeNode => {
    return node !== null && typeof node === 'object' && 'children' in node;
  };

  // Helper to normalize node data from different sources
  const normalizeNodeForDisplay = (node: unknown): TreeNode => {
    if (isTreeNode(node)) {
      return node;
    }
    
    // Handle the case when node is not a proper object
    if (!node || typeof node !== 'object') {
      return {
        id: 'unknown',
        name: 'Unknown Node',
        type: 'unknown',
        children: []
      };
    }
    
    // Convert GraphNode to TreeNode format
    const nodeObj = node as Record<string, unknown>;
    return {
      id: nodeObj.id as string || 'unknown',
      name: nodeObj.name as string || 'Unknown',
      type: nodeObj.type as string || 'unknown',
      path: nodeObj.path as string,
      file: nodeObj.file as string,
      signature: nodeObj.signature as string,
      visibility: nodeObj.visibility as 'public' | 'private' | 'crate' | 'super' | 'in' | undefined,
      children: []
    };
  };
  
  return (
    <main className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm py-4 px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-gray-800">VisCode</h1>
            {projectName && (
              <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                {projectName}
              </div>
            )}
          </div>
          
          {selectedProject && (
            <button
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              onClick={() => setSelectedProject(null)}
            >
              ← Back to Projects
            </button>
          )}
        </div>
      </header>
      
      {/* Main Content */}
      <div className="flex-1 flex">
        {!selectedProject ? (
          // Project Selection Screen
          <div className="w-full p-8 flex flex-col items-center">
            <div className="w-full max-w-4xl">
              <ProjectUploader onUploadComplete={handleUploadComplete} />
              
              <div className="mt-12">
                <ProjectSelector onSelectProject={handleSelectProject} />
              </div>
            </div>
          </div>
        ) : (
          // Visualization Screen
          <div className="flex-1 flex flex-col md:flex-row">
            {/* Sidebar */}
            <div className="w-full md:w-64 bg-gray-100 p-4 border-r">
              <h2 className="text-lg font-semibold mb-4">Visualizations</h2>
              
              <nav className="space-y-2">
                <button
                  className={`w-full text-left px-4 py-2 rounded-lg ${
                    activeView === '3d-force'
                      ? 'bg-blue-500 text-white'
                      : 'hover:bg-gray-200'
                  }`}
                  onClick={() => handleViewChange('3d-force')}
                >
                  3D Force Graph
                </button>
                
                <button
                  className={`w-full text-left px-4 py-2 rounded-lg ${
                    activeView === 'hierarchical'
                      ? 'bg-blue-500 text-white'
                      : 'hover:bg-gray-200'
                  }`}
                  onClick={() => handleViewChange('hierarchical')}
                >
                  Hierarchical View
                </button>
                
                <button
                  className={`w-full text-left px-4 py-2 rounded-lg ${
                    activeView === 'module-dependency'
                      ? 'bg-blue-500 text-white'
                      : 'hover:bg-gray-200'
                  }`}
                  onClick={() => handleViewChange('module-dependency')}
                >
                  Module Dependencies
                </button>
                
                <button
                  className={`w-full text-left px-4 py-2 rounded-lg ${
                    activeView === 'call-graph'
                      ? 'bg-blue-500 text-white'
                      : 'hover:bg-gray-200'
                  }`}
                  onClick={() => handleViewChange('call-graph')}
                >
                  Function Call Graph
                </button>
              </nav>
              
              {/* Language Selector */}
              {selectedProject && availableLanguages.length > 1 && (
                <div className="border-t border-gray-300 my-4 pt-4">
                  <LanguageSelector
                    currentLanguage={currentLanguage}
                    availableLanguages={availableLanguages}
                    onLanguageChange={handleLanguageChange}
                  />
                </div>
              )}
              
              <div className="border-t border-gray-300 my-4 pt-4">
                <VisibilityControls 
                  visibleNodeTypes={visibleNodeTypes}
                  visibleEdgeTypes={visibleEdgeTypes}
                  onNodeTypeToggle={handleNodeTypeToggle}
                  onEdgeTypeToggle={handleEdgeTypeToggle}
                  onToggleAll={handleToggleAll}
                  language={currentLanguage}
                />
              </div>
            </div>
            
            {/* Main Visualization Area */}
            <div className="flex-1 relative">
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-80 z-10">
                  <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gray-800"></div>
                    <p className="mt-4 text-gray-600">Loading visualization...</p>
                  </div>
                </div>
              )}
              
              {error && (
                <div className="absolute inset-0 flex items-center justify-center z-10">
                  <div className="bg-red-100 text-red-700 p-6 rounded-lg max-w-md">
                    <h3 className="text-lg font-semibold mb-2">Error</h3>
                    <p>{error}</p>
                    <button
                      className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                      onClick={() => window.location.reload()}
                    >
                      Retry
                    </button>
                  </div>
                </div>
              )}
              
              {!isLoading && !error && (
                <div className="h-full">
                  {activeView === 'hierarchical' && hierarchicalData ? (
                    <HierarchicalView 
                      data={hierarchicalData} 
                      onNodeClick={handleNodeClick} 
                      visibleNodeTypes={visibleNodeTypes}
                    />
                  ) : graphData ? (
                    <ForceGraph3D 
                      data={graphData} 
                      onNodeClick={handleNodeClick} 
                      visibleNodeTypes={visibleNodeTypes}
                      visibleEdgeTypes={visibleEdgeTypes}
                    />
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <p className="text-gray-500">No visualization data available</p>
                    </div>
                  )}
                </div>
              )}
              
              {/* Node Information Panel (Conditionally Rendered) */}
              {selectedNode && (
                <div className="absolute bottom-0 right-0 p-4 w-80 z-20">
                  <NodeInfoPanel 
                    node={selectedNode} 
                    onClose={() => setSelectedNode(null)} 
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
