'use client';

import React from 'react';
import { TreeNode } from '@/types/common-types';

interface GraphNode {
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
  children?: never;
  [key: string]: unknown;
}

type NodeType = TreeNode | GraphNode;

interface NodeInfoPanelProps {
  node: NodeType;
  onClose: () => void;
}

// Type guard to check if node is a TreeNode
const isTreeNode = (node: NodeType): node is TreeNode => {
  return node !== null && typeof node === 'object' && 'children' in node && Array.isArray((node as any).children);
};

const NodeInfoPanel: React.FC<NodeInfoPanelProps> = ({ node, onClose }) => {
  if (!node) return null;
  
  // Generate type-specific content
  const renderNodeDetails = () => {
    switch (node.type) {
      case 'function':
        return (
          <>
            <div className="mb-4">
              <h3 className="font-semibold text-gray-700">Signature</h3>
              <pre className="mt-1 text-sm bg-gray-100 p-2 rounded overflow-x-auto">
                {node.signature || 'No signature available'}
              </pre>
            </div>
            
            <div className="mb-4">
              <h3 className="font-semibold text-gray-700">Path</h3>
              <p className="mt-1 text-sm">{node.path || 'Root'}</p>
            </div>
            
            <div className="mb-4">
              <h3 className="font-semibold text-gray-700">File</h3>
              <p className="mt-1 text-sm truncate" title={node.file}>
                {node.file ? node.file.split('/').pop() : 'Unknown'}
              </p>
              <p className="text-xs text-gray-500 truncate">{node.file}</p>
            </div>
          </>
        );
        
      case 'struct':
      case 'enum':
        return (
          <>
            <div className="mb-4">
              <h3 className="font-semibold text-gray-700">Definition</h3>
              <pre className="mt-1 text-sm bg-gray-100 p-2 rounded overflow-x-auto">
                {node.signature || 'No definition available'}
              </pre>
            </div>
            
            <div className="mb-4">
              <h3 className="font-semibold text-gray-700">Path</h3>
              <p className="mt-1 text-sm">{node.path || 'Root'}</p>
            </div>
            
            <div className="mb-4">
              <h3 className="font-semibold text-gray-700">Visibility</h3>
              <span className={`mt-1 inline-block px-2 py-1 text-xs rounded ${
                node.visibility === 'public' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {node.visibility || 'private'}
              </span>
            </div>
            
            <div className="mb-4">
              <h3 className="font-semibold text-gray-700">File</h3>
              <p className="mt-1 text-sm truncate" title={node.file}>
                {node.file ? node.file.split('/').pop() : 'Unknown'}
              </p>
              <p className="text-xs text-gray-500 truncate">{node.file}</p>
            </div>
          </>
        );
        
      case 'module':
        return (
          <>
            <div className="mb-4">
              <h3 className="font-semibold text-gray-700">Path</h3>
              <p className="mt-1 text-sm">{node.path || 'Root'}</p>
            </div>
            
            {node.children && (
              <div className="mb-4">
                <h3 className="font-semibold text-gray-700">Contains</h3>
                <p className="mt-1 text-sm">{node.children.length} elements</p>
                
                <div className="mt-2 max-h-40 overflow-y-auto">
                  <ul className="text-xs space-y-1">
                    {node.children.map((child: any, index: number) => (
                      <li key={index} className="truncate">
                        <span className={`inline-block w-2 h-2 rounded-full mr-1`} style={{ 
                          backgroundColor: getColorForType(child.type)
                        }}></span>
                        <span className="text-gray-500">{child.type}:</span> {child.name}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
            
            <div className="mb-4">
              <h3 className="font-semibold text-gray-700">File</h3>
              <p className="mt-1 text-sm truncate" title={node.file}>
                {node.file ? node.file.split('/').pop() : 'Unknown'}
              </p>
              <p className="text-xs text-gray-500 truncate">{node.file}</p>
            </div>
          </>
        );
        
      case 'trait':
      case 'impl':
        return (
          <>
            <div className="mb-4">
              <h3 className="font-semibold text-gray-700">Definition</h3>
              <pre className="mt-1 text-sm bg-gray-100 p-2 rounded overflow-x-auto">
                {node.signature || 'No definition available'}
              </pre>
            </div>
            
            <div className="mb-4">
              <h3 className="font-semibold text-gray-700">Path</h3>
              <p className="mt-1 text-sm">{node.path || 'Root'}</p>
            </div>
            
            <div className="mb-4">
              <h3 className="font-semibold text-gray-700">File</h3>
              <p className="mt-1 text-sm truncate" title={node.file}>
                {node.file ? node.file.split('/').pop() : 'Unknown'}
              </p>
              <p className="text-xs text-gray-500 truncate">{node.file}</p>
            </div>
          </>
        );
        
      case 'class':
        return (
          <>
            <div className="mb-4">
              <h3 className="font-semibold text-gray-700">Signature</h3>
              <pre className="mt-1 text-sm bg-gray-100 p-2 rounded overflow-x-auto">
                {node.signature || 'No signature available'}
              </pre>
            </div>
            
            <div className="mb-4">
              <h3 className="font-semibold text-gray-700">Path</h3>
              <p className="mt-1 text-sm">{node.path || 'Root'}</p>
            </div>
            
            {node.docstring && (
              <div className="mb-4">
                <h3 className="font-semibold text-gray-700">Docstring</h3>
                <pre className="mt-1 text-sm bg-gray-100 p-2 rounded overflow-x-auto whitespace-pre-wrap">
                  {node.docstring}
                </pre>
              </div>
            )}
          </>
        );
        
      case 'method':
        return (
          <>
            <div className="mb-4">
              <h3 className="font-semibold text-gray-700">Signature</h3>
              <pre className="mt-1 text-sm bg-gray-100 p-2 rounded overflow-x-auto">
                {node.signature || 'No signature available'}
              </pre>
            </div>
            
            <div className="mb-4">
              <h3 className="font-semibold text-gray-700">Class</h3>
              <p className="mt-1 text-sm">{(node.path || '').split('.').pop() || 'Unknown'}</p>
            </div>
            
            {node.docstring && (
              <div className="mb-4">
                <h3 className="font-semibold text-gray-700">Docstring</h3>
                <pre className="mt-1 text-sm bg-gray-100 p-2 rounded overflow-x-auto whitespace-pre-wrap">
                  {node.docstring}
                </pre>
              </div>
            )}
          </>
        );
      
      case 'import':
        return (
          <>
            <div className="mb-4">
              <h3 className="font-semibold text-gray-700">Module</h3>
              <p className="mt-1 text-sm">{node.path || 'Unknown'}</p>
            </div>
            
            <div className="mb-4">
              <h3 className="font-semibold text-gray-700">File</h3>
              <p className="mt-1 text-sm">{node.file?.split('/').pop() || 'Unknown'}</p>
            </div>
          </>
        );
        
      default:
        return (
          <>
            <div className="mb-4">
              <h3 className="font-semibold text-gray-700">Name</h3>
              <p className="mt-1 text-sm">{node.name}</p>
            </div>
            
            <div className="mb-4">
              <h3 className="font-semibold text-gray-700">Type</h3>
              <p className="mt-1 text-sm">{node.type}</p>
            </div>
            
            <div className="mb-4">
              <h3 className="font-semibold text-gray-700">Path</h3>
              <p className="mt-1 text-sm">{node.path || 'Root'}</p>
            </div>
          </>
        );
    }
  };
  
  // Function to safely get the filename from a file path
  const getFileName = (filePath?: string): string => {
    if (!filePath) return 'Unknown';
    
    try {
      return filePath.split('/').pop() || 'Unknown';
    } catch {
      return 'Unknown';
    }
  };
  
  // Function to safely get children
  const getChildren = (): React.ReactNode => {
    if (isTreeNode(node) && node.children && Array.isArray(node.children) && node.children.length > 0) {
      return (
        <>
          <p className="mt-1 text-sm">{node.children.length} elements</p>
          <div className="mt-2 max-h-32 overflow-y-auto border border-gray-200 rounded p-2">
            <ul className="text-sm">
              {node.children.map((child, index) => (
                <li key={index} className="py-1 border-b border-gray-100 last:border-0">
                  <span className="font-medium">{child.name}</span>
                  <span className="text-xs text-gray-500 ml-2">({child.type})</span>
                </li>
              ))}
            </ul>
          </div>
        </>
      );
    }
    
    return <p className="mt-1 text-sm">No children</p>;
  };
  
  return (
    <div className="bg-white shadow-lg rounded-lg p-4 max-h-[80vh] overflow-y-auto">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center">
          <div className="w-3 h-3 rounded-full mr-2" style={{ 
            backgroundColor: getColorForType(node.type)
          }}></div>
          
          <h2 className="text-lg font-bold">{node.name}</h2>
        </div>
        
        <button
          className="text-gray-400 hover:text-gray-600"
          onClick={onClose}
          aria-label="Close"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
      
      <div className="mb-2">
        <span className="inline-block px-2 py-1 text-xs font-semibold rounded bg-gray-200 text-gray-800">
          {node.type}
        </span>
      </div>
      
      {renderNodeDetails()}
    </div>
  );
};

// Helper function to get color based on node type
function getColorForType(type: string): string {
  const colors: Record<string, string> = {
    function: '#4285F4',  // Blue
    struct: '#EA4335',    // Red
    enum: '#FBBC05',      // Yellow
    trait: '#34A853',     // Green
    impl: '#9C27B0',      // Purple
    module: '#FF9800',    // Orange
    constant: '#795548',  // Brown
    macro: '#607D8B',     // Grey-Blue
    use: '#9E9E9E',       // Grey
  };
  
  return colors[type] || '#9E9E9E';
}

export default NodeInfoPanel;
