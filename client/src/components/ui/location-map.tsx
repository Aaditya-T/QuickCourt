import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, Search, Navigation, Upload, X, Image } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
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
  onImagesChange: (images: string[]) => void;
  initialCoordinates?: { latitude?: string | number | null; longitude?: string | number | null };
  initialZipCode?: string;
  initialImages?: string[];
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
  onImagesChange,
  initialCoordinates,
  initialZipCode,
  initialImages
}: LocationMapProps) {
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([19.0760, 72.8777]); // Default to Mumbai
  const [mapZoom, setMapZoom] = useState(13);
  const [zipCode, setZipCode] = useState(initialZipCode || '');
  const [showMap, setShowMap] = useState(false);
  const [images, setImages] = useState<string[]>(initialImages || []);
  const [isUploading, setIsUploading] = useState(false);
  const mapRef = useRef<L.Map | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

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
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(pincode)}&countrycodes=in&limit=1`
      );
      
      const data = await response.json();
      
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        const latitude = parseFloat(lat);
        const longitude = parseFloat(lon);
        
        setMapCenter([latitude, longitude]);
        setMapZoom(13);
        setShowMap(true);
        
        // Update map view if it exists
        if (mapRef.current) {
          mapRef.current.setView([latitude, longitude], 13);
        }
      } else {
        console.warn('No geocoding results found for pincode');
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

  // Handle file selection and upload
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    if (images.length + files.length > 5) {
      toast({
        title: "Too many images",
        description: "You can upload a maximum of 5 images",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const formData = new FormData();
        formData.append('image', file);

        const response = await apiRequest('POST', '/api/upload/image', formData);

        if (!response.ok) {
          throw new Error('Upload failed');
        }

        const result = await response.json();
        return result.image.url;
      });

      const uploadedUrls = await Promise.all(uploadPromises);
      const updatedImages = [...images, ...uploadedUrls];
      
      setImages(updatedImages);
      onImagesChange(updatedImages);

      toast({
        title: "Images uploaded",
        description: `Successfully uploaded ${uploadedUrls.length} image(s)`,
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload one or more images. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Handle image removal
  const handleRemoveImage = (imageUrl: string) => {
    const updatedImages = images.filter(url => url !== imageUrl);
    setImages(updatedImages);
    onImagesChange(updatedImages);
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
          
          <div className="flex gap-2">
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

        {/* Photo Upload Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Image className="w-4 h-4" />
            <Label>Facility Photos (Optional)</Label>
          </div>
          
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              size="sm"
              disabled={isUploading || images.length >= 5}
              className="flex-shrink-0"
            >
              {isUploading ? (
                <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full mr-1" />
              ) : (
                <Upload className="w-4 h-4 mr-1" />
              )}
              {isUploading ? 'Uploading...' : 'Add Photos'}
            </Button>
            {images.length > 0 && (
              <span className="text-sm text-gray-500 self-center">
                {images.length}/5 photos
              </span>
            )}
          </div>

          {/* Image Preview Grid */}
          {images.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {images.map((imageUrl, index) => (
                <div key={index} className="relative group">
                  <img
                    src={imageUrl}
                    alt={`Facility photo ${index + 1}`}
                    className="w-full h-24 object-cover rounded-lg border border-gray-200"
                  />
                  <button
                    onClick={() => handleRemoveImage(imageUrl)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Remove image"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="text-xs text-gray-500">
            Upload up to 5 high-quality photos of your facility. Accepted formats: JPEG, PNG, WebP (max 5MB each)
          </div>
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