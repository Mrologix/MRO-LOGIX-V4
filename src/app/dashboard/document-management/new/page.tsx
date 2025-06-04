"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function NewManualPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData(e.currentTarget);
      
      // Debug log to check form data
      console.log("Form data before submission:", {
        name: formData.get('name'),
        number: formData.get('number'),
        revision: formData.get('revision'),
        revisionDate: formData.get('revisionDate'),
        description: formData.get('description'),
        keywords: formData.get('keywords'),
        file: file ? {
          name: file.name,
          type: file.type,
          size: file.size
        } : null
      });

      if (file) {
        formData.append("file", file);
      }

      // Convert the date to UTC noon to avoid timezone issues
      const revisionDateStr = formData.get('revisionDate') as string;
      if (!revisionDateStr) {
        toast({
          title: "Error",
          description: "Revision date is required",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
      const [year, month, day] = revisionDateStr.split('-').map(Number);
      if (!year || !month || !day || isNaN(year) || isNaN(month) || isNaN(day)) {
        toast({
          title: "Error",
          description: "Invalid revision date format",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
      // Do NOT convert to ISO string, just send the raw value
      // formData.set('revisionDate', revisionDate.toISOString());
      // The value is already in YYYY-MM-DD format, which backend expects

      // Debug log to check form data after date conversion
      console.log("Form data after date conversion:", {
        name: formData.get('name'),
        number: formData.get('number'),
        revision: formData.get('revision'),
        revisionDate: formData.get('revisionDate'),
        description: formData.get('description'),
        keywords: formData.get('keywords'),
        file: file ? {
          name: file.name,
          type: file.type,
          size: file.size
        } : null
      });

      const response = await fetch("/api/manuals", {
        method: "POST",
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create manual");
      }

      const data = await response.json();
      toast({
        title: "Success",
        description: "Manual created successfully",
      });
      router.push("/dashboard/document-management");
    } catch (error) {
      console.error("Error creating manual:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create manual",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  return (
    <div className="container max-w-2xl py-6">
      <Card>
        <CardHeader>
          <CardTitle>Create New Manual</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Document Name</Label>
              <Input
                id="name"
                name="name"
                required
                placeholder="Enter document name"
                aria-required="true"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="number">Document Number</Label>
              <Input
                id="number"
                name="number"
                required
                placeholder="Enter document number"
                aria-required="true"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="revision">Manual Revision</Label>
              <Input
                id="revision"
                name="revision"
                required
                placeholder="Enter revision number (e.g., 1.0, 2.1)"
                aria-required="true"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="revisionDate">Revision Date</Label>
              <Input
                id="revisionDate"
                name="revisionDate"
                type="date"
                required
                aria-required="true"
                // Set default to today's date in YYYY-MM-DD format
                defaultValue={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Enter document description"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="keywords">Keywords (comma-separated)</Label>
              <Input
                id="keywords"
                name="keywords"
                placeholder="Enter keywords separated by commas"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="file">Document File (Optional)</Label>
              <Input
                id="file"
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={handleFileChange}
              />
              <p className="text-sm text-muted-foreground">
                Supported formats: PDF, DOC, DOCX
              </p>
            </div>

            <div className="flex justify-end space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Manual
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
} 