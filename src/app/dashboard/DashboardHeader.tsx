"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LogOut, Menu, X } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function DashboardHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [showSignOutDialog, setShowSignOutDialog] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  
  // Check if current page is Gantt Chart Schedule
  const isGanttChartPage = pathname === "/dashboard/gantt-chart-schedule";

  const handleSignOut = async () => {
    try {
      setSigningOut(true);
      const response = await fetch("/api/signout", {
        method: "POST",
      });
      
      if (response.ok) {
        toast.success("Signed out successfully");
        router.push("/signin");
      } else {
        throw new Error("Failed to sign out");
      }
    } catch (error) {
      console.error("Error signing out:", error);
      toast.error("Failed to sign out");
    } finally {
      setSigningOut(false);
      setShowSignOutDialog(false);
    }
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <header className="bg-background border-b border-border sticky top-0 z-40 w-full">
      <div className="w-full max-w-full mx-auto px-4">
        <div className="flex h-16 items-center justify-between w-full">
          <div className="flex items-center gap-2">
            {!isGanttChartPage && <SidebarTrigger className="flex size-8 mr-1" />}
            <Link href="/dashboard" className="font-bold text-xl">
              MRO Logix
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link href="/dashboard" className="text-sm font-medium hover:text-primary">
              Dashboard
            </Link>
            <Link href="/dashboard/fleet-analytics" className="text-sm font-medium hover:text-primary">
              Aircraft
            </Link>
            <Link href="/dashboard/maintenance" className="text-sm font-medium hover:text-primary">
              Maintenance
            </Link>
            <Link href="/dashboard/documents" className="text-sm font-medium hover:text-primary">
              Documents
            </Link>
            <Link href="/dashboard/ai-chat" className="text-sm font-medium hover:text-primary">
              Chat Assistant
            </Link>
            
            <ThemeToggle />
            
            <Dialog open={showSignOutDialog} onOpenChange={setShowSignOutDialog}>
              <DialogTrigger asChild>
                <Button 
                  variant="outline" 
                  className="flex items-center gap-2"
                >
                  Sign out <LogOut className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Sign out confirmation</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to sign out of your account?
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className="mt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowSignOutDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleSignOut}
                    disabled={signingOut}
                    className="ml-2"
                  >
                    {signingOut ? "Signing out..." : "Sign out"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </nav>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={toggleMenu}
              aria-label="Toggle menu"
            >
              {isMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="md:hidden border-t border-border w-full">
          <div className="w-full max-w-full mx-auto px-4 py-4 space-y-2">
            <Link 
              href="/dashboard" 
              className="block py-2 text-sm font-medium hover:text-primary"
              onClick={() => setIsMenuOpen(false)}
            >
              Dashboard
            </Link>
            <Link 
              href="/dashboard/fleet-analytics" 
              className="block py-2 text-sm font-medium hover:text-primary"
              onClick={() => setIsMenuOpen(false)}
            >
              Aircraft
            </Link>
            <Link 
              href="/dashboard/maintenance" 
              className="block py-2 text-sm font-medium hover:text-primary"
              onClick={() => setIsMenuOpen(false)}
            >
              Maintenance
            </Link>
            <Link 
              href="/dashboard/documents" 
              className="block py-2 text-sm font-medium hover:text-primary"
              onClick={() => setIsMenuOpen(false)}
            >
              Documents
            </Link>
            <Link 
              href="/dashboard/ai-chat" 
              className="block py-2 text-sm font-medium hover:text-primary"
              onClick={() => setIsMenuOpen(false)}
            >
              AI Chat
            </Link>
            
            <div className="flex items-center justify-between py-2">
              <span className="text-sm font-medium">Theme</span>
              <ThemeToggle />
            </div>
            
            <Dialog open={showSignOutDialog} onOpenChange={setShowSignOutDialog}>
              <DialogTrigger asChild>
                <Button 
                  variant="outline" 
                  className="flex items-center gap-2 w-full mt-4"
                >
                  Sign out <LogOut className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Sign out confirmation</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to sign out of your account?
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className="mt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowSignOutDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleSignOut}
                    disabled={signingOut}
                    className="ml-2"
                  >
                    {signingOut ? "Signing out..." : "Sign out"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      )}
    </header>
  );
} 