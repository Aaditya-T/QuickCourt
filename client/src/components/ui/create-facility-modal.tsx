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
    sportTypes: [] as string[],
    pricePerHour: "",
    images: [] as string[],
    amenities: [] as string[],
    operatingHours: JSON.stringify({
      monday: { open: "06:00", close: "23:00" },
      tuesday: { open: "06:00", close: "23:00" },
      wednesday: { open: "06:00", close: "23:00" },
      thursday: { open: "06:00", close: "23:00" },
      friday: { open: "06:00", close: "23:00" },
      saturday: { open: "08:00", close: "22:00" },
      sunday: { closed: true },
    }),
  });
  const [newAmenity, setNewAmenity] = useState("");
  const [newImage, setNewImage] = useState("");

  const createFacilityMutation = useMutation({
    mutationFn: async (facilityData: any) => {
      return await apiRequest("/api/facilities", "POST", facilityData);
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
      sportTypes: [],
      pricePerHour: "",
      images: [],
      amenities: [],
      operatingHours: JSON.stringify({
        monday: { open: "06:00", close: "23:00" },
        tuesday: { open: "06:00", close: "23:00" },
        wednesday: { open: "06:00", close: "23:00" },
        thursday: { open: "06:00", close: "23:00" },
        friday: { open: "06:00", close: "23:00" },
        saturday: { open: "08:00", close: "22:00" },
        sunday: { closed: true },
      }),
    });
    setNewAmenity("");
    setNewImage("");
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSportTypeToggle = (sportType: string) => {
    setFormData(prev => ({
      ...prev,
      sportTypes: prev.sportTypes.includes(sportType)
        ? prev.sportTypes.filter(type => type !== sportType)
        : [...prev.sportTypes, sportType]
    }));
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

    if (formData.sportTypes.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please select at least one sport type.",
        variant: "destructive",
      });
      return;
    }

    // Validate operating hours
    try {
      const hours = JSON.parse(formData.operatingHours);
      for (const [day, dayHours] of Object.entries(hours)) {
        const typedDayHours = dayHours as { closed?: boolean; open?: string; close?: string };
        if (!typedDayHours.closed && (!typedDayHours.open || !typedDayHours.close)) {
          toast({
            title: "Validation Error",
            description: `Please set opening and closing times for ${day.charAt(0).toUpperCase() + day.slice(1)} or mark it as closed.`,
            variant: "destructive",
          });
          return;
        }
      }
    } catch (error) {
      toast({
        title: "Validation Error",
        description: "Invalid operating hours format.",
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
      <DialogContent className="max-w-2xl w-[95vw] sm:w-auto max-h-[85vh] sm:max-h-[90vh] overflow-y-auto mx-2 sm:mx-4">
        <DialogHeader>
          <DialogTitle>Add New Facility</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          {/* Basic Information */}
          <div className="space-y-3 sm:space-y-4">
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
              <Label>Sport Types *</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                {[
                  { value: "badminton", label: "Badminton" },
                  { value: "tennis", label: "Tennis" },
                  { value: "basketball", label: "Basketball" },
                  { value: "football", label: "Football" },
                  { value: "table_tennis", label: "Table Tennis" },
                  { value: "squash", label: "Squash" },
                ].map((sport) => (
                  <div key={sport.value} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={sport.value}
                      checked={formData.sportTypes.includes(sport.value)}
                      onChange={() => handleSportTypeToggle(sport.value)}
                      className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                    />
                    <Label htmlFor={sport.value} className="text-sm font-normal">
                      {sport.label}
                    </Label>
                  </div>
                ))}
              </div>
              {formData.sportTypes.length === 0 && (
                <p className="text-sm text-red-500 mt-1">Please select at least one sport type</p>
              )}
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
          <div className="space-y-3 sm:space-y-4">
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

          {/* Operating Hours */}
          <div className="space-y-3 sm:space-y-4">
            <h3 className="text-lg font-medium">Operating Hours</h3>
            <p className="text-sm text-gray-600">Set the opening and closing times for each day of the week</p>
            
            {/* Quick Set All Days */}
            <div className="space-y-3 p-3 border rounded-lg bg-gray-50">
              {/* Set all days to same hours */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 min-w-0">
                  <Label className="text-sm font-medium whitespace-nowrap">Set all days to:</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="time"
                      id="quick-open"
                      defaultValue="06:00"
                      className="w-20 sm:w-24"
                    />
                    <span className="text-gray-500 text-xs sm:text-sm">to</span>
                    <Input
                      type="time"
                      id="quick-close"
                      defaultValue="23:00"
                      className="w-20 sm:w-24"
                    />
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const openTime = (document.getElementById('quick-open') as HTMLInputElement).value;
                    const closeTime = (document.getElementById('quick-close') as HTMLInputElement).value;
                    if (openTime && closeTime) {
                      const hours = {
                        monday: { open: openTime, close: closeTime },
                        tuesday: { open: openTime, close: closeTime },
                        wednesday: { open: openTime, close: closeTime },
                        thursday: { open: openTime, close: closeTime },
                        friday: { open: openTime, close: closeTime },
                        saturday: { open: openTime, close: closeTime },
                        sunday: { open: openTime, close: closeTime },
                      };
                      setFormData(prev => ({
                        ...prev,
                        operatingHours: JSON.stringify(hours)
                      }));
                    }
                  }}
                  className="whitespace-nowrap text-xs sm:text-sm"
                >
                  Apply to All Days
                </Button>
              </div>
              
              {/* Quick Set All Closed */}
              <div className="flex items-center gap-2 pt-2 border-t">
                <input
                  type="checkbox"
                  id="quick-closed"
                  className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                  onChange={(e) => {
                    if (e.target.checked) {
                      const hours = {
                        monday: { closed: true },
                        tuesday: { closed: true },
                        wednesday: { closed: true },
                        thursday: { closed: true },
                        friday: { closed: true },
                        saturday: { closed: true },
                        sunday: { closed: true },
                      };
                      setFormData(prev => ({
                        ...prev,
                        operatingHours: JSON.stringify(hours)
                      }));
                    } else {
                      // Reset to default hours
                      const hours = {
                        monday: { open: "06:00", close: "23:00" },
                        tuesday: { open: "06:00", close: "23:00" },
                        wednesday: { open: "06:00", close: "23:00" },
                        thursday: { open: "06:00", close: "23:00" },
                        friday: { open: "06:00", close: "23:00" },
                        saturday: { open: "08:00", close: "22:00" },
                        sunday: { closed: true },
                      };
                      setFormData(prev => ({
                        ...prev,
                        operatingHours: JSON.stringify(hours)
                      }));
                    }
                  }}
                />
                <Label htmlFor="quick-closed" className="text-sm font-medium">
                  Set all days as closed
                </Label>
              </div>
            </div>
            
            {[
              { key: "monday", label: "Monday" },
              { key: "tuesday", label: "Tuesday" },
              { key: "wednesday", label: "Wednesday" },
              { key: "thursday", label: "Thursday" },
              { key: "friday", label: "Friday" },
              { key: "saturday", label: "Saturday" },
              { key: "sunday", label: "Sunday" },
            ].map((day) => {
              const currentHours = JSON.parse(formData.operatingHours)[day.key];
              const isClosed = currentHours?.closed || false;
              return (
                <div key={day.key} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-2 sm:p-3 border rounded-lg">
                  {/* Day label */}
                  <div className="w-20 sm:w-24 flex-shrink-0">
                    <Label className="text-sm font-medium">{day.label}</Label>
                  </div>
                  
                  {/* Controls row */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 flex-1 min-w-0">
                    {/* Closed checkbox */}
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`${day.key}-closed`}
                        checked={isClosed}
                        onChange={(e) => {
                          const hours = JSON.parse(formData.operatingHours);
                          if (e.target.checked) {
                            hours[day.key] = { closed: true };
                          } else {
                            hours[day.key] = { open: "06:00", close: "23:00" };
                          }
                          setFormData(prev => ({
                            ...prev,
                            operatingHours: JSON.stringify(hours)
                          }));
                        }}
                        className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                      />
                      <Label htmlFor={`${day.key}-closed`} className="text-xs sm:text-sm text-gray-600 whitespace-nowrap">
                        Closed
                      </Label>
                    </div>
                    
                    {/* Time inputs - only show if not closed */}
                    {!isClosed && (
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                        <div className="flex items-center gap-2">
                          <Label htmlFor={`${day.key}-open`} className="text-xs text-gray-600 whitespace-nowrap">Open</Label>
                          <Input
                            id={`${day.key}-open`}
                            type="time"
                            value={currentHours?.open || "06:00"}
                            onChange={(e) => {
                              const hours = JSON.parse(formData.operatingHours);
                              hours[day.key] = { ...hours[day.key], open: e.target.value };
                              setFormData(prev => ({
                                ...prev,
                                operatingHours: JSON.stringify(hours)
                              }));
                            }}
                            className="w-20 sm:w-24"
                          />
                        </div>
                        <span className="text-gray-500 text-xs sm:text-sm">to</span>
                        <div className="flex items-center gap-2">
                          <Label htmlFor={`${day.key}-close`} className="text-xs text-gray-600 whitespace-nowrap">Close</Label>
                          <Input
                            id={`${day.key}-close`}
                            type="time"
                            value={currentHours?.close || "23:00"}
                            onChange={(e) => {
                              const hours = JSON.parse(formData.operatingHours);
                              hours[day.key] = { ...hours[day.key], close: e.target.value };
                              setFormData(prev => ({
                                ...prev,
                                operatingHours: JSON.stringify(hours)
                              }));
                            }}
                            className="w-20 sm:w-24"
                          />
                        </div>
                      </div>
                    )}
                    
                    {/* Show "Closed" text when day is marked as closed */}
                    {isClosed && (
                      <div className="text-gray-500 font-medium text-sm">
                        Closed
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Amenities */}
          <div className="space-y-3 sm:space-y-4">
            <span className="text-lg font-medium">Amenities</span>
            
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
          <div className="space-y-3 sm:space-y-4">
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
                  <span className="text-sm truncate flex-1 mr-2 cursor-pointer" onClick={() => window.open(image, "_blank")}>{image.length > 40 ? image.slice(0, 40) + "..." : image}</span>
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
