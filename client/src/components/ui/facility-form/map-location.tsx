import { useState, useEffect, useCallback, useRef } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { MapPin, AlertTriangle, Target, RefreshCw, Loader2, MousePointer } from "lucide-react";

interface MapLocationProps {
  formData: {
    address: string;
    city: string;
    state: string;
    zipCode: string;
    latitude?: string;
    longitude?: string;
  };
  onFieldChange: (field: string, value: string) => void;
}

declare global {
  interface Window {
    L: any;
  }
}

export default function MapLocation({ formData, onFieldChange }: MapLocationProps) {
  const [mapError, setMapError] = useState<string>("");
  const [isValidatingLocation, setIsValidatingLocation] = useState(false);
  const [isLoadingMap, setIsLoadingMap] = useState(true);
  const [zipBounds, setZipBounds] = useState<any>(null);
  const [map, setMap] = useState<any>(null);
  const [marker, setMarker] = useState<any>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  // Load Leaflet (OpenStreetMap) library
  useEffect(() => {
    const loadLeaflet = () => {
      if (window.L) {
        setIsLoadingMap(false);
        initializeMap();
        return;
      }

      // Load Leaflet CSS
      const cssLink = document.createElement('link');
      cssLink.rel = 'stylesheet';
      cssLink.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      cssLink.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
      cssLink.crossOrigin = '';
      document.head.appendChild(cssLink);

      // Load Leaflet JavaScript
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
      script.crossOrigin = '';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        setIsLoadingMap(false);
        initializeMap();
      };
      script.onerror = () => {
        setIsLoadingMap(false);
        setMapError("Failed to load map. Please refresh the page.");
      };
      document.head.appendChild(script);
    };

    loadLeaflet();
  }, []);

  // Initialize the map
  const initializeMap = useCallback(() => {
    if (!mapRef.current || !window.L) return;

    // Fix Leaflet's default icon path issue
    delete (window.L.Icon.Default.prototype as any)._getIconUrl;
    window.L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    });

    const defaultCenter = [20.5937, 78.9629]; // India center
    
    const newMap = window.L.map(mapRef.current).setView(defaultCenter, 5);

    // Add OpenStreetMap tile layer
    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(newMap);

    // Add click listener to map
    newMap.on('click', (e: any) => {
      handleMapClick(e.latlng.lat, e.latlng.lng);
    });

    setMap(newMap);

    // If we have existing coordinates, place marker
    if (formData.latitude && formData.longitude) {
      const existingPosition = [parseFloat(formData.latitude), parseFloat(formData.longitude)];
      
      // Create custom marker icon for existing coordinates
      const redIcon = window.L.icon({
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
        className: 'marker-red'
      });

      // Fallback: Create a custom colored circle marker if icon doesn't load
      const createExistingMarker = () => {
        try {
          return window.L.marker(existingPosition, { 
            draggable: true,
            icon: redIcon
          });
        } catch (error) {
          // Fallback to circle marker
          return window.L.circleMarker(existingPosition, {
            radius: 10,
            fillColor: '#ef4444',
            color: '#dc2626',
            weight: 3,
            opacity: 1,
            fillOpacity: 0.8,
            draggable: true
          });
        }
      };

      const newMarker = createExistingMarker()
        .addTo(newMap)
        .bindPopup('📍 Facility Location - Drag to adjust');

      newMarker.on('dragend', (e: any) => {
        const position = e.target.getLatLng();
        handleMapClick(position.lat, position.lng);
      });

      setMarker(newMarker);
      newMap.setView(existingPosition, 16);
    }
  }, [formData.latitude, formData.longitude]);

  // Function to get zip code boundaries using OpenStreetMap Nominatim
  const getZipCodeBounds = async (zipCode: string) => {
    if (!zipCode) return null;
    
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${zipCode}&format=json&limit=1&addressdetails=1&polygon_geojson=1`
      );
      const data = await response.json();
      
      if (data && data[0]) {
        const result = data[0];
        const boundingBox = result.boundingbox;
        
        if (boundingBox) {
          return {
            south: parseFloat(boundingBox[0]),
            north: parseFloat(boundingBox[1]),
            west: parseFloat(boundingBox[2]),
            east: parseFloat(boundingBox[3])
          };
        }
      }
    } catch (error) {
      console.error("Error fetching zip code bounds:", error);
    }
    return null;
  };

  // Check if coordinates are within zip code bounds
  const isWithinZipBounds = (lat: number, lng: number, bounds: any) => {
    if (!bounds) return true;
    
    const tolerance = 0.02; // ~2km tolerance
    
    return (
      lat >= (bounds.south - tolerance) &&
      lat <= (bounds.north + tolerance) &&
      lng >= (bounds.west - tolerance) &&
      lng <= (bounds.east + tolerance)
    );
  };

  // Handle map click to place pin
  const handleMapClick = async (lat: number, lng: number) => {
    setIsValidatingLocation(true);
    
    // Get current zip bounds if not already loaded
    let currentBounds = zipBounds;
    if (!currentBounds && formData.zipCode) {
      currentBounds = await getZipCodeBounds(formData.zipCode);
      setZipBounds(currentBounds);
    }

    // Validate if within zip code bounds
    if (formData.zipCode && currentBounds && !isWithinZipBounds(lat, lng, currentBounds)) {
      setMapError("The pin can't be placed here as the area is outside the bounds of the postal/zip code");
      setIsValidatingLocation(false);
      
      // Show a more prominent alert
      alert("❌ Location Error\n\nThe pin can't be placed here as the area is outside the bounds of the postal/zip code.\n\nPlease click within your ZIP code area.");
      return;
    }
    
    setMapError("");
    
    // Update coordinates
    onFieldChange("latitude", lat.toFixed(8));
    onFieldChange("longitude", lng.toFixed(8));

    // Update or create marker
    if (marker && map) {
      marker.setLatLng([lat, lng]);
    } else if (map && window.L) {
      // Create custom red marker icon for better visibility
      const redIcon = window.L.icon({
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
        className: 'marker-red'
      });

      // Fallback: Create a custom colored circle marker if icon doesn't load
      const createMarker = () => {
        try {
          return window.L.marker([lat, lng], { 
            draggable: true,
            icon: redIcon
          });
        } catch (error) {
          // Fallback to circle marker
          return window.L.circleMarker([lat, lng], {
            radius: 10,
            fillColor: '#ef4444',
            color: '#dc2626',
            weight: 3,
            opacity: 1,
            fillOpacity: 0.8,
            draggable: true
          });
        }
      };

      const newMarker = createMarker()
        .addTo(map)
        .bindPopup('📍 Facility Location - Drag to adjust')
        .openPopup();

      newMarker.on('dragend', (e: any) => {
        const position = e.target.getLatLng();
        handleMapClick(position.lat, position.lng);
      });

      setMarker(newMarker);
    }

    setIsValidatingLocation(false);
  };

  // Auto-center map on zip code when zip code changes
  const centerOnZipCode = async () => {
    if (!formData.zipCode || !map) return;
    
    try {
      setIsValidatingLocation(true);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${formData.zipCode}&format=json&limit=1`
      );
      const data = await response.json();
      
      if (data && data[0]) {
        const result = data[0];
        const center = [parseFloat(result.lat), parseFloat(result.lon)];
        
        map.setView(center, 13);
        
        // Also get and store the bounds for this zip code
        const bounds = await getZipCodeBounds(formData.zipCode);
        setZipBounds(bounds);

        // Add a visual indicator of the zip code area if bounds are available
        if (bounds && window.L) {
          const rectangle = window.L.rectangle([
            [bounds.south, bounds.west],
            [bounds.north, bounds.east]
          ], {
            color: "#3b82f6",
            weight: 2,
            opacity: 0.7,
            fillOpacity: 0.1
          }).addTo(map);
          
          // Remove the rectangle after 3 seconds
          setTimeout(() => {
            map.removeLayer(rectangle);
          }, 3000);
        }
      }
    } catch (error) {
      console.error("Error centering on zip code:", error);
      setMapError("Failed to find the zip code location");
    } finally {
      setIsValidatingLocation(false);
    }
  };

  // Update zip bounds when zip code changes
  useEffect(() => {
    if (formData.zipCode) {
      getZipCodeBounds(formData.zipCode).then(setZipBounds);
    }
  }, [formData.zipCode]);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Location & Map Coordinates</h3>
      
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

      <div className="flex gap-2">
        <div className="flex-1">
          <Label htmlFor="zipCode">ZIP Code *</Label>
          <Input
            id="zipCode"
            required
            value={formData.zipCode}
            onChange={(e) => onFieldChange("zipCode", e.target.value)}
            placeholder="400001"
          />
        </div>
        <div className="flex items-end">
          <Button
            type="button"
            variant="outline"
            onClick={centerOnZipCode}
            disabled={!formData.zipCode || !map || isValidatingLocation}
            className="px-3"
          >
            {isValidatingLocation ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Target className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Interactive Map Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MousePointer className="w-5 h-5 text-blue-600" />
            <Label className="text-lg font-medium">Click to Pin Your Exact Location *</Label>
          </div>
          {isValidatingLocation && (
            <div className="flex items-center gap-2 text-sm text-blue-600">
              <Loader2 className="w-4 h-4 animate-spin" />
              Validating...
            </div>
          )}
        </div>
        
        <div className="relative">
          <div 
            ref={mapRef}
            className="w-full h-96 bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-200 shadow-inner"
            style={{ minHeight: '400px' }}
          />
          
          {/* Add inline styles for marker visibility */}
          <style dangerouslySetInnerHTML={{
            __html: `
              .marker-red {
                filter: hue-rotate(0deg) saturate(1.5) brightness(1.1) !important;
              }
              .leaflet-marker-icon {
                border-radius: 50% 50% 50% 0 !important;
                transform: rotate(-45deg) !important;
              }
              .leaflet-popup-content {
                font-weight: 500 !important;
                color: #1f2937 !important;
              }
              .leaflet-container {
                font-family: inherit !important;
              }
              .leaflet-div-icon {
                background: transparent !important;
                border: none !important;
              }
            `
          }} />
          
          {isLoadingMap && (
            <div className="absolute inset-0 bg-gray-100 rounded-lg flex items-center justify-center">
              <div className="flex items-center gap-2 text-gray-600">
                <Loader2 className="w-6 h-6 animate-spin" />
                <span>Loading interactive map...</span>
              </div>
            </div>
          )}
        </div>

        {mapError && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{mapError}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="latitude">Latitude *</Label>
            <Input
              id="latitude"
              required
              value={formData.latitude || ""}
              onChange={(e) => {
                onFieldChange("latitude", e.target.value);
                // If manually entered, validate and update map
                if (e.target.value && formData.longitude) {
                  const lat = parseFloat(e.target.value);
                  const lng = parseFloat(formData.longitude);
                  if (!isNaN(lat) && !isNaN(lng) && map) {
                    map.setView([lat, lng], 16);
                    if (marker) {
                      marker.setLatLng([lat, lng]);
                    }
                  }
                }
              }}
              placeholder="19.0760"
              type="number"
              step="any"
            />
          </div>
          <div>
            <Label htmlFor="longitude">Longitude *</Label>
            <Input
              id="longitude"
              required
              value={formData.longitude || ""}
              onChange={(e) => {
                onFieldChange("longitude", e.target.value);
                // If manually entered, validate and update map
                if (e.target.value && formData.latitude) {
                  const lat = parseFloat(formData.latitude);
                  const lng = parseFloat(e.target.value);
                  if (!isNaN(lat) && !isNaN(lng) && map) {
                    map.setView([lat, lng], 16);
                    if (marker) {
                      marker.setLatLng([lat, lng]);
                    }
                  }
                }
              }}
              placeholder="72.8777"
              type="number"
              step="any"
            />
          </div>
        </div>

        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="flex items-start gap-2">
            <MousePointer className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-2">How to pin your location:</p>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                <li>Enter your ZIP code and click the target button to center the map</li>
                <li><strong>Click directly on the map</strong> at your facility's exact location</li>
                <li>The coordinates will auto-fill and a pin will appear</li>
                <li>You can <strong>drag the red pin</strong> to adjust the position</li>
                <li>The system will validate that your pin is within the ZIP code area</li>
              </ol>
              <p className="mt-2 text-xs text-blue-600 font-medium">
                🎯 <strong>Click anywhere on the map to place your pin!</strong>
              </p>
            </div>
          </div>
        </div>

        {formData.latitude && formData.longitude && !mapError && (
          <div className="bg-green-50 p-3 rounded-lg border border-green-200">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-800">
                ✅ Location pinned: {parseFloat(formData.latitude).toFixed(6)}, {parseFloat(formData.longitude).toFixed(6)}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
