// Common types for code visualization (language-agnostic)

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
    language?: string;
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
  visibility?: string;
  language?: string;
  docstring?: string;
  decorators?: string[];
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
  language?: string;
};

// Language type
export type CodeLanguage = 'rust' | 'python';

// Explicitly define these as string types rather than enums
export type ViewMode = '3d-force' | 'hierarchical' | 'module-dependency' | 'call-graph';
export type AnalysisStatus = 'idle' | 'analyzing' | 'completed' | 'error';
