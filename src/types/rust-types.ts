// Types for Rust code parsing and visualization

export type RustNode = {
  id: string;
  type: 'function' | 'struct' | 'enum' | 'trait' | 'impl' | 'module' | 'constant' | 'macro' | 'use';
  name: string;
  path: string;
  file: string;
  signature?: string;
  visibility?: 'public' | 'private' | 'crate' | 'super' | 'in';
  description?: string;
  attributes?: string[];
  children?: RustNode[];
};

export type RustDependency = {
  source: string;
  target: string;
  type: 'calls' | 'implements' | 'uses' | 'contains' | 'extends';
  weight?: number;
};

export type RustProject = {
  name: string;
  root: string;
  nodes: RustNode[];
  dependencies: RustDependency[];
};

export type GraphData = {
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

export type TreeNode = {
  id: string;
  name: string;
  type: string;
  path?: string;
  file?: string;
  signature?: string;
  visibility?: 'public' | 'private' | 'crate' | 'super' | 'in';
  children: TreeNode[];
};

export type HierarchicalData = {
  name: string;
  children: TreeNode[];
};

// Types for file upload and project management
export type UploadedProject = {
  id: string;
  name: string;
  date: string;
  type: 'git' | 'upload';
  status: 'ready' | 'analyzing' | 'error';
};

// Explicitly define these as string types rather than enums
export type ViewMode = '3d-force' | 'hierarchical' | 'module-dependency' | 'call-graph';
export type AnalysisStatus = 'idle' | 'analyzing' | 'completed' | 'error';
