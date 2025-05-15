// src/components/VisibilityControls.tsx
'use client';

import React from 'react';

// Node types that can be toggled in the visualization
export const NODE_TYPES = [
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

// Edge types that can be toggled in the visualization
export const EDGE_TYPES = [
  { id: 'calls', label: 'Function Calls', color: '#4285F4' },
  { id: 'implements', label: 'Implements', color: '#34A853' },
  { id: 'uses', label: 'Uses', color: '#FBBC05' },
  { id: 'contains', label: 'Contains', color: '#EA4335' },
  { id: 'extends', label: 'Extends', color: '#9C27B0' }
];

interface VisibilityControlsProps {
  visibleNodeTypes: Set<string>;
  visibleEdgeTypes: Set<string>;
  onNodeTypeToggle: (type: string) => void;
  onEdgeTypeToggle: (type: string) => void;
  onToggleAll: (showAll: boolean) => void;
}

const VisibilityControls: React.FC<VisibilityControlsProps> = ({
  visibleNodeTypes,
  visibleEdgeTypes,
  onNodeTypeToggle,
  onEdgeTypeToggle,
  onToggleAll
}) => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between mb-2">
        <h2 className="text-lg font-semibold">Show/Hide Components</h2>
        <div className="space-x-2">
          <button 
            className="text-xs px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded"
            onClick={() => onToggleAll(true)}
          >
            Show All
          </button>
          <button 
            className="text-xs px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded"
            onClick={() => onToggleAll(false)}
          >
            Hide All
          </button>
        </div>
      </div>
      
      <div>
        <h3 className="font-semibold mb-2 text-sm text-gray-700">Node Types</h3>
        <div className="space-y-1 max-h-40 overflow-y-auto pr-2">
          {NODE_TYPES.map(type => (
            <div key={type.id} className="flex items-center">
              <label className="flex items-center cursor-pointer w-full">
                <input
                  type="checkbox"
                  className="form-checkbox rounded text-blue-500"
                  checked={visibleNodeTypes.has(type.id)}
                  onChange={() => onNodeTypeToggle(type.id)}
                />
                <div className="ml-2 flex items-center">
                  <div 
                    className="w-3 h-3 rounded-full mr-2" 
                    style={{ backgroundColor: type.color }}
                  ></div>
                  <span className="text-sm">{type.label}</span>
                </div>
              </label>
            </div>
          ))}
        </div>
      </div>
      
      <div>
        <h3 className="font-semibold mb-2 text-sm text-gray-700">Connection Types</h3>
        <div className="space-y-1 max-h-40 overflow-y-auto pr-2">
          {EDGE_TYPES.map(type => (
            <div key={type.id} className="flex items-center">
              <label className="flex items-center cursor-pointer w-full">
                <input
                  type="checkbox"
                  className="form-checkbox rounded text-blue-500"
                  checked={visibleEdgeTypes.has(type.id)}
                  onChange={() => onEdgeTypeToggle(type.id)}
                />
                <div className="ml-2 flex items-center">
                  <div 
                    className="w-3 h-3 rounded-full mr-2" 
                    style={{ backgroundColor: type.color }}
                  ></div>
                  <span className="text-sm">{type.label}</span>
                </div>
              </label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default VisibilityControls;
