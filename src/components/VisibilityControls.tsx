// src/components/VisibilityControls.tsx
'use client';

import React, { useMemo } from 'react';
import { 
  getNodeTypesByLanguage, 
  getEdgeTypesByLanguage 
} from './NodeTypeConfig';

interface VisibilityControlsProps {
  visibleNodeTypes: Set<string>;
  visibleEdgeTypes: Set<string>;
  onNodeTypeToggle: (type: string) => void;
  onEdgeTypeToggle: (type: string) => void;
  onToggleAll: (showAll: boolean) => void;
  language?: string;
}

const VisibilityControls: React.FC<VisibilityControlsProps> = ({
  visibleNodeTypes,
  visibleEdgeTypes,
  onNodeTypeToggle,
  onEdgeTypeToggle,
  onToggleAll,
  language = 'rust' // Default to Rust if not specified
}) => {
  // Get node and edge types based on the language
  const nodeTypes = useMemo(() => getNodeTypesByLanguage(language), [language]);
  const edgeTypes = useMemo(() => getEdgeTypesByLanguage(language), [language]);
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
          {nodeTypes.map((type) => (
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
          {edgeTypes.map(type => (
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
