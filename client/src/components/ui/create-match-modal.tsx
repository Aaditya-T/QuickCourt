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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { format, parse, addHours } from "date-fns";
import { CalendarIcon } from "lucide-react";

interface CreateMatchModalProps {
  open: boolean;
  onClose: () => void;
  onMatchCreated?: () => void;
}

export default function CreateMatchModal({ open, onClose, onMatchCreated }: CreateMatchModalProps) {
  const { user, token } = useAuth();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    facilityId: "",
    sportType: "",
    skillLevel: "intermediate",
    maxPlayers: "4",
    costPerPlayer: "",
    startTime: "",
    endTime: "",
  });

  // Fetch facilities for selection
  const { data: facilities = [] } = useQuery({
    queryKey: ["/api/facilities"],
    queryFn: async () => {
      const response = await fetch("/api/facilities");
      if (!response.ok) throw new Error("Failed to fetch facilities");
      return response.json();
    },
  });

  const createMatchMutation = useMutation({
    mutationFn: async (matchData: any) => {
      return await apiRequest("/api/matches", "POST", matchData);
    },
    onSuccess: () => {
      toast({
        title: "Match Created",
        description: "Your match has been successfully created!",
      });
      onMatchCreated?.();
      onClose();
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Creation Failed",
        description: error.message || "Failed to create match. Please try again.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      facilityId: "",
      sportType: "",
      skillLevel: "intermediate",
      maxPlayers: "4",
      costPerPlayer: "",
      startTime: "",
      endTime: "",
    });
    setSelectedDate(new Date());
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Login Required",
        description: "You must be logged in to create matches.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedDate) {
      toast({
        title: "Date Required",
        description: "Please select a date for the match.",
        variant: "destructive",
      });
      return;
    }

    try {
      const startDateTime = parse(formData.startTime, "HH:mm", selectedDate);
      const endDateTime = parse(formData.endTime, "HH:mm", selectedDate);

      if (endDateTime <= startDateTime) {
        toast({
          title: "Invalid Time",
          description: "End time must be after start time.",
          variant: "destructive",
        });
        return;
      }

      const matchData = {
        ...formData,
        maxPlayers: parseInt(formData.maxPlayers),
        costPerPlayer: parseFloat(formData.costPerPlayer),
        date: selectedDate.toISOString(),
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
        creatorId: user.id,
      };

      createMatchMutation.mutate(matchData);
    } catch (error) {
      toast({
        title: "Invalid Input",
        description: "Please check your input values and try again.",
        variant: "destructive",
      });
    }
  };

  const selectedFacility = facilities.find((f: any) => f.id === formData.facilityId);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Match</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Match Details</h3>
            
            <div>
              <Label htmlFor="title">Match Title *</Label>
              <Input
                id="title"
                required
                value={formData.title}
                onChange={(e) => handleChange("title", e.target.value)}
                placeholder="Friendly Badminton Doubles"
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleChange("description", e.target.value)}
                placeholder="Looking for players to join a friendly match..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="sportType">Sport Type *</Label>
                <Select value={formData.sportType} onValueChange={(value) => handleChange("sportType", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select sport" />
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
                <Label htmlFor="skillLevel">Skill Level *</Label>
                <Select value={formData.skillLevel} onValueChange={(value) => handleChange("skillLevel", value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="maxPlayers">Max Players *</Label>
                <Input
                  id="maxPlayers"
                  type="number"
                  min="2"
                  max="20"
                  required
                  value={formData.maxPlayers}
                  onChange={(e) => handleChange("maxPlayers", e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="costPerPlayer">Cost per Player (₹) *</Label>
                <Input
                  id="costPerPlayer"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={formData.costPerPlayer}
                  onChange={(e) => handleChange("costPerPlayer", e.target.value)}
                  placeholder="200"
                />
              </div>
            </div>
          </div>

          {/* Facility Selection */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Venue</h3>
            
            <div>
              <Label htmlFor="facilityId">Select Facility *</Label>
              <Select value={formData.facilityId} onValueChange={(value) => handleChange("facilityId", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a facility" />
                </SelectTrigger>
                <SelectContent>
                  {facilities
                    .filter((facility: any) => 
                      !formData.sportType || facility.sportType === formData.sportType
                    )
                    .map((facility: any) => (
                      <SelectItem key={facility.id} value={facility.id}>
                        {facility.name} - {facility.city} (₹{facility.pricePerHour}/hour)
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {selectedFacility && (
                <p className="text-sm text-gray-600 mt-1">
                  {selectedFacility.address}, {selectedFacility.city}
                </p>
              )}
            </div>
          </div>

          {/* Date and Time */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Schedule</h3>
            
            <div>
              <Label>Match Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startTime">Start Time *</Label>
                <Input
                  id="startTime"
                  type="time"
                  required
                  value={formData.startTime}
                  onChange={(e) => handleChange("startTime", e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="endTime">End Time *</Label>
                <Input
                  id="endTime"
                  type="time"
                  required
                  value={formData.endTime}
                  onChange={(e) => handleChange("endTime", e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Match Summary */}
          {formData.title && selectedDate && formData.startTime && formData.endTime && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Match Summary</h4>
              <div className="space-y-1 text-sm">
                <p><strong>Title:</strong> {formData.title}</p>
                <p><strong>Date:</strong> {format(selectedDate, "PPP")}</p>
                <p><strong>Time:</strong> {formData.startTime} - {formData.endTime}</p>
                <p><strong>Players:</strong> {formData.maxPlayers} maximum</p>
                <p><strong>Cost:</strong> ₹{formData.costPerPlayer} per player</p>
                {selectedFacility && (
                  <p><strong>Venue:</strong> {selectedFacility.name}, {selectedFacility.city}</p>
                )}
              </div>
            </div>
          )}

          {/* Submit */}
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createMatchMutation.isPending}
            >
              {createMatchMutation.isPending ? "Creating..." : "Create Match"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
