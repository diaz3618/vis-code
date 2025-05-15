import * as Parser from 'tree-sitter';
import Rust from 'tree-sitter-rust';
import fs from 'fs';
import path from 'path';
import { RustNode, RustDependency, RustProject } from '../../types/rust-types';

// Initialize Tree-sitter parser
const parser = new Parser();
parser.setLanguage(Rust);

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

// Parse a single Rust file
export const parseRustFile = (filePath: string): { nodes: RustNode[], dependencies: RustDependency[] } => {
  try {
    const code = fs.readFileSync(filePath, 'utf8');
    const tree = parser.parse(code);
    
    const nodes: RustNode[] = [];
    const dependencies: RustDependency[] = [];
    
    // Helper function to generate unique IDs
    const generateId = (type: string, name: string, path: string): string => {
      return `${type}:${path}:${name}`;
    };
    
    // Process the AST to extract Rust elements
    const processSyntaxNode = (node: any, parentPath = ''): void => {
      if (!node || !node.children) return;
      
      for (const child of node.children) {
        if (!child.type) continue;
        
        switch (child.type) {
          case 'function_item':
          case 'function_signature_item': {
            const nameNode = child.children.find((n: any) => n.type === 'identifier');
            if (nameNode) {
              const name = code.substring(nameNode.startPosition.row, nameNode.endPosition.row);
              const funcPath = parentPath ? `${parentPath}::${name}` : name;
              const id = generateId('function', name, funcPath);
              
              // Extract function signature
              const signature = code.substring(child.startPosition.row, child.endPosition.row);
              
              // Check for visibility (pub)
              const visibilityNode = child.children.find((n: any) => n.type === 'visibility_modifier');
              const visibility = visibilityNode ? 'public' : 'private';
              
              nodes.push({
                id,
                type: 'function',
                name,
                path: funcPath,
                file: filePath,
                signature,
                visibility
              });
              
              // Process body to find function calls and dependencies
              const bodyNode = child.children.find((n: any) => n.type === 'block');
              if (bodyNode) {
                processBodyForDependencies(bodyNode, id);
              }
            }
            break;
          }
          
          case 'struct_item': {
            const nameNode = child.children.find((n: any) => n.type === 'type_identifier');
            if (nameNode) {
              const name = code.substring(nameNode.startPosition.row, nameNode.endPosition.row);
              const structPath = parentPath ? `${parentPath}::${name}` : name;
              const id = generateId('struct', name, structPath);
              
              // Extract struct definition
              const signature = code.substring(child.startPosition.row, child.endPosition.row);
              
              const visibilityNode = child.children.find((n: any) => n.type === 'visibility_modifier');
              const visibility = visibilityNode ? 'public' : 'private';
              
              nodes.push({
                id,
                type: 'struct',
                name,
                path: structPath,
                file: filePath,
                signature,
                visibility
              });
            }
            break;
          }
          
          case 'enum_item': {
            const nameNode = child.children.find((n: any) => n.type === 'type_identifier');
            if (nameNode) {
              const name = code.substring(nameNode.startPosition.row, nameNode.endPosition.row);
              const enumPath = parentPath ? `${parentPath}::${name}` : name;
              const id = generateId('enum', name, enumPath);
              
              const signature = code.substring(child.startPosition.row, child.endPosition.row);
              
              const visibilityNode = child.children.find((n: any) => n.type === 'visibility_modifier');
              const visibility = visibilityNode ? 'public' : 'private';
              
              nodes.push({
                id,
                type: 'enum',
                name,
                path: enumPath,
                file: filePath,
                signature,
                visibility
              });
            }
            break;
          }
          
          case 'trait_item': {
            const nameNode = child.children.find((n: any) => n.type === 'type_identifier');
            if (nameNode) {
              const name = code.substring(nameNode.startPosition.row, nameNode.endPosition.row);
              const traitPath = parentPath ? `${parentPath}::${name}` : name;
              const id = generateId('trait', name, traitPath);
              
              const signature = code.substring(child.startPosition.row, child.endPosition.row);
              
              const visibilityNode = child.children.find((n: any) => n.type === 'visibility_modifier');
              const visibility = visibilityNode ? 'public' : 'private';
              
              nodes.push({
                id,
                type: 'trait',
                name,
                path: traitPath,
                file: filePath,
                signature,
                visibility
              });
              
              // Process trait methods
              processSyntaxNode(child, traitPath);
            }
            break;
          }
          
          case 'impl_item': {
            // Find what is being implemented
            const typeNode = child.children.find((n: any) => n.type === 'type_identifier');
            const traitNode = child.children.find((n: any) => n.type === 'trait_identifier');
            
            if (typeNode) {
              const typeName = code.substring(typeNode.startPosition.row, typeNode.endPosition.row);
              const implPath = parentPath ? `${parentPath}::${typeName}` : typeName;
              const id = generateId('impl', typeName, implPath);
              
              let name = `impl ${typeName}`;
              if (traitNode) {
                name = `impl ${code.substring(traitNode.startPosition.row, traitNode.endPosition.row)} for ${typeName}`;
              }
              
              nodes.push({
                id,
                type: 'impl',
                name,
                path: implPath,
                file: filePath
              });
              
              // Process impl methods
              processSyntaxNode(child, implPath);
              
              // Create dependency between impl and struct/trait
              if (traitNode) {
                const traitName = code.substring(traitNode.startPosition.row, traitNode.endPosition.row);
                const traitId = generateId('trait', traitName, traitName);
                const typeId = generateId('struct', typeName, typeName);
                
                dependencies.push({
                  source: typeId,
                  target: traitId,
                  type: 'implements'
                });
              }
            }
            break;
          }
          
          case 'mod_item': {
            const nameNode = child.children.find((n: any) => n.type === 'identifier');
            if (nameNode) {
              const name = code.substring(nameNode.startPosition.row, nameNode.endPosition.row);
              const modPath = parentPath ? `${parentPath}::${name}` : name;
              const id = generateId('module', name, modPath);
              
              const visibilityNode = child.children.find((n: any) => n.type === 'visibility_modifier');
              const visibility = visibilityNode ? 'public' : 'private';
              
              nodes.push({
                id,
                type: 'module',
                name,
                path: modPath,
                file: filePath,
                visibility
              });
              
              // Process module contents
              processSyntaxNode(child, modPath);
            }
            break;
          }
          
          case 'use_declaration': {
            const pathNode = child.children.find((n: any) => n.type === 'scoped_identifier' || n.type === 'identifier');
            if (pathNode) {
              const importPath = code.substring(child.startPosition.row, child.endPosition.row);
              const id = generateId('use', importPath, parentPath || 'root');
              
              nodes.push({
                id,
                type: 'use',
                name: importPath,
                path: parentPath || 'root',
                file: filePath
              });
            }
            break;
          }
          
          // Continue processing recursively
          default:
            processSyntaxNode(child, parentPath);
        }
      }
    };
    
    // Process function bodies to extract dependencies
    const processBodyForDependencies = (node: any, sourceId: string): void => {
      if (!node) return;
      
      // Find function calls
      if (node.type === 'call_expression') {
        const funcNameNode = node.children.find((n: any) => n.type === 'identifier' || n.type === 'field_expression');
        if (funcNameNode) {
          const funcName = code.substring(funcNameNode.startPosition.row, funcNameNode.endPosition.row);
          
          // This is simplified, in a real implementation you would need to resolve the actual function
          const targetId = `function:${funcName}:${funcName}`;
          
          dependencies.push({
            source: sourceId,
            target: targetId,
            type: 'calls'
          });
        }
      }
      
      // Process children recursively
      if (node.children) {
        for (const child of node.children) {
          processBodyForDependencies(child, sourceId);
        }
      }
    };
    
    // Start processing from the root
    processSyntaxNode(tree.rootNode);
    
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
  
  // Post-process to resolve dependencies and build a more accurate graph
  const projectName = path.basename(projectPath);
  
  return {
    name: projectName,
    root: projectPath,
    nodes: allNodes,
    dependencies: allDependencies
  };
};

// Convert a RustProject to a graph data format for visualization
export const convertToGraphData = (rustProject: RustProject) => {
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
