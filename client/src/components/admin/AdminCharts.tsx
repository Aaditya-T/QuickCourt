import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, TrendingUp, CheckCircle, PieChart, RefreshCw } from "lucide-react";

// Chart.js imports
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Chart } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function AdminCharts() {
  const [chartTypes, setChartTypes] = useState({
    booking: 'bar' as 'bar' | 'line',
    user: 'bar' as 'bar' | 'line',
    facility: 'bar' as 'bar' | 'line',
    earnings: 'bar' as 'bar' | 'line'
  });

  const toggleChart = (chartName: keyof typeof chartTypes) => {
    setChartTypes(prev => ({
      ...prev,
      [chartName]: prev[chartName] === 'bar' ? 'line' : 'bar'
    }));
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#374151',
          font: {
            size: 12,
            weight: 500 as const
          },
          padding: 20,
          usePointStyle: true
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: false
      }
    },
    scales: {
      x: {
        ticks: {
          color: '#6b7280',
          font: {
            size: 11
          }
        },
        grid: {
          color: '#f3f4f6',
          borderColor: '#e5e7eb'
        }
      },
      y: {
        beginAtZero: true,
        ticks: {
          color: '#6b7280',
          font: {
            size: 11
          }
        },
        grid: {
          color: '#f3f4f6',
          borderColor: '#e5e7eb'
        }
      }
    },
    elements: {
      bar: {
        borderRadius: 4,
        borderSkipped: false
      }
    }
  };

  const bookingData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    datasets: [{
      label: 'Bookings',
      data: [45, 52, 48, 61, 55, 67, 73, 69, 78, 85, 92, 88],
      borderColor: '#3b82f6',
      backgroundColor: chartTypes.booking === 'line' ? 'rgba(59, 130, 246, 0.1)' : '#3b82f6',
      tension: 0.4,
      borderWidth: 2,
      pointBackgroundColor: '#3b82f6',
      pointBorderColor: '#ffffff',
      pointBorderWidth: 2,
      pointRadius: 4,
      fill: chartTypes.booking === 'line'
    }]
  };

  const userData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    datasets: [{
      label: 'New Users',
      data: [12, 15, 18, 22, 28, 35, 42, 38, 45, 52, 58, 65],
      backgroundColor: chartTypes.user === 'line' ? 'rgba(34, 197, 94, 0.1)' : '#22c55e',
      borderColor: '#22c55e',
      borderWidth: 2,
      tension: 0.4,
      pointBackgroundColor: '#22c55e',
      pointBorderColor: '#ffffff',
      pointBorderWidth: 2,
      pointRadius: 4,
      fill: chartTypes.user === 'line'
    }]
  };

  const facilityData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    datasets: [{
      label: 'Approved Facilities',
      data: [3, 5, 4, 7, 6, 8, 9, 11, 10, 12, 14, 13],
      backgroundColor: chartTypes.facility === 'line' ? 'rgba(168, 85, 247, 0.1)' : '#a855f7',
      borderColor: '#a855f7',
      borderWidth: 2,
      tension: 0.4,
      pointBackgroundColor: '#a855f7',
      pointBorderColor: '#ffffff',
      pointBorderWidth: 2,
      pointRadius: 4,
      fill: chartTypes.facility === 'line'
    }]
  };

  const earningsData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    datasets: [{
      label: 'Earnings (₹)',
      data: [15000, 18000, 22000, 25000, 28000, 32000, 35000, 38000, 42000, 45000, 48000, 52000],
      backgroundColor: chartTypes.earnings === 'line' ? 'rgba(249, 115, 22, 0.1)' : '#f97316',
      borderColor: '#f97316',
      borderWidth: 2,
      tension: 0.4,
      pointBackgroundColor: '#f97316',
      pointBorderColor: '#ffffff',
      pointBorderWidth: 2,
      pointRadius: 4,
      fill: chartTypes.earnings === 'line'
    }]
  };

  const sportsData = {
    labels: ['Badminton', 'Tennis', 'Basketball', 'Football', 'Cricket'],
    datasets: [{
      data: [35, 25, 20, 15, 5],
      backgroundColor: [
        '#3b82f6', // Blue for Badminton
        '#22c55e', // Green for Tennis
        '#a855f7', // Purple for Basketball
        '#ef4444', // Red for Football
        '#f97316'  // Orange for Cricket
      ],
      borderWidth: 3,
      borderColor: '#ffffff',
      hoverBorderWidth: 4,
      hoverBorderColor: '#ffffff'
    }]
  };

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          color: '#374151',
          font: {
            size: 12,
            weight: 500 as const
          },
          padding: 15,
          usePointStyle: true,
          pointStyle: 'circle' as const
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
        callbacks: {
          label: function(context: any) {
            const label = context.label || '';
            const value = context.parsed;
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: ${value}% (${percentage}% of total)`;
          }
        }
      }
    },
    elements: {
      arc: {
        borderAlign: 'center' as const
      }
    }
  };

  return (
    <>
      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Booking Activity Chart */}
        <Card className="relative">
          <div className="absolute top-4 right-4 z-10">
            <Button
              onClick={() => toggleChart('booking')}
              variant="outline"
              size="sm"
              className="px-3 py-1 text-xs"
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Toggle
            </Button>
          </div>
          <CardContent className="p-6">
            <h3 className="text-lg leading-6 font-semibold text-gray-900 mb-6 flex items-center">
              <BarChart3 className="w-5 h-5 mr-3 text-blue-600" />
              Booking Activity Over Time
            </h3>
            <div className="h-[300px]">
              <Chart type={chartTypes.booking} data={bookingData} options={chartOptions} />
            </div>
          </CardContent>
        </Card>

        {/* User Registration Chart */}
        <Card className="relative">
          <div className="absolute top-4 right-4 z-10">
            <Button
              onClick={() => toggleChart('user')}
              variant="outline"
              size="sm"
              className="px-3 py-1 text-xs"
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Toggle
            </Button>
          </div>
          <CardContent className="p-6">
            <h3 className="text-lg leading-6 font-semibold text-gray-900 mb-6 flex items-center">
              <TrendingUp className="w-5 h-5 mr-3 text-green-600" />
              User Registration Trends
            </h3>
            <div className="h-[300px]">
              <Chart type={chartTypes.user} data={userData} options={chartOptions} />
            </div>
          </CardContent>
        </Card>

        {/* Facility Approval Chart */}
        <Card className="relative">
          <div className="absolute top-4 right-4 z-10">
            <Button
              onClick={() => toggleChart('facility')}
              variant="outline"
              size="sm"
              className="px-3 py-1 text-xs"
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Toggle
            </Button>
          </div>
          <CardContent className="p-6">
            <h3 className="text-lg leading-6 font-semibold text-gray-900 mb-6 flex items-center">
              <CheckCircle className="w-5 h-5 mr-3 text-purple-600" />
              Facility Approval Trend
            </h3>
            <div className="h-[300px]">
              <Chart type={chartTypes.facility} data={facilityData} options={chartOptions} />
            </div>
          </CardContent>
        </Card>

        {/* Sports Activity Chart */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg leading-6 font-semibold text-gray-900 mb-6 flex items-center">
              <PieChart className="w-5 h-5 mr-3 text-orange-600" />
              Most Active Sports
            </h3>
            <div className="h-[280px]">
              <Chart type="pie" data={sportsData} options={pieOptions} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Earnings Chart */}
      <Card className="relative">
        <div className="absolute top-4 right-4 z-10">
          <Button
            onClick={() => toggleChart('earnings')}
            variant="outline"
            size="sm"
            className="px-3 py-1 text-xs"
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            Toggle
          </Button>
        </div>
        <CardContent className="p-6">
          <h3 className="text-lg leading-6 font-semibold text-gray-900 mb-6 flex items-center">
            <TrendingUp className="w-5 h-5 mr-3 text-amber-600" />
            Monthly Earnings Simulation
          </h3>
          <div className="h-[350px]">
            <Chart type={chartTypes.earnings} data={earningsData} options={chartOptions} />
          </div>
        </CardContent>
      </Card>
    </>
  );
}
