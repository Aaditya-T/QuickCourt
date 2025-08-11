import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import Navbar from "@/components/ui/navbar";
import CreateFacilityModal from "@/components/ui/create-facility-modal";
import EditFacilityModal from "@/components/ui/edit-facility-modal";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { 
  Plus,
  Building,
  Calendar,
  Users,
  TrendingUp,
  MoreVertical,
  Edit,
  Trash,
  MapPin,
  Star,
  Clock,
  Eye,
  Power,
  PowerOff
} from "lucide-react";

export default function FacilityOwnerDashboard() {
  const { user, token } = useAuth();
  const { toast } = useToast();
  const [createFacilityModalOpen, setCreateFacilityModalOpen] = useState(false);
  const [editFacilityModalOpen, setEditFacilityModalOpen] = useState(false);
  const [facilityToEdit, setFacilityToEdit] = useState<any>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [facilityToDelete, setFacilityToDelete] = useState<any>(null);
  const [facilityFilter, setFacilityFilter] = useState<"all" | "active" | "inactive">("all");

  // Fetch facilities owned by the user
  const { data: facilities = [], isLoading: facilitiesLoading } = useQuery<any[]>({
    queryKey: ["/api/owner/facilities"],
    enabled: !!user && !!token && user.role === "facility_owner",
  });

  // Fetch bookings for owned facilities
  const { data: allBookings = [], isLoading: bookingsLoading } = useQuery<any[]>({
    queryKey: ["/api/owner/bookings"],
    enabled: !!user && !!token && user.role === "facility_owner",
  });

  // Delete facility mutation
  const deleteFacilityMutation = useMutation({
    mutationFn: async (facilityId: string) => {
      return await apiRequest("DELETE", `/api/facilities/${facilityId}`, {});
    },
    onSuccess: () => {
      toast({
        title: "Facility Deleted",
        description: "Your facility has been successfully removed.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/owner/facilities"] });
    },
    onError: (error: any) => {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete facility.",
        variant: "destructive",
      });
    },
  });

  // Function to open edit modal
  const handleEditFacility = (facility: any) => {
    setFacilityToEdit(facility);
    setEditFacilityModalOpen(true);
  };

  // Function to open delete confirmation
  const handleDeleteFacility = (facility: any) => {
    setFacilityToDelete(facility);
    setDeleteConfirmOpen(true);
  };

  // Toggle facility status mutation
  const toggleFacilityStatusMutation = useMutation({
    mutationFn: async (facilityId: string) => {
      const response = await apiRequest(`/api/owner/facilities/${facilityId}/toggle-status`, "PATCH", {});
      return response.json();
    },
    onSuccess: (data: any) => {
      console.log('Toggle success response:', data);
      toast({
        title: "Status Updated",
        description: data.message || "Facility status updated successfully.",
      });
      // Force refetch the facilities data
      queryClient.invalidateQueries({ queryKey: ["/api/owner/facilities"] });
      // Also try to refetch immediately
      queryClient.refetchQueries({ queryKey: ["/api/owner/facilities"] });
    },
    onError: (error: any) => {
      console.error('Toggle error:', error);
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update facility status.",
        variant: "destructive",
      });
    },
  });

  if (!user || user.role !== "facility_owner") {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-gray-600 mb-4">
                You need to be logged in as a facility owner to access this dashboard.
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

  const totalBookings = allBookings.length;
  const thisMonthBookings = allBookings.filter((booking: any) => {
    const bookingDate = new Date(booking.createdAt);
    const now = new Date();
    return bookingDate.getMonth() === now.getMonth() && 
           bookingDate.getFullYear() === now.getFullYear();
  }).length;

  const totalRevenue = allBookings.reduce((sum: number, booking: any) => 
    sum + parseFloat(booking.totalAmount || 0), 0
  );

  const averageRating = facilities.length > 0 
    ? facilities.reduce((sum: number, facility: any) => sum + parseFloat(facility.rating || 0), 0) / facilities.length
    : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                Facility Owner Dashboard
              </h1>
              <p className="text-gray-600 mt-2 text-sm sm:text-base">
                Manage your facilities and track your business performance
              </p>
            </div>
            {/* <Button onClick={() => setCreateFacilityModalOpen(true)} className="w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              Add Facility
            </Button> */}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-6 mb-6 sm:mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Building className="w-6 h-6 text-primary" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Facilities</p>
                  <p className="text-2xl font-bold text-gray-900">{facilities.length}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {facilities.filter((f: any) => f.isActive).length} active, {facilities.filter((f: any) => !f.isActive).length} inactive
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Calendar className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Bookings</p>
                  <p className="text-2xl font-bold text-gray-900">{totalBookings}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">₹{totalRevenue.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Star className="w-6 h-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Avg. Rating</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {averageRating > 0 ? averageRating.toFixed(1) : "N/A"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="facilities" className="space-y-4 sm:space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="facilities">My Facilities</TabsTrigger>
            <TabsTrigger value="bookings">Bookings</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="facilities">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>My Facilities</span>
                  <Button 
                    size="sm" 
                    onClick={() => setCreateFacilityModalOpen(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Facility
                  </Button>
                </CardTitle>
                <div className="mt-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                    <span className="text-sm font-medium text-gray-700">Filter:</span>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant={facilityFilter === "all" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFacilityFilter("all")}
                        className="text-xs sm:text-sm"
                      >
                        All ({facilities.length})
                      </Button>
                      <Button
                        variant={facilityFilter === "active" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFacilityFilter("active")}
                        className="text-xs sm:text-sm"
                      >
                        Active ({facilities.filter((f: any) => f.isActive).length})
                      </Button>
                      <Button
                        variant={facilityFilter === "inactive" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFacilityFilter("inactive")}
                        className="text-xs sm:text-sm"
                      >
                        Inactive ({facilities.filter((f: any) => !f.isActive).length})
                      </Button>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {facilitiesLoading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="flex items-center space-x-4">
                        <Skeleton className="h-20 w-20 rounded" />
                        <div className="space-y-2 flex-1">
                          <Skeleton className="h-6 w-1/2" />
                          <Skeleton className="h-4 w-1/3" />
                          <Skeleton className="h-4 w-1/4" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : facilities.length === 0 ? (
                  <div className="text-center py-12">
                    <Building className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No facilities yet</h3>
                    <p className="text-gray-500 mb-6">
                      Add your first facility to start accepting bookings and growing your business.
                    </p>
                    <Button onClick={() => setCreateFacilityModalOpen(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Your First Facility
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {facilities
                      .filter((facility: any) => {
                        if (facilityFilter === "all") return true;
                        if (facilityFilter === "active") return facility.isActive;
                        if (facilityFilter === "inactive") return !facility.isActive;
                        return true;
                      })
                      .map((facility: any) => (
                        <FacilityCard 
                          key={facility.id} 
                          facility={facility}
                          onDelete={() => handleDeleteFacility(facility)}
                          onToggleStatus={(id) => toggleFacilityStatusMutation.mutate(id)}
                          onEdit={() => handleEditFacility(facility)}
                          isToggling={toggleFacilityStatusMutation.isPending}
                        />
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bookings">
            <Card>
              <CardHeader>
                <CardTitle>Recent Bookings</CardTitle>
              </CardHeader>
              <CardContent>
                {bookingsLoading ? (
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : allBookings.length === 0 ? (
                  <div className="text-center py-12">
                    <Calendar className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No bookings yet</h3>
                    <p className="text-gray-500">
                      Bookings for your facilities will appear here once customers start booking.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {allBookings.slice(0, 10).map((booking: any) => (
                      <BookingCard key={booking.id} booking={booking} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Monthly Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12">
                    <TrendingUp className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Analytics Coming Soon</h3>
                    <p className="text-gray-500">
                      Detailed analytics and reporting features will be available soon.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Popular Facilities</CardTitle>
                </CardHeader>
                <CardContent>
                  {facilities.length === 0 ? (
                    <div className="text-center py-12">
                      <Building className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                      <p className="text-gray-500">Add facilities to see performance metrics.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {facilities
                        .sort((a: any, b: any) => parseFloat(b.rating) - parseFloat(a.rating))
                        .slice(0, 3)
                        .map((facility: any) => (
                          <div key={facility.id} className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{facility.name}</p>
                              <p className="text-sm text-gray-600">{facility.city}</p>
                            </div>
                            <div className="text-right">
                              <div className="flex items-center">
                                <Star className="w-4 h-4 text-yellow-400 fill-current mr-1" />
                                <span className="text-sm font-medium">{facility.rating}</span>
                              </div>
                              <p className="text-xs text-gray-500">{facility.totalReviews} reviews</p>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Create Facility Modal */}
      <CreateFacilityModal
        open={createFacilityModalOpen}
        onClose={() => setCreateFacilityModalOpen(false)}
        onFacilityCreated={() => {
          queryClient.invalidateQueries({ queryKey: ["/api/owner/facilities"] });
        }}
      />

      {/* Edit Facility Modal */}
      <EditFacilityModal
        open={editFacilityModalOpen}
        onClose={() => {
          setEditFacilityModalOpen(false);
          setFacilityToEdit(null);
        }}
        facility={facilityToEdit}
        onFacilityUpdated={() => {
          queryClient.invalidateQueries({ queryKey: ["/api/owner/facilities"] });
        }}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setFacilityToDelete(null);
        }}
        onConfirm={() => {
          if (facilityToDelete) {
            deleteFacilityMutation.mutate(facilityToDelete.id);
            setDeleteConfirmOpen(false);
            setFacilityToDelete(null);
          }
        }}
        title="Delete Facility"
        description={`Are you sure you want to delete "${facilityToDelete?.name}"? This action cannot be undone and will remove all associated data.`}
        confirmText="Delete Facility"
        cancelText="Cancel"
        variant="destructive"
      />
    </div>
  );
}

interface FacilityCardProps {
  facility: any;
  onDelete: () => void;
  onToggleStatus: (id: string) => void;
  onEdit: () => void;
  isToggling: boolean;
}

function FacilityCard({ facility, onDelete, onToggleStatus, onEdit, isToggling }: FacilityCardProps) {
  const defaultImage = "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=400&h=300";

  return (
    <div className="p-4 border rounded-lg hover:shadow-sm transition-shadow overflow-hidden">
      {/* Mobile: Stack layout, Desktop: Side by side */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        {/* Facility Info */}
        <div className="flex items-start space-x-4 min-w-0">
          <img 
            src={facility.images[0] || defaultImage}
            alt={facility.name}
            className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
          />
          <div className="flex-1 min-w-0 overflow-hidden">
            <h4 className="font-medium text-lg truncate">{facility.name}</h4>
            <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 text-sm text-gray-600 mt-1 space-y-1 sm:space-y-0">
              <span className="flex items-center min-w-0">
                <MapPin className="w-4 h-4 mr-1 flex-shrink-0" />
                <span className="truncate">{facility.city}</span>
              </span>
              <span className="flex items-center min-w-0">
                <Star className="w-4 h-4 mr-1 text-yellow-400 fill-current flex-shrink-0" />
                <span className="truncate">{facility.rating} ({facility.totalReviews})</span>
              </span>
            </div>
            <p className="text-sm font-medium text-primary mt-1 truncate">
              ₹{facility.pricePerHour}/hour <span className="text-gray-500">{facility.isActive ? "Active" : "Inactive"}</span>
            </p>
            {/* Operating Hours Display */}
            <div className="flex items-center mt-1 text-xs text-gray-600">
              <Clock className="w-3 h-3 mr-1 flex-shrink-0" />
              <span className="truncate">
                {(() => {
                  try {
                    const hours = JSON.parse(facility.operatingHours);
                    const today = new Date().toLocaleDateString('en', { weekday: 'long' }).toLowerCase().slice(0, 3);
                    const todayHours = hours[today] || hours.monday;
                    if (todayHours) {
                      if (todayHours.closed) {
                        return "Today: Closed";
                      } else {
                        return `Today: ${todayHours.open} - ${todayHours.close}`;
                      }
                    }
                  } catch {
                    // fallback for simple string format
                  }
                  return "Hours: 6:00 AM - 11:00 PM";
                })()}
              </span>
            </div>
            {/* <div className="flex justify-center sm:justify-start">
              <Badge variant={facility.isActive ? "default" : "secondary"}>
                {facility.isActive ? "Active" : "Inactive"}
              </Badge>
            </div> */}
          </div>
        </div>
        
        {/* Actions - All in one row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
          
          {/* Action Buttons - Icons only on mobile, icons + text on desktop */}
          <div className="flex items-center justify-center sm:justify-start space-x-1 sm:space-x-2 max-w-full overflow-hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={onEdit}
              className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 min-w-0"
            >
              <Edit className="w-4 h-4 text-blue-500 flex-shrink-0" />
              <span className="text-blue-500 sm:inline">Edit</span>
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onToggleStatus(facility.id)}
              disabled={isToggling}
              className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 min-w-0"
            >
              {facility.isActive ? (
                <>
                  <PowerOff className="w-4 h-4 text-orange-500 flex-shrink-0" />
                  <span className="text-orange-500 sm:inline">Deactivate</span>
                </>
              ) : (
                <>
                  <Power className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span className="text-green-500 sm:inline">Activate</span>
                </>
              )}
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 min-w-0"
            >
              <Trash className="w-4 h-4 text-red-500 flex-shrink-0" />
              <span className="text-red-500 sm:inline">Delete</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface BookingCardProps {
  booking: any;
}

function BookingCard({ booking }: BookingCardProps) {
  return (
    <div className="flex items-center justify-between p-4 border rounded-lg">
      <div className="flex items-center space-x-4">
        <div className="p-2 bg-primary/10 rounded">
          <Calendar className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="font-medium">Booking #{booking.id.slice(0, 8)}</p>
          <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
            <span>{format(new Date(booking.date), "MMM dd, yyyy")}</span>
            <span>
              {format(new Date(booking.startTime), "h:mm a")} - 
              {format(new Date(booking.endTime), "h:mm a")}
            </span>
          </div>
        </div>
      </div>
      
      <div className="text-right">
        <Badge variant={
          booking.status === "confirmed" ? "default" :
          booking.status === "cancelled" ? "destructive" :
          "secondary"
        }>
          {booking.status}
        </Badge>
        <p className="text-sm font-medium mt-1">₹{booking.totalAmount}</p>
      </div>
    </div>
  );
}
