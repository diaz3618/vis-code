'use client';

import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';

type UploadMethod = 'file' | 'git';

export default function ProjectUploader({ onUploadComplete }: { onUploadComplete: (projectId: string) => void }) {
  const [uploadMethod, setUploadMethod] = useState<UploadMethod>('file');
  const [gitUrl, setGitUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [progress, setProgress] = useState(0);
  
  // Handle file drop for zip uploads
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/zip': ['.zip'],
      'application/x-zip-compressed': ['.zip']
    },
    multiple: false,
    disabled: isUploading || uploadMethod !== 'file',
    onDrop: async (acceptedFiles) => {
      if (acceptedFiles.length === 0) return;
      
      const file = acceptedFiles[0];
      await uploadProject(file);
    }
  });
  
  // Handle Git repository clone
  const handleGitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!gitUrl) {
      setErrorMessage('Please enter a Git repository URL');
      return;
    }
    
    await uploadProject(null);
  };
  
  // Common upload handler for both methods
  const uploadProject = async (file: File | null) => {
    setIsUploading(true);
    setErrorMessage('');
    setProgress(0);
    
    try {
      const formData = new FormData();
      formData.append('type', uploadMethod);
      
      if (uploadMethod === 'file' && file) {
        formData.append('file', file);
      } else if (uploadMethod === 'git') {
        formData.append('gitUrl', gitUrl);
      }
      
      const response = await axios.post('/api/projects', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setProgress(percentCompleted);
          }
        }
      });
      
      if (response.data.success) {
        onUploadComplete(response.data.projectId);
      } else {
        setErrorMessage(response.data.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };
  
  return (
    <div className="w-full max-w-3xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-center">Upload or Clone a Project</h2>
      <p className="text-center text-gray-600 mb-4">Supports Rust and Python projects</p>
      
      {/* Upload Method Selection */}
      <div className="flex mb-6 border rounded overflow-hidden">
        <button
          className={`flex-1 py-3 px-4 text-center ${uploadMethod === 'file' ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
          onClick={() => setUploadMethod('file')}
          disabled={isUploading}
        >
          Upload ZIP File
        </button>
        <button
          className={`flex-1 py-3 px-4 text-center ${uploadMethod === 'git' ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
          onClick={() => setUploadMethod('git')}
          disabled={isUploading}
        >
          Clone Git Repository
        </button>
      </div>
      
      {/* File Upload Dropzone */}
      {uploadMethod === 'file' && (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'
          } ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <input {...getInputProps()} />
          <svg
            className="w-16 h-16 mx-auto mb-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          <p className="mb-2 text-lg font-semibold">
            {isDragActive ? 'Drop the ZIP file here' : 'Drag & drop a ZIP file here, or click to browse'}
          </p>
          <p className="text-sm text-gray-500">
            Upload a ZIP file containing a Rust project (max size: 50MB)
          </p>
        </div>
      )}
      
      {/* Git Repository Form */}
      {uploadMethod === 'git' && (
        <form onSubmit={handleGitSubmit} className="space-y-4">
          <div>
            <label htmlFor="gitUrl" className="block mb-2 text-sm font-medium text-gray-700">
              Git Repository URL
            </label>
            <input
              type="text"
              id="gitUrl"
              placeholder="https://github.com/username/repository.git"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={gitUrl}
              onChange={(e) => setGitUrl(e.target.value)}
              disabled={isUploading}
              required
            />
            <p className="mt-1 text-sm text-gray-500">
              Enter the URL of a public Git repository containing a Rust project
            </p>
          </div>
          <button
            type="submit"
            className="w-full py-3 px-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400"
            disabled={isUploading || !gitUrl}
          >
            {isUploading ? 'Cloning Repository...' : 'Clone Repository'}
          </button>
        </form>
      )}
      
      {/* Progress Bar */}
      {isUploading && (
        <div className="mt-6">
          <p className="text-sm font-medium text-gray-700 mb-1">
            {uploadMethod === 'file' ? 'Uploading and Processing...' : 'Cloning and Processing...'}
          </p>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-blue-500 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {progress}% - This may take a while for large projects
          </p>
        </div>
      )}
      
      {/* Error Messages */}
      {errorMessage && (
        <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-lg">
          <p>{errorMessage}</p>
        </div>
      )}
    </div>
  );
}
