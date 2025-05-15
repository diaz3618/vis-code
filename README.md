# Code Visualizer

A simple visualization tool for exploring Rust and Python codebases through interactive diagrams and visual representations.

## Features

- **3D Force Graph**: Interactive 3D visualization of code dependencies and relationships
- **Hierarchical View**: Tree-based representation of module hierarchies and code structure
- **Module Dependencies**: Clear visualization of dependencies between modules
- **Function Call Graph**: Track function calls and relationships between functions

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

## Usage

1. Upload a Rust or Python project or select a previously uploaded project
2. Choose from different visualization types in the sidebar
3. Use the visibility controls to filter what node and edge types are displayed
4. Click on nodes to view detailed information in the info panel
5. Explore the codebase through the interactive visualizations

## Technical Details

This project is built with:

- [Next.js](https://nextjs.org) - React framework for the frontend
- [D3.js](https://d3js.org) - For data visualization components
- [React Force Graph](https://github.com/vasturiano/react-force-graph) - For 3D force-directed graph visualization
- Custom Rust parser with two implementations:
  - RegEx-based parser for browser compatibility
  - Tree-sitter parser for enhanced accuracy (server-side only)
- Python code parser for Python project visualization

## Project Structure

```
src/
  app/              # Next.js app router
    api/            # API routes for project data
  components/       # React components for visualizations
    ForceGraph3D.tsx          # 3D force graph visualization
    HierarchicalView.tsx      # Hierarchical tree visualization
    SystemBlockDiagram.tsx    # System block diagram visualization
    ...
  lib/              # Helper utilities
    parsers/        # Code parsing functionality
      rust-parser.ts          # Tree-sitter based Rust parser (server-side)
      rust-parser-simple.ts   # RegEx based Rust parser (browser compatible)
      python-parser.ts        # Python code parser
  types/            # TypeScript type definitions
    rust-types.ts            # Types for Rust code structures
    python-types.ts          # Types for Python code structures
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
