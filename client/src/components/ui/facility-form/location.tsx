import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface LocationProps {
  formData: {
    address: string;
    city: string;
    state: string;
    zipCode: string;
  };
  onFieldChange: (field: string, value: string) => void;
}

export default function Location({ formData, onFieldChange }: LocationProps) {
  return (
    <div className="space-y-3 sm:space-y-4">
      <h3 className="text-lg font-medium">Location</h3>
      
      <div>
        <Label htmlFor="address">Address *</Label>
        <Input
          id="address"
          required
          value={formData.address}
          onChange={(e) => onFieldChange("address", e.target.value)}
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
            onChange={(e) => onFieldChange("city", e.target.value)}
            placeholder="Mumbai"
          />
        </div>
        <div>
          <Label htmlFor="state">State *</Label>
          <Input
            id="state"
            required
            value={formData.state}
            onChange={(e) => onFieldChange("state", e.target.value)}
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
          onChange={(e) => onFieldChange("zipCode", e.target.value)}
          placeholder="400001"
        />
      </div>
    </div>
  );
}
