"use client";

import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface IncomingInspectionsHeaderProps {
  onAddNew: () => void;
}

export function IncomingInspectionsHeader({ onAddNew }: IncomingInspectionsHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Incoming Inspections</h1>
        <p className="text-muted-foreground">
          Manage and track incoming part inspections
        </p>
      </div>
      <Button onClick={onAddNew}>
        <Plus className="h-4 w-4 mr-2" />
        Add New Inspection
      </Button>
    </div>
  );
} 