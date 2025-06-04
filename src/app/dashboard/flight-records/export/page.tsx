"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  ArrowLeft, 
  FileSpreadsheet,
  Filter,
  Download
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DatePickerWithRange from "./date-range-picker";
import { format } from "date-fns";
import * as XLSX from 'xlsx';
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { DateRange } from "react-day-picker";

interface FlightRecord {
  id: string;
  date: string;
  airline: string;
  fleet: string;
  tail: string;
  station: string;
  service: string;
  hasTime: boolean;
  blockTime: string | null;
  outTime: string | null;
  hasDefect: boolean;
  logPageNo: string | null;
  discrepancyNote: string | null;
  rectificationNote: string | null;
  systemAffected: string | null;
  hasAttachments: boolean;
  technician: string | null;
  createdAt: string;
}

interface FilterState {
  dateRange: {
    from: Date | undefined;
    to: Date | undefined;
  };
  airline: string;
  fleet: string;
  station: string;
}

export default function ExportFlightRecordsPage() {
  const [allRecords, setAllRecords] = useState<FlightRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<FlightRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtersApplied, setFiltersApplied] = useState(false);
  const [exporting, setExporting] = useState(false);
  
  // Filtered value lists
  const [uniqueAirlines, setUniqueAirlines] = useState<string[]>([]);
  const [uniqueFleets, setUniqueFleets] = useState<string[]>([]);
  const [uniqueStations, setUniqueStations] = useState<string[]>([]);
  
  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    dateRange: {
      from: undefined,
      to: undefined
    },
    airline: "all_airlines",
    fleet: "all_fleets",
    station: "all_stations"
  });

  // Fetch all flight records
  useEffect(() => {
    const fetchFlightRecords = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/flight-records');
        const data = await response.json();
        
        if (data.success) {
          setAllRecords(data.records);
          
          // Extract unique values for filters
          const airlines = [...new Set(data.records.map((record: FlightRecord) => record.airline))] as string[];
          const fleets = [...new Set(data.records.map((record: FlightRecord) => record.fleet))] as string[];
          const stations = [...new Set(data.records.map((record: FlightRecord) => record.station))] as string[];
          
          setUniqueAirlines(airlines);
          setUniqueFleets(fleets);
          setUniqueStations(stations);
        }
      } catch (error) {
        console.error('Error fetching flight records:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFlightRecords();
  }, []);

  // Format date for display and filtering
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, 'MMM dd, yyyy');
  };

  // Apply filters
  const applyFilters = () => {
    let result = [...allRecords];
    
    // Filter by date range
    if (filters.dateRange.from) {
      result = result.filter(record => {
        const recordDate = new Date(record.date);
        return recordDate >= filters.dateRange.from!;
      });
    }
    
    if (filters.dateRange.to) {
      result = result.filter(record => {
        const recordDate = new Date(record.date);
        return recordDate <= filters.dateRange.to!;
      });
    }
    
    // Filter by airline
    if (filters.airline && filters.airline !== 'all_airlines') {
      result = result.filter(record => record.airline === filters.airline);
    }
    
    // Filter by fleet
    if (filters.fleet && filters.fleet !== 'all_fleets') {
      result = result.filter(record => record.fleet === filters.fleet);
    }
    
    // Filter by station
    if (filters.station && filters.station !== 'all_stations') {
      result = result.filter(record => record.station === filters.station);
    }
    
    setFilteredRecords(result);
    setFiltersApplied(true);
  };

  // Handle filter changes
  const handleFilterChange = (
    key: keyof FilterState,
    value: FilterState[keyof FilterState] | DateRange | undefined
  ) => {
    if (value === undefined) return;
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Generate and download Excel file
  const exportToExcel = () => {
    setExporting(true);
    
    try {
      // Prepare data for export
      const data = filteredRecords.map(record => ({
        ID: record.id,
        Date: formatDate(record.date),
        Airline: record.airline,
        Fleet: record.fleet,
        Tail: record.tail || "N/A",
        Station: record.station,
        Service: record.service,
        "Block Time": record.hasTime && record.blockTime ? record.blockTime : "N/A",
        "Out Time": record.hasTime && record.outTime ? record.outTime : "N/A",
        "Has Defect": record.hasDefect ? "Yes" : "No",
        "Log Page #": record.hasDefect && record.logPageNo ? record.logPageNo : "N/A",
        "System Affected": record.hasDefect && record.systemAffected ? record.systemAffected : "N/A",
        "Discrepancy": record.hasDefect && record.discrepancyNote ? record.discrepancyNote : "N/A",
        "Rectification": record.hasDefect && record.rectificationNote ? record.rectificationNote : "N/A",
        "Technician": record.technician || "N/A",
        "Created At": format(new Date(record.createdAt), 'MMM dd, yyyy HH:mm'),
      }));
      
      // Create workbook and worksheet
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Flight Records");
      
      // Set some column widths
      const maxWidth = 20;
      const columnsWidths = [
        { wch: 12 }, // ID
        { wch: 12 }, // Date
        { wch: 10 }, // Airline
        { wch: 10 }, // Fleet
        { wch: 10 }, // Tail
        { wch: 10 }, // Station
        { wch: 10 }, // Service
        { wch: 10 }, // Block Time
        { wch: 10 }, // Out Time
        { wch: 10 }, // Has Defect
        { wch: 12 }, // Log Page #
        { wch: 15 }, // System Affected
        { wch: maxWidth }, // Discrepancy
        { wch: maxWidth }, // Rectification
        { wch: 15 }, // Technician
        { wch: 20 }, // Created At
      ];
      worksheet['!cols'] = columnsWidths;
      
      // Generate filename
      const dateStr = format(new Date(), 'yyyy-MM-dd');
      const fileName = `flight-records-export-${dateStr}.xlsx`;
      
      // Trigger download
      XLSX.writeFile(workbook, fileName);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
    } finally {
      setExporting(false);
    }
  };

  // Reset filters
  const resetFilters = () => {
    setFilters({
      dateRange: {
        from: undefined,
        to: undefined
      },
      airline: "all_airlines",
      fleet: "all_fleets",
      station: "all_stations"
    });
    setFiltersApplied(false);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {loading ? (
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <>
          <Card className="w-full mb-6">
            <header>
              <div className="w-full max-w-full mx-auto px-4">
                <div className="flex h-16 items-center justify-between w-full">
                  <div>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mr-2" 
                        asChild
                      >
                        <Link href="/dashboard/flight-records">
                          <ArrowLeft size={16} />
                          <span className="ml-1">Back</span>
                        </Link>
                      </Button>
                      <h1 className="text-2xl font-bold">
                        <div className="flex items-center gap-2">
                          <FileSpreadsheet size={24} strokeWidth={1.5} className="text-green-600" />
                          <Badge className="px-3 py-1 text-base bg-green-600 text-white rounded-[4px] border border-black shadow-md">Export Flight Records</Badge>
                        </div>
                      </h1>
                    </div>
                  </div>
                </div>
              </div>
            </header>
          </Card>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label>Date Range</Label>
              <DatePickerWithRange 
                date={filters.dateRange} 
                setDate={(range) => handleFilterChange('dateRange', range)} 
              />
            </div>
            
            <div className="space-y-2">
              <Label>Airline</Label>
              <Select 
                value={filters.airline} 
                onValueChange={(value) => handleFilterChange('airline', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select airline" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_airlines">All Airlines</SelectItem>
                  {uniqueAirlines.map(airline => (
                    <SelectItem key={airline} value={airline}>{airline}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Fleet</Label>
              <Select 
                value={filters.fleet} 
                onValueChange={(value) => handleFilterChange('fleet', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select fleet" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_fleets">All Fleets</SelectItem>
                  {uniqueFleets.map(fleet => (
                    <SelectItem key={fleet} value={fleet}>{fleet}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Station</Label>
              <Select 
                value={filters.station} 
                onValueChange={(value) => handleFilterChange('station', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select station" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_stations">All Stations</SelectItem>
                  {uniqueStations.map(station => (
                    <SelectItem key={station} value={station}>{station}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex gap-2 mt-4">
            <Button 
              onClick={applyFilters} 
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Filter className="mr-2 h-4 w-4" />
              Apply Filters
            </Button>
            
            <Button 
              variant="outline" 
              onClick={resetFilters}
            >
              Reset
            </Button>
          </div>
          
          {filtersApplied && (
            <>
              <Separator className="my-6" />
              
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold mb-4">
                  {filteredRecords.length} Records Found
                </h2>
                
                <Button 
                  onClick={exportToExcel} 
                  className="bg-green-600 hover:bg-green-700 text-white"
                  disabled={filteredRecords.length === 0 || exporting}
                >
                  <Download className="mr-2 h-4 w-4" />
                  {exporting ? "Exporting..." : "Export to Excel"}
                </Button>
              </div>
              
              {filteredRecords.length > 0 ? (
                <div className="border rounded-lg bg-card overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Airline</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fleet</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Station</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Has Defect</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredRecords.slice(0, 20).map((record) => (
                        <tr key={record.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">{formatDate(record.date)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">{record.airline}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">{record.fleet}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">{record.station}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {record.service === 'AOG' ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                {record.service}
                              </span>
                            ) : record.service}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {record.hasDefect ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-yellow-800">
                                Yes
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                No
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredRecords.length > 20 && (
                    <div className="p-4 text-center text-sm text-gray-500">
                      Showing 20 of {filteredRecords.length} records. Export to Excel to see all records.
                    </div>
                  )}
                </div>
              ) : (
                <div className="border rounded-lg p-8 bg-card text-center">
                  <p className="text-muted-foreground">No records match your filter criteria.</p>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
