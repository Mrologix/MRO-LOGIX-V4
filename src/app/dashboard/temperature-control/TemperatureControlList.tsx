"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { Calendar, MapPin, Thermometer, Droplets, User, ChevronLeft, ChevronRight, Eye, MessageSquare, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface TemperatureControlRecord {
  id: string;
  date: string;
  location: string;
  customLocation?: string;
  time: string;
  temperature: number;
  humidity: number;
  employeeName: string;
  hasComment: boolean;
  comment?: string;
  createdAt: string;
}

interface ConfigData {
  tempNormalMin: number;
  tempNormalMax: number;
  tempMediumMin: number;
  tempMediumMax: number;
  tempHighMin: number;
  humidityNormalMin: number;
  humidityNormalMax: number;
  humidityMediumMin: number;
  humidityMediumMax: number;
  humidityHighMin: number;
}

interface TemperatureControlListProps {
  refreshTrigger?: number;
  config: ConfigData;
}

export function TemperatureControlList({ refreshTrigger, config }: TemperatureControlListProps) {
  const [records, setRecords] = useState<TemperatureControlRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedComment, setSelectedComment] = useState<{
    comment: string;
    recordId: string;
    hasComment: boolean;
  } | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<string | null>(null);
  const { toast } = useToast();

  const limit = 10;

  const fetchRecords = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: limit.toString(),
      });

      const response = await fetch(`/api/temperature-control?${params}`);
      const result = await response.json();

      if (result.success) {
        setRecords(result.data.records);
        setTotalPages(result.data.pagination.totalPages);
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch temperature control records",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to fetch temperature control records",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [currentPage, toast]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords, refreshTrigger]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };
  const formatTime = (timeString: string) => {
    return timeString; // Return the time as-is from the form (24-hour format)
  };

  const getLocationDisplay = (location: string, customLocation?: string) => {
    return location === 'Other' && customLocation ? customLocation : location;
  };
  const getTemperatureColor = (temp: number) => {
    if (temp >= config.tempNormalMin && temp <= config.tempNormalMax) return "text-blue-600"; // Normal
    if (temp >= config.tempMediumMin && temp <= config.tempMediumMax) return "text-yellow-600"; // Medium
    return "text-red-600"; // High
  };

  const getHumidityColor = (humidity: number) => {
    if (humidity >= config.humidityNormalMin && humidity <= config.humidityNormalMax) return "text-blue-600"; // Normal
    if (humidity >= config.humidityMediumMin && humidity <= config.humidityMediumMax) return "text-yellow-600"; // Medium
    return "text-red-600"; // High
  };

  const handleDelete = async (recordId: string) => {
    if (deleteConfirmation !== "Delete") {
      toast({
        title: "Error",
        description: "Please type 'Delete' to confirm",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch(`/api/temperature-control?id=${recordId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Record deleted successfully",
        });
        setIsDeleteDialogOpen(false);
        setDeleteConfirmation("");
        setRecordToDelete(null);
        setSelectedComment(null);
        fetchRecords(); // Refresh the list
      } else {
        toast({
          title: "Error",
          description: "Failed to delete record",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to delete record",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {/* Loading Stats Card */}
        <div className="mb-4">
          <Card className="shadow-sm animate-pulse">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-12"></div>
                </div>
                <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="grid gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {/* Records List */}
      {records.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <Thermometer className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Temperature Records Found</h3>
            <p className="text-muted-foreground">
              Start by adding your first temperature record.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4">
            {records.map((record) => (
              <Card key={record.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
                    {/* Date & Time */}
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      <div>
                        <p className="text-xs font-medium">Date & Time</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(record.date)} at {formatTime(record.time)}
                        </p>
                      </div>
                    </div>

                    {/* Location */}
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                      <div>
                        <p className="text-xs font-medium">Location</p>
                        <p className="text-xs text-muted-foreground">
                          {getLocationDisplay(record.location, record.customLocation)}
                        </p>
                      </div>
                    </div>

                    {/* Temperature */}
                    <div className="flex items-center gap-2">
                      <Thermometer className="h-3 w-3 text-muted-foreground" />
                      <div>
                        <p className="text-xs font-medium">Temperature</p>
                        <p className={`text-xs font-semibold ${getTemperatureColor(record.temperature)}`}>
                          {record.temperature}°C
                        </p>
                      </div>
                    </div>

                    {/* Humidity */}
                    <div className="flex items-center gap-2">
                      <Droplets className="h-3 w-3 text-muted-foreground" />
                      <div>
                        <p className="text-xs font-medium">Humidity</p>
                        <p className={`text-xs font-semibold ${getHumidityColor(record.humidity)}`}>
                          {record.humidity}%
                        </p>
                      </div>
                    </div>
                    {/* Employee */}
                    <div className="flex items-center gap-2">
                      <User className="h-3 w-3 text-muted-foreground" />
                      <div>
                        <p className="text-xs font-medium">Recorded by</p>
                        <p className="text-xs text-muted-foreground">{record.employeeName}</p>
                      </div>
                    </div>
                    {/* Comments */}
                    <div className="flex items-center justify-center">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-3 text-xs"
                        onClick={() => {
                          setSelectedComment({
                            comment: record.comment || "",
                            recordId: record.id,
                            hasComment: record.hasComment
                          });
                        }}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <div className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Comment Dialog */}
      <Dialog open={!!selectedComment} onOpenChange={() => setSelectedComment(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Comment Details
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  setRecordToDelete(selectedComment?.recordId || null);
                  setIsDeleteDialogOpen(true);
                }}
                className="flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Delete Record
              </Button>
            </DialogTitle>
            <DialogDescription>
              Record ID: {selectedComment?.recordId}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {selectedComment?.hasComment && selectedComment?.comment ? (
              <div className="bg-muted/30 p-4 rounded-lg">
                <p className="text-sm leading-relaxed">{selectedComment.comment}</p>
              </div>
            ) : (
              <div className="text-center py-8">
                <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">No comments available for this record.</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this record? This action cannot be undone.
              Type &quot;Delete&quot; to confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Input
              placeholder="Type 'Delete' to confirm"
              value={deleteConfirmation}
              onChange={(e) => setDeleteConfirmation(e.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setIsDeleteDialogOpen(false);
              setDeleteConfirmation("");
              setRecordToDelete(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <Button variant="destructive" onClick={() => recordToDelete && handleDelete(recordToDelete)}>
              Delete
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
