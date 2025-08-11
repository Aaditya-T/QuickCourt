import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Form } from "@/components/ui/form";
import ValidatedFormField from "@/components/ui/validated-form-field";
import FormErrorDisplay from "@/components/ui/form-error-display";
import { Button } from "@/components/ui/button";
import { useFormValidation } from "@/hooks/use-form-validation";
import { facilityFormSchema, type FacilityFormData } from "@shared/validation";
import {
  BasicInformation,
  MapLocation,
  OperatingHours,
  Amenities,
  Images,
} from "./facility-form";

interface CreateFacilityModalProps {
  open: boolean;
  onClose: () => void;
  onFacilityCreated?: () => void;
}

export default function CreateFacilityModal({ open, onClose, onFacilityCreated }: CreateFacilityModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  // Facility form with validation
  const facilityForm = useFormValidation<FacilityFormData>({
    schema: facilityFormSchema,
    defaultValues: {
      name: "",
      description: "",
      address: "",
      city: "",
      state: "",
      zipCode: "",
      sportTypes: [],
      pricePerHour: 800,
      images: [],
      amenities: [],
      operatingHours: {
        monday: { open: "06:00", close: "23:00" },
        tuesday: { open: "06:00", close: "23:00" },
        wednesday: { open: "06:00", close: "23:00" },
        thursday: { open: "06:00", close: "23:00" },
        friday: { open: "06:00", close: "23:00" },
        saturday: { open: "08:00", close: "22:00" },
        sunday: { closed: true },
      },
    },
  });

  const createFacilityMutation = useMutation({
    mutationFn: async (facilityData: FacilityFormData) => {
      const submitData = {
        ...facilityData,
        ownerId: user?.id,
        operatingHours: JSON.stringify(facilityData.operatingHours),
      };
      return await apiRequest("/api/facilities", "POST", submitData);
    },
    onSuccess: () => {
      toast({
        title: "Facility Created",
        description: "Your facility has been successfully added to the platform.",
      });
      onFacilityCreated?.();
      onClose();
      facilityForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Creation Failed",
        description: error.message || "Failed to create facility. Please try again.",
        variant: "destructive",
      });
    },
  });
  const handleSportTypeToggle = (sportType: string) => {
    const currentSportTypes = facilityForm.getValues("sportTypes");
    const newSportTypes = currentSportTypes.includes(sportType)
      ? currentSportTypes.filter(type => type !== sportType)
      : [...currentSportTypes, sportType];
    facilityForm.setValue("sportTypes", newSportTypes);
  };

  const handleAmenitiesChange = (amenities: string[]) => {
    facilityForm.setValue("amenities", amenities);
  };

  const handleImagesChange = (images: string[]) => {
    facilityForm.setValue("images", images);
  };

  const handleOperatingHoursChange = (operatingHours: any) => {
    facilityForm.setValue("operatingHours", operatingHours);
  };

  const handleSubmit = facilityForm.handleSubmit(
    async (data: FacilityFormData) => {
      if (!user || user.role !== "facility_owner") {
        toast({
          title: "Permission Denied",
          description: "You must be a facility owner to create facilities.",
          variant: "destructive",
        });
        return;
      }

      createFacilityMutation.mutate(data);
    },
    (errors) => {
      toast({
        title: "Form Validation Failed",
        description: "Please fix the errors in the form and try again.",
        variant: "destructive",
      });
    }
  );

  const SPORT_TYPES = [
    { value: "badminton", label: "Badminton" },
    { value: "tennis", label: "Tennis" },
    { value: "basketball", label: "Basketball" },
    { value: "football", label: "Football" },
    { value: "table_tennis", label: "Table Tennis" },
    { value: "squash", label: "Squash" },
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl w-[95vw] sm:w-auto max-h-[85vh] sm:max-h-[90vh] overflow-y-auto mx-2 sm:mx-4">
        <DialogHeader>
          <DialogTitle>Add New Facility</DialogTitle>
        </DialogHeader>

        <Form {...facilityForm}>
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Basic Information</h3>

              <ValidatedFormField
                name="name"
                label="Facility Name"
                placeholder="Elite Badminton Center"
                required
              />

              <ValidatedFormField
                name="description"
                label="Description"
                type="textarea"
                placeholder="Describe your facility..."
                rows={3}
              />

              {/* Sport Types - Custom implementation */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Sport Types *</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {SPORT_TYPES.map((sport) => (
                    <div key={sport.value} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={sport.value}
                        checked={facilityForm.watch("sportTypes").includes(sport.value)}
                        onChange={() => handleSportTypeToggle(sport.value)}
                        className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                      />
                      <label htmlFor={sport.value} className="text-sm font-normal">
                        {sport.label}
                      </label>
                    </div>
                  ))}
                </div>
                {facilityForm.formState.errors.sportTypes && (
                  <p className="text-sm text-destructive">
                    {facilityForm.formState.errors.sportTypes.message}
                  </p>
                )}
              </div>

              <ValidatedFormField
                name="pricePerHour"
                label="Price per Hour (₹)"
                type="number"
                placeholder="800"
                required
              />
            </div>

            {/* Location */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Location</h3>

              <ValidatedFormField
                name="address"
                label="Address"
                placeholder="123 Sports Complex Road"
                required
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <ValidatedFormField
                  name="city"
                  label="City"
                  placeholder="Mumbai"
                  required
                />

                <ValidatedFormField
                  name="state"
                  label="State"
                  placeholder="Maharashtra"
                  required
                />
              </div>

              <ValidatedFormField
                name="zipCode"
                label="ZIP Code"
                placeholder="400001"
                required
              />
            </div>

            <OperatingHours
              operatingHours={JSON.stringify(facilityForm.watch("operatingHours"))}
              onOperatingHoursChange={handleOperatingHoursChange}
            />

            <Amenities
              amenities={facilityForm.watch("amenities")}
              onAmenitiesChange={handleAmenitiesChange}
            />

            <Images
              images={facilityForm.watch("images")}
              onImagesChange={handleImagesChange}
            />

            <FormErrorDisplay />

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createFacilityMutation.isPending || !facilityForm.formState.isValid}
                className="w-full sm:flex-1"
              >
                {createFacilityMutation.isPending ? "Creating..." : "Create Facility"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
