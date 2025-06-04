"use client";

import { useEffect, useState, useCallback } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Download, Trash2, ArrowLeft, MoreHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface StockInventory {
  id: string;
  incomingDate: string;
  station: string;
  owner: string;
  description: string;
  partNo: string;
  serialNo: string;
  quantity: string;
  hasExpireDate: boolean;
  expireDate: string | null;
  type: string;
  location: string;
  hasInspection: boolean;
  inspectionResult: string | null;
  inspectionFailure: string | null;
  customFailure: string | null;
  hasComment: boolean;
  comment: string | null;
  hasAttachments: boolean;
  technician: string | null;
  Attachment: Array<{
    id: string;
    fileName: string;
    fileKey: string;
    fileSize: number;
    fileType: string;
  }>;
}

export default function StockInventoryItemPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState<string>("");
  const [record, setRecord] = useState<StockInventory | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteText, setDeleteText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const isMobile = useIsMobile();

  // Get the id from params
  useEffect(() => {
    const getParams = async () => {
      const resolvedParams = await params;
      setId(resolvedParams.id);
    };
    getParams();
  }, [params]);
  const fetchRecord = useCallback(async () => {
    if (!id) return; // Don't fetch if id is not available yet
    
    try {
      setIsLoading(true);
      const response = await fetch(`/api/stock-inventory/${id}`);
      const data = await response.json();
      
      if (data.success) {
        setRecord(data.record);
      } else {
        throw new Error(data.message || 'Failed to fetch record');
      }
    } catch (error) {
      console.error('Error fetching stock inventory record:', error);
      toast({
        title: "Error",
        description: "Failed to fetch stock inventory record",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [id, toast]);

  useEffect(() => {
    fetchRecord();
  }, [fetchRecord]);

  const handleDownload = async (fileKey: string, fileName: string) => {
    try {
      const response = await fetch(`/api/stock-inventory/attachments/${encodeURIComponent(fileKey)}`);
      
      if (!response.ok) {
        throw new Error('Failed to download file');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading file:', error);
    }
  };

  const handleDelete = async () => {
    if (deleteText !== "Delete") {
      toast({
        title: "Invalid confirmation",
        description: "Please type 'Delete' to confirm",
        variant: "destructive"
      });
      return;
    }    setIsDeleting(true);
    try {
      const response = await fetch(`/api/stock-inventory/${id}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "Success",
          description: "Record deleted successfully"
        });
        // Navigate back to inventory list
        router.push('/dashboard/stock-inventory');
      } else {
        throw new Error(data.message || 'Failed to delete record');
      }
    } catch (error) {
      console.error('Error deleting stock inventory record:', error);
      toast({
        title: "Error",
        description: "Failed to delete record",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 space-y-6">
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!record) {
    return (
      <div className="container mx-auto p-4 space-y-6">
        <div className="flex items-center mb-6">
          <Button 
            variant="ghost" 
            onClick={() => router.push('/dashboard/stock-inventory')}
            className="mr-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {!isMobile && "Back to Inventory"}
          </Button>
        </div>
        <div className="text-center p-8">
          <h2 className="text-xl font-semibold mb-2">Record Not Found</h2>
          <p className="text-muted-foreground">The inventory item you&apos;re looking for could not be found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center flex-1 min-w-0">
          <Button 
            variant="ghost" 
            onClick={() => router.push('/dashboard/stock-inventory')}
            className="mr-2 flex-shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
            {!isMobile && <span className="ml-2">Back to Inventory</span>}
          </Button>
          <h1 className={`font-bold truncate ${isMobile ? 'text-lg' : 'text-2xl'}`}>
            Stock Inventory Details
          </h1>
        </div>
        
        {isMobile ? (
          // Mobile: Show dropdown menu with delete option
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="flex-shrink-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem 
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-2 text-red-600"
              >
                <Trash2 className="h-4 w-4" />
                Delete Record
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          // Desktop: Show full delete button
          <Button
            variant="destructive"
            onClick={() => setShowDeleteConfirm(true)}
            className="flex-shrink-0"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Record
          </Button>
        )}
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        {isMobile ? (
          // Mobile: Card layout with key-value pairs
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-sm font-medium text-gray-500 mb-1">Incoming Date</div>
                <div className="text-sm">{format(new Date(record.incomingDate), 'MMM d, yyyy')}</div>
              </div>
              
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-sm font-medium text-gray-500 mb-1">Part Information</div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Part No:</span>
                    <span className="text-sm">{record.partNo}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Serial No:</span>
                    <span className="text-sm">{record.serialNo}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Quantity:</span>
                    <span className="text-sm">{record.quantity}</span>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-sm font-medium text-gray-500 mb-1">Description</div>
                <div className="text-sm whitespace-pre-wrap">{record.description}</div>
              </div>

              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-sm font-medium text-gray-500 mb-1">Location & Owner</div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Station:</span>
                    <span className="text-sm">{record.station}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Owner:</span>
                    <span className="text-sm">{record.owner}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Location:</span>
                    <span className="text-sm">{record.location}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Type:</span>
                    <span className="text-sm">{record.type}</span>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-sm font-medium text-gray-500 mb-1">Technician</div>
                <div className="text-sm">{record.technician || 'Not available'}</div>
              </div>

              {record.hasExpireDate && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm font-medium text-gray-500 mb-1">Expire Date</div>
                  <div className="text-sm">
                    {record.expireDate ? format(new Date(record.expireDate), 'MMM d, yyyy') : 'N/A'}
                  </div>
                </div>
              )}

              {record.hasInspection && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm font-medium text-gray-500 mb-1">Inspection Result</div>
                  <div className="text-sm">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      record.inspectionResult === "Failed" 
                        ? "bg-red-100 text-red-800" 
                        : "bg-green-100 text-green-800"
                    }`}>
                      {record.inspectionResult}
                    </span>
                    {record.inspectionResult === "Failed" && (
                      <div className="text-sm text-gray-500 mt-2">
                        <strong>Reason:</strong> {record.inspectionFailure === "Other" ? record.customFailure : record.inspectionFailure}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {record.hasComment && (
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="text-sm font-medium text-blue-800 mb-2">Comments</div>
                <div className="text-sm text-blue-700 whitespace-pre-wrap">{record.comment}</div>
              </div>
            )}
          </div>
        ) : (
          // Desktop/Tablet: Improved grid layout
          <div className="space-y-6">
            {/* Basic Information */}
            <div>
              <h3 className="text-lg font-semibold mb-3 text-gray-900">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm font-medium text-gray-500">Incoming Date</div>
                  <div className="text-base font-medium">{format(new Date(record.incomingDate), 'MMM d, yyyy')}</div>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm font-medium text-gray-500">Station</div>
                  <div className="text-base font-medium">{record.station}</div>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm font-medium text-gray-500">Owner</div>
                  <div className="text-base font-medium">{record.owner}</div>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm font-medium text-gray-500">Type</div>
                  <div className="text-base font-medium">{record.type}</div>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm font-medium text-gray-500">Location</div>
                  <div className="text-base font-medium">{record.location}</div>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm font-medium text-gray-500">Technician</div>
                  <div className="text-base font-medium">{record.technician || 'Not available'}</div>
                </div>
              </div>
            </div>

            {/* Part Details */}
            <div>
              <h3 className="text-lg font-semibold mb-3 text-gray-900">Part Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm font-medium text-gray-500">Part Number</div>
                  <div className="text-base font-medium">{record.partNo}</div>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm font-medium text-gray-500">Serial Number</div>
                  <div className="text-base font-medium">{record.serialNo}</div>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm font-medium text-gray-500">Quantity</div>
                  <div className="text-base font-medium">{record.quantity}</div>
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <h3 className="text-lg font-semibold mb-3 text-gray-900">Description</h3>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-base whitespace-pre-wrap">{record.description}</div>
              </div>
            </div>

            {/* Dates and Status */}
            <div>
              <h3 className="text-lg font-semibold mb-3 text-gray-900">Status & Dates</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {record.hasExpireDate && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm font-medium text-gray-500">Expire Date</div>
                    <div className="text-base font-medium">
                      {record.expireDate ? (
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-sm font-medium ${
                          (() => {
                            const today = new Date();
                            const expiryDate = new Date(record.expireDate);
                            const diffTime = expiryDate.getTime() - today.getTime();
                            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                            
                            if (diffDays <= 0) return 'bg-red-100 text-red-800';
                            if (diffDays <= 30) return 'bg-yellow-100 text-yellow-800';
                            if (diffDays <= 90) return 'bg-orange-100 text-orange-800';
                            return 'bg-green-100 text-green-800';
                          })()
                        }`}>
                          {format(new Date(record.expireDate), 'MMM d, yyyy')}
                        </span>
                      ) : (
                        'N/A'
                      )}
                    </div>
                  </div>
                )}
                
                {record.hasInspection && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm font-medium text-gray-500">Inspection Result</div>
                    <div className="text-base font-medium">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-sm font-medium ${
                        record.inspectionResult === "Failed" 
                          ? "bg-red-100 text-red-800" 
                          : "bg-green-100 text-green-800"
                      }`}>
                        {record.inspectionResult}
                      </span>
                      {record.inspectionResult === "Failed" && (
                        <div className="text-sm text-gray-500 mt-2">
                          <strong>Reason:</strong> {record.inspectionFailure === "Other" ? record.customFailure : record.inspectionFailure}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {record.hasComment && (
              <div>
                <h3 className="text-lg font-semibold mb-3 text-gray-900">Comments</h3>
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="text-base text-blue-700 whitespace-pre-wrap">{record.comment}</div>
                </div>
              </div>
            )}
          </div>
        )}

        {record.hasAttachments && record.Attachment.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-semibold mb-3 text-gray-900">Attachments</h3>
            <div className="space-y-2">
              {record.Attachment.map((attachment) => (
                <div key={attachment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm truncate flex-1 font-medium">{attachment.fileName}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDownload(attachment.fileKey, attachment.fileName)}
                    className="ml-2 flex-shrink-0"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {!isMobile && "Download"}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this record? This action cannot be undone.
              Type &apos;Delete&apos; to confirm.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              type="text"
              value={deleteText}
              onChange={(e) => setDeleteText(e.target.value)}
              placeholder="Type &apos;Delete&apos; to confirm"
              className="w-full"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteConfirm(false);
                setDeleteText("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteText !== "Delete" || isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
