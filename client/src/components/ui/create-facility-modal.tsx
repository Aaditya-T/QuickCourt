import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { X, Plus } from "lucide-react";

interface CreateFacilityModalProps {
  open: boolean;
  onClose: () => void;
  onFacilityCreated?: () => void;
}

export default function CreateFacilityModal({ open, onClose, onFacilityCreated }: CreateFacilityModalProps) {
  const { user, token } = useAuth();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    sportType: "",
    pricePerHour: "",
    images: [] as string[],
    amenities: [] as string[],
    operatingHours: JSON.stringify({
      monday: { open: "06:00", close: "23:00" },
      tuesday: { open: "06:00", close: "23:00" },
      wednesday: { open: "06:00", close: "23:00" },
      thursday: { open: "06:00", close: "23:00" },
      friday: { open: "06:00", close: "23:00" },
      saturday: { open: "06:00", close: "23:00" },
      sunday: { open: "06:00", close: "23:00" },
    }),
  });
  const [newAmenity, setNewAmenity] = useState("");
  const [newImage, setNewImage] = useState("");

  const createFacilityMutation = useMutation({
    mutationFn: async (facilityData: any) => {
      return await apiRequest("POST", "/api/facilities", facilityData);
    },
    onSuccess: () => {
      toast({
        title: "Facility Created",
        description: "Your facility has been successfully added to the platform.",
      });
      onFacilityCreated?.();
      onClose();
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Creation Failed",
        description: error.message || "Failed to create facility. Please try again.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      address: "",
      city: "",
      state: "",
      zipCode: "",
      sportType: "",
      pricePerHour: "",
      images: [],
      amenities: [],
      operatingHours: JSON.stringify({
        monday: { open: "06:00", close: "23:00" },
        tuesday: { open: "06:00", close: "23:00" },
        wednesday: { open: "06:00", close: "23:00" },
        thursday: { open: "06:00", close: "23:00" },
        friday: { open: "06:00", close: "23:00" },
        saturday: { open: "06:00", close: "23:00" },
        sunday: { open: "06:00", close: "23:00" },
      }),
    });
    setNewAmenity("");
    setNewImage("");
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addAmenity = () => {
    if (newAmenity.trim() && !formData.amenities.includes(newAmenity.trim())) {
      setFormData(prev => ({
        ...prev,
        amenities: [...prev.amenities, newAmenity.trim()]
      }));
      setNewAmenity("");
    }
  };

  const removeAmenity = (amenity: string) => {
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities.filter(a => a !== amenity)
    }));
  };

  const addImage = () => {
    if (newImage.trim() && !formData.images.includes(newImage.trim())) {
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, newImage.trim()]
      }));
      setNewImage("");
    }
  };

  const removeImage = (image: string) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter(img => img !== image)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || user.role !== "facility_owner") {
      toast({
        title: "Permission Denied",
        description: "You must be a facility owner to create facilities.",
        variant: "destructive",
      });
      return;
    }

    const facilityData = {
      ...formData,
      // Keep pricePerHour as string since Drizzle decimal expects string
      ownerId: user.id,
    };

    createFacilityMutation.mutate(facilityData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Facility</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Basic Information</h3>
            
            <div>
              <Label htmlFor="name">Facility Name *</Label>
              <Input
                id="name"
                required
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="Elite Badminton Center"
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleChange("description", e.target.value)}
                placeholder="Describe your facility..."
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="sportType">Sport Type *</Label>
              <Select value={formData.sportType} onValueChange={(value) => handleChange("sportType", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select sport type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="badminton">Badminton</SelectItem>
                  <SelectItem value="tennis">Tennis</SelectItem>
                  <SelectItem value="basketball">Basketball</SelectItem>
                  <SelectItem value="football">Football</SelectItem>
                  <SelectItem value="table_tennis">Table Tennis</SelectItem>
                  <SelectItem value="squash">Squash</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="pricePerHour">Price per Hour (₹) *</Label>
              <Input
                id="pricePerHour"
                type="number"
                min="0"
                step="0.01"
                required
                value={formData.pricePerHour}
                onChange={(e) => handleChange("pricePerHour", e.target.value)}
                placeholder="800"
              />
            </div>
          </div>

          {/* Location */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Location</h3>
            
            <div>
              <Label htmlFor="address">Address *</Label>
              <Input
                id="address"
                required
                value={formData.address}
                onChange={(e) => handleChange("address", e.target.value)}
                placeholder="123 Sports Complex Road"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  required
                  value={formData.city}
                  onChange={(e) => handleChange("city", e.target.value)}
                  placeholder="Mumbai"
                />
              </div>
              <div>
                <Label htmlFor="state">State *</Label>
                <Input
                  id="state"
                  required
                  value={formData.state}
                  onChange={(e) => handleChange("state", e.target.value)}
                  placeholder="Maharashtra"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="zipCode">ZIP Code *</Label>
              <Input
                id="zipCode"
                required
                value={formData.zipCode}
                onChange={(e) => handleChange("zipCode", e.target.value)}
                placeholder="400001"
              />
            </div>
          </div>

          {/* Amenities */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Amenities</h3>
            
            <div className="flex space-x-2">
              <Input
                value={newAmenity}
                onChange={(e) => setNewAmenity(e.target.value)}
                placeholder="Add amenity..."
                onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addAmenity())}
              />
              <Button type="button" onClick={addAmenity} variant="outline">
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              {formData.amenities.map((amenity) => (
                <Badge key={amenity} variant="secondary" className="flex items-center gap-1">
                  {amenity}
                  <button
                    type="button"
                    onClick={() => removeAmenity(amenity)}
                    className="ml-1 hover:text-red-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          {/* Images */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Images (URLs)</h3>
            
            <div className="flex space-x-2">
              <Input
                value={newImage}
                onChange={(e) => setNewImage(e.target.value)}
                placeholder="Add image URL..."
                onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addImage())}
              />
              <Button type="button" onClick={addImage} variant="outline">
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-2">
              {formData.images.map((image, index) => (
                <div key={index} className="flex items-center justify-between p-2 border rounded">
                  <span className="text-sm truncate flex-1 mr-2">{image}</span>
                  <Button
                    type="button"
                    onClick={() => removeImage(image)}
                    variant="ghost"
                    size="sm"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createFacilityMutation.isPending}
            >
              {createFacilityMutation.isPending ? "Creating..." : "Create Facility"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
