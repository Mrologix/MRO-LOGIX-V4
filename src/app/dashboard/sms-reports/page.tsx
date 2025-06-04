"use client";

import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import SMSReportsHeader from './sms-reports-header';

export default function SMSReports() {
  return (
    <div className="w-full max-w-full mx-auto px-2 pt-1 pb-10">
      <SMSReportsHeader />
      <div className="space-y-6">
        <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
          <Card>
            <CardHeader className="text-center">
              <CardTitle>Safety Reports Overview</CardTitle>
              <CardDescription className="underline text-rose-500">Monthly Safety Statistics</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="text-center">
              <CardTitle>Risk Assessment</CardTitle>
              <CardDescription className="underline text-rose-500">Risk Level Distribution</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="text-center">
              <CardTitle>Incident Categories</CardTitle>
              <CardDescription className="underline text-rose-500">Type of Safety Events</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    </div>
  );
} 