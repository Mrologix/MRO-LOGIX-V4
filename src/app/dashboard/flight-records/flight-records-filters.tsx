"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { FilterIcon, SearchIcon, RefreshCwIcon } from "lucide-react";

interface FlightRecordsFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  stationFilter: string;
  onStationFilterChange: (value: string) => void;
  serviceFilter: string;
  onServiceFilterChange: (value: string) => void;
  defectFilter: string;
  onDefectFilterChange: (value: string) => void;
  onRefresh: () => void;
  loading: boolean;
  stationList: string[];
  serviceList: string[];
}

export function FlightRecordsFilters({
  searchTerm,
  onSearchChange,
  stationFilter,
  onStationFilterChange,
  serviceFilter,
  onServiceFilterChange,
  defectFilter,
  onDefectFilterChange,
  onRefresh,
  loading,
  stationList,
  serviceList
}: FlightRecordsFiltersProps) {
  return (
    <Card>
      <CardHeader className="py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FilterIcon className="h-4 w-4" />
            <CardTitle className="text-base">Filters & Search</CardTitle>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onStationFilterChange("all_stations");
                onServiceFilterChange("all_services");
                onDefectFilterChange("all_defects");
                onSearchChange("");
              }}
            >
              Clear All
            </Button>
            <Button onClick={onRefresh} disabled={loading} variant="outline" size="sm">
              <RefreshCwIcon className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="py-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium">Search</label>
            <div className="relative">
              <SearchIcon className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search records..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium">Station</label>
            <Select value={stationFilter} onValueChange={onStationFilterChange}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="All stations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all_stations">All Stations</SelectItem>
                {stationList.map((station) => (
                  <SelectItem key={station} value={station}>{station}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium">Service Type</label>
            <Select value={serviceFilter} onValueChange={onServiceFilterChange}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="All services" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all_services">All Services</SelectItem>
                {serviceList.map((service) => (
                  <SelectItem key={service} value={service}>{service}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium">Defect Status</label>
            <Select value={defectFilter} onValueChange={onDefectFilterChange}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="All status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all_defects">All Status</SelectItem>
                <SelectItem value="with_defects">With Defects</SelectItem>
                <SelectItem value="no_defects">No Defects</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 