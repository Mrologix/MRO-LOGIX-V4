"use client";

import { useState, useEffect, useCallback, use } from "react";
import { Button } from "@/components/ui/button";
import { FileText, ChevronLeft, Download, AlertCircle, Trash2, RefreshCw, FileType as PdfIcon } from "lucide-react";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Attachment {
  id: string;
  fileName: string;
  fileKey: string;
  fileSize: number;
  fileType: string;
}

interface FlightRecord {
  id: string;
  date: string;
  airline: string;
  fleet: string;
  flightNumber: string | null;
  tail: string | null;
  station: string;
  service: string;
  hasTime: boolean;
  blockTime: string | null;
  outTime: string | null;
  hasDefect: boolean;
  logPageNo: string | null;
  discrepancyNote: string | null;
  rectificationNote: string | null;
  systemAffected: string | null;
  defectStatus: string | null;
  riiRequired: boolean;
  inspectedBy: string | null;
  hasAttachments: boolean;
  hasComment: boolean;
  comment: string | null;
  technician: string | null;
  Attachment: Attachment[];
  createdAt: string;
  fixingManual?: string;
  manualReference?: string;
  hasPartReplaced: boolean;
  pnOff?: string | null;
  snOff?: string | null;
  pnOn?: string | null;
  snOn?: string | null;
  PartReplacement: Array<{
    id: string;
    pnOff: string | null;
    snOff: string | null;
    pnOn: string | null;
    snOn: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
}

export default function FlightRecordDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [record, setRecord] = useState<FlightRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const fetchFlightRecord = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/flight-records/${id}`);
      const data = await response.json();
      if (data.success) {
        console.log('Fetched flight record:', data.record);
        console.log('Comment data:', {
          hasComment: data.record.hasComment,
          comment: data.record.comment
        });
        setRecord(data.record);
      } else {
        setError(data.message || "Failed to load flight record");
      }
    } catch (error) {
      console.error('Error fetching flight record:', error);
      setError("An error occurred while loading the flight record");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    fetchFlightRecord();
  }, [fetchFlightRecord]);

  const generatePdf = () => {
    if (!record) return;
    setIsGeneratingPdf(true);

    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Flight Record Details", 14, 20);

    const tableColumn = ["Field", "Value"];
    const tableRows = [
      ["Date", formatDate(record.date)],
      ["Airline", record.airline],
      ["Fleet", record.fleet],
      ["Flight Number", record.flightNumber || "N/A"],
      ["Tail", record.tail || "N/A"],
      ["Station", record.station || "N/A"],
      ["Service Type", record.service || "N/A"],
      ["Technician", record.technician || "N/A"],
      ["Created At", formatDate(record.createdAt)],
    ];

    if (record.hasTime) {
      tableRows.push(["Block Time", record.blockTime || "N/A"]);
      tableRows.push(["Out Time", record.outTime || "N/A"]);
    }

    if (record.hasDefect) {
      tableRows.push(["Log Page No.", record.logPageNo || "N/A"]);
      tableRows.push(["System Affected", record.systemAffected || "N/A"]);
      tableRows.push(["Status", record.defectStatus || "N/A"]);
      tableRows.push(["RII Required", record.riiRequired ? "Yes" : "No"]);
      tableRows.push(["Part Replaced", record.hasPartReplaced ? "Yes" : "No"]);
      if (record.riiRequired && record.inspectedBy) {
        tableRows.push(["Inspected By", record.inspectedBy]);
      }
      if (record.hasPartReplaced && record.PartReplacement && record.PartReplacement.length > 0) {
        doc.setFontSize(12);
        doc.text("Part Replacements", 14, 30);
        record.PartReplacement.forEach((part, index) => {
          const partRows = [
            [`Part Replacement #${index + 1}`, ""],
            ["Removed Part", ""],
            ["P/N OFF", part.pnOff || "N/A"],
            ["S/N OFF", part.snOff || "N/A"],
            ["Installed Part", ""],
            ["P/N ON", part.pnOn || "N/A"],
            ["S/N ON", part.snOn || "N/A"],
            ["Date", new Date(part.createdAt).toLocaleDateString()]
          ];
          
          autoTable(doc, {
            startY: 40,
            head: [["Field", "Value"]],
            body: partRows,
            theme: 'grid',
            headStyles: { fillColor: [33, 150, 243], textColor: [255, 255, 255] },
            styles: { fontSize: 10 },
            margin: { left: 14 }
          });
          
          doc.addPage();
        });
      }
      if (record.defectStatus) {
        tableRows.push([
          record.defectStatus === "Fixed" ? "Fixing Manual" : "Deferral Manual",
          record.fixingManual || "N/A"
        ]);
        tableRows.push([
          record.defectStatus === "Fixed" ? "Fixing Manual Reference" : "Deferral Manual Reference",
          record.manualReference || "N/A"
        ]);
      }
    }

    if (record.hasComment) {
      tableRows.push(["Has Comment", "Yes"]);
    }

    autoTable(doc, {
      startY: 30,
      head: [tableColumn],
      body: tableRows,
      theme: 'striped',
      headStyles: { fillColor: [33, 150, 243], textColor: [255, 255, 255] },
      styles: { fontSize: 10 },
    });

    let finalY = (doc as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || 30;

    if (record.hasDefect) {
      doc.setFontSize(12);
      doc.text("Defect Information", 14, finalY + 10);
      finalY += 15;
      doc.setFontSize(10);
      doc.text("Discrepancy:", 14, finalY);
      const discrepancyText = doc.splitTextToSize(record.discrepancyNote || "N/A", 180);
      doc.text(discrepancyText, 14, finalY + 5);
      finalY += 5 + (discrepancyText.length * 5);

      doc.text("Rectification:", 14, finalY);
      const rectificationText = doc.splitTextToSize(record.rectificationNote || "N/A", 180);
      doc.text(rectificationText, 14, finalY + 5);
      finalY += 5 + (rectificationText.length * 5);
    }

    if (record.hasComment && record.comment) {
      doc.setFontSize(12);
      doc.text("Comments", 14, finalY + 10);
      finalY += 15;
      doc.setFontSize(10);
      const commentText = doc.splitTextToSize(record.comment, 180);
      doc.text(commentText, 14, finalY);
      finalY += commentText.length * 5;
    }

    if (record.hasAttachments && record.Attachment?.length) {
      doc.addPage();
      doc.setFontSize(12);
      doc.text("Attachments", 14, 20);
      const attachmentColumns = ["File Name", "Type", "Size (KB)"];
      const attachmentRows = record.Attachment.map(att => [
        att.fileName,
        att.fileType,
        (att.fileSize / 1024).toFixed(1)
      ]);
      autoTable(doc, {
        startY: 30,
        head: [attachmentColumns],
        body: attachmentRows,
        theme: 'striped',
        headStyles: { fillColor: [33, 150, 243], textColor: [255, 255, 255] },
        styles: { fontSize: 10 },
      });
    }

    doc.save(`FlightRecord_${record.id}.pdf`);
    setIsGeneratingPdf(false);
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchFlightRecord();
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    const userTimezoneOffset = date.getTimezoneOffset() * 60000;
    const adjustedDate = new Date(date.getTime() + userTimezoneOffset);
    return adjustedDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const downloadAttachment = async (attachment: Attachment) => {
    try {
      const fileKeyEncoded = encodeURIComponent(attachment.fileKey);
      const response = await fetch(`/api/flight-records/attachments/${fileKeyEncoded}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to download file");
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = attachment.fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Error downloading attachment:", error);
      alert("Failed to download attachment: " + (error instanceof Error ? error.message : "Unknown error"));
    }
  };

  const handleDeleteClick = () => {
    setShowDeleteDialog(true);
    setDeleteConfirmation("");
    setDeleteError(null);
  };

  const handleDeleteCancel = () => {
    setShowDeleteDialog(false);
    setDeleteConfirmation("");
    setDeleteError(null);
  };

  const handleDeleteConfirm = async () => {
    if (deleteConfirmation !== "Delete") {
      setDeleteError("Please type 'Delete' to confirm");
      return;
    }
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const response = await fetch(`/api/flight-records/${id}`, { method: 'DELETE' });
      const result = await response.json();
      if (result.success) {
        setShowDeleteDialog(false);
        // Navigate back to flight records list and ensure a complete page refresh
        window.location.href = '/dashboard/flight-records';
      } else {
        setDeleteError(result.message || "Failed to delete the flight record");
      }
    } catch (error) {
      console.error("Error deleting flight record:", error);
      setDeleteError("An unexpected error occurred");
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4 sm:p-6">
        <Card>
          <CardContent className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !record) {
    return (
      <div className="container mx-auto p-4 sm:p-6">
        <Card>
          <CardContent className="text-center py-8">
            <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-4" />
            <h3 className="text-lg font-medium mb-2">Error</h3>
            <p className="text-muted-foreground mb-4">{error || "Flight record not found."}</p>
            <Button variant="outline" asChild>
              <Link href="/dashboard/flight-records">
                <ChevronLeft className="h-4 w-4 mr-2" />
                Back to Flight Records
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-4xl">
      <Card className="mb-6">
        <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <CardTitle className="text-xl font-semibold">Flight Record</CardTitle>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="destructive"
              size="sm"
              onClick={generatePdf}
              disabled={isGeneratingPdf || loading}
              className="text-white hover:bg-red-400 transition-colors cursor-pointer"
            >
              <PdfIcon className="h-4 w-4 mr-2" />
              {isGeneratingPdf ? "Generating..." : "Export PDF"}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing || loading}
              className="bg-blue-200 text-black hover:bg-blue-300 transition-colors cursor-pointer"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteClick}
              disabled={loading}
              className="bg-destructive text-white hover:bg-red-400 transition-colors cursor-pointer"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/flight-records" className="cursor-pointer">
                <ChevronLeft className="h-4 w-4 mr-2" />
                Back
              </Link>
            </Button>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">General Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Date</p>
                <p className="font-medium">{formatDate(record.date)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Airline</p>
                <p className="font-medium">{record.airline}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Fleet</p>
                <p className="font-medium">{record.fleet}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Flight Number</p>
                <p className="font-medium">{record.flightNumber || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tail</p>
                <p className="font-medium">{record.tail || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Station</p>
                <p className="font-medium">{record.station}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Service</p>
                <p className="font-medium">{record.service}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Technician</p>
                <p className="font-medium">{record.technician || "N/A"}</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-4">Created: {formatDate(record.createdAt)}</p>
          </CardContent>
        </Card>

        {record.hasTime && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Time Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Block Time</p>
                  <p className="font-medium">{record.blockTime || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Out Time</p>
                  <p className="font-medium">{record.outTime || "N/A"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {record.hasDefect && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Defect Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm text-muted-foreground">Log Page No</p>
                  <p className="font-medium">{record.logPageNo || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">System Affected</p>
                  <p className="font-medium">{record.systemAffected || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p className="font-medium">{record.defectStatus || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">RII Required</p>
                  <p className="font-medium">{record.riiRequired ? "Yes" : "No"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Part Replaced</p>
                  <p className="font-medium">{record.hasPartReplaced ? "Yes" : "No"}</p>
                </div>
                {record.riiRequired && record.inspectedBy && (
                  <div>
                    <p className="text-sm text-muted-foreground">Inspected By</p>
                    <p className="font-medium">{record.inspectedBy}</p>
                  </div>
                )}
                {record.hasPartReplaced && record.PartReplacement && record.PartReplacement.length > 0 && (
                  <div className="col-span-2 mt-4">
                    <h3 className="text-sm font-medium mb-4">Part Replacements</h3>
                    <div className="space-y-4">
                      {record.PartReplacement.map((part, index) => (
                        <div key={part.id} className="border rounded-lg p-4 bg-muted/50">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-medium">Part Replacement #{index + 1}</h4>
                            <span className="text-xs text-muted-foreground">
                              {new Date(part.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <div>
                                <p className="text-sm text-muted-foreground">Removed Part</p>
                                <div className="grid grid-cols-2 gap-2 mt-1">
                                  <div>
                                    <p className="text-xs text-muted-foreground">P/N</p>
                                    <p className="font-medium">{part.pnOff || "N/A"}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground">S/N</p>
                                    <p className="font-medium">{part.snOff || "N/A"}</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <div>
                                <p className="text-sm text-muted-foreground">Installed Part</p>
                                <div className="grid grid-cols-2 gap-2 mt-1">
                                  <div>
                                    <p className="text-xs text-muted-foreground">P/N</p>
                                    <p className="font-medium">{part.pnOn || "N/A"}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground">S/N</p>
                                    <p className="font-medium">{part.snOn || "N/A"}</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {record.defectStatus && (
                  <>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {record.defectStatus === "Fixed" ? "Fixing Manual" : "Deferral Manual"}
                      </p>
                      <p className="font-medium">{record.fixingManual || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {record.defectStatus === "Fixed" ? "Fixing Manual Reference" : "Deferral Manual Reference"}
                      </p>
                      <p className="font-medium">{record.manualReference || "N/A"}</p>
                    </div>
                  </>
                )}
              </div>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Discrepancy</p>
                  <p className="bg-muted p-2 rounded text-sm whitespace-pre-wrap">{record.discrepancyNote || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Rectification</p>
                  <p className="bg-muted p-2 rounded text-sm whitespace-pre-wrap">{record.rectificationNote || "N/A"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {record.hasComment && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Comments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-muted p-4 rounded">
                <p className="text-sm whitespace-pre-wrap">
                  {record.comment || "No comment provided"}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {record.hasAttachments && record.Attachment?.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Attachments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {record.Attachment.map((attachment) => (
                  <div key={attachment.id} className="flex items-center justify-between bg-muted p-2 rounded">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{attachment.fileName}</p>
                        <p className="text-xs text-muted-foreground">
                          {attachment.fileType} • {(attachment.fileSize / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadAttachment(attachment)}
                      className="flex items-center gap-2 hover:cursor-pointer"
                    >
                      <Download className="h-4 w-4" />
                      Download
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the flight record
              {record?.hasAttachments && ' and all attached files'}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="confirmation" className="text-destructive font-semibold">
              Type &quot;Delete&quot; to confirm:
            </Label>
            <Input
              id="confirmation"
              className="mt-2"
              value={deleteConfirmation}
              onChange={(e) => setDeleteConfirmation(e.target.value)}
              placeholder="Delete"
            />
            {deleteError && (
              <p className="text-sm text-destructive mt-2">{deleteError}</p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDeleteCancel}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteConfirm}
              disabled={isDeleting || deleteConfirmation !== "Delete"}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}