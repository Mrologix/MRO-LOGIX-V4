"use client";

import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import SMSAuditsHeader from './sms-audits-header';

export default function SMSAudits() {
  return (
    <div className="w-full max-w-full mx-auto px-2 pt-1 pb-10">
      <SMSAuditsHeader />
      <div className="space-y-6">
        <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
          <Card>
            <CardHeader className="text-center">
              <CardTitle>Safety Audit Overview</CardTitle>
              <CardDescription className="underline text-rose-500">Recent SMS Audits</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="text-center">
              <CardTitle>Safety Findings</CardTitle>
              <CardDescription className="underline text-rose-500">Critical vs Non-Critical Issues</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="text-center">
              <CardTitle>Safety Metrics</CardTitle>
              <CardDescription className="underline text-rose-500">Safety Performance Indicators</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    </div>
  );
} 