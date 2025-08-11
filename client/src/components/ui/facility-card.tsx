import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Star, Clock, MapPin, Trophy, Zap, Wifi, Car, Coffee, Users } from "lucide-react";
import { Link } from "wouter";

interface Facility {
  id: string;
  name: string;
  description?: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
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

const sportIcons: Record<string, string> = {
  badminton: "🏸",
  tennis: "🎾",
  basketball: "🏀",
  football: "⚽",
  table_tennis: "🏓",
  squash: "🎯",
};

const amenityIcons: Record<string, any> = {
  "WiFi": Wifi,
  "Parking": Car,
  "Cafeteria": Coffee,
  "Changing Room": Users,
  "Equipment Rental": Trophy,
  "Air Conditioning": Zap,
};

export default function FacilityCard({ facility, onBook }: FacilityCardProps) {
  const defaultImages = [
    "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=800&q=60",
    "https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=800&q=60",
    "https://images.unsplash.com/photo-1508609349937-5ec4ae374ebf?auto=format&fit=crop&w=800&q=60",
  ];

  const image = facility.images?.[0] || defaultImages[0];
  const pricePerHour = parseFloat(facility.pricePerHour);

  // Calculate dynamic pricing display
  const weekendPrice = Math.round(pricePerHour * 1.2);
  const peakPrice = Math.round(pricePerHour * 1.3);

  const parseOperatingHours = (hours: string) => {
    try {
      const parsed = JSON.parse(hours);
      const today = new Date().toLocaleDateString('en', { weekday: 'long' }).toLowerCase().slice(0, 3);
      const todayHours = parsed[today] || parsed.monday;
      if (todayHours) {
        return `${todayHours.open} - ${todayHours.close}`;
      }
    } catch {
      return hours;
    }
    return "6:00 AM - 11:00 PM";
  };

  return (
    <Card className="group overflow-hidden border-0 shadow-lg hover:shadow-2xl transition-all duration-300 bg-white/90 backdrop-blur-sm hover:scale-[1.02]">
      <div className="relative">
        <Link href={`/facilities/${facility.id}`}>
          <img
            src={image}
            alt={facility.name}
            className="w-full h-56 object-cover group-hover:scale-105 transition-transform duration-300 cursor-pointer"
          />
        </Link>

        {/* Rating Badge */}
        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1 flex items-center gap-1">
          <Star className="w-4 h-4 text-yellow-500 fill-current" />
          <span className="text-sm font-semibold text-gray-800">{facility.rating}</span>
        </div>

        {/* Price Badge */}
        <div className="absolute top-4 left-4 bg-blue-600 text-white rounded-lg px-3 py-1">
          <span className="text-sm font-bold">₹{pricePerHour}/hr</span>
        </div>
      </div>

      <CardContent className="p-6">
        <div className="space-y-4">
          <div>
            <Link href={`/facilities/${facility.id}`}>
              <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors cursor-pointer">
                {facility.name}
              </h3>
            </Link>
            <div className="flex items-center text-gray-600 text-sm mb-3">
              <MapPin className="w-4 h-4 mr-1" />
              <span>{facility.city}, {facility.state}</span>
            </div>
          </div>

          {/* Sports Available */}
          <div>
            <div className="flex flex-wrap gap-2 mb-3">
              {facility.sportTypes?.slice(0, 3).map((sport: string) => (
                <Badge
                  key={sport}
                  variant="secondary"
                  className="bg-gradient-to-r from-blue-100 to-purple-100 text-blue-800 border-0"
                >
                  {sportIcons[sport]} {sportTypeLabels[sport] || sport}
                </Badge>
              ))}
              {facility.sportTypes?.length > 3 && (
                <Badge variant="outline" className="text-gray-600">
                  +{facility.sportTypes.length - 3} more
                </Badge>
              )}
            </div>
          </div>

          {/* Pricing Info */}
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-sm text-gray-600 space-y-1">
              <div className="flex justify-between">
                <span>Regular:</span>
                <span className="font-semibold">₹{pricePerHour}/hr</span>
              </div>
              <div className="flex justify-between">
                <span>Weekend:</span>
                <span className="font-semibold text-orange-600">₹{weekendPrice}/hr</span>
              </div>
              <div className="flex justify-between">
                <span>Peak Hours:</span>
                <span className="font-semibold text-red-600">₹{peakPrice}/hr</span>
              </div>
            </div>
          </div>

          {/* Amenities */}
          {facility.amenities?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {facility.amenities.slice(0, 4).map((amenity: string) => {
                const IconComponent = amenityIcons[amenity];
                return (
                  <div key={amenity} className="flex items-center gap-1 text-xs text-gray-600 bg-gray-100 rounded-full px-2 py-1">
                    {IconComponent && <IconComponent className="w-3 h-3" />}
                    <span>{amenity}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Operating Hours */}
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Clock className="w-4 h-4" />
            <span>Open today: {parseOperatingHours(facility.operatingHours)}</span>
          </div>

          <Button
            onClick={() => onBook(facility.id)}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
          >
            View Details & Book
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
