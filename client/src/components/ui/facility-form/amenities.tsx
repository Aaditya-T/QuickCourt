import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, X } from "lucide-react";

interface AmenitiesProps {
  amenities: string[];
  onAmenitiesChange: (amenities: string[]) => void;
}

export default function Amenities({ amenities, onAmenitiesChange }: AmenitiesProps) {
  const [newAmenity, setNewAmenity] = useState("");

  const addAmenity = () => {
    if (newAmenity.trim() && !amenities.includes(newAmenity.trim())) {
      onAmenitiesChange([...amenities, newAmenity.trim()]);
      setNewAmenity("");
    }
  };

  const removeAmenity = (amenity: string) => {
    onAmenitiesChange(amenities.filter(a => a !== amenity));
  };

  return (
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
        {amenities.map((amenity) => (
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
  );
}
