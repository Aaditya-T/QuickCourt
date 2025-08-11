import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  BasicInformation,
  Location,
  OperatingHours,
  Amenities,
  Images,
  FormActions
} from "./facility-form";

interface CreateFacilityModalProps {
  open: boolean;
  onClose: () => void;
  onFacilityCreated?: () => void;
}

export default function CreateFacilityModal({ open, onClose, onFacilityCreated }: CreateFacilityModalProps) {
  const { user } = useAuth();
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
  };

  const handleFieldChange = (field: string, value: string) => {
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

  const handleAmenitiesChange = (amenities: string[]) => {
    setFormData(prev => ({ ...prev, amenities }));
  };

  const handleImagesChange = (images: string[]) => {
    setFormData(prev => ({ ...prev, images }));
  };

  const handleOperatingHoursChange = (operatingHours: string) => {
    setFormData(prev => ({ ...prev, operatingHours }));
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
          <BasicInformation
            formData={{
              name: formData.name,
              description: formData.description,
              sportTypes: formData.sportTypes,
              pricePerHour: formData.pricePerHour,
            }}
            onFieldChange={handleFieldChange}
            onSportTypeToggle={handleSportTypeToggle}
          />

          <Location
            formData={{
              address: formData.address,
              city: formData.city,
              state: formData.state,
              zipCode: formData.zipCode,
            }}
            onFieldChange={handleFieldChange}
          />

          <OperatingHours
            operatingHours={formData.operatingHours}
            onOperatingHoursChange={handleOperatingHoursChange}
          />

          <Amenities
            amenities={formData.amenities}
            onAmenitiesChange={handleAmenitiesChange}
          />

          <Images
            images={formData.images}
            onImagesChange={handleImagesChange}
          />

          <FormActions
            onCancel={onClose}
            submitText="Create Facility"
            isSubmitting={createFacilityMutation.isPending}
          />
        </form>
      </DialogContent>
    </Dialog>
  );
}
