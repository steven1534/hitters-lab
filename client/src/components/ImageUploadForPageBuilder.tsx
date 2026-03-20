import { useState } from "react";
import { Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";

interface ImageUploadProps {
  onImageUploaded: (url: string) => void;
}

export function ImageUploadForPageBuilder({ onImageUploaded }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const uploadMutation = trpc.imageUpload.uploadImage.useMutation();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be smaller than 5MB");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      // Read file as buffer
      const arrayBuffer = await file.arrayBuffer();
      const buffer = new Uint8Array(arrayBuffer);

      // Generate unique filename
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(7);
      const fileKey = `drill-images/${timestamp}-${randomSuffix}-${file.name}`;

      // Upload to S3 via tRPC
      const { url } = await uploadMutation.mutateAsync({
        fileKey,
        fileData: Array.from(buffer),
        mimeType: file.type,
      });
      onImageUploaded(url);
    } catch (err) {
      console.error("Upload error:", err);
      setError("Failed to upload image. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <label className="block">
        <input
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          disabled={uploading}
          className="hidden"
        />
        <Button
          type="button"
          variant="outline"
          disabled={uploading}
          className="w-full"
          onClick={(e) => {
            e.preventDefault();
            (e.currentTarget.previousElementSibling as HTMLInputElement)?.click();
          }}
        >
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Upload Image
            </>
          )}
        </Button>
      </label>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <p className="text-xs text-muted-foreground">Max 5MB • JPG, PNG, GIF, WebP</p>
    </div>
  );
}
