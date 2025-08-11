import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import Navbar from "@/components/ui/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { 
  Users,
  Building,
  Calendar,
  TrendingUp,
  MoreVertical,
  Search,
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  Edit,
  Ban,
  Zap,
  LayoutDashboard,
  Download,
  BarChart3,
  UserCheck,
  Flag,
  User,
  LogOut,
  Clock,
  MapPin,
  Phone,
  FileText,
  MessageCircle,
  Check,
  X,
  UserX,
  MessageSquare,
  RefreshCw,
  PieChart
} from "lucide-react";
import AdminCharts from "@/components/admin/AdminCharts";
import FacilityApprovalTab from "@/components/admin/FacilityApprovalTab";
import OwnerApprovalTab from "@/components/admin/OwnerApprovalTab";
import UserManagementTab from "@/components/admin/UserManagementTab";
import ReportsTab from "@/components/admin/ReportsTab";

export default function AdminDashboard() {
  const { user, token } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("dashboard");

  // Fetch all users
  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ["/api/admin/users"],
    enabled: !!user && !!token && user.role === "admin",
    queryFn: async () => {
      // This would require admin-only endpoints
      // For now, return mock data as placeholder
      return [
        {
          id: 1,
          firstName: "Alice",
          lastName: "Johnson",
          email: "alice@example.com",
          username: "alice_j",
          role: "user",
          isActive: true,
          createdAt: "2024-01-10",
          lastActive: "2024-01-20"
        },
        {
          id: 2,
          firstName: "Bob",
          lastName: "Smith",
          email: "bob@example.com",
          username: "bob_smith",
          role: "facility_owner",
          isActive: true,
          createdAt: "2024-01-05",
          lastActive: "2024-01-19"
        }
      ];
    },
  });

  // Fetch all facilities
  const { data: facilities = [], isLoading: facilitiesLoading } = useQuery({
    queryKey: ["/api/facilities"],
    enabled: !!user && !!token && user.role === "admin",
    queryFn: async () => {
      const response = await fetch("/api/facilities", {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch facilities");
      return response.json();
    },
  });

  // Fetch all bookings
  const { data: bookings = [], isLoading: bookingsLoading } = useQuery({
    queryKey: ["/api/admin/bookings"],
    enabled: !!user && !!token && user.role === "admin",
    queryFn: async () => {
      // This would require admin-only endpoints
      // For now, return mock data as placeholder
      return [
        {
          id: 1,
          facilityId: 1,
          userId: 1,
          date: "2024-01-20",
          totalAmount: 800,
          status: "confirmed",
          createdAt: "2024-01-18"
        }
      ];
    },
  });

  // Fetch all matches
  const { data: matches = [], isLoading: matchesLoading } = useQuery({
    queryKey: ["/api/matches"],
    enabled: !!user && !!token && user.role === "admin",
    queryFn: async () => {
      const response = await fetch("/api/matches", {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch matches");
      return response.json();
    },
  });

  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-gray-600 mb-4">
                You need to be logged in as an administrator to access this dashboard.
              </p>
              <Link href="/login">
                <Button>Login</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const totalUsers = users.length;
  const totalFacilities = facilities.length;
  const totalBookings = bookings.length;
  const totalMatches = matches.length;

  const activeFacilities = facilities.filter((f: any) => f.isActive).length;
  const thisMonthBookings = bookings.filter((booking: any) => {
    const bookingDate = new Date(booking.createdAt);
    const now = new Date();
    return bookingDate.getMonth() === now.getMonth() && 
           bookingDate.getFullYear() === now.getFullYear();
  }).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-xl font-bold flex items-center bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">
                  <Zap className="w-6 h-6 mr-2 text-blue-600" />
                  QuickCourt
                </h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                <Shield className="w-3 h-3 mr-1" />
                Administrator
              </Badge>
              <Button variant="ghost" size="sm">
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <LayoutDashboard className="w-8 h-8 mr-3 text-blue-600" />
                Sports Admin Dashboard
              </h1>
              <p className="text-gray-600 mt-2">Manage facilities, users, and platform analytics</p>
            </div>
            <div className="flex items-center space-x-3">
              <Button className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white">
                <Download className="w-4 h-4 mr-2" />
                Export Data
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-7 gap-0 bg-white border border-gray-200 p-0 h-auto">
            <TabsTrigger 
              value="dashboard" 
              className="flex flex-col items-center py-3 px-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-500 hover:text-gray-700 text-xs font-medium"
            >
              <BarChart3 className="w-4 h-4 mb-1" />
              <span className="hidden sm:inline">Dashboard</span>
              <span className="sm:hidden">Home</span>
            </TabsTrigger>
            <TabsTrigger 
              value="facility-approval"
              className="flex flex-col items-center py-3 px-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-500 hover:text-gray-700 text-xs font-medium"
            >
              <Building className="w-4 h-4 mb-1" />
              <span className="hidden sm:inline">Facility Approval</span>
              <span className="sm:hidden">Facilities</span>
            </TabsTrigger>
            <TabsTrigger 
              value="owner-approval"
              className="flex flex-col items-center py-3 px-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-500 hover:text-gray-700 text-xs font-medium"
            >
              <UserCheck className="w-4 h-4 mb-1" />
              <span className="hidden sm:inline">Owner Approval</span>
              <span className="sm:hidden">Owners</span>
            </TabsTrigger>
            <TabsTrigger 
              value="user-management"
              className="flex flex-col items-center py-3 px-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-500 hover:text-gray-700 text-xs font-medium"
            >
              <Users className="w-4 h-4 mb-1" />
              <span className="hidden sm:inline">User Management</span>
              <span className="sm:hidden">Users</span>
            </TabsTrigger>
            <TabsTrigger 
              value="reports"
              className="flex flex-col items-center py-3 px-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-500 hover:text-gray-700 text-xs font-medium"
            >
              <Flag className="w-4 h-4 mb-1" />
              <span className="hidden sm:inline">Reports & Moderation</span>
              <span className="sm:hidden">Reports</span>
            </TabsTrigger>
            <TabsTrigger 
              value="analytics"
              className="flex flex-col items-center py-3 px-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-500 hover:text-gray-700 text-xs font-medium"
            >
              <TrendingUp className="w-4 h-4 mb-1" />
              <span className="hidden sm:inline">Analytics</span>
              <span className="sm:hidden">Stats</span>
            </TabsTrigger>
            <TabsTrigger 
              value="profile"
              className="flex flex-col items-center py-3 px-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-500 hover:text-gray-700 text-xs font-medium"
            >
              <User className="w-4 h-4 mb-1" />
              <span className="hidden sm:inline">Profile</span>
              <span className="sm:hidden">Me</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            {/* Global Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <Card className="bg-white border shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="p-3 bg-blue-100 rounded-lg">
                        <Users className="w-6 h-6 text-blue-600" />
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dt className="text-sm font-medium text-gray-500 truncate">Total Users</dt>
                      <dd className="text-2xl font-bold text-gray-900">1,247</dd>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="p-3 bg-green-100 rounded-lg">
                        <Building className="w-6 h-6 text-green-600" />
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dt className="text-sm font-medium text-gray-500 truncate">Facility Owners</dt>
                      <dd className="text-2xl font-bold text-gray-900">89</dd>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="p-3 bg-purple-100 rounded-lg">
                        <Calendar className="w-6 h-6 text-purple-600" />
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dt className="text-sm font-medium text-gray-500 truncate">Total Bookings</dt>
                      <dd className="text-2xl font-bold text-gray-900">3,456</dd>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="p-3 bg-orange-100 rounded-lg">
                        <TrendingUp className="w-6 h-6 text-orange-600" />
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dt className="text-sm font-medium text-gray-500 truncate">Active Courts</dt>
                      <dd className="text-2xl font-bold text-gray-900">156</dd>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <AdminCharts />

            {/* Recent Activity & System Health */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <p className="text-sm">New facility registered</p>
                      <span className="text-xs text-gray-500 ml-auto">2 hours ago</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <p className="text-sm">User reported an issue</p>
                      <span className="text-xs text-gray-500 ml-auto">4 hours ago</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      <p className="text-sm">Match created</p>
                      <span className="text-xs text-gray-500 ml-auto">6 hours ago</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>System Health</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Database</span>
                      <Badge variant="outline" className="bg-green-50 text-green-700">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Healthy
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">API Services</span>
                      <Badge variant="outline" className="bg-green-50 text-green-700">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Healthy
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Payment Gateway</span>
                      <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Warning
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="facility-approval">
            <FacilityApprovalTab />
          </TabsContent>

          <TabsContent value="owner-approval">
            <OwnerApprovalTab />
          </TabsContent>

          <TabsContent value="user-management">
            <UserManagementTab users={users} isLoading={usersLoading} />
          </TabsContent>

          <TabsContent value="reports">
            <ReportsTab />
          </TabsContent>

          <TabsContent value="analytics">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-6">Platform Analytics</h3>
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                          <p className="text-2xl font-bold text-blue-600">92%</p>
                          <p className="text-sm text-gray-600">User Satisfaction</p>
                        </div>
                        <div className="text-center p-4 bg-green-50 rounded-lg">
                          <p className="text-2xl font-bold text-green-600">87%</p>
                          <p className="text-sm text-gray-600">Facility Approval Rate</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-4 bg-purple-50 rounded-lg">
                          <p className="text-2xl font-bold text-purple-600">4.2</p>
                          <p className="text-sm text-gray-600">Avg. Facility Rating</p>
                        </div>
                        <div className="text-center p-4 bg-orange-50 rounded-lg">
                          <p className="text-2xl font-bold text-orange-600">24min</p>
                          <p className="text-sm text-gray-600">Avg. Session Duration</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Quick Actions</h3>
                  <div className="space-y-3">
                    <Button variant="outline" className="w-full justify-start">
                      <Download className="w-4 h-4 mr-2" />
                      Export User Data
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <FileText className="w-4 h-4 mr-2" />
                      Generate Report
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Send Announcement
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Shield className="w-4 h-4 mr-2" />
                      System Settings
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="profile">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-6">Admin Profile</h3>
                    <form className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                          <Input type="text" defaultValue="John" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                          <Input type="text" defaultValue="Admin" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <Input type="email" defaultValue="admin@quickcourt.com" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                        <Input type="text" defaultValue="admin" />
                      </div>
                      <div className="pt-4">
                        <Button type="submit">Update Profile</Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Admin Privileges</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">User Management</span>
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Facility Approval</span>
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">System Analytics</span>
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Report Moderation</span>
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
