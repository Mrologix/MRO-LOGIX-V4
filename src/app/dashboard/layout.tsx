"use client";

import { useEffect, useState, ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Toaster } from "sonner";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import DashboardHeader from "@/app/dashboard/DashboardHeader";
import { ToastProvider } from '@/components/ui/use-toast';

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  
  // Check if current page is Gantt Chart Schedule
  const isGanttChartPage = pathname === "/dashboard/gantt-chart-schedule";

  useEffect(() => {
    // Check if user is logged in
    const checkAuth = async () => {
      try {
        const response = await fetch("/api/auth/check", {
          method: "GET",
        });

        if (!response.ok) {
          throw new Error("Not authenticated");
        }

        setLoading(false);
      } catch {
        // Redirect to sign in page if not authenticated
        router.push("/signin");
      }
    };

    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <ToastProvider>
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          {!isGanttChartPage && <AppSidebar />}
          <div className={`flex-1 flex flex-col w-full ${isGanttChartPage ? 'ml-0' : ''}`}>
            <DashboardHeader />
            <main className="flex-grow p-4 w-full">
              {children}
            </main>
          </div>
        </div>
        <Toaster position="top-right" />
      </SidebarProvider>
    </ToastProvider>
  );
}