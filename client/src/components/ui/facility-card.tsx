import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Star, Clock } from "lucide-react";

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

interface FacilityCardProps {
  facility: any;
  onBook: () => void;
}

export default function FacilityCard({ facility, onBook }: FacilityCardProps) {
  const defaultImages = [
    "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=800&q=60",
    "https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=800&q=60",
    "https://images.unsplash.com/photo-1508609349937-5ec4ae374ebf?auto=format&fit=crop&w=800&q=60",
  ];

  const image = facility.images?.[0] || defaultImages[0];

  return (
    <Card className="group overflow-hidden border-0 shadow-lg hover:shadow-2xl transition-all duration-300 bg-white/90 backdrop-blur-sm hover:scale-[1.02] h-full flex flex-col">
      <div className="relative">
        <img
          src={image}
          alt={facility.name}
          className="w-full h-56 object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />

        {/* Rating Badge */}
        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1 flex items-center gap-1">
          <Star className="w-4 h-4 text-yellow-500 fill-current" />
          <span className="text-sm font-semibold text-gray-800">{facility.rating}</span>
        </div>
      </div>

      <CardContent className="p-6 flex-1 flex flex-col">
        <div className="flex-1 space-y-4">
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
              {facility.name}
            </h3>
            <div className="flex items-center text-gray-600 text-sm mb-3">
              <MapPin className="w-4 h-4 mr-1" />
              <span>{facility.city}, {facility.state}</span>
            </div>
          </div>

          {/* Available Amenities */}
          <div>
            <div className="text-sm font-semibold text-gray-700 mb-2">Available Amenities</div>
            <div className="flex flex-wrap gap-2">
              {facility.amenities && facility.amenities.length > 0 ? (
                <>
                  {facility.amenities.slice(0, 4).map((amenity: string) => (
                    <Badge
                      key={amenity}
                      variant="outline"
                      className="bg-green-50 text-green-700 border-green-200 text-xs"
                    >
                      {amenity}
                    </Badge>
                  ))}
                  {facility.amenities.length > 4 && (
                    <Badge variant="outline" className="text-gray-600 text-xs">
                      +{facility.amenities.length - 4} more
                    </Badge>
                  )}
                </>
              ) : (
                <span className="text-gray-500 text-xs italic">No amenities listed</span>
              )}
            </div>
          </div>

          {/* Operating Hours */}
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Clock className="w-4 h-4" />
            <span>Open today: 6:00 AM - 11:00 PM</span>
          </div>
        </div>

        {/* Fixed Button at Bottom */}
        <div className="mt-4 pt-4 border-t">
          <Button
            onClick={onBook}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
          >
            View Details & Book
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}