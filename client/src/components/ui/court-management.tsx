import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, 
  Edit, 
  Trash, 
  Clock, 
  MapPin,
  Settings
} from "lucide-react";
import type { Court, InsertCourt } from "@shared/schema";

interface CourtManagementProps {
  facilityId: string;
  facilityName: string;
}

export default function CourtManagement({ facilityId, facilityName }: CourtManagementProps) {
  const { toast } = useToast();
  const [createCourtModalOpen, setCreateCourtModalOpen] = useState(false);
  const [editingCourt, setEditingCourt] = useState<Court | null>(null);
  const [courtFormData, setCourtFormData] = useState<Partial<InsertCourt>>({
    name: "",
    sportType: undefined,
    pricePerHour: "0",
    operatingHours: "09:00-21:00",
    isActive: true,
  });

  // Fetch courts for this facility
  const { data: courts = [], isLoading: courtsLoading } = useQuery<Court[]>({
    queryKey: ["/api/facilities", facilityId, "courts"],
    queryFn: () => fetch(`/api/facilities/${facilityId}/courts`).then(res => res.json()),
  });

  // Create court mutation
  const createCourtMutation = useMutation({
    mutationFn: async (courtData: Partial<InsertCourt>) => {
      return await apiRequest("POST", `/api/facilities/${facilityId}/courts`, courtData);
    },
    onSuccess: () => {
      toast({
        title: "Court Created",
        description: "New court has been successfully added.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/facilities", facilityId, "courts"] });
      setCreateCourtModalOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Creation Failed",
        description: error.message || "Failed to create court.",
        variant: "destructive",
      });
    },
  });

  // Update court mutation
  const updateCourtMutation = useMutation({
    mutationFn: async ({ courtId, data }: { courtId: string; data: Partial<InsertCourt> }) => {
      return await apiRequest("PUT", `/api/courts/${courtId}`, data);
    },
    onSuccess: () => {
      toast({
        title: "Court Updated",
        description: "Court has been successfully updated.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/facilities", facilityId, "courts"] });
      setEditingCourt(null);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update court.",
        variant: "destructive",
      });
    },
  });

  // Delete court mutation
  const deleteCourtMutation = useMutation({
    mutationFn: async (courtId: string) => {
      return await apiRequest("DELETE", `/api/courts/${courtId}`, {});
    },
    onSuccess: () => {
      toast({
        title: "Court Deleted",
        description: "Court has been successfully removed.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/facilities", facilityId, "courts"] });
    },
    onError: (error: any) => {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete court.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setCourtFormData({
      name: "",
      sportType: undefined,
      pricePerHour: "0",
      operatingHours: "09:00-21:00",
      isActive: true,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCourt) {
      updateCourtMutation.mutate({ courtId: editingCourt.id, data: courtFormData });
    } else {
      createCourtMutation.mutate(courtFormData);
    }
  };

  const startEdit = (court: Court) => {
    setEditingCourt(court);
    setCourtFormData({
      name: court.name,
      sportType: court.sportType,
      pricePerHour: court.pricePerHour,
      operatingHours: court.operatingHours,
      isActive: court.isActive ?? true,
    });
  };

  const sportTypes = [
    { value: "basketball", label: "Basketball" },
    { value: "tennis", label: "Tennis" },
    { value: "badminton", label: "Badminton" },
    { value: "table_tennis", label: "Table Tennis" },
    { value: "squash", label: "Squash" },
    { value: "football", label: "Football" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Courts for {facilityName}</span>
          <Dialog open={createCourtModalOpen || !!editingCourt} onOpenChange={(open) => {
            if (!open) {
              setCreateCourtModalOpen(false);
              setEditingCourt(null);
              resetForm();
            }
          }}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={() => setCreateCourtModalOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Court
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingCourt ? "Edit Court" : "Add New Court"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Court Name</Label>
                  <Input
                    id="name"
                    value={courtFormData.name}
                    onChange={(e) => setCourtFormData({ ...courtFormData, name: e.target.value })}
                    placeholder="e.g., Court 1, Center Court"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="sportType">Sport Type</Label>
                  <Select
                    value={courtFormData.sportType}
                    onValueChange={(value) => setCourtFormData({ ...courtFormData, sportType: value as any })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select sport" />
                    </SelectTrigger>
                    <SelectContent>
                      {sportTypes.map((sport) => (
                        <SelectItem key={sport.value} value={sport.value}>
                          {sport.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="pricePerHour">Hourly Rate (₹)</Label>
                  <Input
                    id="pricePerHour"
                    type="number"
                    min="0"
                    step="50"
                    value={courtFormData.pricePerHour}
                    onChange={(e) => setCourtFormData({ ...courtFormData, pricePerHour: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="operatingHours">Operating Hours</Label>
                  <Input
                    id="operatingHours"
                    value={courtFormData.operatingHours}
                    onChange={(e) => setCourtFormData({ ...courtFormData, operatingHours: e.target.value })}
                    placeholder="e.g., 09:00-21:00"
                    required
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="isActive"
                    checked={courtFormData.isActive ?? true}
                    onCheckedChange={(checked) => setCourtFormData({ ...courtFormData, isActive: checked })}
                  />
                  <Label htmlFor="isActive">Active (Available for booking)</Label>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button 
                    type="submit" 
                    className="flex-1"
                    disabled={createCourtMutation.isPending || updateCourtMutation.isPending}
                  >
                    {editingCourt ? "Update Court" : "Create Court"}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setCreateCourtModalOpen(false);
                      setEditingCourt(null);
                      resetForm();
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {courtsLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="h-16 w-16 rounded" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-5 w-1/2" />
                  <Skeleton className="h-4 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : courts.length === 0 ? (
          <div className="text-center py-8">
            <Settings className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No courts yet</h3>
            <p className="text-gray-600 mb-4">
              Add courts to start accepting bookings for this facility.
            </p>
            <Button onClick={() => setCreateCourtModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Court
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {courts.map((court) => (
              <div key={court.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-semibold text-lg">{court.name}</h4>
                      <Badge variant={court.isActive ? "default" : "secondary"}>
                        {court.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {sportTypes.find(s => s.value === court.sportType)?.label || court.sportType}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        ₹{court.pricePerHour}/hour
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {court.operatingHours}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => startEdit(court)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deleteCourtMutation.mutate(court.id)}
                      disabled={deleteCourtMutation.isPending}
                    >
                      <Trash className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}