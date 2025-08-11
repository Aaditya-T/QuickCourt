import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, X, Image, Camera } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface PhotoUploadProps {
  onImagesChange: (images: string[]) => void;
  initialImages?: string[];
  maxImages?: number;
}

export default function PhotoUpload({ 
  onImagesChange, 
  initialImages = [], 
  maxImages = 5 
}: PhotoUploadProps) {
  const [images, setImages] = useState<string[]>(initialImages);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Handle file selection and upload
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    if (images.length + files.length > maxImages) {
      toast({
        title: "Too many images",
        description: `You can upload a maximum of ${maxImages} images`,
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const formData = new FormData();
        formData.append('image', file);

        const response = await fetch('/api/upload/image', {
          method: 'POST',
          body: formData
        });

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
    
    toast({
      title: "Image removed",
      description: "The image has been removed from your facility photos.",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="w-5 h-5 text-purple-600" />
          Facility Photos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-sm text-gray-600">
          Upload high-quality photos of your facility to attract more customers. Show courts, amenities, and the overall environment.
        </div>

        {/* Upload Button Section */}
        <div className="flex flex-col items-center space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          
          <div className="w-full">
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              size="lg"
              disabled={isUploading || images.length >= maxImages}
              className="w-full h-20 border-2 border-dashed border-gray-300 hover:border-purple-400 flex flex-col items-center justify-center gap-2"
            >
              {isUploading ? (
                <>
                  <div className="animate-spin w-6 h-6 border-4 border-purple-600 border-t-transparent rounded-full" />
                  <span>Uploading...</span>
                </>
              ) : (
                <>
                  <Upload className="w-6 h-6 text-purple-600" />
                  <span className="text-sm">
                    {images.length >= maxImages 
                      ? `Maximum ${maxImages} photos reached`
                      : `Click to upload photos (${images.length}/${maxImages})`
                    }
                  </span>
                </>
              )}
            </Button>
          </div>

          <div className="text-xs text-gray-500 text-center">
            Accepted formats: JPEG, PNG, WebP • Maximum file size: 5MB each
            {maxImages > 1 && ` • Up to ${maxImages} photos`}
          </div>
        </div>

        {/* Image Preview Grid */}
        {images.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Image className="w-4 h-4" />
              <span className="font-medium">Uploaded Photos ({images.length})</span>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {images.map((imageUrl, index) => (
                <div key={index} className="relative group">
                  <div className="aspect-video rounded-lg overflow-hidden border border-gray-200">
                    <img
                      src={imageUrl}
                      alt={`Facility photo ${index + 1}`}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    />
                  </div>
                  <button
                    onClick={() => handleRemoveImage(imageUrl)}
                    className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-lg"
                    title="Remove image"
                  >
                    <X className="w-3 h-3" />
                  </button>
                  <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                    Photo {index + 1}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {images.length === 0 && !isUploading && (
          <div className="text-center py-12 text-gray-500">
            <Camera className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium">No photos uploaded yet</p>
            <p className="text-sm">Add some photos to showcase your facility</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}