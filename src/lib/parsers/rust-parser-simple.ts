// This module is server-only and should not be imported from client components
// Uses regular expressions instead of tree-sitter for browser compatibility

import fs from 'fs';
import path from 'path';
import { RustNode, RustDependency, RustProject, GraphData } from '../../types/rust-types';

// Helper to recursively find all Rust files in a directory
export const findRustFiles = (dir: string): string[] => {
  const files: string[] = [];
  
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      // Skip node_modules, hidden files, and target dirs
      if (entry.name.startsWith('.') || 
          entry.name === 'node_modules' || 
          entry.name === 'target') {
        continue;
      }
      
      if (entry.isDirectory()) {
        files.push(...findRustFiles(fullPath));
      } else if (entry.name.endsWith('.rs')) {
        files.push(fullPath);
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error);
  }
  
  return files;
};

// Basic regex-based Rust parser
export const parseRustFile = (filePath: string): { nodes: RustNode[], dependencies: RustDependency[] } => {
  try {
    const code = fs.readFileSync(filePath, 'utf8');
    const nodes: RustNode[] = [];
    const dependencies: RustDependency[] = [];
    
    // Helper function to generate unique IDs
    const generateId = (type: string, name: string, path: string): string => {
      return `${type}:${path}:${name}`;
    };
    
    // Get the module name from file path
    const fileName = path.basename(filePath);
    const moduleName = fileName.replace(/\.rs$/, '');
    
    // Extract functions using regex
    const functionRegex = /fn\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*(?:<[^>]*>)?\s*\(([^)]*)\)(?:\s*->\s*([^{]*))?/g;
    let match;
    
    while ((match = functionRegex.exec(code)) !== null) {
      const name = match[1];
      const signature = match[0];
      const id = generateId('function', name, moduleName);
      
      // Check if this is a public function
      const funcSection = code.substring(Math.max(0, match.index - 5), match.index);
      const visibility = funcSection.includes('pub ') ? 'public' : 'private';
      
      nodes.push({
        id,
        type: 'function',
        name,
        path: moduleName,
        file: filePath,
        signature,
        visibility
      });
      
      // Extract function calls within this function
      // This is a simplified approach and won't catch all dependencies
      const endIndex = code.indexOf('}', match.index);
      if (endIndex > match.index) {
        const functionBody = code.substring(match.index, endIndex);
        const callRegex = /([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g;
        let callMatch;
        
        while ((callMatch = callRegex.exec(functionBody)) !== null) {
          const calledFunc = callMatch[1];
          // Skip if it's a common keyword
          if (['if', 'while', 'for', 'match'].includes(calledFunc)) {
            continue;
          }
          
          const targetId = generateId('function', calledFunc, '');
          
          dependencies.push({
            source: id,
            target: targetId,
            type: 'calls'
          });
        }
      }
    }
    
    // Extract structs
    const structRegex = /struct\s+([a-zA-Z_][a-zA-Z0-9_]*)(?:<[^>]*>)?/g;
    while ((match = structRegex.exec(code)) !== null) {
      const name = match[1];
      const id = generateId('struct', name, moduleName);
      
      // Check visibility
      const structSection = code.substring(Math.max(0, match.index - 5), match.index);
      const visibility = structSection.includes('pub ') ? 'public' : 'private';
      
      nodes.push({
        id,
        type: 'struct',
        name,
        path: moduleName,
        file: filePath,
        signature: match[0],
        visibility
      });
    }
    
    // Extract enums
    const enumRegex = /enum\s+([a-zA-Z_][a-zA-Z0-9_]*)(?:<[^>]*>)?/g;
    while ((match = enumRegex.exec(code)) !== null) {
      const name = match[1];
      const id = generateId('enum', name, moduleName);
      
      // Check visibility
      const enumSection = code.substring(Math.max(0, match.index - 5), match.index);
      const visibility = enumSection.includes('pub ') ? 'public' : 'private';
      
      nodes.push({
        id,
        type: 'enum',
        name,
        path: moduleName,
        file: filePath,
        signature: match[0],
        visibility
      });
    }
    
    // Extract traits
    const traitRegex = /trait\s+([a-zA-Z_][a-zA-Z0-9_]*)(?:<[^>]*>)?/g;
    while ((match = traitRegex.exec(code)) !== null) {
      const name = match[1];
      const id = generateId('trait', name, moduleName);
      
      // Check visibility
      const traitSection = code.substring(Math.max(0, match.index - 5), match.index);
      const visibility = traitSection.includes('pub ') ? 'public' : 'private';
      
      nodes.push({
        id,
        type: 'trait',
        name,
        path: moduleName,
        file: filePath,
        signature: match[0],
        visibility
      });
    }
    
    // Extract impls
    const implRegex = /impl(?:<[^>]*>)?\s+(?:([a-zA-Z_][a-zA-Z0-9_]*)(?:<[^>]*>)?\s+for\s+)?([a-zA-Z_][a-zA-Z0-9_]*)(?:<[^>]*>)?/g;
    while ((match = implRegex.exec(code)) !== null) {
      const trait = match[1];
      const type = match[2];
      const name = trait ? `impl ${trait} for ${type}` : `impl ${type}`;
      const id = generateId('impl', name, moduleName);
      
      nodes.push({
        id,
        type: 'impl',
        name,
        path: moduleName,
        file: filePath
      });
      
      // Add dependency if this is a trait implementation
      if (trait) {
        const typeId = generateId('struct', type, moduleName);
        const traitId = generateId('trait', trait, moduleName);
        
        dependencies.push({
          source: typeId,
          target: traitId,
          type: 'implements'
        });
      }
    }
    
    // Extract modules
    const moduleRegex = /mod\s+([a-zA-Z_][a-zA-Z0-9_]*)/g;
    while ((match = moduleRegex.exec(code)) !== null) {
      const name = match[1];
      const id = generateId('module', name, moduleName);
      
      // Check visibility
      const modSection = code.substring(Math.max(0, match.index - 5), match.index);
      const visibility = modSection.includes('pub ') ? 'public' : 'private';
      
      nodes.push({
        id,
        type: 'module',
        name,
        path: moduleName,
        file: filePath,
        visibility
      });
    }
    
    // Extract use statements
    const useRegex = /use\s+([^;]+);/g;
    while ((match = useRegex.exec(code)) !== null) {
      const path = match[1];
      const id = generateId('use', path, moduleName);
      
      nodes.push({
        id,
        type: 'use',
        name: path,
        path: moduleName,
        file: filePath
      });
    }
    
    return { nodes, dependencies };
  } catch (error) {
    console.error(`Error parsing file ${filePath}:`, error);
    return { nodes: [], dependencies: [] };
  }
};

// Parse an entire Rust project
export const parseRustProject = async (projectPath: string): Promise<RustProject> => {
  const rustFiles = findRustFiles(projectPath);
  
  let allNodes: RustNode[] = [];
  let allDependencies: RustDependency[] = [];
  
  // Parse each Rust file
  for (const file of rustFiles) {
    const { nodes, dependencies } = parseRustFile(file);
    allNodes = [...allNodes, ...nodes];
    allDependencies = [...allDependencies, ...dependencies];
  }
  
  // Post-process to resolve module paths and fix dependencies
  allNodes = allNodes.map(node => {
    // Create full path for each node by prepending the module path
    const modulePath = path.relative(projectPath, node.file)
      .replace(/\.rs$/, '')
      .replace(/\\/g, '/')
      .replace(/^src\//, '')
      .replace(/\//g, '::');
    
    return {
      ...node,
      path: modulePath ? `${modulePath}::${node.name}` : node.name
    };
  });
  
  // Resolve dependencies between nodes
  allDependencies = allDependencies.filter(dep => {
    // Find matching target for dependencies
    const sourceNode = allNodes.find(node => node.id === dep.source);
    const targetCandidate = allNodes.find(node => 
      node.type === dep.type.replace('calls', 'function')
        .replace('implements', 'trait')
        .replace('uses', 'use')
        .replace('contains', 'module')
        .replace('extends', 'struct') && 
      node.name === dep.target.split(':').pop()
    );
    
    if (sourceNode && targetCandidate) {
      // Update the target with the found node id
      dep.target = targetCandidate.id;
      return true;
    }
    
    return false;
  });
  
  const projectName = path.basename(projectPath);
  
  return {
    name: projectName,
    root: projectPath,
    nodes: allNodes,
    dependencies: allDependencies
  };
};

// Convert a RustProject to a graph data format for visualization
export const convertToGraphData = (rustProject: RustProject): GraphData => {
  const nodeColors = {
    function: '#4285F4',  // Blue
    struct: '#EA4335',    // Red
    enum: '#FBBC05',      // Yellow
    trait: '#34A853',     // Green
    impl: '#9C27B0',      // Purple
    module: '#FF9800',    // Orange
    constant: '#795548',  // Brown
    macro: '#607D8B',     // Grey-Blue
    use: '#9E9E9E'        // Grey
  };
  
  // Node size based on type
  const nodeSize = {
    function: 5,
    struct: 8,
    enum: 7,
    trait: 9,
    impl: 6,
    module: 10,
    constant: 4,
    macro: 6,
    use: 3
  };
  
  const nodes = rustProject.nodes.map(node => ({
    id: node.id,
    name: node.name,
    type: node.type,
    val: nodeSize[node.type as keyof typeof nodeSize] || 5,
    color: nodeColors[node.type as keyof typeof nodeColors] || '#9E9E9E',
    group: node.path.split('::')[0],
    path: node.path,
    file: node.file,
    signature: node.signature
  }));
  
  const links = rustProject.dependencies.map(dep => ({
    source: dep.source,
    target: dep.target,
    type: dep.type,
    value: dep.weight || 1
  }));
  
  return { nodes, links };
};
