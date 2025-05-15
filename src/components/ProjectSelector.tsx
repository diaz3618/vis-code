'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { UploadedProject } from '@/types/rust-types';

interface ProjectSelectorProps {
  onSelectProject: (projectId: string) => void;
}

const ProjectSelector: React.FC<ProjectSelectorProps> = ({ onSelectProject }) => {
  const [projects, setProjects] = useState<UploadedProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Load the list of available projects
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/api/projects');
        setProjects(response.data.projects || []);
        setError(null);
      } catch (err) {
        console.error('Error fetching projects:', err);
        setError('Failed to load projects. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchProjects();
  }, []);
  
  // Format the timestamp to a readable date
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Handle project selection
  const handleProjectSelect = (projectId: string) => {
    onSelectProject(projectId);
  };
  
  if (loading) {
    return (
      <div className="w-full py-20 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800"></div>
        <p className="mt-4 text-gray-600">Loading projects...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="w-full py-8 text-center">
        <div className="bg-red-100 text-red-700 p-4 rounded-lg inline-block">
          <p>{error}</p>
          <button
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }
  
  if (projects.length === 0) {
    return (
      <div className="w-full py-8 text-center">
        <p className="text-gray-600">No projects available. Upload a project to get started.</p>
      </div>
    );
  }
  
  return (
    <div className="w-full">
      <h2 className="text-xl font-semibold mb-4">Your Projects</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((project) => (
          <div
            key={project.id}
            className="border rounded-lg overflow-hidden hover:shadow-md transition cursor-pointer"
            onClick={() => handleProjectSelect(project.id)}
          >
            <div className="p-4">
              <div className="flex items-center">
                <div className="mr-3">
                  {project.type === 'git' ? (
                    <svg className="w-6 h-6 text-gray-700" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M2.6,10.59L8.38,4.8l1.69,1.7c-0.24,0.85-0.15,1.78,0.32,2.47L9.96,10.4l2.78-2.79c0.68,0.47,1.62,0.56,2.47,0.32 l1.7,1.69l-5.79,5.79c-0.39,0.39-0.39,1.02,0,1.41l2.12,2.12c0.39,0.39,1.02,0.39,1.41,0l5.79-5.79l1.7,1.69 c-0.24,0.85-0.15,1.78,0.32,2.47l1.43-1.43c0.47,0.68,0.56,1.62,0.32,2.47l1.7,1.69l-5.79,5.79c-0.39,0.39-1.02,0.39-1.41,0 l-2.12-2.12c-0.39-0.39-0.39-1.02,0-1.41L20.3,18.7c-0.85,0.24-1.78,0.15-2.47-0.32l-1.43,1.43c-0.68-0.47-1.62-0.56-2.47-0.32 l-1.69-1.7l-5.79,5.79c-0.39,0.39-1.02,0.39-1.41,0l-2.12-2.12c-0.39-0.39-0.39-1.02,0-1.41l5.8-5.79 c-0.85-0.24-1.78-0.15-2.47-0.32l-1.43,1.43c-0.47-0.68-0.56-1.62-0.32-2.47l-1.7-1.69l5.79-5.79c0.39-0.39,1.02-0.39,1.41,0 l2.12,2.12c0.39,0.39,0.39,1.02,0,1.41l-5.8,5.79c0.85,0.24,1.78,0.15,2.47,0.32l1.43-1.43C3.16,12.21,3.25,11.27,2.6,10.59z" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6 text-gray-700" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20,6h-8l-2-2H4C2.9,4,2,4.9,2,6v12c0,1.1,0.9,2,2,2h16c1.1,0,2-0.9,2-2V8C22,6.9,21.1,6,20,6z M20,18H4V8h16V18z" />
                    </svg>
                  )}
                </div>
                
                <div>
                  <h3 className="font-semibold text-gray-800">{project.name}</h3>
                  <p className="text-sm text-gray-500">
                    {project.type === 'git' ? 'Git Repository' : 'Uploaded Project'}
                  </p>
                </div>
              </div>
              
              <p className="mt-3 text-xs text-gray-500">
                Added {formatDate(project.date)}
              </p>
            </div>
            
            <div className="bg-gray-50 px-4 py-2 border-t">
              <button className="text-sm text-blue-600 hover:text-blue-800">
                Visualize
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProjectSelector;
