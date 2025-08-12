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
  onLocationChange: (coordinates: { latitude: number; longitude: number }) => void;
  onZipCodeChange: (zipCode: string) => void;
  initialCoordinates?: { latitude?: string | number | null; longitude?: string | number | null };
  initialZipCode?: string;
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
  onLocationChange,
  onZipCodeChange,
  initialCoordinates,
  initialZipCode
}: LocationMapProps) {
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([19.0760, 72.8777]); // Default to Mumbai
  const [mapZoom, setMapZoom] = useState(13);
  const [zipCode, setZipCode] = useState(initialZipCode || '');
  const [showMap, setShowMap] = useState(false);
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

  const geocodeZipCode = async (pincode: string) => {
    if (!pincode) return;

    setIsGeocoding(true);
    
    try {
      // Use server-side geocoding endpoint to avoid CORS issues
      const response = await fetch(`/api/geocode/${pincode}`);
      
      if (response.ok) {
        const data = await response.json();
        const { latitude, longitude } = data;
        
        setMapCenter([latitude, longitude]);
        setMapZoom(data.source === 'postal-api' ? 10 : 13);
        setShowMap(true);
        
        if (mapRef.current) {
          mapRef.current.setView([latitude, longitude], data.source === 'postal-api' ? 10 : 13);
        }
      } else {
        console.warn('Geocoding failed for pincode:', pincode);
        setShowMap(false);
      }
    } catch (error) {
      console.error('Geocoding error for pincode:', pincode, error);
      setShowMap(false);
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
          setShowMap(true);
          onLocationChange({ latitude, longitude });
          
          // Update map view if it exists
          if (mapRef.current) {
            mapRef.current.setView([latitude, longitude], 15);
          }
        },
        (error) => {
          console.error('Error getting location:', error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      );
    } else {
      console.error('Geolocation is not supported by this browser.');
    }
  };

  // Handle zip code input changes
  const handleZipCodeChange = (value: string) => {
    setZipCode(value);
    onZipCodeChange(value);
    
    // Auto-geocode when zip code has 6 digits (Indian pincode format)
    if (value.length === 6) {
      geocodeZipCode(value);
    } else {
      setShowMap(false);
    }
  };



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
          Enter your pincode to view the map of that area, then click on the map to set your facility's exact location.
        </div>
        
        {/* Pincode Input Section */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="pincode">Pincode</Label>
            <Input
              id="pincode"
              type="text"
              maxLength={6}
              value={zipCode}
              onChange={(e) => handleZipCodeChange(e.target.value.replace(/\D/g, ''))}
              placeholder="Enter 6-digit pincode (e.g., 400001)"
              className="mt-1"
            />
          </div>
          
          {/* <div className="flex gap-2">
            <Button 
              onClick={getCurrentLocation} 
              size="sm"
              variant="outline"
              className="flex-shrink-0"
            >
              <Navigation className="w-4 h-4 mr-1" />
              Use My Location
            </Button>
          </div> */}
        </div>



        {/* Interactive Map - Only show when pincode is entered */}
        {showMap && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <MapPin className="w-4 h-4" />
              Map for Pincode: {zipCode}
            </div>
            <div 
              className="w-full h-80 border border-gray-300 rounded-lg overflow-hidden"
              style={{ minHeight: '320px' }}
            >
              <MapContainer
                center={mapCenter}
                zoom={mapZoom}
                style={{ height: '100%', width: '100%' }}
                ref={mapRef}
                key={`${mapCenter[0]}-${mapCenter[1]}`} // Force re-render when center changes
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
        )}

        {/* Show message when no pincode entered */}
        {!showMap && zipCode.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <MapPin className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>Enter a pincode to view the map</p>
          </div>
        )}

        {/* Show loading when geocoding */}
        {isGeocoding && (
          <div className="text-center py-8">
            <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-600">Loading map for pincode {zipCode}...</p>
          </div>
        )}

        {/* Show error message when geocoding fails */}
        {!showMap && !isGeocoding && zipCode.length === 6 && (
          <div className="text-center py-8 text-gray-500">
            <MapPin className="w-12 h-12 mx-auto mb-4 text-red-300" />
            <p className="font-medium">Could not find exact location for pincode {zipCode}</p>
            <p className="text-sm mt-2">This might happen due to:</p>
            <ul className="text-sm mt-1 space-y-1">
              <li>• Network connectivity issues</li>
              <li>• Invalid or non-existent pincode</li>
              <li>• Geocoding service temporarily unavailable</li>
            </ul>
            <p className="text-sm mt-3 font-medium">Try using "Use My Location" button instead</p>
          </div>
        )}

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