"use client";

import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import InternalAuditsHeader from './internal-audits-header';

export default function InternalAudits() {
  return (
    <div className="w-full max-w-full mx-auto px-2 pt-1 pb-10">
      <InternalAuditsHeader />
      <div className="space-y-6">
        <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
          <Card>
            <CardHeader className="text-center">
              <CardTitle>Audit Overview</CardTitle>
              <CardDescription className="underline text-rose-500">Recent Internal Audits</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="text-center">
              <CardTitle>Findings Status</CardTitle>
              <CardDescription className="underline text-rose-500">Open vs Closed Findings</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="text-center">
              <CardTitle>Compliance Metrics</CardTitle>
              <CardDescription className="underline text-rose-500">Audit Performance</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    </div>
  );
}
