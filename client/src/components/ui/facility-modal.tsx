import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import LocationMap from "@/components/ui/location-map";
import PhotoUpload from "@/components/ui/photo-upload";
import { 
  Building, 
  MapPin, 
  Clock, 
  Trophy, 
  DollarSign, 
  Plus, 
  Minus,
  Star,
  Wifi,
  Car,
  Coffee,
  Users,
  Zap,
  X
} from "lucide-react";

type Game = {
  id: string;
  name: string;
  emoji: string;
  sportType: string;
};

type GameCourt = {
  gameId: string;
  courtCount: number;
  pricePerHour: number;
};

type OperatingHours = {
  [key: string]: {
    open?: string;
    close?: string;
    closed?: boolean;
  };
};

interface FacilityModalProps {
  open: boolean;
  onClose: () => void;
  facility?: any;
  mode: "create" | "edit";
}

const AMENITY_OPTIONS = [
  { id: "WiFi", label: "WiFi", icon: Wifi },
  { id: "Parking", label: "Parking", icon: Car },
  { id: "Cafeteria", label: "Cafeteria", icon: Coffee },
  { id: "Changing Room", label: "Changing Room", icon: Users },
  { id: "Equipment Rental", label: "Equipment Rental", icon: Trophy },
  { id: "Air Conditioning", label: "Air Conditioning", icon: Zap },
];

const DAYS_OF_WEEK = [
  { key: "monday", label: "Monday" },
  { key: "tuesday", label: "Tuesday" },
  { key: "wednesday", label: "Wednesday" },
  { key: "thursday", label: "Thursday" },
  { key: "friday", label: "Friday" },
  { key: "saturday", label: "Saturday" },
  { key: "sunday", label: "Sunday" },
];

export default function FacilityModal({ open, onClose, facility, mode }: FacilityModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    latitude: null as number | null,
    longitude: null as number | null,
    images: [] as string[],
  });

  const [gameCourts, setGameCourts] = useState<GameCourt[]>([]);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [operatingHours, setOperatingHours] = useState<OperatingHours>({
    monday: { open: "06:00", close: "23:00" },
    tuesday: { open: "06:00", close: "23:00" },
    wednesday: { open: "06:00", close: "23:00" },
    thursday: { open: "06:00", close: "23:00" },
    friday: { open: "06:00", close: "23:00" },
    saturday: { open: "08:00", close: "22:00" },
    sunday: { closed: true },
  });

  // Fetch available games
  const { data: allGames = [] } = useQuery<Game[]>({
    queryKey: ["/api/games"],
    queryFn: async () => {
      const res = await fetch("/api/games");
      if (!res.ok) throw new Error("Failed to fetch games");
      return res.json();
    },
  });

  // Reset form when modal opens/closes or facility changes
  useEffect(() => {
    if (open) {
      if (mode === "edit" && facility) {
        setFormData({
          name: facility.name || "",
          description: facility.description || "",
          address: facility.address || "",
          city: facility.city || "",
          state: facility.state || "",
          zipCode: facility.zipCode || "",
          latitude: facility.latitude ? parseFloat(facility.latitude) : null,
          longitude: facility.longitude ? parseFloat(facility.longitude) : null,
          images: facility.images || [],
        });
        setSelectedAmenities(facility.amenities || []);
        
        try {
          const hours = facility.operatingHours ? JSON.parse(facility.operatingHours) : {};
          setOperatingHours(hours);
        } catch (error) {
          console.error("Error parsing operating hours:", error);
        }
        
        // Load existing game courts if available
        if (facility.facilityCourts) {
          const courts = facility.facilityCourts.map((court: any) => ({
            gameId: court.gameId,
            courtCount: court.courtCount,
            pricePerHour: parseFloat(court.pricePerHour),
          }));
          setGameCourts(courts);
        }
      } else {
        // Reset for create mode
        setFormData({
          name: "",
          description: "",
          address: "",
          city: "",
          state: "",
          zipCode: "",
          latitude: null,
          longitude: null,
          images: [],
        });
        setGameCourts([]);
        setSelectedAmenities([]);
        setOperatingHours({
          monday: { open: "06:00", close: "23:00" },
          tuesday: { open: "06:00", close: "23:00" },
          wednesday: { open: "06:00", close: "23:00" },
          thursday: { open: "06:00", close: "23:00" },
          friday: { open: "06:00", close: "23:00" },
          saturday: { open: "08:00", close: "22:00" },
          sunday: { closed: true },
        });
      }
    }
  }, [open, mode, facility]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleLocationChange = (coordinates: { latitude: number; longitude: number }) => {
    setFormData(prev => ({
      ...prev,
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
    }));
  };

  const handleZipCodeChange = (zipCode: string) => {
    setFormData(prev => ({ ...prev, zipCode }));
  };

  const handleImagesChange = (images: string[]) => {
    setFormData(prev => ({ ...prev, images }));
  };

  const handleGameCourtChange = (gameId: string, field: 'courtCount' | 'pricePerHour', value: number) => {
    setGameCourts(prev => {
      const existing = prev.find(court => court.gameId === gameId);
      if (existing) {
        return prev.map(court => 
          court.gameId === gameId 
            ? { ...court, [field]: value }
            : court
        );
      } else {
        return [...prev, {
          gameId,
          courtCount: field === 'courtCount' ? value : 1,
          pricePerHour: field === 'pricePerHour' ? value : 800,
        }];
      }
    });
  };

  const removeGameCourt = (gameId: string) => {
    setGameCourts(prev => prev.filter(court => court.gameId !== gameId));
  };

  const handleOperatingHoursChange = (day: string, field: 'open' | 'close' | 'closed', value: string | boolean) => {
    setOperatingHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value,
      }
    }));
  };

  const toggleAmenity = (amenityId: string) => {
    setSelectedAmenities(prev => 
      prev.includes(amenityId) 
        ? prev.filter(id => id !== amenityId)
        : [...prev, amenityId]
    );
  };

  // Submit mutation
  const submitMutation = useMutation({
    mutationFn: async () => {
      const submitData = {
        ...formData,
        ownerId: user?.id,
        amenities: selectedAmenities,
        operatingHours: JSON.stringify(operatingHours),
        gameCourts: gameCourts,
        // Legacy fields for compatibility
        sportTypes: gameCourts.map(court => {
          const game = allGames.find(g => g.id === court.gameId);
          return game?.sportType;
        }).filter(Boolean),
        pricePerHour: gameCourts.length > 0 ? gameCourts[0].pricePerHour : 800,
      };

      const endpoint = mode === "create" ? "/api/facilities" : `/api/facilities/${facility.id}`;
      const method = mode === "create" ? "POST" : "PUT";
      
      return await apiRequest(endpoint, method, submitData);
    },
    onSuccess: () => {
      toast({
        title: mode === "create" ? "Facility Created" : "Facility Updated",
        description: mode === "create" 
          ? "Your facility has been successfully created and is pending approval."
          : "Your facility has been successfully updated.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/owner/facilities"] });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: mode === "create" ? "Creation Failed" : "Update Failed",
        description: error.message || "An error occurred. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    // Basic validation
    if (!formData.name || !formData.address || !formData.city || !formData.state || !formData.zipCode) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    if (gameCourts.length === 0) {
      toast({
        title: "Validation Error", 
        description: "Please add at least one game with court availability.",
        variant: "destructive",
      });
      return;
    }

    submitMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building className="w-6 h-6 text-blue-600" />
            {mode === "create" ? "Create New Facility" : "Edit Facility"}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="location">Location</TabsTrigger>
            <TabsTrigger value="photos">Photos</TabsTrigger>
            <TabsTrigger value="games">Games & Courts</TabsTrigger>
            <TabsTrigger value="amenities">Amenities</TabsTrigger>
            <TabsTrigger value="hours">Hours</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-green-600" />
                  Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Facility Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleInputChange("name", e.target.value)}
                      placeholder="Enter facility name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => handleInputChange("city", e.target.value)}
                      placeholder="Enter city"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange("description", e.target.value)}
                    placeholder="Describe your facility..."
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="address">Address *</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => handleInputChange("address", e.target.value)}
                    placeholder="Enter full address"
                  />
                </div>

                <div>
                  <Label htmlFor="state">State *</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => handleInputChange("state", e.target.value)}
                    placeholder="Enter state"
                  />
                </div>

                <div className="text-sm text-gray-600 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <strong>Note:</strong> Pincode will be entered in the Location tab along with map selection.
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="location" className="space-y-6">
            <LocationMap
              onLocationChange={handleLocationChange}
              onZipCodeChange={handleZipCodeChange}
              initialCoordinates={{
                latitude: formData.latitude,
                longitude: formData.longitude,
              }}
              initialZipCode={formData.zipCode}
            />
          </TabsContent>

          <TabsContent value="photos" className="space-y-6">
            <PhotoUpload
              onImagesChange={handleImagesChange}
              initialImages={formData.images}
              maxImages={5}
            />
          </TabsContent>

          <TabsContent value="games" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-600" />
                  Games & Court Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm text-gray-600 mb-4">
                  Select the games available at your facility and set the number of courts and pricing for each.
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {allGames.map((game) => {
                    const existingCourt = gameCourts.find(court => court.gameId === game.id);
                    const isSelected = !!existingCourt;

                    return (
                      <Card key={game.id} className={`border-2 transition-all ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <span className="text-2xl">{game.emoji}</span>
                              <span className="font-medium">{game.name}</span>
                            </div>
                            {isSelected && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeGameCourt(game.id)}
                                className="text-red-600 hover:text-red-800 hover:bg-red-50 p-1"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            )}
                          </div>

                          {isSelected ? (
                            <div className="space-y-3">
                              <div>
                                <Label className="text-xs text-gray-600">Courts Available</Label>
                                <div className="flex items-center gap-2 mt-1">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleGameCourtChange(game.id, 'courtCount', Math.max(1, (existingCourt?.courtCount || 1) - 1))}
                                    disabled={existingCourt?.courtCount <= 1}
                                    className="h-8 w-8 p-0"
                                  >
                                    <Minus className="w-3 h-3" />
                                  </Button>
                                  <span className="w-12 text-center font-medium">
                                    {existingCourt?.courtCount || 1}
                                  </span>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleGameCourtChange(game.id, 'courtCount', (existingCourt?.courtCount || 1) + 1)}
                                    className="h-8 w-8 p-0"
                                  >
                                    <Plus className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>

                              <div>
                                <Label className="text-xs text-gray-600">Price per Hour (₹)</Label>
                                <Input
                                  type="number"
                                  value={existingCourt?.pricePerHour || 800}
                                  onChange={(e) => handleGameCourtChange(game.id, 'pricePerHour', parseInt(e.target.value) || 800)}
                                  className="mt-1 h-8 text-sm"
                                  min="100"
                                  max="5000"
                                />
                              </div>
                            </div>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleGameCourtChange(game.id, 'courtCount', 1)}
                              className="w-full"
                            >
                              <Plus className="w-4 h-4 mr-1" />
                              Add Game
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {gameCourts.length > 0 && (
                  <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Star className="w-4 h-4 text-green-600" />
                      <span className="font-medium text-green-800">Selected Games Summary</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      {gameCourts.map(court => {
                        const game = allGames.find(g => g.id === court.gameId);
                        return (
                          <div key={court.gameId} className="flex justify-between">
                            <span>{game?.emoji} {game?.name}</span>
                            <span className="font-medium">
                              {court.courtCount} court{court.courtCount > 1 ? 's' : ''} @ ₹{court.pricePerHour}/hr
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="amenities" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-purple-600" />
                  Facility Amenities
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {AMENITY_OPTIONS.map((amenity) => {
                    const IconComponent = amenity.icon;
                    const isSelected = selectedAmenities.includes(amenity.id);
                    
                    return (
                      <div
                        key={amenity.id}
                        onClick={() => toggleAmenity(amenity.id)}
                        className={`flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all ${
                          isSelected 
                            ? 'border-blue-500 bg-blue-50 text-blue-700' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <IconComponent className="w-5 h-5" />
                        <span className="font-medium">{amenity.label}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="hours" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-indigo-600" />
                  Operating Hours
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {DAYS_OF_WEEK.map((day) => {
                  const dayHours = operatingHours[day.key];
                  const isClosed = dayHours?.closed;

                  return (
                    <div key={day.key} className="flex items-center gap-4 p-3 border border-gray-200 rounded-lg">
                      <div className="w-24 font-medium">{day.label}</div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={!isClosed}
                          onCheckedChange={(checked) => 
                            handleOperatingHoursChange(day.key, 'closed', !checked)
                          }
                        />
                        <span className="text-sm text-gray-600">
                          {isClosed ? 'Closed' : 'Open'}
                        </span>
                      </div>
                      {!isClosed && (
                        <div className="flex items-center gap-2 ml-auto">
                          <Input
                            type="time"
                            value={dayHours?.open || "06:00"}
                            onChange={(e) => handleOperatingHoursChange(day.key, 'open', e.target.value)}
                            className="w-32"
                          />
                          <span className="text-gray-500">to</span>
                          <Input
                            type="time"
                            value={dayHours?.close || "23:00"}
                            onChange={(e) => handleOperatingHoursChange(day.key, 'close', e.target.value)}
                            className="w-32"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-3 pt-6 border-t">
          <Button variant="outline" onClick={onClose} disabled={submitMutation.isPending}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={submitMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {submitMutation.isPending 
              ? (mode === "create" ? "Creating..." : "Updating...")
              : (mode === "create" ? "Create Facility" : "Update Facility")
            }
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}