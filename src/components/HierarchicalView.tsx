'use client';

import React, { useEffect, useRef, useMemo, useState } from 'react';
import * as d3 from 'd3';
import { HierarchicalData, TreeNode } from '@/types/rust-types';

interface HierarchicalViewProps {
  data: HierarchicalData;
  onNodeClick?: (node: TreeNode) => void;
  visibleNodeTypes?: Set<string>;
}

const HierarchicalView: React.FC<HierarchicalViewProps> = ({ 
  data, 
  onNodeClick,
  visibleNodeTypes = new Set()  // Default to all types visible if not specified
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [containerHeight, setContainerHeight] = useState(800); // Default height
  // State to track which nodes are collapsed
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());
  // State for search functionality
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedNodes, setHighlightedNodes] = useState<Set<string>>(new Set());
  
  // Toggle the collapse state of a node
  const toggleNode = (nodeId: string) => {
    const newCollapsedNodes = new Set(collapsedNodes);
    if (newCollapsedNodes.has(nodeId)) {
      newCollapsedNodes.delete(nodeId);
    } else {
      newCollapsedNodes.add(nodeId);
    }
    setCollapsedNodes(newCollapsedNodes);
  };
  
  // Node colors based on type
  const nodeColors: Record<string, string> = {
    function: '#4285F4',  // Blue
    struct: '#EA4335',    // Red
    enum: '#FBBC05',      // Yellow
    trait: '#34A853',     // Green
    impl: '#9C27B0',      // Purple
    module: '#FF9800',    // Orange
    constant: '#795548',  // Brown
    macro: '#607D8B',     // Grey-Blue
    use: '#9E9E9E',       // Grey
    root: '#000000'       // Black
  };
  
  // Filter data to only show visible node types
  const filteredData = useMemo(() => {
    // If no specific visible types are provided, make all types visible
    if (visibleNodeTypes.size === 0) {
      const allNodeTypes = new Set<string>();
      
      // Helper function to collect all node types from hierarchical data
      const collectTypes = (node: TreeNode) => {
        allNodeTypes.add(node.type);
        if (node.children) {
          node.children.forEach(collectTypes);
        }
      };
      
      // Start collecting from root's children
      if (data.children) {
        data.children.forEach(collectTypes);
      }
      
      // Use all collected types as visible
      visibleNodeTypes = allNodeTypes;
    }
    
    // Filter function that preserves structure but removes non-visible node types
    const filterNode = (node: TreeNode): TreeNode | null => {
      // Always keep module nodes to maintain structure
      const isVisible = node.type === 'module' || visibleNodeTypes.has(node.type);
      
      if (!isVisible && node.type !== 'module') {
        return null;
      }
      
      // Filter children recursively
      const filteredChildren = node.children
        .map(filterNode)
        .filter((n): n is TreeNode => n !== null);
      
      // If not a module and all children were filtered out, don't render this node
      if (node.type !== 'module' && filteredChildren.length === 0 && node.children.length > 0) {
        return null;
      }
      
      // Return node with filtered children
      return {
        ...node,
        children: filteredChildren
      };
    };
    
    // Apply filtering to each child of root
    const filteredChildren = data.children
      .map(filterNode)
      .filter((n): n is TreeNode => n !== null);
    
    return {
      name: data.name,
      children: filteredChildren
    };
  }, [data, visibleNodeTypes]);
  
  // Extend the d3 HierarchyNode interface to include collapse functionality
  interface CollapsibleNode extends d3.HierarchyNode<TreeNode> {
    _children?: d3.HierarchyNode<TreeNode>[];
  }
  
  useEffect(() => {
    if (!filteredData || !svgRef.current) return;
    
    // Clear existing content
    d3.select(svgRef.current).selectAll('*').remove();
    
    // Define the renderTree function to handle tree construction and updates
    const renderTree = () => {
      const svg = d3.select(svgRef.current);
      const width = window.innerWidth;
      // Make it much taller to accommodate large hierarchies
      const height = Math.max(window.innerHeight * 2, containerHeight);
      
      // Calculate optimal height based on node count - using descendants length to avoid TypeScript errors
      const hierarchyRoot = d3.hierarchy(filteredData as unknown as TreeNode);
      const nodeCount = hierarchyRoot.descendants().length;
      const optimalHeight = Math.max(nodeCount * 18, 800); // 18px per node minimum
      
      // Update container height if needed
      if (optimalHeight > containerHeight) {
        setContainerHeight(optimalHeight);
      }
      
      // Create a tree layout with dynamic spacing based on tree size
      const treeLayout = d3.tree<TreeNode>()
        .size([height, width - 300]); // Make the width smaller to accommodate more nodes
      
      // Adjust node size based on tree complexity
      // For larger trees, make the spacing more compact
      if (nodeCount > 100) {
        treeLayout.nodeSize([22, 150]); // More compact vertical spacing for large trees
      } else if (nodeCount > 50) {
        treeLayout.nodeSize([26, 150]); // Medium spacing for medium trees
      } else {
        treeLayout.nodeSize([30, 150]); // More space for small trees
      }
      
      // Convert the data to a hierarchy
      const root = d3.hierarchy<TreeNode>(filteredData as unknown as TreeNode) as CollapsibleNode;
      
      // Process the hierarchy to collapse nodes based on the collapsedNodes set
      root.descendants().forEach(d => {
        const node = d as CollapsibleNode;
        if (node.data.id && collapsedNodes.has(node.data.id)) {
          // Store children and then remove them (collapse)
          node._children = node.children;
          node.children = undefined;
        }
      });
      
      // Compute the tree layout
      treeLayout(root);
      
      // Add a group element for the nodes and links
      const g = svg.append('g')
        .attr('transform', 'translate(100, 0)');
      
      // Add links between nodes
      g.selectAll('.link')
        .data(root.links())
        .enter()
        .append('path')
        .attr('class', 'link')
        .attr('d', (d) => {
          const sourceY = d.source.y || 0;
          const sourceX = d.source.x || 0;
          const targetY = d.target.y || 0;
          const targetX = d.target.x || 0;
          
          return `M${sourceY},${sourceX}
                  C${(sourceY + targetY) / 2},${sourceX}
                   ${(sourceY + targetY) / 2},${targetX}
                   ${targetY},${targetX}`;
        })
        .attr('fill', 'none')
        .attr('stroke', (d) => {
          // Change color based on depth for better visual hierarchy
          const depth = d.target.depth;
          return depth > 3 ? '#ddd' : depth > 2 ? '#ccc' : depth > 1 ? '#bbb' : '#999';
        })
        .attr('stroke-width', (d) => {
          // Thinner lines for deeper nodes
          return 1.5 - (Math.min(d.target.depth, 3) * 0.25);
        })
        .attr('stroke-opacity', (d) => {
          // More transparent lines for deeper nodes
          return 1 - (Math.min(d.target.depth, 5) * 0.15);
        });
      
      // Add nodes
      const node = g.selectAll('.node')
        .data(root.descendants())
        .enter()
        .append('g')
        .attr('class', 'node')
        .attr('transform', d => `translate(${d.y},${d.x})`)
        .attr('cursor', 'pointer');
      
      // Add circles to nodes
      node.append('circle')
        .attr('r', d => {
          // Larger radius for modules and expandable nodes
          if (d.data.type === 'module') return 7;
          // Highlight search matches
          if (d.data.id && highlightedNodes.has(d.data.id)) return 8;
          // Check if the node has children or collapsed children
          const collapsibleNode = d as CollapsibleNode;
          // Size based on importance and collapsibility
          if (collapsibleNode._children) return 6; // Collapsed nodes are larger
          return (collapsibleNode.children) ? 5 : 4; // Expanded or leaf nodes
        })
        .attr('fill', d => {
          // Highlight search matches
          if (d.data.id && highlightedNodes.has(d.data.id)) {
            return '#ff6600'; // Bright orange for search matches
          }
          
          // Add opacity to nodes based on depth for visual hierarchy
          const opacity = Math.max(0.5, 1 - d.depth * 0.15);
          const baseColor = nodeColors[d.data.type] || '#999';
          
          // If the node has collapsed children, make it more saturated
          const collapsibleNode = d as CollapsibleNode;
          if (collapsibleNode._children) {
            // Darker color for collapsed nodes to indicate they contain content
            return d3.color(baseColor)?.darker(0.5).toString() || baseColor;
          }
          
          // Return the color with appropriate opacity
          const color = d3.color(baseColor);
          if (color) {
            color.opacity = opacity;
            return color.toString();
          }
          return baseColor;
        })
        .attr('stroke', d => {
          // Highlight search matches
          if (d.data.id && highlightedNodes.has(d.data.id)) {
            return '#ff3300'; // Darker orange stroke for search matches
          }
          // Different stroke for collapsed vs expanded
          const collapsibleNode = d as CollapsibleNode;
          return (collapsibleNode._children) ? '#555' : '#fff';
        })
        .attr('stroke-width', d => {
          // Highlight search matches
          if (d.data.id && highlightedNodes.has(d.data.id)) return 2.5;
          // Thicker stroke for collapsed nodes with many children
          const collapsibleNode = d as CollapsibleNode;
          return (collapsibleNode._children) ? 2 : 1.5;
        })
        .on('click', function(event, d) {
          event.stopPropagation();
          
          // If the node has children or collapsed children, toggle expansion
          const collapsibleNode = d as CollapsibleNode;
          if (collapsibleNode.children || collapsibleNode._children) {
            toggleNode(collapsibleNode.data.id);
            
            // Store current node position to ensure it's visible after redraw
            const nodeX = collapsibleNode.x || 0;
            const nodeY = collapsibleNode.y || 0;
            
            // Redraw the tree
            svg.selectAll('*').remove();
            renderTree();
            
            // After redraw, ensure the toggled node is in view
            const containerElement = svgRef.current?.parentElement?.parentElement;
            if (containerElement) {
              // Adjust scroll position to keep the clicked node in view
              setTimeout(() => {
                containerElement.scrollTo({
                  top: Math.max(0, nodeX - 200),
                  behavior: 'smooth'
                });
              }, 100);
            }
          } else if (onNodeClick) {
            // Only trigger the node click callback for leaf nodes
            onNodeClick(d.data);
          }
        });
      
      // Add expand/collapse indicators
      node.each(function(d) {
        const collapsibleNode = d as CollapsibleNode;
        const hasChildren = collapsibleNode.children || collapsibleNode._children;
        
        if (hasChildren) {
          const isCollapsed = Boolean(!collapsibleNode.children && collapsibleNode._children);
          // Create group for indicator
          const indicatorGroup = d3.select(this).append('g')
            .attr('class', 'toggle-indicator')
            .attr('transform', 'translate(-15, 0)');
          
          // Add the +/- symbol
          indicatorGroup.append('text')
            .attr('dy', '0.31em')
            .attr('text-anchor', 'middle')
            .text(isCollapsed ? '+' : '-')
            .attr('font-size', '14px')
            .attr('font-weight', 'bold')
            .attr('font-family', 'sans-serif')
            .attr('fill', '#666');
          
          // If collapsed, add a count of hidden children
          if (isCollapsed && collapsibleNode._children) {
            const childCount = collapsibleNode._children.length;
            if (childCount > 0) {
              d3.select(this).append('text')
                .attr('dy', '-0.5em')
                .attr('x', 10)
                .attr('text-anchor', 'start')
                .text(`(${childCount})`)
                .attr('font-size', '8px')
                .attr('font-family', 'sans-serif')
                .attr('fill', '#666');
            }
          }
        }
      });
      
      // Add labels to nodes
      node.append('text')
        .attr('dy', '.31em')
        .attr('x', d => {
          const collapsibleNode = d as CollapsibleNode;
          return (collapsibleNode.children || collapsibleNode._children) ? -9 : 8;
        })
        .attr('text-anchor', d => {
          const collapsibleNode = d as CollapsibleNode;
          return (collapsibleNode.children || collapsibleNode._children) ? 'end' : 'start';
        })
        .text(d => {
          // Truncate long names for better display
          const name = d.data.name;
          if (name.length > 25) {
            return name.substring(0, 22) + '...';
          }
          return name;
        })
        .attr('font-size', d => {
          // Slightly larger font for important nodes
          return d.data.type === 'module' ? '11px' : '10px';
        })
        .attr('font-weight', d => {
          // Bold for modules and collapsed nodes
          const collapsibleNode = d as CollapsibleNode;
          return (d.data.type === 'module' || collapsibleNode._children) ? 'bold' : 'normal';
        })
        .attr('font-family', 'Arial, sans-serif')
        .attr('fill', d => {
          // Color labels based on node type for better visual grouping
          return d.data.type === 'module' ? '#333' : '#555';
        })
        // Add hover effect for better interaction
        .on('mouseover', function() {
          d3.select(this).attr('font-weight', 'bold');
        })
        .on('mouseout', function(_, d) {
          // Return to normal weight unless it's a module or collapsed node
          if (d.data.type !== 'module' && !(d as CollapsibleNode)._children) {
            d3.select(this).attr('font-weight', 'normal');
          }
        });
      
      // Add zoom behavior with touch support
      const zoom = d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.1, 3])
        .on('zoom', (event) => {
          g.attr('transform', event.transform);
        });
      
      if (svgRef.current) {
        // Need to use d3.select with a non-null assertion for proper typing
        d3.select<SVGSVGElement, unknown>(svgRef.current)
          .call(zoom as any)
          // Enable touch events for mobile users
          .on('touchstart', function(event) {
            // Prevent default to allow zooming on mobile
            event.preventDefault();
          });
        
        // Initial centering and zoom - position at the top with enough space to see the whole tree
        d3.select<SVGSVGElement, unknown>(svgRef.current)
          .call((zoom as any).transform,
            d3.zoomIdentity
              .translate(100, 50)
              .scale(0.6)
          );
      }
    };
    
    // Initial render
    renderTree();
    
  }, [filteredData, onNodeClick, nodeColors, collapsedNodes, toggleNode, highlightedNodes]);
  
  // Search function to find and highlight nodes
  const handleSearch = () => {
    if (!searchTerm.trim()) {
      setHighlightedNodes(new Set());
      return;
    }
    
    const searchTermLower = searchTerm.toLowerCase();
    const matches = new Set<string>();
    
    // Recursive function to find matching nodes
    const findMatches = (node: TreeNode, parentPath: string[] = []) => {
      const nodePath = [...parentPath, node.id || ''];
      
      if (node.name.toLowerCase().includes(searchTermLower) && node.id) {
        matches.add(node.id);
        
        // Auto-expand all parent nodes to reveal matches
        for (const parentId of parentPath) {
          if (parentId) {
            collapsedNodes.delete(parentId);
          }
        }
      }
      
      if (node.children) {
        node.children.forEach(child => findMatches(child, nodePath));
      }
    };
    
    // Start search from the root's children
    if (filteredData.children) {
      filteredData.children.forEach(child => findMatches(child));
    }
    
    setHighlightedNodes(matches);
    
    // Update collapsed nodes if needed
    if (matches.size > 0) {
      setCollapsedNodes(new Set(collapsedNodes));
    }
  };
  
  return (
    <div 
      className="hierarchical-view-container" 
      style={{ 
        width: '100%', 
        height: '100%', 
        position: 'relative',
        overflow: 'auto'
      }}
    >
      <div style={{ width: '100%', height: `${containerHeight}px`, position: 'relative' }}>
        <svg 
          ref={svgRef} 
          width="100%" 
          height="100%"
          style={{ overflow: 'visible', minHeight: '600px' }}
        />
      </div>
      <div className="controls-overlay" style={{ 
        position: 'fixed', 
        top: '70px', 
        right: '20px',
        background: 'rgba(255, 255, 255, 0.9)',
        padding: '10px',
        borderRadius: '6px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        zIndex: 100,
        width: '220px'
      }}>
        {/* Search input */}
        <div className="mb-3">
          <div className="flex items-center mb-1">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search nodes..."
              className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
            />
            <button
              onClick={handleSearch}
              className="ml-1 px-2 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
            >
              Find
            </button>
          </div>
          {highlightedNodes.size > 0 && (
            <div className="text-xs text-gray-600">
              Found {highlightedNodes.size} matches
              <button 
                onClick={() => setHighlightedNodes(new Set())}
                className="ml-2 text-blue-500 hover:text-blue-700"
              >
                Clear
              </button>
            </div>
          )}
        </div>
        
        {/* Collapse/Expand controls */}
        <div className="flex space-x-2">
          <button 
            onClick={() => {
              // Collapse all non-root nodes
              if (!filteredData) return;
              
              const collectIds = (node: TreeNode): string[] => {
                let ids: string[] = [];
                if (node.id && node.children && node.children.length > 0) {
                  ids.push(node.id);
                }
                if (node.children) {
                  node.children.forEach(child => {
                    ids = [...ids, ...collectIds(child)];
                  });
                }
                return ids;
              };
              
              const allCollapsibleIds = filteredData.children.flatMap(collectIds);
              setCollapsedNodes(new Set(allCollapsibleIds));
            }}
            className="flex-1 px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm"
          >
            Collapse All
          </button>
          <button 
            onClick={() => setCollapsedNodes(new Set())}
            className="flex-1 px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm"
          >
            Expand All
          </button>
        </div>
      </div>
      <div className="search-overlay" style={{ 
        position: 'fixed', 
        top: '10px', 
        left: '20px',
        background: 'rgba(255, 255, 255, 0.9)',
        padding: '10px',
        borderRadius: '6px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        zIndex: 100
      }}>
      </div>
    </div>
  );
};

export default HierarchicalView;
