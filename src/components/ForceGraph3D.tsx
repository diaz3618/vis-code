'use client';

import React, { useEffect, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { GraphData } from '@/types/common-types';

// Dynamically import the ForceGraph3D component with no SSR
const ForceGraph = dynamic(() => import('react-force-graph-3d'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-[600px]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-800"></div>
    </div>
  ),
});

// Define the node structure that the graph uses
interface GraphNode {
  id: string;
  name: string;
  type: string;
  val?: number;
  color?: string;
  [key: string]: any;
}

interface ForceGraph3DProps {
  data: GraphData;
  onNodeClick?: (node: GraphNode) => void;
  visibleNodeTypes?: Set<string>;
  visibleEdgeTypes?: Set<string>;
}

const ForceGraph3DComponent: React.FC<ForceGraph3DProps> = ({ 
  data, 
  onNodeClick,
  visibleNodeTypes = new Set(data.nodes.map(node => node.type)),
  visibleEdgeTypes = new Set(data.links.map(link => link.type || ''))
}) => {
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  
  // Filter data based on visible types
  const filteredData = useMemo(() => {
    const visibleNodes = data.nodes.filter(node => visibleNodeTypes.has(node.type));
    const visibleNodeIds = new Set(visibleNodes.map(node => node.id));
    
    // Only include links where both source and target nodes are visible and link type is visible
    const visibleLinks = data.links.filter(link => {
      // Handle both string IDs and object references
      const sourceId = typeof link.source === 'string' ? link.source : (link.source as any)?.id || '';
      const targetId = typeof link.target === 'string' ? link.target : (link.target as any)?.id || '';
      
      return (
        visibleNodeIds.has(sourceId) && 
        visibleNodeIds.has(targetId) && 
        visibleEdgeTypes.has(link.type || '')
      );
    });
    
    return {
      nodes: visibleNodes,
      links: visibleLinks
    };
  }, [data, visibleNodeTypes, visibleEdgeTypes]);
  
  useEffect(() => {
    // Initialize graph with current window dimensions
    const updateDimensions = () => {
      if (typeof window !== 'undefined') {
        setDimensions({
          width: window.innerWidth,
          height: window.innerHeight - 200, // Leave space for header/controls
        });
      }
    };
    
    // Set initial dimensions
    updateDimensions();
    
    // Update dimensions on window resize
    window.addEventListener('resize', updateDimensions);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', updateDimensions);
    };
  }, []);
  
  return (
    <div className="w-full h-full" style={{ height: `${dimensions.height}px` }}>
      {filteredData.nodes.length > 0 ? (
        <ForceGraph
          width={dimensions.width}
          height={dimensions.height}
          graphData={filteredData}
          nodeLabel={(node) => `${node.type}: ${node.name}`}
          nodeAutoColorBy="type"
          nodeVal={(node) => node.val || 5}
          linkDirectionalArrowLength={3.5}
          linkDirectionalArrowRelPos={1}
          linkCurvature={0.25}
          linkWidth={1}
          backgroundColor="#ffffff"
          onNodeClick={(node) => {
            if (onNodeClick && node.name && node.type) {
              onNodeClick(node as GraphNode);
            }
          }}
          linkLabel={(link) => link.type}
          linkAutoColorBy="type"
          linkDirectionalParticles={1}
          linkDirectionalParticleSpeed={0.005}
          linkDirectionalParticleWidth={1.5}
          cooldownTime={1000}
          onEngineStop={() => {
            // Center the graph after it's done loading
            if (typeof window !== 'undefined') {
              const canvas = document.querySelector('canvas');
              if (canvas) {
                const event = new MouseEvent('dblclick', {
                  view: window,
                  bubbles: true,
                  cancelable: true
                });
                canvas.dispatchEvent(event);
              }
            }
          }}
        />
      ) : (
        <div className="flex items-center justify-center h-full">
          <p className="text-gray-500">No nodes visible with current filters</p>
        </div>
      )}
    </div>
  );
};

export default ForceGraph3DComponent;
