import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface BasicInformationProps {
  formData: {
    name: string;
    description: string;
    sportTypes: string[];
    pricePerHour: string;
  };
  onFieldChange: (field: string, value: string) => void;
  onSportTypeToggle: (sportType: string) => void;
}

const SPORT_TYPES = [
  { value: "badminton", label: "Badminton" },
  { value: "tennis", label: "Tennis" },
  { value: "basketball", label: "Basketball" },
  { value: "football", label: "Football" },
  { value: "table_tennis", label: "Table Tennis" },
  { value: "squash", label: "Squash" },
];

export default function BasicInformation({ 
  formData, 
  onFieldChange, 
  onSportTypeToggle 
}: BasicInformationProps) {
  return (
    <div className="space-y-3 sm:space-y-4">
      <h3 className="text-lg font-medium">Basic Information</h3>
      
      <div>
        <Label htmlFor="name">Facility Name *</Label>
        <Input
          id="name"
          required
          value={formData.name}
          onChange={(e) => onFieldChange("name", e.target.value)}
          placeholder="Elite Badminton Center"
        />
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => onFieldChange("description", e.target.value)}
          placeholder="Describe your facility..."
          rows={3}
        />
      </div>

      <div>
        <Label>Sport Types *</Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
          {SPORT_TYPES.map((sport) => (
            <div key={sport.value} className="flex items-center space-x-2">
              <input
                type="checkbox"
                id={sport.value}
                checked={formData.sportTypes.includes(sport.value)}
                onChange={() => onSportTypeToggle(sport.value)}
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
          onChange={(e) => onFieldChange("pricePerHour", e.target.value)}
          placeholder="800"
        />
      </div>
    </div>
  );
}
