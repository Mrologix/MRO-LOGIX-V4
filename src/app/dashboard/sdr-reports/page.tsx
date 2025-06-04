"use client";

import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import SDRReportsHeader from './sdr-reports-header';

export default function SDRReports() {
  return (
    <div className="w-full max-w-full mx-auto px-2 pt-1 pb-10">
      <SDRReportsHeader />
      <div className="space-y-6">
        <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
          <Card>
            <CardHeader className="text-center">
              <CardTitle>Service Difficulty Overview</CardTitle>
              <CardDescription className="underline text-rose-500">Recent SDR Submissions</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="text-center">
              <CardTitle>Component Analysis</CardTitle>
              <CardDescription className="underline text-rose-500">Affected Systems & Parts</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="text-center">
              <CardTitle>Defect Trends</CardTitle>
              <CardDescription className="underline text-rose-500">Recurring Issues & Patterns</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    </div>
  );
} 