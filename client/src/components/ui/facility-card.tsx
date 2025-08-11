import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Star, Clock, MapPin } from "lucide-react";
import { Link } from "wouter";

interface Facility {
  id: string;
  name: string;
  description?: string;
  address: string;
  city: string;
  sportTypes: string[];
  pricePerHour: string;
  images: string[];
  amenities: string[];
  operatingHours: string;
  rating: string;
  totalReviews: number;
}

interface FacilityCardProps {
  facility: Facility;
  onBook: (facilityId: string) => void;
}

const sportTypeLabels: Record<string, string> = {
  badminton: "Badminton",
  tennis: "Tennis",
  basketball: "Basketball",
  football: "Football",
  table_tennis: "Table Tennis",
  squash: "Squash",
};

export default function FacilityCard({ facility, onBook }: FacilityCardProps) {
  const defaultImage = "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=800&h=400";
  
  const parseOperatingHours = (hours: string) => {
    try {
      const parsed = JSON.parse(hours);
      const today = new Date().toLocaleDateString('en', { weekday: 'long' }).toLowerCase().slice(0, 3); // mon, tue, etc.
      const todayHours = parsed[today] || parsed.monday; // fallback to monday
      if (todayHours) {
        return `${todayHours.open} - ${todayHours.close}`;
      }
    } catch {
      // fallback for simple string format
      return hours;
    }
    return "6:00 AM - 11:00 PM";
  };

  return (
    <Card className="facility-card overflow-hidden hover:shadow-xl transition-all duration-300">
      <div className="relative">
        <Link href={`/facilities/${facility.id}`}>
          <img 
            src={facility.images[0] || defaultImage} 
            alt={facility.name}
            className="w-full h-48 object-cover cursor-pointer"
          />
        </Link>
        <div className="absolute top-2 right-2">
          <div className="flex flex-wrap gap-1">
            {facility.sportTypes.slice(0, 2).map((sportType) => (
              <Badge key={sportType} variant="secondary" className="bg-white/90 text-xs">
                {sportTypeLabels[sportType] || sportType}
              </Badge>
            ))}
            {facility.sportTypes.length > 2 && (
              <Badge variant="secondary" className="bg-white/90 text-xs">
                +{facility.sportTypes.length - 2}
              </Badge>
            )}
          </div>
        </div>
      </div>
      
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-2">
          <Link href={`/facilities/${facility.id}`}>
            <h3 className="text-xl font-semibold text-gray-900 hover:underline cursor-pointer">{facility.name}</h3>
          </Link>
          <div className="flex items-center">
            <Star className="w-4 h-4 text-yellow-400 fill-current" />
            <span className="ml-1 text-sm text-gray-600">
              {facility.rating} ({facility.totalReviews})
            </span>
          </div>
        </div>
        
        <div className="flex items-center text-gray-600 mb-3">
          <MapPin className="w-4 h-4 mr-1" />
          <span className="text-sm">{facility.city}</span>
        </div>
        
        {facility.description && (
          <p className="text-gray-600 text-sm mb-3 line-clamp-2">
            {facility.description}
          </p>
        )}
        
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center text-sm text-gray-500">
            <Clock className="w-4 h-4 mr-1" />
            <span>{parseOperatingHours(facility.operatingHours)}</span>
          </div>
          <div className="text-primary font-semibold">
            ₹{facility.pricePerHour}/hour
          </div>
        </div>
        
        {facility.amenities.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {facility.amenities.slice(0, 3).map((amenity) => (
              <Badge key={amenity} variant="outline" className="text-xs">
                {amenity}
              </Badge>
            ))}
            {facility.amenities.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{facility.amenities.length - 3} more
              </Badge>
            )}
          </div>
        )}
        
        <Button 
          onClick={() => onBook(facility.id)} 
          className="w-full"
        >
          Book Now
        </Button>
      </CardContent>
    </Card>
  );
}
