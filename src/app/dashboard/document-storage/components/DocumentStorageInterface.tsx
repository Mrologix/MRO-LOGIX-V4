"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Cloud, 
  Upload, 
  FolderPlus, 
  Search, 
  MoreVertical,
  Folder,
  Download,
  Trash2,
  Edit3,
  Eye,
  Share2,
  Grid3X3,
  List,
  ArrowLeft,
  Home,
  ChevronRight,
  FileText,
  Image,
  Video,
  Music,
  Archive,
  Loader2
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";

interface DocumentFile {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  description?: string;
  isShared: boolean;
  isPublic: boolean;
  downloadCount: number;
  lastAccessedAt?: string;
}

interface DocumentFolder {
  id: string;
  name: string;
  parentId?: string;
  path: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  children?: DocumentFolder[];
  files: DocumentFile[];
  _count: {
    files: number;
    children: number;
  };
}

interface StorageData {
  folders: DocumentFolder[];
  rootFiles: DocumentFile[];
  userId: string;
}

interface UploadProgress {
  progress: number;
  loaded: number;
  total: number;
  speed: number;
  startTime: number;
}

interface UploadResult {
  success: boolean;
  fileName: string;
}

// Maximum upload size limit (250MB in bytes)
const MAX_UPLOAD_SIZE_BYTES = 250 * 1024 * 1024;

const DocumentStorageInterface = () => {
  const [storageData, setStorageData] = useState<StorageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [currentFolder, setCurrentFolder] = useState<DocumentFolder | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [uploading, setUploading] = useState(false);
  
  // Dialog states
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [uploadFilesOpen, setUploadFilesOpen] = useState(false);
  
  // Form states
  const [folderName, setFolderName] = useState('');
  const [folderDescription, setFolderDescription] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [uploadTags, setUploadTags] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  
  // Upload progress tracking
  const [uploadProgress, setUploadProgress] = useState<{[key: string]: UploadProgress}>({});
  const [completedUploads, setCompletedUploads] = useState<Set<string>>(new Set());
  const [failedUploads, setFailedUploads] = useState<Set<string>>(new Set());
  const [uploadXHRs, setUploadXHRs] = useState<{[key: string]: XMLHttpRequest}>({});
  
  // Total size calculation for selected files
  const [totalUploadSize, setTotalUploadSize] = useState<number>(0);
  const [sizeExceeded, setSizeExceeded] = useState<boolean>(false);

  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());

  const fetchStorageData = useCallback(async () => {
    try {
      setLoading(true);
      console.log('Fetching storage data...');
      const response = await fetch('/api/document-storage', {
        credentials: 'include'
      });
      console.log('Storage data response status:', response.status);
      const data = await response.json();
      console.log('Storage data response:', data);
      
      if (data.success) {
        setStorageData(data.data);
      } else {
        console.error('Storage data error:', data.message);
        toast.error(data.message || 'Failed to load storage data');
      }
    } catch (error) {
      console.error('Error fetching storage data:', error);
      toast.error('Failed to load storage data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStorageData();
  }, [fetchStorageData]);

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return Image;
    if (fileType.startsWith('video/')) return Video;
    if (fileType.startsWith('audio/')) return Music;
    if (fileType.includes('zip') || fileType.includes('rar') || fileType.includes('tar')) return Archive;
    return FileText;
  };
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const calculateFolderSize = (folder: DocumentFolder): number => {
    // Calculate size of all files in this folder
    let totalSize = folder.files.reduce((sum, file) => sum + file.fileSize, 0);
    
    // Recursively calculate size of all subfolders
    if (folder.children) {
      totalSize += folder.children.reduce((sum, childFolder) => sum + calculateFolderSize(childFolder), 0);
    }
    
    return totalSize;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const navigateToFolder = (folder: DocumentFolder) => {
    const pathElements = folder.path.split('/').filter(Boolean);
    setCurrentPath(pathElements);
    setCurrentFolder(folder);
  };

  const navigateUp = () => {
    if (currentPath.length === 0) return;
    
    const parentPath = currentPath.slice(0, -1);
    setCurrentPath(parentPath);
    
    if (parentPath.length === 0) {
      setCurrentFolder(null);
    } else {
      // Find parent folder
      const parentFolder = findFolderByPath(parentPath.join('/'));
      setCurrentFolder(parentFolder);
    }
  };

  const navigateToRoot = () => {
    setCurrentPath([]);
    setCurrentFolder(null);
  };

  const findFolderByPath = (path: string): DocumentFolder | null => {
    if (!storageData) return null;
    
    const pathParts = path.split('/').filter(Boolean);
    let currentFolders = storageData.folders;
    
    for (const part of pathParts) {
      const folder = currentFolders.find(f => f.name === part && !f.parentId);
      if (!folder) return null;
      if (folder.children) {
        currentFolders = folder.children;
      }
    }
    
    return currentFolders.find(f => f.name === pathParts[pathParts.length - 1]) || null;
  };

  const getCurrentItems = () => {
    if (!storageData) return { folders: [], files: [] };
    
    if (currentFolder) {
      return {
        folders: currentFolder.children || [],
        files: currentFolder.files || []
      };
    } else {
      // Root level
      return {
        folders: storageData.folders.filter(f => !f.parentId),
        files: storageData.rootFiles
      };
    }
  };

  const handleCreateFolder = async () => {
    if (!folderName.trim()) {
      toast.error('Folder name is required');
      return;
    }

    try {
      console.log('Creating folder...');
      const response = await fetch('/api/document-storage/folders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          name: folderName,
          parentId: currentFolder?.id || null,
          description: folderDescription || null
        }),
      });
      console.log('Create folder response status:', response.status);
      const data = await response.json();
      console.log('Create folder response:', data);

      if (data.success) {
        toast.success('Folder created successfully');
        setCreateFolderOpen(false);
        setFolderName('');
        setFolderDescription('');
        fetchStorageData();
      } else {
        console.error('Create folder error:', data.message);
        toast.error(data.message || 'Failed to create folder');
      }
    } catch {
      console.error('Error creating folder');
      toast.error('Failed to create folder');
    }
  };

  const formatSpeed = (bytesPerSecond: number) => {
    if (bytesPerSecond === 0) return '0 B/s';
    const k = 1024;
    const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
    const i = Math.floor(Math.log(bytesPerSecond) / Math.log(k));
    return parseFloat((bytesPerSecond / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleCancelUpload = async (fileId: string) => {
    const xhr = uploadXHRs[fileId];
    if (xhr) {
      xhr.abort();
      // Clean up the uploaded file if it was partially uploaded
      try {
        const fileName = fileId.split('-')[0];
        const response = await fetch(`/api/document-storage/files/cleanup`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ fileName }),
        });
        if (!response.ok) {
          console.error('Failed to cleanup partial upload');
        }
      } catch (error) {
        console.error('Error cleaning up partial upload:', error);
      }
    }
  };

  const handleCancelAllUploads = async () => {
    // Cancel all ongoing uploads
    Object.keys(uploadXHRs).forEach(fileId => {
      handleCancelUpload(fileId);
    });
    
    // Reset all states
    setUploadProgress({});
    setCompletedUploads(new Set());
    setFailedUploads(new Set());
    setUploadXHRs({});
    setUploading(false);
    setUploadFilesOpen(false);
  };

  const handleUploadFiles = async () => {
    if (!selectedFiles || selectedFiles.length === 0) {
      toast.error('Please select files to upload');
      return;
    }

    // Calculate total size of selected files
    const filesArray = Array.from(selectedFiles);
    const totalSize = filesArray.reduce((sum, file) => sum + file.size, 0);
    setTotalUploadSize(totalSize);

    // Check if total size exceeds the limit
    if (totalSize > MAX_UPLOAD_SIZE_BYTES) {
      setSizeExceeded(true);
      toast.error('Total upload size exceeds the 250MB limit');
      return;
    } else {
      setSizeExceeded(false);
    }

    try {
      setUploading(true);
      
      // Reset progress tracking
      setUploadProgress({});
      setCompletedUploads(new Set());
      setFailedUploads(new Set());
      setUploadXHRs({});
      
      console.log('Uploading files...');
        const files = Array.from(selectedFiles);
      const uploadPromises = files.map((file, index) => {
        return new Promise<UploadResult>((resolve, reject) => {
          const fileId = `${file.name}-${index}`;
          const startTime = Date.now();
          
          // Initialize progress for this file
          setUploadProgress(prev => ({ 
            ...prev, 
            [fileId]: {
              progress: 0,
              loaded: 0,
              total: file.size,
              speed: 0,
              startTime
            }
          }));
          
          const xhr = new XMLHttpRequest();
          setUploadXHRs(prev => ({ ...prev, [fileId]: xhr }));
          
          const formData = new FormData();
          formData.append('files', file);
          
          if (currentFolder?.id) {
            formData.append('folderId', currentFolder.id);
          }
          
          if (uploadTags.trim()) {
            formData.append('tags', JSON.stringify(uploadTags.split(',').map(tag => tag.trim())));
          }
          
          if (uploadDescription.trim()) {
            formData.append('description', uploadDescription);
          }

          let lastLoaded = 0;
          let lastTime = startTime;

          xhr.upload.addEventListener('progress', (event) => {
            if (event.lengthComputable) {
              const currentTime = Date.now();
              const timeDiff = (currentTime - lastTime) / 1000; // in seconds
              const loadedDiff = event.loaded - lastLoaded;
              const speed = timeDiff > 0 ? loadedDiff / timeDiff : 0;

              setUploadProgress(prev => ({
                ...prev,
                [fileId]: {
                  progress: (event.loaded / event.total) * 100,
                  loaded: event.loaded,
                  total: event.total,
                  speed,
                  startTime
                }
              }));

              lastLoaded = event.loaded;
              lastTime = currentTime;
            }
          });

          xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                const data = JSON.parse(xhr.responseText);
                if (data.success) {
                  setUploadProgress(prev => ({
                    ...prev,
                    [fileId]: {
                      ...prev[fileId],
                      progress: 100,
                      speed: 0
                    }
                  }));
                  setCompletedUploads(prev => new Set([...prev, fileId]));
                  resolve({ success: true, fileName: file.name });
                } else {
                  setFailedUploads(prev => new Set([...prev, fileId]));
                  reject(new Error(data.message || 'Upload failed'));
                }
              } catch {
                setFailedUploads(prev => new Set([...prev, fileId]));
                reject(new Error('Failed to parse server response'));
              }
            } else {
              setFailedUploads(prev => new Set([...prev, fileId]));
              reject(new Error(`Upload failed with status ${xhr.status}`));
            }
          });

          xhr.addEventListener('error', () => {
            setFailedUploads(prev => new Set([...prev, fileId]));
            reject(new Error('Network error occurred'));
          });

          xhr.addEventListener('abort', () => {
            setFailedUploads(prev => new Set([...prev, fileId]));
            reject(new Error('Upload was aborted'));
          });

          xhr.open('POST', '/api/document-storage/files');
          xhr.send(formData);
        });
      });

      const results = await Promise.all(uploadPromises);
      const successCount = results.filter(r => r.success).length;
      const failureCount = results.filter(r => !r.success).length;
      
      if (successCount > 0) {
        toast.success(`${successCount} file(s) uploaded successfully${failureCount > 0 ? ` (${failureCount} failed)` : ''}`);
        fetchStorageData();
      }
      
      if (failureCount > 0) {
        toast.error(`${failureCount} file(s) failed to upload`);
      }
      
      // Reset form after a short delay to show completion
      setTimeout(() => {
        setUploadFilesOpen(false);
        setSelectedFiles(null);
        setUploadTags('');
        setUploadDescription('');
        setUploadProgress({});
        setCompletedUploads(new Set());
        setFailedUploads(new Set());
      }, 2000);
      
    } catch (error) {
      console.error('Error uploading files:', error instanceof Error ? error.message : 'Unknown error');
      toast.error(`Failed to upload files: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadFile = async (file: DocumentFile) => {
    try {
      const response = await fetch(`/api/document-storage/files/${file.id}/download`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = file.fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('File downloaded successfully');
      } else {
        const data = await response.json();
        toast.error(data.message || 'Failed to download file');
      }
    } catch (error) {
      console.error('Error downloading file:', error instanceof Error ? error.message : 'Unknown error');
      toast.error('Failed to download file');
    }
  };

  const handleDeleteItem = async (item: DocumentFile | DocumentFolder, isFolder: boolean) => {
    if (!confirm(`Are you sure you want to delete this ${isFolder ? 'folder' : 'file'}?`)) {
      return;
    }

    try {
      const endpoint = isFolder 
        ? `/api/document-storage/folders/${item.id}`
        : `/api/document-storage/files/${item.id}`;

      const response = await fetch(endpoint, {
        method: 'DELETE',
        credentials: 'include'
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`${isFolder ? 'Folder' : 'File'} deleted successfully`);
        fetchStorageData();
      } else {
        toast.error(data.message || `Failed to delete ${isFolder ? 'folder' : 'file'}`);
      }
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error(`Failed to delete ${isFolder ? 'folder' : 'file'}`);
    }
  };

  const { folders, files } = getCurrentItems();

  // Helper for select all
  const allFileIds = files.map((file) => file.id);
  const isAllSelected = allFileIds.length > 0 && allFileIds.every((id) => selectedFileIds.has(id));
  const isIndeterminate = selectedFileIds.size > 0 && !isAllSelected;
  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedFileIds(new Set());
    } else {
      setSelectedFileIds(new Set(allFileIds));
    }
  };
  const handleFileCheckbox = (fileId: string) => {
    setSelectedFileIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(fileId)) {
        newSet.delete(fileId);
      } else {
        newSet.add(fileId);
      }
      return newSet;
    });
  };
  const handleBulkDelete = async () => {
    if (selectedFileIds.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedFileIds.size} selected file(s)?`)) return;
    try {
      for (const fileId of selectedFileIds) {
        await fetch(`/api/document-storage/files/${fileId}`, {
          method: 'DELETE',
          credentials: 'include',
        });
      }
      toast.success(`${selectedFileIds.size} file(s) deleted successfully`);
      setSelectedFileIds(new Set());
      fetchStorageData();
    } catch (error) {
      console.error('Error deleting files:', error instanceof Error ? error.message : 'Unknown error');
      toast.error(`Failed to delete selected files: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <Card className="w-full">
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Cloud className="h-6 w-6 text-blue-600" />
              <h1 className="text-2xl font-bold">Document Storage</h1>
              <Badge variant="secondary" className="ml-2">
                Cloud Storage
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Actions Bar */}
      <Card>
        <div className="p-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Dialog open={createFolderOpen} onOpenChange={setCreateFolderOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <FolderPlus className="h-4 w-4 mr-2" />
                    New Folder
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Folder</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="folderName">Folder Name</Label>
                      <Input
                        id="folderName"
                        value={folderName}
                        onChange={(e) => setFolderName(e.target.value)}
                        placeholder="Enter folder name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="folderDescription">Description (Optional)</Label>
                      <Textarea
                        id="folderDescription"
                        value={folderDescription}
                        onChange={(e) => setFolderDescription(e.target.value)}
                        placeholder="Enter folder description"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setCreateFolderOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateFolder}>Create Folder</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog open={uploadFilesOpen} onOpenChange={setUploadFilesOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Files
                  </Button>
                </DialogTrigger>                <DialogContent className="!max-w-[95vw] !w-[95vw] sm:!max-w-[95vw] max-h-[95vh]">
                  <DialogHeader>
                    <DialogTitle>Upload Files</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>                      <Label htmlFor="fileInput">Select Files</Label>
                      <Input
                        id="fileInput"
                        type="file"
                        multiple
                        onChange={(e) => {
                          const files = e.target.files;
                          setSelectedFiles(files);
                          
                          // Calculate total size of selected files
                          if (files && files.length > 0) {
                            const totalSize = Array.from(files).reduce((sum, file) => sum + file.size, 0);
                            setTotalUploadSize(totalSize);
                            setSizeExceeded(totalSize > MAX_UPLOAD_SIZE_BYTES);
                          } else {
                            setTotalUploadSize(0);
                            setSizeExceeded(false);
                          }                        }}
                        disabled={uploading}
                      />
                      {selectedFiles && selectedFiles.length > 0 && (
                        <div className="mt-2">
                          <p className="text-sm">
                            Total size: <span className={sizeExceeded ? "text-red-500 font-bold" : ""}>{formatFileSize(totalUploadSize)}</span> 
                            {sizeExceeded && (
                              <span className="text-red-500 ml-2 font-bold">
                                Size limit exceeded! Maximum allowed: {formatFileSize(MAX_UPLOAD_SIZE_BYTES)}
                              </span>
                            )}
                          </p>
                          {sizeExceeded && (
                            <p className="text-sm text-red-500 mt-1">
                              Please reduce the total file size to continue with the upload.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="uploadTags">Tags (Optional)</Label>
                      <Input
                        id="uploadTags"
                        value={uploadTags}
                        onChange={(e) => setUploadTags(e.target.value)}
                        placeholder="Enter tags separated by commas"
                        disabled={uploading}
                      />
                    </div>
                    <div>
                      <Label htmlFor="uploadDescription">Description (Optional)</Label>
                      <Textarea
                        id="uploadDescription"
                        value={uploadDescription}
                        onChange={(e) => setUploadDescription(e.target.value)}
                        placeholder="Enter file description"
                        disabled={uploading}
                      />
                    </div>
                      {/* Upload Progress Section */}
                    {uploading && selectedFiles && (
                      <div className="space-y-3">
                        <div className="border-t pt-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-medium">Upload Progress</h4>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">
                                {completedUploads.size + failedUploads.size} of {selectedFiles.length} files
                              </span>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={handleCancelAllUploads}
                                className="h-7 px-2 text-xs"
                              >
                                Cancel All
                              </Button>
                            </div>
                          </div>
                          
                          {/* Overall Progress Bar */}
                          <div className="mb-4">
                            <Progress 
                              value={(completedUploads.size + failedUploads.size) / selectedFiles.length * 100} 
                              className="h-3"
                            />
                          </div>
                          
                          <div className="space-y-3 max-h-48 overflow-y-auto">
                            {Array.from(selectedFiles).map((file, index) => {
                              const fileId = `${file.name}-${index}`;
                              const progressData = uploadProgress[fileId] || { progress: 0, loaded: 0, total: file.size, speed: 0, startTime: Date.now() };
                              const isCompleted = completedUploads.has(fileId);
                              const isFailed = failedUploads.has(fileId);
                              
                              return (
                                <div key={fileId} className="space-y-1">
                                  <div className="flex items-center justify-between text-sm">
                                    <div className="flex-1 mr-2 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <span className="truncate" title={file.name}>
                                          {file.name}
                                        </span>
                                        {!isCompleted && !isFailed && (
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleCancelUpload(fileId)}
                                            className="h-6 w-6 p-0"
                                          >
                                            <Trash2 className="h-3 w-3" />
                                          </Button>
                                        )}
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        {formatFileSize(progressData.loaded)} / {formatFileSize(progressData.total)}
                                        {!isCompleted && !isFailed && progressData.speed > 0 && (
                                          <span className="ml-2">• {formatSpeed(progressData.speed)}</span>
                                        )}
                                      </div>
                                    </div>
                                    <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                                      {isCompleted ? (
                                        <span className="text-green-600">✓ Complete</span>
                                      ) : isFailed ? (
                                        <span className="text-red-600">✗ Failed</span>
                                      ) : (
                                        `${Math.round(progressData.progress)}%`
                                      )}
                                    </span>
                                  </div>
                                  <Progress 
                                    value={progressData.progress} 
                                    className={`h-2 ${
                                      isCompleted ? '[&>div]:bg-green-500' : 
                                      isFailed ? '[&>div]:bg-red-500' : '[&>div]:bg-blue-500'
                                    }`}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <DialogFooter>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        if (!uploading) {
                          setUploadFilesOpen(false);
                          setSelectedFiles(null);
                          setUploadTags('');
                          setUploadDescription('');
                          setUploadProgress({});
                          setCompletedUploads(new Set());
                          setFailedUploads(new Set());
                        }                      }}
                      disabled={uploading}
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleUploadFiles} 
                      disabled={uploading || sizeExceeded || !selectedFiles || selectedFiles.length === 0}
                      title={sizeExceeded ? "Total file size exceeds the maximum limit of 250MB" : ""}
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        'Upload Files'
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search files and folders..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Breadcrumb Navigation */}
      <Card>
        <div className="p-4">
          <div className="flex items-center justify-between">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink
                    onClick={navigateToRoot}
                    className="cursor-pointer flex items-center gap-1"
                  >
                    <Home className="h-4 w-4" />
                    Home
                  </BreadcrumbLink>
                </BreadcrumbItem>
                {currentPath.map((pathPart, index) => (
                  <React.Fragment key={index}>
                    <BreadcrumbSeparator>
                      <ChevronRight className="h-4 w-4" />
                    </BreadcrumbSeparator>
                    <BreadcrumbItem>
                      {index === currentPath.length - 1 ? (
                        <BreadcrumbPage>{pathPart}</BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink
                          onClick={() => {
                            // Navigate to this path
                            const targetPath = currentPath.slice(0, index + 1);
                            setCurrentPath(targetPath);
                            const targetFolder = findFolderByPath(targetPath.join('/'));
                            setCurrentFolder(targetFolder);
                          }}
                          className="cursor-pointer"
                        >
                          {pathPart}
                        </BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                  </React.Fragment>
                ))}
              </BreadcrumbList>
            </Breadcrumb>
            
            {currentPath.length > 0 && (
              <Button variant="outline" size="sm" onClick={navigateUp}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Content Area */}
      <Card>
        <div className="p-6">
          {folders.length === 0 && files.length === 0 ? (
            <div className="text-center py-12">
              <Cloud className="h-16 w-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No items found</h3>
              <p className="text-gray-500 mb-4">
                {currentFolder ? 'This folder is empty' : 'Your storage is empty'}
              </p>
              <div className="flex justify-center gap-2">
                <Button onClick={() => setCreateFolderOpen(true)}>
                  <FolderPlus className="h-4 w-4 mr-2" />
                  Create Folder
                </Button>
                <Button variant="outline" onClick={() => setUploadFilesOpen(true)}>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Files
                </Button>
              </div>
            </div>
          ) : (
            <>              <div className="flex items-center gap-3 mb-3 px-1">
                <Checkbox
                  checked={isIndeterminate ? "indeterminate" : isAllSelected}
                  onCheckedChange={handleSelectAll}
                  id="select-all-files"
                  className="h-4 w-4"
                />
                <label htmlFor="select-all-files" className="text-sm select-none cursor-pointer text-gray-700">
                  Select All
                </label>
                {selectedFileIds.size > 0 && (
                  <>
                    <span className="text-sm text-gray-500">
                      ({selectedFileIds.size} selected)
                    </span>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleBulkDelete}
                      className="h-7 px-3 text-xs"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Delete Selected
                    </Button>
                  </>
                )}
              </div>              <div className={viewMode === 'grid' ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-9 gap-2' : 'space-y-1'}>
                {/* Folders */}
                {folders.map((folder) => {
                  const folderSize = calculateFolderSize(folder);
                  return (
                    <div
                      key={folder.id}                      className={`${
                        viewMode === 'grid'
                          ? 'p-2 border rounded-md hover:bg-blue-50 hover:border-blue-200 cursor-pointer group flex flex-col items-center transition-all duration-200 min-h-[90px]'
                          : 'flex items-center justify-between p-2 border rounded-md hover:bg-blue-50 hover:border-blue-200 cursor-pointer group transition-all duration-200'
                      }`}
                    >
                      <div
                        className={`${viewMode === 'grid' ? 'flex flex-col items-center space-y-2 w-full' : 'flex items-center gap-3 flex-1'}`}
                        onClick={() => navigateToFolder(folder)}
                      >                        <div className={`${viewMode === 'grid' ? 'flex justify-center' : ''}`}>
                          <Folder className={`${viewMode === 'grid' ? 'h-7 w-7' : 'h-5 w-5'} text-blue-600`} />
                        </div>                        <div className={`${viewMode === 'grid' ? 'text-center w-full' : ''}`}>
                          <p className={`font-medium truncate ${viewMode === 'grid' ? 'text-xs leading-tight' : 'text-sm'}`} title={folder.name}>
                            {folder.name}
                          </p>
                          <p className={`text-gray-500 ${viewMode === 'grid' ? 'text-xs leading-tight' : 'text-xs'}`}>
                            {folder._count.files} file{folder._count.files !== 1 ? 's' : ''}
                            {folder._count.children > 0 && `, ${folder._count.children} folder${folder._count.children !== 1 ? 's' : ''}`}
                          </p>
                          <p className={`text-gray-400 ${viewMode === 'grid' ? 'text-xs leading-tight' : 'text-xs'}`}>
                            {formatFileSize(folderSize)}
                          </p>
                          {viewMode === 'list' && (
                            <p className="text-xs text-gray-400">{formatDate(folder.createdAt)}</p>
                          )}
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className={`opacity-0 group-hover:opacity-100 ${viewMode === 'grid' ? 'h-6 w-6 p-0' : ''}`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigateToFolder(folder)}>
                            <Eye className="h-4 w-4 mr-2" />
                            Open
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Edit3 className="h-4 w-4 mr-2" />
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDeleteItem(folder, true)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  );
                })}                {/* Files */}
                {files.map((file) => {
                  const FileIcon = getFileIcon(file.fileType);
                  const checked = selectedFileIds.has(file.id);
                  return (
                    <div
                      key={file.id}                      className={`${
                        viewMode === 'grid'
                          ? 'p-2 border rounded-md hover:bg-blue-50 hover:border-blue-200 group relative flex flex-col items-center transition-all duration-200 min-h-[90px]'
                          : 'flex items-center justify-between p-2 border rounded-md hover:bg-blue-50 hover:border-blue-200 group relative transition-all duration-200'
                      }`}
                    >
                      <div className={`absolute ${viewMode === 'grid' ? 'top-1 left-1' : 'top-2 left-2'} z-10`}>
                        <Checkbox 
                          checked={checked} 
                          onCheckedChange={() => handleFileCheckbox(file.id)}
                          className={viewMode === 'grid' ? 'h-3 w-3' : ''}
                        />
                      </div>                      <div 
                        className={`${viewMode === 'grid' ? 'flex flex-col items-center space-y-1 w-full pt-3' : 'flex items-center gap-3 flex-1 ml-6'}`}
                      >
                        <div className={`${viewMode === 'grid' ? 'flex justify-center' : ''}`}>
                          <FileIcon className={`${viewMode === 'grid' ? 'h-7 w-7' : 'h-5 w-5'} text-gray-600`} />
                        </div>
                        <div className={`${viewMode === 'grid' ? 'text-center w-full' : ''}`}>
                          <p className={`font-medium truncate ${viewMode === 'grid' ? 'text-xs leading-tight' : 'text-sm'}`} title={file.fileName}>
                            {file.fileName}
                          </p>
                          <p className={`text-gray-500 ${viewMode === 'grid' ? 'text-xs leading-tight' : 'text-xs'}`}>
                            {formatFileSize(file.fileSize)}
                          </p>
                          {viewMode === 'list' && (
                            <p className="text-xs text-gray-400">{formatDate(file.createdAt)}</p>
                          )}
                          {file.tags.length > 0 && (
                            <div className={`flex flex-wrap gap-1 mt-1 ${viewMode === 'grid' ? 'justify-center' : ''}`}>
                              {file.tags.slice(0, viewMode === 'grid' ? 1 : 2).map((tag, index) => (
                                <Badge key={index} variant="outline" className="text-xs px-1 py-0">
                                  {tag}
                                </Badge>
                              ))}
                              {file.tags.length > (viewMode === 'grid' ? 1 : 2) && (
                                <Badge variant="outline" className="text-xs px-1 py-0">
                                  +{file.tags.length - (viewMode === 'grid' ? 1 : 2)}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className={`opacity-0 group-hover:opacity-100 ${viewMode === 'grid' ? 'h-6 w-6 p-0 absolute top-1 right-1' : ''}`}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleDownloadFile(file)}>
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Edit3 className="h-4 w-4 mr-2" />
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Share2 className="h-4 w-4 mr-2" />
                            Share
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDeleteItem(file, false)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  );
};

export default DocumentStorageInterface;