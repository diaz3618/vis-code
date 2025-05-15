// Types for Python code parsing and visualization

export type PythonNode = {
  id: string;
  type: 'function' | 'class' | 'method' | 'module' | 'import' | 'variable' | 'constant' | 'decorator';
  name: string;
  path: string;
  file: string;
  signature?: string;
  docstring?: string;
  decorators?: string[];
  children?: PythonNode[];
};

export type PythonDependency = {
  source: string;
  target: string;
  type: 'calls' | 'imports' | 'inherits' | 'contains' | 'uses';
  weight?: number;
};

export type PythonProject = {
  name: string;
  root: string;
  nodes: PythonNode[];
  dependencies: PythonDependency[];
};

// These are shared types with Rust visualization but defined here for clarity
export type PythonGraphData = {
  nodes: {
    id: string;
    name: string;
    type: string;
    val: number;
    color?: string;
    group?: string;
    path?: string;
    file?: string;
    signature?: string;
  }[];
  links: {
    source: string;
    target: string;
    type: string;
    value?: number;
  }[];
};

export type PythonTreeNode = {
  id: string;
  name: string;
  type: string;
  path?: string;
  file?: string;
  signature?: string;
  children: PythonTreeNode[];
};

export type PythonHierarchicalData = {
  name: string;
  children: PythonTreeNode[];
};
