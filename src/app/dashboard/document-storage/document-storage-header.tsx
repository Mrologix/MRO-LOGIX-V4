"use client";

import React from 'react';
import { DatabaseBackup } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

const DocumentStorageHeader = () => {
  return (
    <Card className="w-full mb-6">
      <header>
        <div className="w-full max-w-full mx-auto px-4">
          <div className="flex h-16 items-center w-full">
            <div>
              <h1 className="text-2xl font-bold">
                <div className="flex items-center gap-2">
                  <DatabaseBackup size={24} strokeWidth={1.5} className="text-[#6366f1]" />
                  <Badge className="px-3 py-1 text-base bg-[#6366f1] text-white rounded-[4px] border border-black shadow-md">Document Storage</Badge>
                </div>
              </h1>
            </div>
          </div>
        </div>
      </header>
    </Card>
  );
};

export default DocumentStorageHeader;
