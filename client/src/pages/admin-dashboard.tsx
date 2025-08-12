import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import Navbar from "@/components/ui/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { 
  Users,
  Building,
  Calendar,
  TrendingUp,
  Shield,
  AlertTriangle,
  CheckCircle,
  Zap,
  LayoutDashboard,
  Download,
  BarChart3,
  Flag,
  User,
  LogOut,
  FileText,
  MessageSquare,
  Clock,
  Star,
} from "lucide-react";
import AdminCharts from "@/components/admin/AdminCharts";
import FacilityApprovalTab from "@/components/admin/FacilityApprovalTab";
import OwnerApprovalTab from "@/components/admin/OwnerApprovalTab";
import UserManagementTab from "@/components/admin/UserManagementTab";
import ReportsTab from "@/components/admin/ReportsTab";

export default function AdminDashboard() {
  const { user, token, logout } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("dashboard");

  // Debug token
  console.log('AdminDashboard token:', token);
  console.log('AdminDashboard user:', user);

  // User role update mutation
  const updateUserRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const response = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ role }),
      });
      if (!response.ok) throw new Error('Failed to update user role');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "User role updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update user role",
        variant: "destructive",
      });
    },
  });

  // Fetch all users
  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ["/api/admin/users"],
    enabled: !!user && !!token && user.role === "admin",
    queryFn: async () => {
      const response = await fetch("/api/admin/users", {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch users");
      return response.json();
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
      const response = await fetch("/api/admin/bookings", {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch bookings");
      return response.json();
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

  // Fetch admin dashboard statistics
  const { data: dashboardStats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/admin/dashboard/stats"],
    enabled: !!user && !!token && user.role === "admin",
    queryFn: async () => {
      const response = await fetch("/api/admin/dashboard/stats", {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch dashboard stats");
      return response.json();
    },
  });

  // Fetch recent activity
  const { data: recentActivity = [], isLoading: activityLoading } = useQuery({
    queryKey: ["/api/admin/dashboard/recent-activity"],
    enabled: !!user && !!token && user.role === "admin",
    queryFn: async () => {
      const response = await fetch("/api/admin/dashboard/recent-activity", {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch recent activity");
      return response.json();
    },
  });

  // Fetch system health
  const { data: systemHealth, isLoading: healthLoading } = useQuery({
    queryKey: ["/api/admin/dashboard/system-health"],
    enabled: !!user && !!token && user.role === "admin",
    queryFn: async () => {
      const response = await fetch("/api/admin/dashboard/system-health", {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch system health");
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

  // Use real data from API if available, fallback to calculated values
  const totalUsers = dashboardStats?.totalUsers || users.length;
  const totalFacilityOwners = dashboardStats?.facilityOwners || 0;
  const totalBookings = dashboardStats?.totalBookings || bookings.length;
  const totalMatches = matches.length;

  const activeCourts = dashboardStats?.activeCourts || facilities.filter((f: any) => f.isActive).length;
  const thisMonthBookings = dashboardStats?.thisMonthBookings || bookings.filter((booking: any) => {
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
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <h1 className="text-xl font-bold flex items-center bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">
                  <Zap className="w-6 h-6 mr-2 text-blue-600" />
                  QuickCourt
                </h1>
              </div>
              <Link href="/">
                <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900">
                  <LayoutDashboard className="w-4 h-4 mr-2" />
                  Home
                </Button>
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                <Shield className="w-3 h-3 mr-1" />
                Administrator
              </Badge>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  if (confirm('Are you sure you want to logout?')) {
                    toast({
                      title: "Logging out",
                      description: "You have been successfully logged out.",
                    });
                    logout();
                  }
                }}
                className="text-gray-600 hover:text-red-600"
              >
                <LogOut className="w-5 h-5 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Breadcrumb Navigation */}
          <div className="mb-4">
            <nav className="flex" aria-label="Breadcrumb">
              <ol className="inline-flex items-center space-x-1 md:space-x-3">
                <li className="inline-flex items-center">
                  <Link href="/" className="inline-flex items-center text-sm font-medium text-gray-700 hover:text-blue-600">
                    <LayoutDashboard className="w-4 h-4 mr-2" />
                    Home
                  </Link>
                </li>
                <li>
                  <div className="flex items-center">
                    <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"></path>
                    </svg>
                    <span className="ml-1 text-sm font-medium text-gray-500 md:ml-2">Admin Dashboard</span>
                  </div>
                </li>
              </ol>
            </nav>
          </div>
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <LayoutDashboard className="w-8 h-8 mr-3 text-blue-600" />
                Sports Admin Dashboard
              </h1>
              <p className="text-gray-600 mt-2">Manage facilities, users, and platform analytics</p>
            </div>
            <div className="flex items-center space-x-3">
              <Link href="/">
                <Button variant="outline">
                  <LayoutDashboard className="w-4 h-4 mr-2" />
                  Back to Home
                </Button>
              </Link>
              <Button 
                variant="outline" 
                onClick={() => {
                  queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard/stats"] });
                  queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard/recent-activity"] });
                  queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard/system-health"] });
                }}
                disabled={statsLoading || activityLoading || healthLoading}
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                {(statsLoading || activityLoading || healthLoading) ? "Refreshing..." : "Refresh All"}
              </Button>
              <Link href="/profile">
                <Button variant="outline">
                  <User className="w-4 h-4 mr-2" />
                  My Profile
                </Button>
              </Link>
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
                      <dd className="text-2xl font-bold text-gray-900">
                        {statsLoading ? (
                          <div className="h-8 w-16 bg-gray-200 rounded animate-pulse"></div>
                        ) : (
                          totalUsers.toLocaleString()
                        )}
                      </dd>
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
                      <dd className="text-2xl font-bold text-gray-900">
                        {statsLoading ? (
                          <div className="h-8 w-16 bg-gray-200 rounded animate-pulse"></div>
                        ) : (
                          totalFacilityOwners.toLocaleString()
                        )}
                      </dd>
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
                      <dd className="text-2xl font-bold text-gray-900">
                        {statsLoading ? (
                          <div className="h-8 w-16 bg-gray-200 rounded animate-pulse"></div>
                        ) : (
                          totalBookings.toLocaleString()
                        )}
                      </dd>
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
                      <dd className="text-2xl font-bold text-gray-900">
                        {statsLoading ? (
                          <div className="h-8 w-16 bg-gray-200 rounded animate-pulse"></div>
                        ) : (
                          activeCourts.toLocaleString()
                        )}
                      </dd>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Additional Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <Card className="bg-white border shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="p-3 bg-amber-100 rounded-lg">
                        <Clock className="w-6 h-6 text-amber-600" />
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dt className="text-sm font-medium text-gray-500 truncate">This Month</dt>
                      <dd className="text-2xl font-bold text-gray-900">
                        {statsLoading ? (
                          <div className="h-8 w-16 bg-gray-200 rounded animate-pulse"></div>
                        ) : (
                          thisMonthBookings.toLocaleString()
                        )}
                      </dd>
                      <p className="text-xs text-gray-500 mt-1">Bookings</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="p-3 bg-red-100 rounded-lg">
                        <AlertTriangle className="w-6 h-6 text-red-600" />
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dt className="text-sm font-medium text-gray-500 truncate">Pending</dt>
                      <dd className="text-2xl font-bold text-gray-900">
                        {statsLoading ? (
                          <div className="h-8 w-16 bg-gray-200 rounded animate-pulse"></div>
                        ) : (
                          (dashboardStats?.pendingApprovals || 0).toLocaleString()
                        )}
                      </dd>
                      <p className="text-xs text-gray-500 mt-1">Approvals</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="p-3 bg-green-100 rounded-lg">
                        <TrendingUp className="w-6 h-6 text-green-600" />
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dt className="text-sm font-medium text-gray-500 truncate">Revenue</dt>
                      <dd className="text-2xl font-bold text-gray-900">
                        {statsLoading ? (
                          <div className="h-8 w-16 bg-gray-200 rounded animate-pulse"></div>
                        ) : (
                          `₹${(dashboardStats?.totalRevenue || 0).toLocaleString()}`
                        )}
                      </dd>
                      <p className="text-xs text-gray-500 mt-1">Total</p>
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
                  <CardTitle className="flex items-center justify-between">
                    Recent Activity
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard/recent-activity"] })}
                      disabled={activityLoading}
                    >
                      <BarChart3 className="w-4 h-4" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {activityLoading ? (
                    <div className="space-y-4">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="flex items-center space-x-3">
                          <div className="w-2 h-2 bg-gray-300 rounded-full animate-pulse"></div>
                          <div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div>
                          <div className="h-3 bg-gray-200 rounded w-20 ml-auto animate-pulse"></div>
                        </div>
                      ))}
                    </div>
                  ) : recentActivity.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500">No recent activity</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {recentActivity.map((activity: any, index: number) => (
                        <div key={`${activity.type}-${activity.id}-${index}`} className="flex items-center space-x-3">
                          <div className={`w-2 h-2 rounded-full ${
                            activity.type === 'facility_registered' ? 'bg-green-500' :
                            activity.type === 'user_registered' ? 'bg-blue-500' :
                            activity.type === 'booking_created' ? 'bg-purple-500' :
                            activity.type === 'match_created' ? 'bg-orange-500' : 'bg-gray-500'
                          }`}></div>
                          <p className="text-sm flex-1">
                            {activity.action}
                            {activity.name && `: ${activity.name}`}
                            {activity.title && `: ${activity.title}`}
                          </p>
                          <span className="text-xs text-gray-500 ml-auto">{activity.timeAgo}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    System Health
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard/system-health"] })}
                      disabled={healthLoading}
                    >
                      <BarChart3 className="w-4 h-4" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {healthLoading ? (
                    <div className="space-y-4">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="flex items-center justify-between">
                          <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
                          <div className="h-6 bg-gray-200 rounded w-20 animate-pulse"></div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Database</span>
                        <Badge 
                          variant="outline" 
                          className={`${
                            systemHealth?.database?.status === 'healthy' ? 'bg-green-50 text-green-700 border-green-200' :
                            systemHealth?.database?.status === 'warning' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                            'bg-red-50 text-red-700 border-red-200'
                          }`}
                        >
                          {systemHealth?.database?.status === 'healthy' ? (
                            <CheckCircle className="w-3 h-3 mr-1" />
                          ) : systemHealth?.database?.status === 'warning' ? (
                            <AlertTriangle className="w-3 h-3 mr-1" />
                          ) : (
                            <AlertTriangle className="w-3 h-3 mr-1" />
                          )}
                          {systemHealth?.database?.status === 'healthy' ? 'Healthy' :
                           systemHealth?.database?.status === 'warning' ? 'Warning' : 'Error'}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">API Services</span>
                        <Badge 
                          variant="outline" 
                          className={`${
                            systemHealth?.apiServices?.status === 'healthy' ? 'bg-green-50 text-green-700 border-green-200' :
                            systemHealth?.apiServices?.status === 'warning' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                            'bg-red-50 text-red-700 border-red-200'
                          }`}
                        >
                          {systemHealth?.apiServices?.status === 'healthy' ? (
                            <CheckCircle className="w-3 h-3 mr-1" />
                          ) : systemHealth?.apiServices?.status === 'warning' ? (
                            <AlertTriangle className="w-3 h-3 mr-1" />
                          ) : (
                            <AlertTriangle className="w-3 h-3 mr-1" />
                          )}
                          {systemHealth?.apiServices?.status === 'healthy' ? 'Healthy' :
                           systemHealth?.apiServices?.status === 'warning' ? 'Warning' : 'Error'}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Payment Gateway</span>
                        <Badge 
                          variant="outline" 
                          className={`${
                            systemHealth?.paymentGateway?.status === 'healthy' ? 'bg-green-50 text-green-700 border-green-200' :
                            systemHealth?.paymentGateway?.status === 'warning' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                            'bg-red-50 text-red-700 border-red-200'
                          }`}
                        >
                          {systemHealth?.paymentGateway?.status === 'healthy' ? (
                            <CheckCircle className="w-3 h-3 mr-1" />
                          ) : systemHealth?.paymentGateway?.status === 'warning' ? (
                            <AlertTriangle className="w-3 h-3 mr-1" />
                          ) : (
                            <AlertTriangle className="w-3 h-3 mr-1" />
                          )}
                          {systemHealth?.paymentGateway?.status === 'healthy' ? 'Healthy' :
                           systemHealth?.paymentGateway?.status === 'warning' ? 'Warning' : 'Error'}
                        </Badge>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="facility-approval">
            {token ? (
              <FacilityApprovalTab token={token} />
            ) : (
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-center py-12">
                    <div className="text-gray-500">Loading authentication...</div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="owner-approval">
            <OwnerApprovalTab />
          </TabsContent>

                      <TabsContent value="user-management">
              {token ? (
                <UserManagementTab
                  users={users}
                  isLoading={usersLoading}
                  token={token}
                  currentUser={user}
                  onUpdateUserRole={(userId, role) => updateUserRoleMutation.mutate({ userId, role })}
                />
              ) : (
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-center py-12">
                      <div className="text-gray-500">Loading authentication...</div>
                    </div>
                  </CardContent>
                </Card>
              )}
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

        </Tabs>
      </div>
    </div>
  );
}
