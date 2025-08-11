import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Building, Clock, MapPin, Check, X, Eye, AlertTriangle, CheckCircle, XCircle, User, Calendar } from "lucide-react";

interface Facility {
  id: string;
  name: string;
  description: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  pricePerHour: number;
  images: string[];
  amenities: string[];
  operatingHours: string;
  isActive: boolean;
  isApproved: boolean;
  approvedAt?: string;
  approvedBy?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
  owner: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

interface FacilityApprovalTabProps {
  token: string | null;
}

export default function FacilityApprovalTab({ token }: FacilityApprovalTabProps) {
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [currentFacility, setCurrentFacility] = useState<Facility | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Debug token
  console.log('FacilityApprovalTab token:', token);

  // Fetch pending facilities for approval
  const { data: pendingFacilities = [], isLoading: pendingLoading } = useQuery<Facility[]>({
    queryKey: ["/api/admin/facilities/pending", token],
    enabled: !!token,
    queryFn: async () => {
      if (!token) throw new Error('No authentication token');
      
      const response = await fetch("/api/admin/facilities/pending", {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch pending facilities");
      return response.json();
    },
  });

  // Fetch all facilities with approval status
  const { data: allFacilities = [], isLoading: allLoading } = useQuery<Facility[]>({
    queryKey: ["/api/admin/facilities/all", token],
    enabled: !!token,
    queryFn: async () => {
      if (!token) throw new Error('No authentication token');
      
      const response = await fetch("/api/admin/facilities/all", {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch all facilities");
      return response.json();
    },
  });

  // Approve facility mutation
  const approveFacilityMutation = useMutation({
    mutationFn: async (facilityId: string) => {
      if (!token) throw new Error('No authentication token');
      
      const response = await fetch(`/api/admin/facilities/${facilityId}/approve`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ isApproved: true }),
      });
      if (!response.ok) throw new Error('Failed to approve facility');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Facility approved successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/facilities/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/facilities/all"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to approve facility",
        variant: "destructive",
      });
    },
  });

  // Reject facility mutation
  const rejectFacilityMutation = useMutation({
    mutationFn: async ({ facilityId, reason }: { facilityId: string; reason: string }) => {
      if (!token) throw new Error('No authentication token');
      
      const response = await fetch(`/api/admin/facilities/${facilityId}/approve`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ isApproved: false, rejectionReason: reason }),
      });
      if (!response.ok) throw new Error('Failed to reject facility');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Facility rejected successfully",
      });
      setIsRejectModalOpen(false);
      setRejectReason("");
      setCurrentFacility(null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/facilities/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/facilities/all"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to reject facility",
        variant: "destructive",
      });
    },
  });

  // Toggle facility visibility (unlist/relist) mutation
  const toggleFacilityVisibilityMutation = useMutation({
    mutationFn: async ({ facilityId, isActive }: { facilityId: string; isActive: boolean }) => {
      if (!token) throw new Error('No authentication token');
      
      const response = await fetch(`/api/admin/facilities/${facilityId}/visibility`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ isActive }),
      });
      if (!response.ok) throw new Error('Failed to toggle facility visibility');
      return response.json();
    },
    onSuccess: (data, variables) => {
      toast({
        title: "Success",
        description: `Facility ${variables.isActive ? 'relisted' : 'unlisted'} successfully`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/facilities/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/facilities/all"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to toggle facility visibility",
        variant: "destructive",
      });
    },
  });

  const handleApprove = (facility: Facility) => {
    if (confirm(`Are you sure you want to approve "${facility.name}"?`)) {
      approveFacilityMutation.mutate(facility.id);
    }
  };

  const handleReject = (facility: Facility) => {
    setCurrentFacility(facility);
    setIsRejectModalOpen(true);
  };

  const handleViewDetails = (facility: Facility) => {
    setCurrentFacility(facility);
    setIsViewModalOpen(true);
  };

  const handleToggleVisibility = (facility: Facility) => {
    const action = facility.isActive ? 'unlist' : 'relist';
    const message = facility.isActive 
      ? `Are you sure you want to unlist "${facility.name}"? This will hide it from public view.`
      : `Are you sure you want to relist "${facility.name}"? This will make it visible to the public again.`;
    
    if (confirm(message)) {
      toggleFacilityVisibilityMutation.mutate({ 
        facilityId: facility.id, 
        isActive: !facility.isActive 
      });
    }
  };

  const confirmReject = () => {
    if (!currentFacility || rejectReason.trim() === '') {
      toast({
        title: "Error",
        description: "Please provide a reason for rejection.",
        variant: "destructive",
      });
      return;
    }
    
    rejectFacilityMutation.mutate({ 
      facilityId: currentFacility.id, 
      reason: rejectReason.trim() 
    });
  };

  const getApprovalStatusBadge = (facility: Facility) => {
    if (facility.isApproved) {
      return (
        <Badge variant="default" className="bg-green-50 text-green-700 border-green-200">
          <CheckCircle className="w-3 h-3 mr-1" />
          Approved
        </Badge>
      );
    } else if (facility.rejectionReason) {
      return (
        <Badge variant="destructive" className="bg-red-50 text-red-700 border-red-200">
          <XCircle className="w-3 h-3 mr-1" />
          Rejected
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
          <Clock className="w-3 h-3 mr-1" />
          Pending
        </Badge>
      );
    }
  };

  const getStatusColor = (facility: Facility) => {
    if (facility.isApproved) return "border-green-400 bg-green-50";
    if (facility.rejectionReason) return "border-red-400 bg-red-50";
    return "border-amber-400 bg-amber-50";
  };

  if (!token) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-12">
            <div className="text-red-500">No authentication token available. Please log in again.</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (pendingLoading || allLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-12">
            <div className="text-gray-500">Loading facilities...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const pendingCount = pendingFacilities.length;
  const approvedCount = allFacilities.filter(f => f.isApproved).length;
  const rejectedCount = allFacilities.filter(f => !f.isApproved && f.rejectionReason).length;

  return (
    <>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-3 bg-amber-100 rounded-lg">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending Approval</p>
                <p className="text-2xl font-bold text-gray-900">{pendingCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Approved</p>
                <p className="text-2xl font-bold text-gray-900">{approvedCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-3 bg-red-100 rounded-lg">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Rejected</p>
                <p className="text-2xl font-bold text-gray-900">{rejectedCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-3 bg-gray-100 rounded-lg">
                <Eye className="w-6 h-6 text-gray-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Unlisted</p>
                <p className="text-2xl font-bold text-gray-900">
                  {allFacilities.filter(f => f.isApproved && !f.isActive).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Approvals */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Building className="w-6 h-6 mr-3 text-amber-600" />
            Pending Facility Approvals
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {pendingCount === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="w-16 h-16 mx-auto text-green-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No pending approvals</h3>
              <p className="text-gray-500">All facilities have been reviewed.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {pendingFacilities.map((facility) => (
                <div key={facility.id} className={`border-l-4 border-amber-400 bg-amber-50 rounded-lg p-6`}>
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-start space-x-6">
                      <img 
                        src={facility.images[0] || "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=100"} 
                        alt="Facility" 
                        className="w-20 h-20 object-cover rounded-lg"
                      />
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900 mb-2">{facility.name}</h4>
                        <p className="text-gray-600 mb-2">
                          Owner: {facility.owner.firstName} {facility.owner.lastName} ({facility.owner.email})
                        </p>
                        <div className="flex items-center space-x-6 text-sm text-gray-500 mt-3">
                          <span className="flex items-center">
                            <MapPin className="w-4 h-4 mr-2" />
                            {facility.city}, {facility.state}
                          </span>
                          <span className="flex items-center">
                            <span className="w-4 h-4 mr-2 rounded-full bg-blue-500"></span>
                            ₹{facility.pricePerHour}/hour
                          </span>
                          <span className="flex items-center">
                            <Calendar className="w-4 h-4 mr-2" />
                            {new Date(facility.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    {getApprovalStatusBadge(facility)}
                  </div>
                  
                  <p className="text-gray-700 mb-4">{facility.description}</p>
                  
                  <div className="flex flex-wrap gap-2 mb-4">
                    {facility.amenities.map((amenity) => (
                      <Badge key={amenity} variant="outline" className="bg-blue-50 text-blue-700">
                        {amenity}
                      </Badge>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <div className="flex space-x-3">
                      <Button 
                        onClick={() => handleApprove(facility)}
                        className="bg-green-600 hover:bg-green-700 text-white"
                        disabled={approveFacilityMutation.isPending}
                      >
                        <Check className="w-4 h-4 mr-2" />
                        {approveFacilityMutation.isPending ? "Approving..." : "Approve"}
                      </Button>
                      <Button 
                        onClick={() => handleReject(facility)}
                        variant="destructive"
                        disabled={rejectFacilityMutation.isPending}
                      >
                        <X className="w-4 h-4 mr-2" />
                        {rejectFacilityMutation.isPending ? "Rejecting..." : "Reject"}
                      </Button>
                      {facility.isApproved && (
                        <Button 
                          variant="outline"
                          onClick={() => handleToggleVisibility(facility)}
                          disabled={toggleFacilityVisibilityMutation.isPending}
                          className={facility.isActive ? "text-orange-600 border-orange-200 hover:bg-orange-50" : "text-green-600 border-green-200 hover:bg-green-50"}
                        >
                          {facility.isActive ? (
                            <>
                              <Eye className="w-4 h-4 mr-1" />
                              Unlist
                            </>
                          ) : (
                            <>
                              <Eye className="w-4 h-4 mr-1" />
                              Relist
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                    <Button variant="outline" onClick={() => handleViewDetails(facility)}>
                      <Eye className="w-4 h-4 mr-2" />
                      View Details
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* All Facilities Status */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <Building className="w-6 h-6 mr-3 text-blue-600" />
              All Facilities Status
            </div>
            <div className="flex items-center space-x-2">
              <select 
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                onChange={(e) => {
                  const filter = e.target.value;
                  // You can implement filtering logic here if needed
                }}
                defaultValue="all"
              >
                <option value="all">All Facilities</option>
                <option value="approved">Approved Only</option>
                <option value="rejected">Rejected Only</option>
                <option value="unlisted">Unlisted Only</option>
                <option value="pending">Pending Only</option>
              </select>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            {allFacilities.map((facility) => (
              <div key={facility.id} className={`border-l-4 rounded-lg p-4 ${getStatusColor(facility)}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <img 
                      src={facility.images[0] || "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=100"} 
                      alt="Facility" 
                      className="w-12 h-12 object-cover rounded-lg"
                    />
                    <div>
                      <h5 className="font-medium text-gray-900">{facility.name}</h5>
                      <p className="text-sm text-gray-600">
                        {facility.owner.firstName} {facility.owner.lastName} • {facility.city}
                      </p>
                                             {facility.rejectionReason && (
                         <p className="text-sm text-red-600 mt-1">
                           <AlertTriangle className="w-3 h-3 inline mr-1" />
                           Rejected: {facility.rejectionReason}
                         </p>
                       )}
                       <div className="flex items-center space-x-2 mt-1">
                         <Badge 
                           variant={facility.isActive ? "default" : "secondary"} 
                           className="text-xs"
                         >
                           {facility.isActive ? "Publicly Listed" : "Unlisted"}
                         </Badge>
                       </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    {getApprovalStatusBadge(facility)}
                    <div className="flex items-center space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleToggleVisibility(facility)}
                        disabled={toggleFacilityVisibilityMutation.isPending}
                        className={facility.isActive ? "text-orange-600 border-orange-200 hover:bg-orange-50" : "text-green-600 border-green-200 hover:bg-green-50"}
                      >
                        {facility.isActive ? (
                          <>
                            <Eye className="w-4 h-4 mr-1" />
                            Unlist
                          </>
                        ) : (
                          <>
                            <Eye className="w-4 h-4 mr-1" />
                            Relist
                          </>
                        )}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleViewDetails(facility)}>
                        <Eye className="w-4 h-4 mr-2" />
                        View
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Reject Modal */}
      <Dialog open={isRejectModalOpen} onOpenChange={setIsRejectModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Facility</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting "{currentFacility?.name}". This will be visible to the facility owner.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="reject-reason">Rejection Reason</Label>
              <Textarea
                id="reject-reason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Explain why this facility is being rejected..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRejectModalOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmReject}
              disabled={rejectFacilityMutation.isPending}
            >
              {rejectFacilityMutation.isPending ? "Rejecting..." : "Reject Facility"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Details Modal */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Facility Details</DialogTitle>
          </DialogHeader>
          {currentFacility && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Facility Name</Label>
                  <p className="text-sm text-gray-700">{currentFacility.name}</p>
                </div>
                <div>
                  <Label>Owner</Label>
                  <p className="text-sm text-gray-700">
                    {currentFacility.owner.firstName} {currentFacility.owner.lastName}
                  </p>
                </div>
                <div>
                  <Label>Email</Label>
                  <p className="text-sm text-gray-700">{currentFacility.owner.email}</p>
                </div>
                <div>
                  <Label>Price per Hour</Label>
                  <p className="text-sm text-gray-700">₹{currentFacility.pricePerHour}</p>
                </div>
                <div className="col-span-2">
                  <Label>Address</Label>
                  <p className="text-sm text-gray-700">
                    {currentFacility.address}, {currentFacility.city}, {currentFacility.state} {currentFacility.zipCode}
                  </p>
                </div>
                <div className="col-span-2">
                  <Label>Description</Label>
                  <p className="text-sm text-gray-700">{currentFacility.description}</p>
                </div>
                <div className="col-span-2">
                  <Label>Amenities</Label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {currentFacility.amenities.map((amenity) => (
                      <Badge key={amenity} variant="outline">
                        {amenity}
                      </Badge>
                    ))}
                  </div>
                </div>
                {currentFacility.rejectionReason && (
                  <div className="col-span-2">
                    <Label className="text-red-600">Rejection Reason</Label>
                    <p className="text-sm text-red-600 mt-1">{currentFacility.rejectionReason}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
