"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, PlaneTakeoff, Users, Wrench } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  username: string;
}

interface TopSystemAffected {
  name: string;
  count: number;
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [flightRecordsCount, setFlightRecordsCount] = useState(0);
  const [monthlyFlightCount, setMonthlyFlightCount] = useState(0);
  const [currentMonth, setCurrentMonth] = useState('');
  const [usersCount, setUsersCount] = useState(0);
  const [stationsCount, setStationsCount] = useState(0);
  const [topSystemsAffected, setTopSystemsAffected] = useState<TopSystemAffected[]>([]);
  const [times, setTimes] = useState({
    utc: {
      time: new Date().toLocaleTimeString('en-US', { timeZone: 'UTC', hour12: false }),
      date: new Date().toLocaleDateString('en-US', { timeZone: 'UTC', year: 'numeric', month: 'short', day: 'numeric' }),
      seconds: new Date().getUTCSeconds()
    },
    local: {
      time: new Date().toLocaleTimeString('en-US', { hour12: false }),
      date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
      seconds: new Date().getSeconds()
    },
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  });

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await fetch("/api/auth/check");
        const data = await response.json();
        
        if (response.ok && data.user) {
          setUser(data.user);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        toast.error("Failed to load user data");
      } finally {
        setLoading(false);
      }
    };

    const fetchFlightRecordsCount = async () => {
      try {
        const response = await fetch('/api/flight-records');
        const data = await response.json();
        
        if (data.success) {
          setFlightRecordsCount(data.records.length);
        }
      } catch (error) {
        console.error('Error fetching flight records count:', error);
      }
    };

    const fetchMonthlyFlightCount = async () => {
      try {
        const response = await fetch('/api/flight-records/monthly-count');
        const data = await response.json();
        
        if (data.success) {
          setMonthlyFlightCount(data.count);
          setCurrentMonth(data.month);
        }
      } catch (error) {
        console.error('Error fetching monthly flight count:', error);
      }
    };

    const fetchUsersCount = async () => {
      try {
        const response = await fetch('/api/users');
        const data = await response.json();

        if (data.success) {
          setUsersCount(data.count);
        }
      } catch (error) {
        console.error('Error fetching users count:', error);
      }
    };

    const fetchStationsCount = async () => {
      try {
        const response = await fetch('/api/flight-records/stations-count');
        const data = await response.json();
        
        if (data.success) {
          setStationsCount(data.count);
        }
      } catch (error) {
        console.error('Error fetching stations count:', error);
      }
    };

    const fetchTopSystemAffected = async () => {
      try {
        const response = await fetch('/api/defect-analytics');
        const data = await response.json();
        
        if (data.success && data.data?.topSystemsAffected) {
          setTopSystemsAffected(data.data.topSystemsAffected);
        }
      } catch (error) {
        console.error('Error fetching top systems affected:', error);
      }
    };

    fetchUserData();
    fetchFlightRecordsCount();
    fetchMonthlyFlightCount();
    fetchUsersCount();
    fetchStationsCount();
    fetchTopSystemAffected();

    // Update time every second
    const timer = setInterval(() => {
      const now = new Date();
      setTimes({
        utc: {
          time: now.toLocaleTimeString('en-US', { timeZone: 'UTC', hour12: false }),
          date: now.toLocaleDateString('en-US', { timeZone: 'UTC', year: 'numeric', month: 'short', day: 'numeric' }),
          seconds: now.getUTCSeconds()
        },
        local: {
          time: now.toLocaleTimeString('en-US', { hour12: false }),
          date: now.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
          seconds: now.getSeconds()
        },
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full mx-auto px-4 py-10">
      <div className="space-y-6">
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="h-[210px]">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">
                UTC Time
              </CardTitle>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-muted-foreground"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {times.utc.time}
              </div>
              <div className="text-sm text-muted-foreground mt-1">{times.utc.date}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Universal Coordinated Time
              </p>
            </CardContent>
          </Card>

          <Card className="h-[210px]">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">
                Local Time
              </CardTitle>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-muted-foreground"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {times.local.time}
              </div>
              <div className="text-sm text-muted-foreground mt-1">{times.local.date}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {times.timezone.replace('_', ' ')}
              </p>
            </CardContent>
          </Card>

          <Link href="/dashboard/data-analytics" className="block">
            <Card className="group transition-all duration-200 hover:bg-primary/5 hover:shadow-md hover:border-primary/30 hover:cursor-pointer h-[210px]">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">
                  Data Analytics
                </CardTitle>
                <PlaneTakeoff className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">Analytics</div>
                <p className="text-xs text-muted-foreground">
                  Analyze all the Trends in your MRO
                </p>
                <div className="mt-2 text-xs text-primary font-medium">
                  View analytics →
                </div>
              </CardContent>
            </Card>
          </Link>
          
          <Card className="bg-blue-50/50 dark:bg-blue-950/20 h-[210px]">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">
                Active Stations
              </CardTitle>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-muted-foreground"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stationsCount}</div>
              <p className="text-xs text-muted-foreground">
                Stations with flight records
              </p>
            </CardContent>
          </Card>
          
          <Link href="/dashboard/flight-records" className="block">
            <Card className="group transition-all duration-200 hover:bg-primary/5 hover:shadow-md hover:border-primary/30 hover:cursor-pointer bg-green-50/50 dark:bg-green-950/20 h-[210px]">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">
                  Flights Recorded
                </CardTitle>
                <PlaneTakeoff className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{flightRecordsCount}</div>
                <p className="text-xs text-muted-foreground">
                  Total flight records
                </p>
                <div className="mt-2 text-xs text-primary font-medium">
                  View all records →
                </div>
              </CardContent>
            </Card>
          </Link>

          <Card className="bg-green-50/50 dark:bg-green-950/20 h-[210px]">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">
                Monthly Flights
              </CardTitle>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-muted-foreground"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{monthlyFlightCount}</div>
              <p className="text-xs text-muted-foreground">
                Flights in {currentMonth}
              </p>
            </CardContent>
          </Card>
          
          <Card className="bg-pink-50/50 dark:bg-pink-950/20 h-[210px]">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">
                Team Members
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{usersCount}</div>
              <p className="text-xs text-muted-foreground">
                Active team members
              </p>
            </CardContent>
          </Card>

          <Link href="/dashboard/fleet-analytics" className="block">
            <Card className="group transition-all duration-200 hover:bg-primary/5 hover:shadow-md hover:border-primary/30 hover:cursor-pointer bg-red-50/50 dark:bg-red-950/20 h-[210px]">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-bold">
                  Top Systems Affected
                </CardTitle>
                <Wrench className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
              </CardHeader>
              <CardContent className="space-y-3">
                {topSystemsAffected.length > 0 ? (
                  topSystemsAffected.map((system, index) => (
                    <div key={system.name} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-muted-foreground">#{index + 1}</span>
                        <span className="text-sm hidden md:block">{system.name.split(' ')[0]}</span>
                        <span className="text-sm block md:hidden">{system.name}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">{system.count} defects</span>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-muted-foreground">No data available</div>
                )}
                <div className="mt-2 text-xs text-primary font-medium">
                  View fleet analytics →
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Common tasks you can perform from your dashboard
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2">
              <Button variant="outline" className="w-full justify-between" asChild>
                <Link href="/dashboard/flight-records">
                  Add Flight Record <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-between">
                Schedule Maintenance <ArrowRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" className="w-full justify-between">
                Upload Document <ArrowRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" className="w-full justify-between">
                Invite Team Member <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
              <CardDescription>
                Your profile and account details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="space-y-1">
                <p className="text-sm font-medium">Name</p>
                <p className="text-sm text-muted-foreground">
                  {user?.firstName} {user?.lastName}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Email</p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Username</p>
                <p className="text-sm text-muted-foreground">{user?.username}</p>
              </div>
              <div className="pt-2">
                <Link href="/profile">
                  <Button variant="outline" className="w-full justify-between">
                    Edit Profile <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 