// This module is server-only and should not be imported from client components
// Uses regular expressions to parse Python code

import fs from 'fs';
import path from 'path';
import { PythonNode, PythonDependency, PythonProject, PythonGraphData, PythonHierarchicalData, PythonTreeNode } from '../../types/python-types';

// Helper to recursively find all Python files in a directory
export const findPythonFiles = (dir: string): string[] => {
  const files: string[] = [];
  
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      // Skip node_modules, hidden files, and other non-relevant directories
      if (entry.name.startsWith('.') || 
          entry.name === 'node_modules' || 
          entry.name === '__pycache__' ||
          entry.name === 'venv' ||
          entry.name === 'env' ||
          entry.name === '.venv') {
        continue;
      }
      
      if (entry.isDirectory()) {
        files.push(...findPythonFiles(fullPath));
      } else if (entry.name.endsWith('.py')) {
        files.push(fullPath);
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error);
  }
  
  return files;
};

// Generate a unique ID for a Python node
const generateId = (type: string, name: string, path: string): string => {
  return `${type}:${path}:${name}`;
};

// Parse a single Python file
export const parsePythonFile = (filePath: string): { nodes: PythonNode[], dependencies: PythonDependency[] } => {
  try {
    const code = fs.readFileSync(filePath, 'utf8');
    const nodes: PythonNode[] = [];
    const dependencies: PythonDependency[] = [];
    
    // Get the module name from file path
    const fileName = path.basename(filePath);
    const moduleName = fileName.replace(/\.py$/, '');
    const dirPath = path.dirname(filePath);
    const packagePath = getPackagePath(dirPath, moduleName);
    
    // Extract imports
    const importRegex = /^\s*(?:from\s+([.\w]+)\s+)?import\s+([^#\n]+)/gm;
    let importMatch;
    
    while ((importMatch = importRegex.exec(code)) !== null) {
      const fromModule = importMatch[1] || '';
      const importItems = importMatch[2].split(',').map(item => {
        const asMatch = item.trim().match(/(\S+)(?:\s+as\s+(\S+))?/);
        return asMatch ? asMatch[1].trim() : item.trim();
      });
      
      for (const item of importItems) {
        const importName = item;
        const id = generateId('import', importName, packagePath);
        
        nodes.push({
          id,
          type: 'import',
          name: importName,
          path: packagePath,
          file: filePath
        });
        
        // Create dependency for this import
        if (fromModule) {
          const importPath = fromModule + '.' + importName;
          dependencies.push({
            source: generateId('module', moduleName, packagePath),
            target: generateId('import', importPath, ''),
            type: 'imports'
          });
        } else {
          dependencies.push({
            source: generateId('module', moduleName, packagePath),
            target: generateId('import', importName, ''),
            type: 'imports'
          });
        }
      }
    }
    
    // Extract classes
    const classRegex = /^\s*class\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*(?:\(([^)]*)\))?:/gm;
    let classMatch;
    
    while ((classMatch = classRegex.exec(code)) !== null) {
      const className = classMatch[1];
      const parentClasses = classMatch[2] ? classMatch[2].split(',').map(c => c.trim()) : [];
      const classId = generateId('class', className, packagePath);
      
      // Check for docstring
      const docstringStart = code.indexOf('"""', classMatch.index + classMatch[0].length);
      let docstring = '';
      
      if (docstringStart > -1 && docstringStart < code.indexOf('\n\n', classMatch.index + classMatch[0].length)) {
        const docstringEnd = code.indexOf('"""', docstringStart + 3);
        if (docstringEnd > -1) {
          docstring = code.substring(docstringStart + 3, docstringEnd).trim();
        }
      }
      
      nodes.push({
        id: classId,
        type: 'class',
        name: className,
        path: packagePath,
        file: filePath,
        signature: `class ${className}${parentClasses.length ? `(${parentClasses.join(', ')})` : ''}`,
        docstring
      });
      
      // Add inheritance dependencies
      for (const parent of parentClasses) {
        // Skip built-in types like 'object'
        if (parent !== 'object') {
          dependencies.push({
            source: classId,
            target: generateId('class', parent, ''),
            type: 'inherits'
          });
        }
      }
      
      // Find methods within this class
      const classEndIndex = findClassEndIndex(code, classMatch.index);
      if (classEndIndex > classMatch.index) {
        const classBody = code.substring(classMatch.index, classEndIndex);
        parseClassMethods(classBody, packagePath, filePath, className, classId, nodes, dependencies);
      }
    }
    
    // Extract standalone functions
    const functionRegex = /^\s*def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([^)]*)\)(?:\s*->\s*([^:]*))?\s*:/gm;
    let functionMatch;
    
    while ((functionMatch = functionRegex.exec(code)) !== null) {
      // Check if this function is within a class (already processed)
      const functionStartPos = functionMatch.index;
      let insideClass = false;
      
      for (const node of nodes) {
        if (node.type === 'class' && node.file === filePath) {
          const classEndIndex = findClassEndIndex(code, code.indexOf(`class ${node.name}`));
          if (functionStartPos > code.indexOf(`class ${node.name}`) && functionStartPos < classEndIndex) {
            insideClass = true;
            break;
          }
        }
      }
      
      if (!insideClass) {
        const functionName = functionMatch[1];
        const params = functionMatch[2].trim();
        const returnType = functionMatch[3] ? functionMatch[3].trim() : '';
        const functionId = generateId('function', functionName, packagePath);
        
        // Check for decorators
        const decorators: string[] = [];
        let pos = functionMatch.index;
        while (pos > 0) {
          const lineStart = code.lastIndexOf('\n', pos - 1);
          const line = code.substring(lineStart + 1, pos).trim();
          if (line.startsWith('@')) {
            decorators.push(line.substring(1));
            pos = lineStart;
          } else if (!line || !line.trim()) {
            pos = lineStart;
          } else {
            break;
          }
        }
        
        // Check for docstring
        const docstringStart = code.indexOf('"""', functionMatch.index + functionMatch[0].length);
        let docstring = '';
        
        if (docstringStart > -1 && docstringStart < code.indexOf('\n\n', functionMatch.index + functionMatch[0].length)) {
          const docstringEnd = code.indexOf('"""', docstringStart + 3);
          if (docstringEnd > -1) {
            docstring = code.substring(docstringStart + 3, docstringEnd).trim();
          }
        }
        
        nodes.push({
          id: functionId,
          type: 'function',
          name: functionName,
          path: packagePath,
          file: filePath,
          signature: `def ${functionName}(${params})${returnType ? ` -> ${returnType}` : ''}`,
          docstring,
          decorators: decorators.length > 0 ? decorators : undefined
        });
        
        // Extract function calls within this function
        const endIndex = findFunctionEndIndex(code, functionMatch.index);
        if (endIndex > functionMatch.index) {
          const functionBody = code.substring(functionMatch.index, endIndex);
          const callRegex = /([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g;
          let callMatch;
          
          while ((callMatch = callRegex.exec(functionBody)) !== null) {
            const calledFunc = callMatch[1];
            // Skip if it's a common keyword or the function itself
            if (['if', 'while', 'for', 'print', 'len', 'str', 'int', 'float'].includes(calledFunc) || calledFunc === functionName) {
              continue;
            }
            
            const targetId = generateId('function', calledFunc, '');
            
            dependencies.push({
              source: functionId,
              target: targetId,
              type: 'calls'
            });
          }
        }
      }
    }
    
    return { nodes, dependencies };
  } catch (error) {
    console.error(`Error parsing Python file ${filePath}:`, error);
    return { nodes: [], dependencies: [] };
  }
};

// Helper function to find the end of a class definition
const findClassEndIndex = (code: string, startIndex: number): number => {
  const lines = code.substring(startIndex).split('\n');
  let indentLevel = -1;
  let lineIndex = 0;
  
  // Find indentation level of class declaration
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim().startsWith('class ')) {
      const match = line.match(/^(\s*)/);
      indentLevel = match ? match[1].length : 0;
      lineIndex = i + 1;
      break;
    }
  }
  
  // Find first line with same or less indentation (end of class)
  for (let i = lineIndex; i < lines.length; i++) {
    const line = lines[i].trimRight();
    if (line.length > 0) {
      const match = line.match(/^(\s*)/);
      const currentIndent = match ? match[1].length : 0;
      if (currentIndent <= indentLevel && !line.trim().startsWith('#')) {
        return startIndex + lines.slice(0, i).join('\n').length;
      }
    }
  }
  
  return code.length;
};

// Helper function to find the end of a function definition
const findFunctionEndIndex = (code: string, startIndex: number): number => {
  const lines = code.substring(startIndex).split('\n');
  let indentLevel = -1;
  let lineIndex = 0;
  
  // Find indentation level of function declaration
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim().startsWith('def ')) {
      const match = line.match(/^(\s*)/);
      indentLevel = match ? match[1].length : 0;
      lineIndex = i + 1;
      break;
    }
  }
  
  // Find first line with same or less indentation (end of function)
  for (let i = lineIndex; i < lines.length; i++) {
    const line = lines[i].trimRight();
    if (line.length > 0) {
      const match = line.match(/^(\s*)/);
      const currentIndent = match ? match[1].length : 0;
      if (currentIndent <= indentLevel && !line.trim().startsWith('#')) {
        return startIndex + lines.slice(0, i).join('\n').length;
      }
    }
  }
  
  return code.length;
};

// Parse methods within a class
const parseClassMethods = (
  classBody: string, 
  packagePath: string, 
  filePath: string, 
  className: string, 
  classId: string,
  nodes: PythonNode[], 
  dependencies: PythonDependency[]
) => {
  const methodRegex = /\n\s+def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([^)]*)\)(?:\s*->\s*([^:]*))?\s*:/g;
  let methodMatch;
  
  while ((methodMatch = methodRegex.exec(classBody)) !== null) {
    const methodName = methodMatch[1];
    let params = methodMatch[2].trim();
    const returnType = methodMatch[3] ? methodMatch[3].trim() : '';
    
    // Check if this is an instance method (has self parameter)
    const isInstanceMethod = params.startsWith('self') || params.startsWith('cls');
    
    // Remove self/cls from displayed signature
    if (isInstanceMethod) {
      params = params.replace(/^(?:self|cls)(?:,\s*)?/, '');
    }
    
    const methodId = generateId('method', `${className}.${methodName}`, packagePath);
    
    // Check for docstring
    const docstringStart = classBody.indexOf('"""', methodMatch.index + methodMatch[0].length);
    let docstring = '';
    
    if (docstringStart > -1 && docstringStart < classBody.indexOf('\n\n', methodMatch.index + methodMatch[0].length)) {
      const docstringEnd = classBody.indexOf('"""', docstringStart + 3);
      if (docstringEnd > -1) {
        docstring = classBody.substring(docstringStart + 3, docstringEnd).trim();
      }
    }
    
    nodes.push({
      id: methodId,
      type: 'method',
      name: methodName,
      path: packagePath,
      file: filePath,
      signature: `def ${methodName}(${params})${returnType ? ` -> ${returnType}` : ''}`,
      docstring
    });
    
    // Add containment dependency (class contains method)
    dependencies.push({
      source: classId,
      target: methodId,
      type: 'contains'
    });
    
    // Extract method calls
    const endIndex = findFunctionEndIndex(classBody, methodMatch.index);
    if (endIndex > methodMatch.index) {
      const methodBody = classBody.substring(methodMatch.index, endIndex);
      const callRegex = /(?:self\.)?([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g;
      let callMatch;
      
      while ((callMatch = callRegex.exec(methodBody)) !== null) {
        const calledFunc = callMatch[1];
        // Skip if it's a common keyword or the method itself
        if (['if', 'while', 'for', 'print', 'len', 'str', 'int', 'float'].includes(calledFunc) || calledFunc === methodName) {
          continue;
        }
        
        const targetId = calledFunc.includes('.') 
          ? generateId('method', calledFunc, '')
          : generateId('method', `${className}.${calledFunc}`, packagePath);
        
        dependencies.push({
          source: methodId,
          target: targetId,
          type: 'calls'
        });
      }
    }
  }
};

// Get Python package path from a directory path and module name
const getPackagePath = (dirPath: string, moduleName: string): string => {
  // Check if there's an __init__.py to determine if it's part of a package
  if (fs.existsSync(path.join(dirPath, '__init__.py'))) {
    const parentDir = path.dirname(dirPath);
    const dirName = path.basename(dirPath);
    
    if (fs.existsSync(path.join(parentDir, '__init__.py'))) {
      return `${getPackagePath(parentDir, dirName)}.${moduleName}`;
    }
    
    return `${dirName}.${moduleName}`;
  }
  
  return moduleName;
};

// Parse a Python project and generate a PythonProject object
export const parsePythonProject = async (projectPath: string): Promise<PythonProject> => {
  // Find all Python files in the project
  const pythonFiles = findPythonFiles(projectPath);
  
  let allNodes: PythonNode[] = [];
  let allDependencies: PythonDependency[] = [];
  
  // Parse each Python file
  for (const filePath of pythonFiles) {
    const { nodes, dependencies } = parsePythonFile(filePath);
    allNodes = [...allNodes, ...nodes];
    allDependencies = [...allDependencies, ...dependencies];
  }
  
  // Create project name from directory name
  const projectName = path.basename(projectPath);
  
  return {
    name: projectName,
    root: projectPath,
    nodes: allNodes,
    dependencies: allDependencies
  };
};

// Convert PythonProject to GraphData for visualization
export const convertToGraphData = (pythonProject: PythonProject): PythonGraphData => {
  const nodeTypes = {
    function: { val: 5, color: '#4CAF50' },
    class: { val: 10, color: '#2196F3' },
    method: { val: 3, color: '#4FC3F7' },
    module: { val: 15, color: '#673AB7' },
    import: { val: 2, color: '#9E9E9E' },
    variable: { val: 1, color: '#FF9800' },
    constant: { val: 1, color: '#FFC107' },
    decorator: { val: 2, color: '#F44336' }
  };
  
  // Map nodes to graph format
  const graphNodes = pythonProject.nodes.map(node => {
    const nodeType = nodeTypes[node.type as keyof typeof nodeTypes];
    
    return {
      id: node.id,
      name: node.name,
      type: node.type,
      val: nodeType.val,
      color: nodeType.color,
      group: node.path,
      path: node.path,
      file: node.file,
      signature: node.signature
    };
  });
  
  // Map dependencies to links
  const links = pythonProject.dependencies.map(dep => ({
    source: dep.source,
    target: dep.target,
    type: dep.type,
    value: dep.weight || 1
  }));
  
  return {
    nodes: graphNodes,
    links
  };
};

// Convert PythonProject to hierarchical data for tree visualization
export const convertToHierarchicalData = (pythonProject: PythonProject): PythonHierarchicalData => {
  const modules: Record<string, PythonTreeNode> = {};
  
  // Create module nodes
  for (const node of pythonProject.nodes) {
    const pathParts = node.path.split('.');
    let currentPath = '';
    
    for (let i = 0; i < pathParts.length; i++) {
      const part = pathParts[i];
      currentPath = currentPath ? `${currentPath}.${part}` : part;
      
      if (!modules[currentPath]) {
        modules[currentPath] = {
          id: `module:${currentPath}`,
          name: part,
          type: 'module',
          path: currentPath,
          children: []
        };
      }
    }
  }
  
  // Build the module hierarchy
  Object.keys(modules).forEach(modulePath => {
    const lastDotIndex = modulePath.lastIndexOf('.');
    if (lastDotIndex !== -1) {
      const parentPath = modulePath.substring(0, lastDotIndex);
      if (modules[parentPath]) {
        modules[parentPath].children.push(modules[modulePath]);
      }
    }
  });
  
  // Add nodes to the appropriate modules
  for (const node of pythonProject.nodes) {
    if (node.type !== 'module') {
      const treeNode: PythonTreeNode = {
        id: node.id,
        name: node.name,
        type: node.type,
        path: node.path,
        file: node.file,
        signature: node.signature,
        children: []
      };
      
      if (modules[node.path]) {
        modules[node.path].children.push(treeNode);
      }
    }
  }
  
  // Find root modules (those without parents)
  const rootModules = Object.values(modules).filter(module => {
    const path = module.path || '';
    return !path.includes('.') || !modules[path.substring(0, path.lastIndexOf('.'))];
  });
  
  return {
    name: pythonProject.name,
    children: rootModules
  };
};
