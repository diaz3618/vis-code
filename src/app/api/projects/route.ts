import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import simpleGit from 'simple-git';
import extract from 'extract-zip';
import { parseRustProject, convertToGraphData } from '@/lib/parsers/rust-parser-simple';
import { parsePythonProject, convertToGraphData as convertPythonToGraphData } from '@/lib/parsers/python-parser';

// Base directory for project storage
const PROJECTS_DIR = path.join(process.cwd(), 'projects');

// Ensure projects directory exists
if (!fs.existsSync(PROJECTS_DIR)) {
  fs.mkdirSync(PROJECTS_DIR, { recursive: true });
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const uploadType = formData.get('type') as string;
    
    // Generate unique project ID
    const projectId = uuidv4();
    const projectDir = path.join(PROJECTS_DIR, projectId);
    
    // Create project directory
    fs.mkdirSync(projectDir, { recursive: true });
    
    let projectPath = '';
    let projectName = '';
    
    if (uploadType === 'file') {
      // Handle project upload as zip file
      const file = formData.get('file') as File;
      
      if (!file) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 });
      }
      
      // Get original filename without extension for project name
      projectName = path.parse(file.name).name;
      
      // Save the zip file
      const zipPath = path.join(projectDir, file.name);
      const buffer = Buffer.from(await file.arrayBuffer());
      fs.writeFileSync(zipPath, buffer);
      
      // Extract the zip file
      await extract(zipPath, { dir: projectDir });
      
      // Delete the zip file after extraction
      fs.unlinkSync(zipPath);
      
      // The project path is the directory containing the extracted files
      projectPath = projectDir;
    } else if (uploadType === 'git') {
      // Handle Git repository clone
      const gitUrl = formData.get('gitUrl') as string;
      
      if (!gitUrl) {
        return NextResponse.json({ error: 'No Git URL provided' }, { status: 400 });
      }
      
      // Extract repo name from URL for project name
      const urlParts = gitUrl.split('/');
      projectName = urlParts[urlParts.length - 1].replace('.git', '');
      
      // Clone the repository
      const git = simpleGit();
      await git.clone(gitUrl, projectDir);
      
      // The project path is the directory containing the cloned repository
      projectPath = projectDir;
    } else {
      return NextResponse.json({ error: 'Invalid upload type' }, { status: 400 });
    }
    
    // Save project metadata
    const metadata: {
      id: string;
      name: string;
      path: string;
      type: string;
      timestamp: number;
      language?: string;
    } = {
      id: projectId,
      name: projectName,
      path: projectPath,
      type: uploadType,
      timestamp: Date.now()
    };
    
    fs.writeFileSync(
      path.join(projectDir, 'metadata.json'),
      JSON.stringify(metadata, null, 2)
    );
    
    // Detect project language by checking for key files
    const hasPythonFiles = fs.existsSync(path.join(projectPath, 'requirements.txt')) || 
                           fs.existsSync(path.join(projectPath, 'setup.py')) ||
                           fs.readdirSync(projectPath).some(file => file.endsWith('.py'));
                           
    const hasRustFiles = fs.existsSync(path.join(projectPath, 'Cargo.toml')) ||
                         fs.readdirSync(projectPath).some(file => file.endsWith('.rs'));
    
    // Process based on detected language
    if (hasPythonFiles) {
      // Parse Python project
      const pythonProject = await parsePythonProject(projectPath);
      
      // Save the parsed project data
      fs.writeFileSync(
        path.join(projectDir, 'project-data.json'),
        JSON.stringify(pythonProject, null, 2)
      );
      
      // Convert to graph data and save
      const graphData = convertPythonToGraphData(pythonProject);
      fs.writeFileSync(
        path.join(projectDir, 'graph-data.json'),
        JSON.stringify(graphData, null, 2)
      );
      
      // Update metadata to include language
      metadata.language = 'python';
      fs.writeFileSync(
        path.join(projectDir, 'metadata.json'),
        JSON.stringify(metadata, null, 2)
      );
    } else if (hasRustFiles) {
      // Parse Rust project
      const rustProject = await parseRustProject(projectPath);
      
      // Save the parsed project data
      fs.writeFileSync(
        path.join(projectDir, 'project-data.json'),
        JSON.stringify(rustProject, null, 2)
      );
      
      // Convert to graph data and save
      const graphData = convertToGraphData(rustProject);
      fs.writeFileSync(
        path.join(projectDir, 'graph-data.json'),
        JSON.stringify(graphData, null, 2)
      );
      
      // Update metadata to include language
      metadata.language = 'rust';
      fs.writeFileSync(
        path.join(projectDir, 'metadata.json'),
        JSON.stringify(metadata, null, 2)
      );
    } else {
      // Default to Rust processing if language can't be determined
      const rustProject = await parseRustProject(projectPath);
      
      fs.writeFileSync(
        path.join(projectDir, 'project-data.json'),
        JSON.stringify(rustProject, null, 2)
      );
      
      const graphData = convertToGraphData(rustProject);
      fs.writeFileSync(
        path.join(projectDir, 'graph-data.json'),
        JSON.stringify(graphData, null, 2)
      );
    }
    
    return NextResponse.json({
      success: true,
      projectId,
      name: projectName,
      message: `Project uploaded and processed successfully`
    });
  } catch (error) {
    console.error('Error processing project:', error);
    return NextResponse.json({ 
      error: 'Failed to process project',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const language = searchParams.get('language');
    
    if (projectId) {
      // Return data for a specific project
      const projectDir = path.join(PROJECTS_DIR, projectId);
      
      if (!fs.existsSync(projectDir)) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }
      
      // Check if graph data exists with language-specific filename
      let graphDataPath = path.join(projectDir, 'graph-data.json');
      
      // If language is specified, try to use language-specific data
      if (language) {
        const langSpecificPath = path.join(projectDir, `graph-data-${language}.json`);
        if (fs.existsSync(langSpecificPath)) {
          graphDataPath = langSpecificPath;
        }
      }
      
      if (fs.existsSync(graphDataPath)) {
        const graphData = JSON.parse(fs.readFileSync(graphDataPath, 'utf8'));
        return NextResponse.json(graphData);
      } else {
        // If graph data doesn't exist, check if project data exists
        const projectDataPath = path.join(projectDir, 'project-data.json');
        
        if (fs.existsSync(projectDataPath)) {
          const projectData = JSON.parse(fs.readFileSync(projectDataPath, 'utf8'));
          
          // Check metadata for language
          const metadataPath = path.join(projectDir, 'metadata.json');
          let graphData;
          
          if (fs.existsSync(metadataPath)) {
            const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
            const dataLanguage = language || metadata.language || 'rust';
            
            if (dataLanguage === 'python') {
              graphData = convertPythonToGraphData(projectData);
              
              // Save language-specific graph data for future requests
              const pythonGraphPath = path.join(projectDir, 'graph-data-python.json');
              fs.writeFileSync(pythonGraphPath, JSON.stringify(graphData, null, 2));
            } else {
              // Default to Rust
              graphData = convertToGraphData(projectData);
              
              // Save language-specific graph data for future requests
              const rustGraphPath = path.join(projectDir, 'graph-data-rust.json');
              fs.writeFileSync(rustGraphPath, JSON.stringify(graphData, null, 2));
            }
          } else {
            // Fallback to Rust if no metadata
            graphData = convertToGraphData(projectData);
          }
          
          // Save the graph data for future requests (language-agnostic version)
          fs.writeFileSync(graphDataPath, JSON.stringify(graphData, null, 2));
          
          return NextResponse.json(graphData);
        } else {
          // If neither graph data nor project data exists, parse the project
          const metadataPath = path.join(projectDir, 'metadata.json');
          
          if (fs.existsSync(metadataPath)) {
            const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
            const rustProject = await parseRustProject(metadata.path);
            
            // Save the project data
            fs.writeFileSync(
              path.join(projectDir, 'project-data.json'),
              JSON.stringify(rustProject, null, 2)
            );
            
            // Convert and save the graph data
            const graphData = convertToGraphData(rustProject);
            fs.writeFileSync(
              path.join(projectDir, 'graph-data.json'),
              JSON.stringify(graphData, null, 2)
            );
            
            return NextResponse.json(graphData);
          } else {
            return NextResponse.json({ error: 'Project metadata not found' }, { status: 404 });
          }
        }
      }
    } else {
      // Return a list of all projects
      const projects = [];
      
      // List all project directories
      const projectDirs = fs.readdirSync(PROJECTS_DIR);
      
      for (const dir of projectDirs) {
        const metadataPath = path.join(PROJECTS_DIR, dir, 'metadata.json');
        
        if (fs.existsSync(metadataPath)) {
          const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
          projects.push({
            id: metadata.id,
            name: metadata.name,
            type: metadata.type,
            timestamp: metadata.timestamp
          });
        }
      }
      
      return NextResponse.json({ projects });
    }
  } catch (error) {
    console.error('Error retrieving project data:', error);
    return NextResponse.json({ 
      error: 'Failed to retrieve project data',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
