"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import { PlusCircle, FileBarChart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

const SMSReportsHeader = () => {
  return (
    <Card className="w-full mb-6">
      <header>
        <div className="w-full max-w-full mx-auto px-4">
          <div className="flex h-16 items-center justify-between w-full">
            <div>
              <h1 className="text-2xl font-bold">
                <div className="flex items-center gap-2">
                  <FileBarChart size={24} strokeWidth={1.5} className="text-[#f43f5e]" />
                  <Badge className="px-3 py-1 text-base bg-[#f43f5e] text-white rounded-[4px] border border-black shadow-md">SMS Reports</Badge>
                </div>
              </h1>
            </div>
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <PlusCircle size={16} />
              New Report
            </Button>
          </div>
        </div>
      </header>
    </Card>
  );
};

export default SMSReportsHeader; 