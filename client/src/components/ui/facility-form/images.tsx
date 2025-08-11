import { useState, useCallback } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, X, Upload, Image as ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface ImagesProps {
  images: string[];
  onImagesChange: (images: string[]) => void;
}

interface UploadedImage {
  id: string;
  filename: string;
  url: string;
  size: number;
  mimeType: string;
  uploadedAt: Date;
}

export default function Images({ images, onImagesChange }: ImagesProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const { toast } = useToast();

  const uploadImage = async (file: File) => {
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file (JPEG, PNG, WebP)",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Image must be smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('image', file);

      // Get auth token from localStorage
      const token = localStorage.getItem('quickcourt_token');
      if (!token) {
        throw new Error('Authentication required');
      }

      console.log('Uploading image:', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        hasToken: !!token,
        tokenLength: token.length,
        uploadUrl: '/api/upload/image'
      });

      // Use the existing apiRequest function but override Content-Type for FormData
      const response = await fetch('/api/upload/image', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          // Don't set Content-Type for FormData - let the browser set it with boundary
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Upload failed');
      }

      const responseData = await response.json();
      const uploadedImage: UploadedImage = responseData.image;
      
      // Add the new image URL to the images array
      onImagesChange([...images, uploadedImage.url]);
      
      toast({
        title: "Image uploaded successfully",
        description: "Your image has been added to the facility",
      });
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: error.response?.data?.message || "Failed to upload image",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      uploadImage(file);
    }
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      uploadImage(e.dataTransfer.files[0]);
    }
  }, []);

  const removeImage = (image: string) => {
    onImagesChange(images.filter(img => img !== image));
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      <h3 className="text-lg font-medium">Images</h3>
      
      {/* File Upload Area */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          dragActive 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          id="image-upload"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          disabled={isUploading}
        />
        
        <div className="space-y-2">
          <Upload className="mx-auto h-8 w-8 text-gray-400" />
          <div className="text-sm text-gray-600">
            <label
              htmlFor="image-upload"
              className="relative cursor-pointer rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
            >
              <span>Upload an image</span>
              <input
                id="image-upload"
                name="image-upload"
                type="file"
                className="sr-only"
                accept="image/*"
                onChange={handleFileSelect}
                disabled={isUploading}
              />
            </label>
            <span className="text-gray-500"> or drag and drop</span>
          </div>
          <p className="text-xs text-gray-500">
            PNG, JPG, WebP up to 5MB
          </p>
        </div>

        {isUploading && (
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-lg">
            <div className="text-sm text-gray-600">Uploading...</div>
          </div>
        )}
      </div>

      {/* Image Preview List */}
      <div className="space-y-3">
        {images.map((image, index) => (
          <div key={index} className="flex items-center space-x-3 p-3 border rounded-lg">
            <div className="flex-shrink-0">
              <img
                src={image}
                alt={`Facility image ${index + 1}`}
                className="w-16 h-16 object-cover rounded border"
                onError={(e) => {
                  // Fallback to icon if image fails to load
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                }}
              />
              <ImageIcon className="w-16 h-16 text-gray-400 hidden" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-900 truncate cursor-pointer" onClick={() => {
                window.open(image, '_blank');
              }}>
                {image.includes('/') ? image.split('/').pop() : image}
              </p>
            </div>
            <Button
              type="button"
              onClick={() => removeImage(image)}
              variant="ghost"
              size="sm"
              className="flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        ))}
        
        {images.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <ImageIcon className="mx-auto h-12 w-12 text-gray-300 mb-2" />
            <p className="text-sm">No images uploaded yet</p>
            <p className="text-xs">Upload images to showcase your facility</p>
          </div>
        )}
      </div>
    </div>
  );
}
