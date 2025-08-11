import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, Search, Navigation } from 'lucide-react';
// Note: leaflet CSS is loaded globally via index.css

// Fix for default markers in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface LocationMapProps {
  address: string;
  city: string;
  state: string;
  zipCode: string;
  onLocationChange: (coordinates: { latitude: number; longitude: number }) => void;
  initialCoordinates?: { latitude?: string | number | null; longitude?: string | number | null };
}

// Map event handler component
function MapClickHandler({ onLocationChange }: { onLocationChange: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => {
      onLocationChange(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function LocationMap({ 
  address, 
  city, 
  state, 
  zipCode, 
  onLocationChange, 
  initialCoordinates 
}: LocationMapProps) {
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([19.0760, 72.8777]); // Default to Mumbai
  const [mapZoom, setMapZoom] = useState(13);
  const mapRef = useRef<L.Map | null>(null);

  // Initialize coordinates from props
  useEffect(() => {
    if (initialCoordinates?.latitude && initialCoordinates?.longitude) {
      const lat = parseFloat(String(initialCoordinates.latitude));
      const lng = parseFloat(String(initialCoordinates.longitude));
      setCoordinates({ lat, lng });
      setMapCenter([lat, lng]);
      setMapZoom(15);
    }
  }, [initialCoordinates]);

  const geocodeAddress = async () => {
    if (!address && !city && !zipCode) return;

    setIsGeocoding(true);
    
    const query = [address, city, state, zipCode].filter(Boolean).join(', ');
    
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`
      );
      
      const data = await response.json();
      
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        const latitude = parseFloat(lat);
        const longitude = parseFloat(lon);
        
        setCoordinates({ lat: latitude, lng: longitude });
        setMapCenter([latitude, longitude]);
        setMapZoom(15);
        onLocationChange({ latitude, longitude });
        
        // Update map view if it exists
        if (mapRef.current) {
          mapRef.current.setView([latitude, longitude], 15);
        }
      } else {
        console.warn('No geocoding results found');
      }
    } catch (error) {
      console.error('Geocoding error:', error);
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleMapClick = (lat: number, lng: number) => {
    setCoordinates({ lat, lng });
    onLocationChange({ latitude: lat, longitude: lng });
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setCoordinates({ lat: latitude, lng: longitude });
          setMapCenter([latitude, longitude]);
          setMapZoom(15);
          onLocationChange({ latitude, longitude });
          
          // Update map view if it exists
          if (mapRef.current) {
            mapRef.current.setView([latitude, longitude], 15);
          }
        },
        (error) => {
          console.error('Error getting location:', error);
        }
      );
    }
  };

  // Auto-geocode when address fields change
  useEffect(() => {
    if (address || city || zipCode) {
      const timeoutId = setTimeout(() => {
        geocodeAddress();
      }, 1000); // Debounce geocoding calls

      return () => clearTimeout(timeoutId);
    }
  }, [address, city, zipCode]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-red-600" />
          Location & Map
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-sm text-gray-600">
          Enter your address details and click on the map to set your facility's exact location. The map will automatically center based on your zip code/city.
        </div>
        
        {/* Geocoding Section */}
        <div className="space-y-3">
          <div className="flex gap-2">
            <Button 
              onClick={geocodeAddress} 
              disabled={isGeocoding || (!address && !city && !zipCode)}
              size="sm"
              variant="outline"
              className="flex-shrink-0"
            >
              {isGeocoding ? (
                <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              {isGeocoding ? 'Locating...' : 'Find on Map'}
            </Button>
            
            <Button 
              onClick={getCurrentLocation} 
              size="sm"
              variant="outline"
              className="flex-shrink-0"
            >
              <Navigation className="w-4 h-4 mr-1" />
              Use My Location
            </Button>
          </div>
        </div>

        {/* Interactive Map */}
        <div className="space-y-3">
          <div 
            className="w-full h-80 border border-gray-300 rounded-lg overflow-hidden"
            style={{ minHeight: '320px' }}
          >
            <MapContainer
              center={mapCenter}
              zoom={mapZoom}
              style={{ height: '100%', width: '100%' }}
              ref={mapRef}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapClickHandler onLocationChange={handleMapClick} />
              {coordinates && (
                <Marker position={[coordinates.lat, coordinates.lng]} />
              )}
            </MapContainer>
          </div>
          
          <div className="text-xs text-gray-500">
            <strong>Tip:</strong> Click anywhere on the map to place your facility marker at that exact location.
          </div>
        </div>

        {/* Current Coordinates Display */}
        {coordinates && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-4 h-4 text-green-600" />
              <span className="font-medium text-green-800">Selected Location</span>
            </div>
            <div className="text-sm text-green-700">
              <div>Latitude: {coordinates.lat.toFixed(6)}</div>
              <div>Longitude: {coordinates.lng.toFixed(6)}</div>
            </div>
            
            {/* Google Maps Preview Link */}
            <div className="mt-3">
              <a
                href={`https://www.google.com/maps?q=${coordinates.lat},${coordinates.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:text-blue-800 underline"
              >
                View on Google Maps →
              </a>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}