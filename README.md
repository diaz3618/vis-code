# Rust Code Visualizer

A powerful visualization tool for exploring and understanding Rust codebases through interactive diagrams and visual representations.

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

1. Upload a Rust project or select a previously uploaded project
2. Choose from different visualization types in the sidebar
3. Use the visibility controls to filter what node and edge types are displayed
4. Click on nodes to view detailed information in the info panel
5. Explore the codebase through the interactive visualizations

## Technical Details

This project is built with:

- [Next.js](https://nextjs.org) - React framework for the frontend
- [D3.js](https://d3js.org) - For data visualization components
- [React Force Graph](https://github.com/vasturiano/react-force-graph) - For 3D force-directed graph visualization
- Custom Rust parsing to extract code structure and relationships

## Learn More

For more information about the technologies used:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial
- [D3.js Documentation](https://d3js.org) - comprehensive guide to D3.js
- [Rust Programming Language](https://www.rust-lang.org/) - learn about Rust

## System Block Diagram Visualization

The System Block Diagram visualization offers a high-level architectural view of your Rust project, showing:

- Clear visual representation of functional modules in the system
- Communications pathways between modules with directional flow indicators
- Visual grouping of related functionality
- Detailed view of functions, structs, and other elements within each module
- Interactive elements for exploring connections and dependencies

This visualization helps developers understand how the parts fit into the larger whole, identify excessive coupling, and maintain proper system architecture.

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
    parsers/        # Rust code parsing functionality
  types/            # TypeScript type definitions
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
