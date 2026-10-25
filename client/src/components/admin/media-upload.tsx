import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Upload, X, Check, Image } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Progress,
} from "@/components/ui";

interface MediaUploadProps {
  onSuccess?: () => void;
}

export function MediaUpload({ onSuccess }: MediaUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);

      // Create preview for images
      if (selectedFile.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (event) => {
          setPreview(event.target?.result as string);
        };
        reader.readAsDataURL(selectedFile);
      } else {
        setPreview(null);
      }
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    try {
      setUploading(true);
      setProgress(0);

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 300);

      // Create form data
      const formData = new FormData();
      formData.append("file", file);

      // Add metadata if needed
      if (file.type.startsWith("image/")) {
        const img = new window.Image();
        img.src = URL.createObjectURL(file);
        await new Promise<void>((resolve) => {
          img.onload = () => {
            formData.append(
              "dimensions",
              JSON.stringify({
                width: img.width,
                height: img.height,
              }),
            );
            resolve();
          };
        });
      }

      // Send to API
      const response = await fetch("/api/media", {
        method: "POST",
        body: formData,
        headers: {
          // Don't set Content-Type with FormData, browser will set it with boundary
        },
        credentials: "include",
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (!response.ok) {
        throw new Error("Файл байршуулах үед алдаа гарлаа");
      }

      // Clear form and show success message
      toast({
        title: "Амжилттай байршуулагдлаа",
        description: "Файл амжилттай байршуулагдлаа.",
      });

      // Invalidate media queries to refresh the list
      queryClient.invalidateQueries({ queryKey: ["/api/media"] });

      // Call success callback if provided
      if (onSuccess) {
        onSuccess();
      }

      // Reset form
      setTimeout(() => {
        setFile(null);
        setPreview(null);
        setUploading(false);
        setProgress(0);
      }, 1000);
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Алдаа гарлаа",
        description: "Файл байршуулах үед алдаа гарлаа. Дахин оролдоно уу.",
        variant: "destructive",
      });
      setUploading(false);
      setProgress(0);
    }
  };

  const handleCancel = () => {
    setFile(null);
    setPreview(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Файл байршуулах</CardTitle>
      </CardHeader>
      <CardContent>
        {!file ? (
          <div
            className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => document.getElementById("file-upload")?.click()}
          >
            <div className="flex flex-col items-center">
              <Upload className="h-12 w-12 text-gray-400 mb-4" />
              <p className="text-lg font-medium mb-1">Файл сонгох</p>
              <p className="text-sm text-gray-500 mb-4">
                эсвэл энд чирч оруулна уу
              </p>
              <p className="text-xs text-gray-400">
                PNG, JPG, GIF, SVG, PDF, зэрэг файлууд зөвшөөрөгдөнө
              </p>
            </div>
            <input
              id="file-upload"
              type="file"
              className="hidden"
              onChange={handleFileChange}
              accept="image/*,application/pdf"
            />
          </div>
        ) : (
          <div>
            <div className="flex items-center mb-4">
              <div className="flex-1">
                <p className="font-medium truncate">{file.name}</p>
                <p className="text-sm text-gray-500">
                  {(file.size / 1024).toFixed(2)} KB
                </p>
              </div>
              {!uploading && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancel}
                  className="text-gray-500"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            {preview && (
              <div className="mb-4 overflow-hidden rounded-md border border-gray-200">
                <img
                  src={preview}
                  alt="Preview"
                  className="max-h-48 max-w-full object-contain mx-auto"
                />
              </div>
            )}

            {uploading ? (
              <div className="space-y-2">
                <Progress value={progress} className="w-full" />
                <p className="text-sm text-gray-500 text-center">
                  {progress === 100 ? (
                    <span className="flex items-center justify-center">
                      <Check className="h-4 w-4 mr-1 text-green-500" />
                      Амжилттай байршуулагдлаа
                    </span>
                  ) : (
                    `Байршуулж байна... ${progress}%`
                  )}
                </p>
              </div>
            ) : (
              <Button onClick={handleUpload} className="w-full">
                <Upload className="h-4 w-4 mr-2" />
                Байршуулах
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
