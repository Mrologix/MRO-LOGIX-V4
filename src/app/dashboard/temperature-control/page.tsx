"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, ThermometerSnowflake, Thermometer, Droplets } from "lucide-react";
import { AddTemperatureControlForm } from "./AddTemperatureControlForm";
import { TemperatureControlList } from "./TemperatureControlList";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TemperatureControlPage() {
  const [showForm, setShowForm] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [totalRecords, setTotalRecords] = useState(0);

  useEffect(() => {
    // Fetch the total number of records
    const fetchTotalRecords = async () => {
      try {
        const response = await fetch('/api/temperature-control?count=true');
        const data = await response.json();
        if (data.success) {
          setTotalRecords(data.data.total || 0);
        }
      } catch (error) {
        console.error('Error fetching total records:', error);
      }
    };
    
    fetchTotalRecords();
  }, [refreshTrigger]);

  const handleFormClose = () => {
    setShowForm(false);
    // Trigger a refresh of the list when form is closed (after successful submission)
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <ThermometerSnowflake className="h-6 w-6" />
          <h1 className="text-3xl font-bold">Temperature Control</h1>
        </div>
        <Button 
          onClick={() => setShowForm(true)}
          className="bg-white text-black border border-black hover:bg-gray-50"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Temperature
        </Button>
      </div>

      {/* Range Indicator Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">        {/* Total Records Stats Card */}
        <Card className="shadow-sm">
          <CardHeader className="py-2">
            <CardTitle className="text-sm flex items-center">
              <ThermometerSnowflake className="h-4 w-4 mr-1" />
              Records Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="py-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium">Total Records</span>
              <span className="text-lg font-bold text-primary">{totalRecords}</span>
            </div>
          </CardContent>
        </Card>

        {/* Temperature Range Cards */}
        <Card className="shadow-sm">
          <CardHeader className="py-2">
            <CardTitle className="text-sm flex items-center">
              <Thermometer className="h-4 w-4 mr-1" />
              Temperature Ranges
            </CardTitle>
          </CardHeader>
          <CardContent className="py-2">
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-xs">Normal:</span>
                <span className="text-xs font-semibold text-blue-600">0-24°C</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs">Medium:</span>
                <span className="text-xs font-semibold text-yellow-600">25-35°C</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs">High:</span>
                <span className="text-xs font-semibold text-red-600">Above 35°C</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Humidity Range Cards */}
        <Card className="shadow-sm">
          <CardHeader className="py-2">
            <CardTitle className="text-sm flex items-center">
              <Droplets className="h-4 w-4 mr-1" />
              Humidity Ranges
            </CardTitle>
          </CardHeader>
          <CardContent className="py-2">
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-xs">Normal:</span>
                <span className="text-xs font-semibold text-blue-600">0-35%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs">Medium:</span>
                <span className="text-xs font-semibold text-yellow-600">36-65%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs">High:</span>
                <span className="text-xs font-semibold text-red-600">Above 65%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {showForm && (
        <AddTemperatureControlForm onClose={handleFormClose} />
      )}      {/* Temperature Control Records List */}
      <div className="mt-8">
        <TemperatureControlList refreshTrigger={refreshTrigger} />
      </div>
    </div>
  );
}
