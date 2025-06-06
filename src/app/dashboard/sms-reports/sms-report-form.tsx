"use client";

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { X, Upload, File, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface SMSReportFormProps {
  onCancel: () => void;
  onSuccess: () => void;
}

interface FileWithPreview extends File {
  id: string;
}

const SMSReportForm = ({ onCancel, onSuccess }: SMSReportFormProps) => {
  const [formData, setFormData] = useState({
    reporterName: '',
    reporterEmail: '',
    date: '',
    timeOfEvent: '',
    reportTitle: '',
    reportDescription: ''
  });
  
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileSelect = (selectedFiles: FileList | null) => {
    if (!selectedFiles) return;
    
    const newFiles: FileWithPreview[] = Array.from(selectedFiles).map(file => {
      // Properly extend the File object to preserve its methods
      const fileWithId = file as FileWithPreview;
      fileWithId.id = Math.random().toString(36).substr(2, 9);
      return fileWithId;
    });
    
    setFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(file => file.id !== fileId));
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const validateForm = () => {
    if (!formData.date) {
      toast.error('Date is required');
      return false;
    }
    if (!formData.reportTitle.trim()) {
      toast.error('Report title is required');
      return false;
    }
    if (!formData.reportDescription.trim()) {
      toast.error('Report description is required');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    
    try {
      const submitFormData = new FormData();
      
      // Add form fields
      Object.entries(formData).forEach(([key, value]) => {
        if (value) {
          submitFormData.append(key, value);
        }
      });
      
      // Add files
      if (files.length > 0) {
        submitFormData.append('hasAttachments', 'true');
        files.forEach(file => {
          submitFormData.append('files', file);
        });
      } else {
        submitFormData.append('hasAttachments', 'false');
      }
      
      const response = await fetch('/api/sms-reports', {
        method: 'POST',
        body: submitFormData,
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast.success('SMS report submitted successfully!');
        onSuccess();
      } else {
        toast.error(result.message || 'Failed to submit SMS report');
      }
    } catch (error) {
      console.error('Error submitting SMS report:', error);
      toast.error('An error occurred while submitting the report');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-xl font-semibold">New SMS Report</CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          className="h-8 w-8 p-0"
        >
          <X size={16} />
        </Button>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Reporter Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="reporterName">Your Name (Optional)</Label>
              <Input
                id="reporterName"
                name="reporterName"
                value={formData.reporterName}
                onChange={handleInputChange}
                placeholder="Enter your name (reports can be anonymous)"
              />
              <p className="text-xs text-gray-500">
                Reports can be anonymous in accordance with company policies
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="reporterEmail">Email (Optional)</Label>
              <Input
                id="reporterEmail"
                name="reporterEmail"
                type="email"
                value={formData.reporterEmail}
                onChange={handleInputChange}
                placeholder="Enter your email for a copy of the report"
              />
              <p className="text-xs text-gray-500">
                A copy of the report will be sent to this email if provided
              </p>
            </div>
          </div>

          {/* Event Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date <span className="text-red-500">*</span></Label>
              <Input
                id="date"
                name="date"
                type="date"
                value={formData.date}
                onChange={handleInputChange}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="timeOfEvent">Time of Event (Optional)</Label>
              <Input
                id="timeOfEvent"
                name="timeOfEvent"
                type="time"
                value={formData.timeOfEvent}
                onChange={handleInputChange}
                placeholder="HH:MM"
              />
            </div>
          </div>

          {/* Report Details */}
          <div className="space-y-2">
            <Label htmlFor="reportTitle">Report Title <span className="text-red-500">*</span></Label>
            <Input
              id="reportTitle"
              name="reportTitle"
              value={formData.reportTitle}
              onChange={handleInputChange}
              placeholder="Enter a descriptive title for the report"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reportDescription">Report Description <span className="text-red-500">*</span></Label>
            <Textarea
              id="reportDescription"
              name="reportDescription"
              value={formData.reportDescription}
              onChange={handleInputChange}
              placeholder="Provide a detailed description of the safety event or concern..."
              rows={6}
              required
            />
          </div>

          {/* File Upload */}
          <div className="space-y-4">
            <Label>Attachments (Optional)</Label>
            
            {/* File Drop Zone */}
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                dragActive 
                  ? 'border-blue-400 bg-blue-50' 
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-sm text-gray-600 mb-2">
                Drag and drop files here, or{' '}
                <label className="text-blue-600 hover:text-blue-500 cursor-pointer">
                  browse
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => handleFileSelect(e.target.files)}
                    accept="image/*,video/*,.pdf,.doc,.docx,.txt"
                  />
                </label>
              </p>
              <p className="text-xs text-gray-500">
                Supports images, videos, documents, etc. (Max 250MB total)
              </p>
            </div>

            {/* File List */}
            {files.length > 0 && (
              <div className="space-y-2">
                <Label>Selected Files ({files.length})</Label>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {files.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <File size={16} className="text-gray-500" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {file.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatFileSize(file.size)}
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(file.id)}
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-4 pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-[#8b5cf6] hover:bg-[#7c3aed]"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Report'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default SMSReportForm; 