import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";

interface ImagesProps {
  images: string[];
  onImagesChange: (images: string[]) => void;
}

export default function Images({ images, onImagesChange }: ImagesProps) {
  const [newImage, setNewImage] = useState("");

  const addImage = () => {
    if (newImage.trim() && !images.includes(newImage.trim())) {
      onImagesChange([...images, newImage.trim()]);
      setNewImage("");
    }
  };

  const removeImage = (image: string) => {
    onImagesChange(images.filter(img => img !== image));
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      <h3 className="text-lg font-medium">Images (URLs)</h3>
      
      <div className="flex space-x-2">
        <Input
          value={newImage}
          onChange={(e) => setNewImage(e.target.value)}
          placeholder="Add image URL..."
          onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addImage())}
        />
        <Button type="button" onClick={addImage} variant="outline">
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      <div className="space-y-2">
        {images.map((image, index) => (
          <div key={index} className="flex items-center justify-between p-2 border rounded">
            <span 
              className="text-sm truncate flex-1 mr-2 cursor-pointer" 
              onClick={() => window.open(image, "_blank")}
            >
              {image.length > 40 ? image.slice(0, 40) + "..." : image}
            </span>
            <Button
              type="button"
              onClick={() => removeImage(image)}
              variant="ghost"
              size="sm"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
