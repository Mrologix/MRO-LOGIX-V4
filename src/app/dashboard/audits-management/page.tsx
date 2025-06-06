"use client";

import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import AuditsManagementHeader from './audits-management-header';

export default function AuditsManagement() {
  return (
    <div className="w-full max-w-full mx-auto px-2 pt-1 pb-10">
      <AuditsManagementHeader />
      <div className="space-y-6">
        <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
          <Card>
            <CardHeader className="text-center">
              <CardTitle>Audit Overview</CardTitle>
              <CardDescription className="underline text-rose-500">Recent Audits & Inspections</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="text-center">
              <CardTitle>Audit Findings</CardTitle>
              <CardDescription className="underline text-rose-500">Critical vs Non-Critical Issues</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="text-center">
              <CardTitle>Compliance Metrics</CardTitle>
              <CardDescription className="underline text-rose-500">Audit Performance & Compliance</CardDescription>
            </CardHeader>
          </Card>
        </div>
        
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4 mt-6">
          <Card>
            <CardHeader className="text-center">
              <CardTitle>Internal Audits</CardTitle>
              <CardDescription className="underline text-blue-500">Quality & Compliance Audits</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="text-center">
              <CardTitle>External Audits</CardTitle>
              <CardDescription className="underline text-green-500">Regulatory & Customer Audits</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="text-center">
              <CardTitle>Safety Audits</CardTitle>
              <CardDescription className="underline text-orange-500">SMS & Safety Management</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="text-center">
              <CardTitle>Audit Schedule</CardTitle>
              <CardDescription className="underline text-purple-500">Planned & Upcoming Audits</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    </div>
  );
} 