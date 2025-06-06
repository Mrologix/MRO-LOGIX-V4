"use client";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState, useRef, useEffect } from "react";
import { X, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

// Maximum file size limit (250MB in bytes)
const MAX_UPLOAD_SIZE_BYTES = 250 * 1024 * 1024;

interface AddStockInventoryFormProps {
  onClose: () => void;
}

export function AddStockInventoryForm({ onClose }: AddStockInventoryFormProps) {
  const [incomingDate, setIncomingDate] = useState<string>("");
  const [station, setStation] = useState<string>("");
  const [customStation, setCustomStation] = useState<string>("");
  const [owner, setOwner] = useState<string>("");
  const [customOwner, setCustomOwner] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [partNo, setPartNo] = useState<string>("");
  const [serialNo, setSerialNo] = useState<string>("");
  const [quantity, setQuantity] = useState<string>("");
  const [hasExpireDate, setHasExpireDate] = useState<string>("no");
  const [expireDate, setExpireDate] = useState<string>("");
  const [type, setType] = useState<string>("");
  const [customType, setCustomType] = useState<string>("");
  const [location, setLocation] = useState<string>("");
  const [customLocation, setCustomLocation] = useState<string>("");
  const [hasInspection, setHasInspection] = useState<string>("no");
  const [inspectionResult, setInspectionResult] = useState<string>("");
  const [inspectionFailure, setInspectionFailure] = useState<string>("");
  const [customFailure, setCustomFailure] = useState<string>("");
  const [hasComment, setHasComment] = useState<string>("no");
  const [comment, setComment] = useState<string>("");  const [hasAttachments, setHasAttachments] = useState<string>("no");  
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [totalFileSize, setTotalFileSize] = useState<number>(0);
  const [fileSizeExceeded, setFileSizeExceeded] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showInspectionModal, setShowInspectionModal] = useState<boolean>(false);
  const [savedRecordData, setSavedRecordData] = useState<{partNo: string, serialNo: string, description: string} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const router = useRouter();
  const [technician, setTechnician] = useState<string>("");
  const [isLoadingUser, setIsLoadingUser] = useState<boolean>(true);

  const stationOptions = ['STA-1', 'STA-2', 'STA-3', 'STA-4', 'STA-5', 'STA-6', 'STA-7', 'STA-8', 'STA-9', 'STA-10', 'Other'];
  const ownerOptions = ['Airline-1', 'Airline-2', 'Airline-3', 'Airline-4', 'Airline-5', 'Airline-6', 'Airline-7', 'Airline-8', 'Airline-9', 'Airline-10', 'Other'];
  const typeOptions = ['Brake Assy', 'Wheel', 'Tool', 'Part', 'Eng-Oil', 'Hyd-Oil', 'Grease', 'Bolt', 'Torque', 'Other'];
  const locationOptions = ['SHELF-1A', 'SHELF-1B', 'SHELF-1C', 'SHELF-1D', 'SHELF-1E', 'SHELF-1F', 'SHELF-1G', 'SHELF-1H', 'SHELF-1I', 'SHELF-1J', 'Other'];
  const inspectionFailureOptions = ['Doc Missing', 'Damaged', 'Expired', 'Other'];

  // Add useEffect to fetch user data
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setIsLoadingUser(true);
        const response = await fetch("/api/auth/check");
        const data = await response.json();
        
        if (response.ok && data.user) {
          // Set technician name to user's full name
          const fullName = `${data.user.firstName} ${data.user.lastName}`.trim();
          setTechnician(fullName);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        toast({
          title: "Error",
          description: "Could not retrieve user information",
          variant: "destructive"
        });
      } finally {
        setIsLoadingUser(false);
      }
    };

    fetchUserData();
  }, [toast]);
  // Format file size to human-readable format
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Calculate total size of files
  const calculateTotalFileSize = (files: File[]) => {
    return files.reduce((total, file) => total + file.size, 0);
  };

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      const updatedFiles = [...attachedFiles, ...newFiles];
      
      // Calculate total file size
      const newTotalSize = calculateTotalFileSize(updatedFiles);
      setTotalFileSize(newTotalSize);
      
      // Check if total size exceeds the limit
      const isExceeded = newTotalSize > MAX_UPLOAD_SIZE_BYTES;
      setFileSizeExceeded(isExceeded);
      
      if (isExceeded) {
        toast({
          title: "File size limit exceeded",
          description: `Total size (${formatFileSize(newTotalSize)}) exceeds the maximum limit of ${formatFileSize(MAX_UPLOAD_SIZE_BYTES)}`,
          variant: "destructive"
        });
      }
      
      setAttachedFiles(updatedFiles);
    }
  };

  // Handle file removal
  const handleRemoveFile = (index: number) => {
    const updatedFiles = attachedFiles.filter((_, i) => i !== index);
    setAttachedFiles(updatedFiles);
    
    // Recalculate total file size
    const newTotalSize = calculateTotalFileSize(updatedFiles);
    setTotalFileSize(newTotalSize);
    setFileSizeExceeded(newTotalSize > MAX_UPLOAD_SIZE_BYTES);
  };

  // Trigger file input click
  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!incomingDate || !station || !owner || !description || !partNo || !serialNo || !quantity || !type || !location) {
      toast({
        title: "Missing required fields",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }
    
    if (station === "Other" && !customStation) {
      toast({
        title: "Missing station",
        description: "Please specify the station name.",
        variant: "destructive"
      });
      return;
    }
    
    if (owner === "Other" && !customOwner) {
      toast({
        title: "Missing owner",
        description: "Please specify the owner name.",
        variant: "destructive"
      });
      return;
    }
    
    if (type === "Other" && !customType) {
      toast({
        title: "Missing type",
        description: "Please specify the type.",
        variant: "destructive"
      });
      return;
    }
    
    if (location === "Other" && !customLocation) {
      toast({
        title: "Missing location",
        description: "Please specify the location.",
        variant: "destructive"
      });
      return;
    }
    
    if (hasExpireDate === "yes" && !expireDate) {
      toast({
        title: "Missing expire date",
        description: "Please select an expire date.",
        variant: "destructive"
      });
      return;
    }
    
    if (hasInspection === "yes") {
      if (!inspectionResult) {
        toast({
          title: "Missing inspection result",
          description: "Please select an inspection result.",
          variant: "destructive"
        });
        return;
      }
      
      if (inspectionResult === "Failed" && !inspectionFailure) {
        toast({
          title: "Missing failure reason",
          description: "Please select a failure reason.",
          variant: "destructive"
        });
        return;
      }
      
      if (inspectionResult === "Failed" && inspectionFailure === "Other" && !customFailure) {
        toast({
          title: "Missing failure reason",
          description: "Please specify the failure reason.",
          variant: "destructive"
        });
        return;
      }
    }
    
    if (hasComment === "yes" && !comment) {
      toast({
        title: "Missing comment",
        description: "Please enter a comment.",
        variant: "destructive"
      });
      return;
    }
      if (hasAttachments === "yes" && attachedFiles.length === 0) {
      toast({
        title: "Missing attachments",
        description: "Please upload at least one file.",
        variant: "destructive"
      });
      return;
    }
    
    if (hasAttachments === "yes" && fileSizeExceeded) {
      toast({
        title: "File size limit exceeded",
        description: `Total size (${formatFileSize(totalFileSize)}) exceeds the maximum limit of ${formatFileSize(MAX_UPLOAD_SIZE_BYTES)}`,
        variant: "destructive"
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Create form data
      const formData = new FormData();
      
      formData.append('incomingDate', incomingDate);
      formData.append('station', station);
      if (station === "Other") {
        formData.append('customStation', customStation);
      }
      formData.append('owner', owner);
      if (owner === "Other") {
        formData.append('customOwner', customOwner);
      }
      formData.append('description', description);
      formData.append('partNo', partNo);
      formData.append('serialNo', serialNo);
      formData.append('quantity', quantity);
      formData.append('hasExpireDate', hasExpireDate);
      if (hasExpireDate === "yes") {
        formData.append('expireDate', expireDate);
      }
      formData.append('type', type);
      if (type === "Other") {
        formData.append('customType', customType);
      }
      formData.append('location', location);
      if (location === "Other") {
        formData.append('customLocation', customLocation);
      }
      formData.append('hasInspection', hasInspection);
      if (hasInspection === "yes") {
        formData.append('inspectionResult', inspectionResult);
        if (inspectionResult === "Failed") {
          formData.append('inspectionFailure', inspectionFailure);
          if (inspectionFailure === "Other") {
            formData.append('customFailure', customFailure);
          }
        }
      }
      formData.append('hasComment', hasComment);
      if (hasComment === "yes") {
        formData.append('comment', comment);
      }
      formData.append('hasAttachments', hasAttachments);
      
      // Add files to form data
      if (hasAttachments === "yes" && attachedFiles.length > 0) {
        attachedFiles.forEach(file => {
          formData.append('files', file);
        });
      }
      
      // Add technician to form data
      formData.append('technician', technician);
      
      // Submit form data
      const response = await fetch('/api/stock-inventory', {
        method: 'POST',
        body: formData,
      });
      
      const result = await response.json();
        if (result.success) {
        toast({
          title: "Success!",
          description: "Stock inventory item saved successfully."
        });
        
        // Store the saved record data and show inspection modal
        setSavedRecordData({
          partNo: partNo,
          serialNo: serialNo,
          description: description
        });
        setShowInspectionModal(true);
      } else {
        throw new Error(result.message || 'Something went wrong');
      }
    } catch (error: unknown) {
      console.error('Error submitting stock inventory item:', error);
      toast({
        title: "Failed to save",
        description: error instanceof Error ? error.message : "Failed to save stock inventory item",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-card p-4 rounded-lg shadow border w-full">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Add New Stock Item</h2>
      </div>
      <form className="space-y-4" onSubmit={handleSubmit}>
        {/* Flexible grid layout */}
        <div className="flex flex-wrap -mx-2">
          {/* Each field takes up 1/3 of the container on md screens */}
          <div className="w-full md:w-1/3 px-2 mb-4">
            <Label htmlFor="incomingDate" className="text-sm sm:text-base">Incoming Date</Label>
            <Input
              type="date"
              id="incomingDate"
              value={incomingDate}
              onChange={(e) => setIncomingDate(e.target.value)}
              className={`mt-1 w-full ${incomingDate ? 'bg-green-50' : ''}`}
            />
          </div>

          <div className="w-full md:w-1/3 px-2 mb-4">
            <Label htmlFor="station" className="text-sm sm:text-base">Station</Label>
            <Select value={station} onValueChange={setStation}>
              <SelectTrigger id="station" className="mt-1">
                <SelectValue placeholder="Select station" />
              </SelectTrigger>
              <SelectContent>
                {stationOptions.map(option => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {station === "Other" && (
            <div className="w-full md:w-1/3 px-2 mb-4">
              <Label htmlFor="customStation" className="text-sm sm:text-base">Specify Station</Label>
              <Input
                type="text"
                id="customStation"
                value={customStation}
                onChange={(e) => setCustomStation(e.target.value)}
                placeholder="Enter station name"
                className={`mt-1 w-full ${customStation ? 'bg-green-50' : ''}`}
              />
            </div>
          )}

          <div className="w-full md:w-1/3 px-2 mb-4">
            <Label htmlFor="owner" className="text-sm sm:text-base">Owner</Label>
            <Select value={owner} onValueChange={setOwner}>
              <SelectTrigger id="owner" className="mt-1">
                <SelectValue placeholder="Select owner" />
              </SelectTrigger>
              <SelectContent>
                {ownerOptions.map(option => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {owner === "Other" && (
            <div className="w-full md:w-1/3 px-2 mb-4">
              <Label htmlFor="customOwner" className="text-sm sm:text-base">Specify Owner</Label>
              <Input
                type="text"
                id="customOwner"
                value={customOwner}
                onChange={(e) => setCustomOwner(e.target.value)}
                placeholder="Enter owner name"
                className={`mt-1 w-full ${customOwner ? 'bg-green-50' : ''}`}
              />
            </div>
          )}

          <div className="w-full px-2 mb-4">
            <Label htmlFor="description" className="text-sm sm:text-base">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter item description"
              className={`mt-1 w-full ${description ? 'bg-green-50' : ''}`}
            />
          </div>

          <div className="w-full md:w-1/3 px-2 mb-4">
            <Label htmlFor="partNo" className="text-sm sm:text-base">Part No</Label>
            <Input
              type="text"
              id="partNo"
              value={partNo}
              onChange={(e) => setPartNo(e.target.value)}
              placeholder="Enter part number"
              className={`mt-1 w-full ${partNo ? 'bg-green-50' : ''}`}
            />
          </div>

          <div className="w-full md:w-1/3 px-2 mb-4">
            <Label htmlFor="serialNo" className="text-sm sm:text-base">Serial No</Label>
            <Input
              type="text"
              id="serialNo"
              value={serialNo}
              onChange={(e) => setSerialNo(e.target.value)}
              placeholder="Enter serial number"
              className={`mt-1 w-full ${serialNo ? 'bg-green-50' : ''}`}
            />
          </div>

          <div className="w-full md:w-1/3 px-2 mb-4">
            <Label htmlFor="quantity" className="text-sm sm:text-base">Quantity</Label>
            <Input
              type="text"
              id="quantity"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Enter quantity"
              className={`mt-1 w-full ${quantity ? 'bg-green-50' : ''}`}
            />
          </div>

          <div className="w-full md:w-1/3 px-2 mb-4">
            <Label htmlFor="hasExpireDate" className="text-sm sm:text-base">Has Expire Date?</Label>
            <Select value={hasExpireDate} onValueChange={setHasExpireDate}>
              <SelectTrigger id="hasExpireDate" className="mt-1">
                <SelectValue placeholder="Select option" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="yes">Yes</SelectItem>
                <SelectItem value="no">No</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {hasExpireDate === "yes" && (
            <div className="w-full md:w-1/3 px-2 mb-4">
              <Label htmlFor="expireDate" className="text-sm sm:text-base">Expire Date</Label>
              <Input
                type="date"
                id="expireDate"
                value={expireDate}
                onChange={(e) => setExpireDate(e.target.value)}
                className={`mt-1 w-full ${expireDate ? 'bg-green-50' : ''}`}
              />
            </div>
          )}

          <div className="w-full md:w-1/3 px-2 mb-4">
            <Label htmlFor="type" className="text-sm sm:text-base">Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger id="type" className="mt-1">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {typeOptions.map(option => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {type === "Other" && (
            <div className="w-full md:w-1/3 px-2 mb-4">
              <Label htmlFor="customType" className="text-sm sm:text-base">Specify Type</Label>
              <Input
                type="text"
                id="customType"
                value={customType}
                onChange={(e) => setCustomType(e.target.value)}
                placeholder="Enter type"
                className={`mt-1 w-full ${customType ? 'bg-green-50' : ''}`}
              />
            </div>
          )}

          <div className="w-full md:w-1/3 px-2 mb-4">
            <Label htmlFor="location" className="text-sm sm:text-base">Location</Label>
            <Select value={location} onValueChange={setLocation}>
              <SelectTrigger id="location" className="mt-1">
                <SelectValue placeholder="Select location" />
              </SelectTrigger>
              <SelectContent>
                {locationOptions.map(option => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {location === "Other" && (
            <div className="w-full md:w-1/3 px-2 mb-4">
              <Label htmlFor="customLocation" className="text-sm sm:text-base">Specify Location</Label>
              <Input
                type="text"
                id="customLocation"
                value={customLocation}
                onChange={(e) => setCustomLocation(e.target.value)}
                placeholder="Enter location"
                className={`mt-1 w-full ${customLocation ? 'bg-green-50' : ''}`}
              />
            </div>
          )}

          <div className="w-full md:w-1/3 px-2 mb-4">
            <Label htmlFor="hasInspection" className="text-sm sm:text-base">Inspection Required?</Label>
            <Select value={hasInspection} onValueChange={setHasInspection}>
              <SelectTrigger id="hasInspection" className="mt-1">
                <SelectValue placeholder="Select option" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="yes">Yes</SelectItem>
                <SelectItem value="no">No</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {hasInspection === "yes" && (
            <>
              <div className="w-full md:w-1/3 px-2 mb-4">
                <Label htmlFor="inspectionResult" className="text-sm sm:text-base">Results</Label>
                <Select value={inspectionResult} onValueChange={setInspectionResult}>
                  <SelectTrigger id="inspectionResult" className="mt-1">
                    <SelectValue placeholder="Select result" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Passed">Passed</SelectItem>
                    <SelectItem value="Failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {inspectionResult === "Failed" && (
                <>
                  <div className="w-full md:w-1/3 px-2 mb-4">
                    <Label htmlFor="inspectionFailure" className="text-sm sm:text-base">Pick One</Label>
                    <Select value={inspectionFailure} onValueChange={setInspectionFailure}>
                      <SelectTrigger id="inspectionFailure" className="mt-1">
                        <SelectValue placeholder="Select reason" />
                      </SelectTrigger>
                      <SelectContent>
                        {inspectionFailureOptions.map(option => (
                          <SelectItem key={option} value={option}>{option}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {inspectionFailure === "Other" && (
                    <div className="w-full md:w-1/3 px-2 mb-4">
                      <Label htmlFor="customFailure" className="text-sm sm:text-base">Specify Reason</Label>
                      <Input
                        type="text"
                        id="customFailure"
                        value={customFailure}
                        onChange={(e) => setCustomFailure(e.target.value)}
                        placeholder="Enter failure reason"
                        className={`mt-1 w-full ${customFailure ? 'bg-green-50' : ''}`}
                      />
                    </div>
                  )}
                </>
              )}
            </>
          )}

          <div className="w-full md:w-1/3 px-2 mb-4">
            <Label htmlFor="hasComment" className="text-sm sm:text-base">Comments</Label>
            <Select value={hasComment} onValueChange={setHasComment}>
              <SelectTrigger id="hasComment" className="mt-1">
                <SelectValue placeholder="Select option" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="yes">Yes</SelectItem>
                <SelectItem value="no">No</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {hasComment === "yes" && (
            <div className="w-full px-2 mb-4">
              <Label htmlFor="comment" className="text-sm sm:text-base">Enter Comment</Label>
              <Textarea
                id="comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Enter your comment"
                className={`mt-1 w-full ${comment ? 'bg-green-50' : ''}`}
              />
            </div>
          )}

          <div className="w-full md:w-1/3 px-2 mb-4">
            <Label htmlFor="hasAttachments" className="text-sm sm:text-base">Attachments</Label>
            <Select value={hasAttachments} onValueChange={setHasAttachments}>
              <SelectTrigger id="hasAttachments" className="mt-1">
                <SelectValue placeholder="Select option" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="yes">Yes</SelectItem>
                <SelectItem value="no">No</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {hasAttachments === "yes" && (
            <div className="w-full px-2 mb-4">
              <Label htmlFor="fileAttachments" className="text-sm sm:text-base">Upload Files</Label>
              <div className="mt-1 border-2 border-dashed border-gray-300 rounded-lg p-4">
                <input
                  type="file"
                  id="fileAttachments"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"                  multiple
                />
                <div className="flex flex-col items-center justify-center space-y-2">
                  <p className="text-sm text-gray-500">Any file type accepted including images and audio (Max 250MB total)</p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={triggerFileInput}
                    className="mt-2"
                    disabled={fileSizeExceeded}
                  >
                    Select Files
                  </Button>
                </div>
                {attachedFiles.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <div className="text-sm">
                      Total size: <span className={fileSizeExceeded ? "text-red-500 font-bold" : ""}>{formatFileSize(totalFileSize)}</span>
                      {fileSizeExceeded && (
                        <span className="text-red-500 ml-2 font-bold">
                          Size limit exceeded! Maximum allowed: {formatFileSize(MAX_UPLOAD_SIZE_BYTES)}
                        </span>
                      )}
                    </div>
                    {attachedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="text-sm truncate flex-1">{file.name}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveFile(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="w-full px-2 mb-4">
            <Label htmlFor="technician" className="text-sm sm:text-base">Technician</Label>
            <div className="flex items-center mt-1">
              {isLoadingUser ? (
                <div className="h-9 w-full bg-gray-100 rounded animate-pulse"></div>
              ) : (
                <div className="h-9 px-3 flex items-center w-full border rounded-md bg-muted/50 text-muted-foreground">
                  {technician || "Not available"}
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Automatically retrieved from your account</p>
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button 
            type="button" 
            variant="outline" 
            size="sm"
            className="h-8"
            onClick={onClose} 
            disabled={isSubmitting}
          >
            Cancel          </Button>
          <Button 
            type="submit" 
            disabled={isSubmitting || (hasAttachments === "yes" && fileSizeExceeded)}
            size="sm"
            className="bg-green-400 hover:bg-green-500 text-gray-800 h-8"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save'
            )}          </Button>
        </div>
      </form>

      {/* Incoming Inspection Modal */}
      <Dialog open={showInspectionModal} onOpenChange={setShowInspectionModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Record Saved Successfully!</DialogTitle>
            <DialogDescription>
              Would you like to perform an incoming inspection for this part?
            </DialogDescription>
          </DialogHeader>
          
          {savedRecordData && (
            <div className="py-4 space-y-2">
              <div className="text-sm">
                <span className="font-medium">Part No:</span> {savedRecordData.partNo}
              </div>
              <div className="text-sm">
                <span className="font-medium">Serial No:</span> {savedRecordData.serialNo}
              </div>
              <div className="text-sm">
                <span className="font-medium">Description:</span> {savedRecordData.description}
              </div>
            </div>
          )}
          
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowInspectionModal(false);
                onClose(); // Close the form
              }}
            >
              No
            </Button>
            <Button
              onClick={() => {
                setShowInspectionModal(false);
                onClose(); // Close the form
                router.push('/dashboard/incoming-inspections');
              }}
            >
              Yes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 