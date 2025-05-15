import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

// Base directory for project storage
const PROJECTS_DIR = path.join(process.cwd(), 'projects');

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }
    
    const projectDir = path.join(PROJECTS_DIR, projectId);
    
    if (!fs.existsSync(projectDir)) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    
    // Read the metadata file
    const metadataPath = path.join(projectDir, 'metadata.json');
    
    if (!fs.existsSync(metadataPath)) {
      // Create default metadata if it doesn't exist
      const defaultMetadata = {
        id: projectId,
        name: path.basename(projectDir),
        path: projectDir,
        timestamp: Date.now(),
        language: 'rust' // Default to Rust for backward compatibility
      };
      
      return NextResponse.json(defaultMetadata);
    }
    
    // Return the metadata
    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
    return NextResponse.json(metadata);
  } catch (error) {
    console.error('Error fetching project metadata:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch project metadata',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}