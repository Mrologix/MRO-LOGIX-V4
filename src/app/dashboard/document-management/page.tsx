"use client";

import React, { useEffect, useState } from "react";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  PlusIcon,
  DownloadIcon,
  Trash2Icon,
  Share2Icon,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ManualComment {
  id: string;
  content: string;
  createdAt: string;
  user: {
    firstName: string;
    lastName: string;
  };
}

interface Manual {
  id: string;
  name: string;
  number: string;
  revision: string;
  revisionDate: string;
  status: "DRAFT" | "APPROVED" | "ARCHIVED";
  description?: string;
  fileSize?: number;
}

// Helper to format file size
function formatFileSize(bytes?: number): string {
  if (!bytes || bytes === 0) return "-";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export default function DocumentManagementPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [manuals, setManuals] = useState<Manual[]>([]);
  const [selectedManual, setSelectedManual] = useState<Manual | null>(null);
  const [loading, setLoading] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  useEffect(() => {
    const fetchManuals = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/manuals", {
          credentials: 'include',
        });
        if (res.ok) {
          const data = await res.json();
          setManuals(data.manuals || []);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchManuals();
  }, []);

  const handleNew = () => {
    router.push("/dashboard/document-management/new");
  };

  const handleDownload = async () => {
    if (!selectedManual) return;

    try {
      const response = await fetch(`/api/manuals/${selectedManual.id}/download`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error("Download failed");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${selectedManual.name}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download document",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!selectedManual) return;

    try {
      const response = await fetch(`/api/manuals/${selectedManual.id}`, {
        method: "DELETE",
        credentials: 'include',
      });

      if (!response.ok) throw new Error("Delete failed");

      setManuals((prev) => prev.filter((m) => m.id !== selectedManual.id));
      setSelectedManual(null);
      toast({
        title: "Success",
        description: "Document deleted successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete document",
        variant: "destructive",
      });
    } finally {
      setIsDeleteDialogOpen(false);
    }
  };

  const handleShare = () => {
    if (!selectedManual) return;
    // Implement share functionality (e.g., copy link to clipboard)
    navigator.clipboard.writeText(
      `${window.location.origin}/dashboard/document-management/${selectedManual.id}`
    );
    toast({
      title: "Success",
      description: "Share link copied to clipboard",
    });
  };

  const handleStatusChange = async (manualId: string, newStatus: Manual["status"]) => {
    try {
      const response = await fetch(`/api/manuals/${manualId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
        credentials: 'include',
      });

      if (!response.ok) throw new Error("Failed to update status");

      // Update local state
      setManuals((prev) =>
        prev.map((manual) =>
          manual.id === manualId ? { ...manual, status: newStatus } : manual
        )
      );

      toast({
        title: "Success",
        description: "Status updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      });
    }
  };

  const getStatusBadgeVariant = (status: Manual["status"]) => {
    switch (status) {
      case "APPROVED":
        return "default";
      case "ARCHIVED":
        return "destructive";
      case "DRAFT":
      default:
        return "secondary";
    }
  };

  const getStatusLabel = (status: Manual["status"]) => {
    switch (status) {
      case "APPROVED":
        return "Approved";
      case "ARCHIVED":
        return "Archived";
      case "DRAFT":
      default:
        return "In Review";
    }
  };

  return (
    <div className="flex h-[calc(100vh_-_theme(spacing.24))] w-full overflow-hidden">
      {/* Inbox Table */}
      <div className="w-1/2 lg:w-[50%] border-r border-border overflow-y-auto">
        <div className="h-full w-full overflow-y-auto">
          <Table className="min-w-full text-sm">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]"></TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Number</TableHead>
                <TableHead>Revision</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {manuals.map((manual) => (
                <TableRow
                  key={manual.id}
                  className={`cursor-pointer ${selectedManual?.id === manual.id ? "bg-muted/50" : ""} py-1`}
                  onClick={() => setSelectedManual(manual)}
                >
                  <TableCell className="py-1">
                    <input
                      type="checkbox"
                      checked={selectedManual?.id === manual.id}
                      onChange={() => setSelectedManual(manual)}
                    />
                  </TableCell>
                  <TableCell className="font-medium whitespace-nowrap py-1">
                    {manual.name}
                  </TableCell>
                  <TableCell className="whitespace-nowrap py-1">
                    {manual.number}
                  </TableCell>
                  <TableCell className="whitespace-nowrap py-1">
                    {manual.revision}
                  </TableCell>
                  <TableCell className="whitespace-nowrap py-1">
                    <Badge variant={getStatusBadgeVariant(manual.status)}>
                      {getStatusLabel(manual.status)}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {!loading && manuals.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    No manuals found.
                  </TableCell>
                </TableRow>
              )}
              {loading && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="border-t p-2 text-xs text-muted-foreground">
          Results 1–{manuals.length} of {manuals.length}
        </div>
      </div>

      {/* Details Panel */}
      <div className="flex-1 max-w-3xl border-r border-border h-full overflow-y-auto px-4 py-6 space-y-4">
        {/* Panel Header with Title and Actions */}
        <div className="flex items-center justify-between bg-muted px-4 py-3 rounded-md mb-4">
          <h2 className="text-lg font-semibold">
            {selectedManual ? selectedManual.name : "Document Details"}
          </h2>
          <div className="flex flex-row gap-2">
            <Button size="icon" variant="outline" title="New" onClick={handleNew}>
              <PlusIcon className="w-5 h-5" />
            </Button>
            <Button size="icon" variant="outline" title="Download" onClick={handleDownload} disabled={!selectedManual}>
              <DownloadIcon className="w-5 h-5" />
            </Button>
            <Button size="icon" variant="outline" title="Delete" onClick={() => setIsDeleteDialogOpen(true)} disabled={!selectedManual}>
              <Trash2Icon className="w-5 h-5" />
            </Button>
            <Button size="icon" variant="outline" title="Share" onClick={handleShare} disabled={!selectedManual}>
              <Share2Icon className="w-5 h-5" />
            </Button>
          </div>
        </div>
        <div className="space-y-2 text-sm">
          <div>
            <span className="font-medium">Document No: </span>
            {selectedManual ? selectedManual.number : ""}
          </div>
          <div>
            <span className="font-medium">Revision: </span>
            {selectedManual ? selectedManual.revision : ""}
          </div>
          <div>
            <span className="font-medium">Revision Date: </span>
            {selectedManual ? new Date(selectedManual.revisionDate).toLocaleDateString() : ""}
          </div>
          <div>
            <span className="font-medium">Status: </span>
            {selectedManual ? (
              <Select
                value={selectedManual.status}
                onValueChange={(value: Manual["status"]) =>
                  handleStatusChange(selectedManual.id, value)
                }
              >
                <SelectTrigger className="w-[130px]">
                  <SelectValue>
                    {getStatusLabel(selectedManual.status)}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DRAFT">In Review</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="ARCHIVED">Archived</SelectItem>
                </SelectContent>
              </Select>
            ) : null}
          </div>
          {/* Description Section */}
          {selectedManual && selectedManual.description && (
            <div className="mt-6">
              <h3 className="font-medium mb-2">Description</h3>
              <p className="text-sm whitespace-pre-wrap bg-muted/50 p-3 rounded-md">
                {selectedManual.description}
              </p>
            </div>
          )}
          {/* Document Settings Section */}
          {selectedManual && (
            <div className="mt-6">
              <h3 className="font-medium mb-2">Document Settings</h3>
              <div className="space-y-2 text-sm bg-muted/50 p-3 rounded-md">
                <div>
                  <span className="font-medium">File Size: </span>
                  {formatFileSize(selectedManual.fileSize)}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the document
              "{selectedManual?.name}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 