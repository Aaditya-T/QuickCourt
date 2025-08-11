import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, Search, Navigation } from 'lucide-react';

interface LocationMapProps {
  address: string;
  city: string;
  state: string;
  zipCode: string;
  onLocationChange: (coordinates: { latitude: number; longitude: number }) => void;
  initialCoordinates?: { latitude?: string | number | null; longitude?: string | number | null };
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
  const [manualLat, setManualLat] = useState<string>('');
  const [manualLng, setManualLng] = useState<string>('');

  // Initialize coordinates from props
  useEffect(() => {
    if (initialCoordinates?.latitude && initialCoordinates?.longitude) {
      const lat = parseFloat(String(initialCoordinates.latitude));
      const lng = parseFloat(String(initialCoordinates.longitude));
      setCoordinates({ lat, lng });
      setManualLat(lat.toString());
      setManualLng(lng.toString());
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
        setManualLat(latitude.toString());
        setManualLng(longitude.toString());
        onLocationChange({ latitude, longitude });
      } else {
        console.warn('No geocoding results found');
      }
    } catch (error) {
      console.error('Geocoding error:', error);
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleManualCoordinates = () => {
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);
    
    if (!isNaN(lat) && !isNaN(lng)) {
      setCoordinates({ lat, lng });
      onLocationChange({ latitude: lat, longitude: lng });
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setCoordinates({ lat: latitude, lng: longitude });
          setManualLat(latitude.toString());
          setManualLng(longitude.toString());
          onLocationChange({ latitude, longitude });
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
          Location & Coordinates
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-sm text-gray-600">
          Set your facility's exact location coordinates. You can use geocoding to find coordinates automatically or enter them manually.
        </div>
        
        {/* Geocoding Section */}
        <div className="space-y-3">
          <h4 className="font-medium text-gray-800">Find Coordinates Automatically</h4>
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
              {isGeocoding ? 'Finding...' : 'Find Coordinates'}
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

        {/* Manual Coordinate Input */}
        <div className="space-y-3">
          <h4 className="font-medium text-gray-800">Or Enter Coordinates Manually</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="latitude">Latitude</Label>
              <Input
                id="latitude"
                type="number"
                step="any"
                value={manualLat}
                onChange={(e) => setManualLat(e.target.value)}
                placeholder="e.g., 19.0760"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="longitude">Longitude</Label>
              <Input
                id="longitude"
                type="number"
                step="any"
                value={manualLng}
                onChange={(e) => setManualLng(e.target.value)}
                placeholder="e.g., 72.8777"
                className="mt-1"
              />
            </div>
          </div>
          <Button 
            onClick={handleManualCoordinates}
            size="sm"
            variant="outline"
            disabled={!manualLat || !manualLng}
          >
            Set Coordinates
          </Button>
        </div>

        {/* Current Coordinates Display */}
        {coordinates && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-4 h-4 text-green-600" />
              <span className="font-medium text-green-800">Current Coordinates</span>
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
        
        <div className="text-xs text-gray-500">
          <strong>Tip:</strong> Accurate coordinates help customers find your facility easily. You can view and verify the location using the Google Maps link above.
        </div>
      </CardContent>
    </Card>
  );
}