// Configuration for node types by language

// Rust node types
export const RUST_NODE_TYPES = [
  { id: 'function', label: 'Functions', color: '#4285F4' },
  { id: 'struct', label: 'Structs', color: '#EA4335' },
  { id: 'enum', label: 'Enums', color: '#FBBC05' },
  { id: 'trait', label: 'Traits', color: '#34A853' },
  { id: 'impl', label: 'Implementations', color: '#9C27B0' },
  { id: 'module', label: 'Modules', color: '#FF9800' },
  { id: 'constant', label: 'Constants', color: '#795548' },
  { id: 'macro', label: 'Macros', color: '#607D8B' },
  { id: 'use', label: 'Use Statements', color: '#9E9E9E' }
];

// Rust edge types
export const RUST_EDGE_TYPES = [
  { id: 'calls', label: 'Function Calls', color: '#4285F4' },
  { id: 'implements', label: 'Implements', color: '#34A853' },
  { id: 'uses', label: 'Uses', color: '#FBBC05' },
  { id: 'contains', label: 'Contains', color: '#EA4335' },
  { id: 'extends', label: 'Extends', color: '#9C27B0' }
];

// Python node types
export const PYTHON_NODE_TYPES = [
  { id: 'function', label: 'Functions', color: '#4285F4' },
  { id: 'class', label: 'Classes', color: '#EA4335' },
  { id: 'method', label: 'Methods', color: '#FBBC05' },
  { id: 'module', label: 'Modules', color: '#FF9800' },
  { id: 'import', label: 'Imports', color: '#607D8B' },
  { id: 'variable', label: 'Variables', color: '#9E9E9E' },
  { id: 'constant', label: 'Constants', color: '#795548' },
  { id: 'decorator', label: 'Decorators', color: '#9C27B0' }
];

// Python edge types
export const PYTHON_EDGE_TYPES = [
  { id: 'calls', label: 'Function Calls', color: '#4285F4' },
  { id: 'imports', label: 'Imports', color: '#607D8B' },
  { id: 'inherits', label: 'Inheritance', color: '#9C27B0' },
  { id: 'contains', label: 'Contains', color: '#EA4335' },
  { id: 'uses', label: 'Uses', color: '#FBBC05' }
];

// Get node types by language
export const getNodeTypesByLanguage = (language: string) => {
  switch (language) {
    case 'python':
      return PYTHON_NODE_TYPES;
    case 'rust':
    default:
      return RUST_NODE_TYPES;
  }
};

// Get edge types by language
export const getEdgeTypesByLanguage = (language: string) => {
  switch (language) {
    case 'python':
      return PYTHON_EDGE_TYPES;
    case 'rust':
    default:
      return RUST_EDGE_TYPES;
  }
};