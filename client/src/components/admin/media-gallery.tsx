import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Upload, X, Search, Trash2, Check } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { HelpTooltip } from "./help-tooltip";
import { helpIllustrations } from "@/assets/help";
import { Button, Input } from "@/components/ui";
import { getFullImageUrl, compressImage } from "@/lib/image-utils";
import { logger } from "@/lib/logger";

interface MediaItem {
  id: number;
  name: string;
  type: string;
  url: string;
  size: number;
  metadata: any;
  createdAt: string;
}

interface MediaGalleryProps {
  onSelect?: (url: string) => void;
  selectable?: boolean;
}

export function MediaGallery({
  onSelect,
  selectable = false,
}: MediaGalleryProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [uploadingFile, setUploadingFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedMediaId, setSelectedMediaId] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: mediaItems = [], isLoading } = useQuery({
    queryKey: ["/api/media"],
    queryFn: async () => {
      const data = await apiRequest("GET", "/api/media");
      return data as MediaItem[];
    },
  });

  const filteredItems = mediaItems.filter((item) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadingFile(e.target.files[0]);
    }
  };

  const handleFileUpload = async () => {
    if (!uploadingFile) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", uploadingFile);

    try {
      logger.custom("🖼️", "Compressing image before gallery upload...");
      const compressedFile = await compressImage(uploadingFile, 1600);

      const uploadFormData = new FormData();
      uploadFormData.append("file", compressedFile);

      await apiRequest("POST", "/api/media", uploadFormData);

      toast({
        title: "Зураг амжилттай хуулагдлаа",
        description: `${uploadingFile.name} амжилттай хуулагдлаа.`,
      });

      // Refresh media list
      queryClient.invalidateQueries({ queryKey: ["/api/media"] });

      // Reset state
      setUploadingFile(null);
      setIsUploading(false);
    } catch (error) {
      toast({
        title: "Зураг хуулах үед алдаа гарлаа",
        description: "Файл хуулах үед алдаа гарлаа. Дахин оролдоно уу.",
        variant: "destructive",
      });
      setIsUploading(false);
    }
  };

  const handleDeleteMedia = async (id: number) => {
    try {
      await apiRequest("DELETE", `/api/media/${id}`);

      toast({
        title: "Зураг устгагдлаа",
        description: "Зураг амжилттай устгагдлаа.",
      });

      // Refresh media list
      queryClient.invalidateQueries({ queryKey: ["/api/media"] });
    } catch (error) {
      toast({
        title: "Зураг устгах үед алдаа гарлаа",
        description: "Зураг устгах үед алдаа гарлаа. Дахин оролдоно уу.",
        variant: "destructive",
      });
    }
  };

  const handleSelect = (mediaItem: MediaItem) => {
    if (selectable && onSelect) {
      setSelectedMediaId(mediaItem.id);
      onSelect(mediaItem.url);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Upload Section */}
      <div className="space-y-4">
        <div className="flex items-center">
          <h3 className="text-lg font-medium">Шинэ зураг нэмэх</h3>
          <div className="ml-2">
            <HelpTooltip
              content={
                <div>
                  <p className="font-medium mb-1">Шинэ зураг нэмэх:</p>
                  <p className="mb-2">
                    JPG, PNG, GIF, SVG файлуудыг оруулах боломжтой.
                  </p>
                  <ol className="list-decimal list-inside space-y-1 text-xs">
                    <li>Файл сонгох товч дээр дарна</li>
                    <li>Компьютерээс зураг файл сонгоно</li>
                    <li>Файл хуулах товч дээр дарж хуулна</li>
                  </ol>
                </div>
              }
              illustration={helpIllustrations.mediaUpload}
              size="md"
            />
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex-1">
            <Input
              type="file"
              onChange={handleFileChange}
              accept="image/*"
              className="cursor-pointer"
            />
          </div>
          <Button
            onClick={handleFileUpload}
            disabled={!uploadingFile || isUploading}
          >
            {isUploading ? (
              <span className="flex items-center">
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Хуулж байна...
              </span>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Файл хуулах
              </>
            )}
          </Button>
        </div>

        {uploadingFile && (
          <div className="bg-gray-50 p-2 rounded-md flex justify-between items-center">
            <div className="truncate max-w-md">
              <span className="font-medium">{uploadingFile.name}</span>
              <span className="text-gray-500 text-sm ml-2">
                ({Math.round(uploadingFile.size / 1024)} KB)
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setUploadingFile(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <div className="border-t pt-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium">Зургийн сан</h3>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Хайх..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 w-64"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <svg
              className="animate-spin h-8 w-8 text-gray-400"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 p-4 rounded-md">
            <div className="font-medium text-lg">Зурагнууд хоосон байна</div>
            <div className="text-gray-500">Шинэ зураг нэмж эхлэнэ үү.</div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className={`relative group overflow-hidden rounded-md border shadow-sm hover:shadow-md transition-all ${
                  selectable ? "cursor-pointer" : ""
                } ${selectedMediaId === item.id ? "ring-2 ring-primary" : ""}`}
                onClick={() => selectable && handleSelect(item)}
              >
                <div className="aspect-square overflow-hidden bg-gray-100 flex items-center justify-center">
                  <img
                    src={getFullImageUrl(item.url)}
                    alt={item.name}
                    className="object-cover w-full h-full"
                  />
                </div>
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center">
                  {selectable && selectedMediaId === item.id && (
                    <div className="absolute top-2 right-2 bg-primary text-white rounded-full p-1">
                      <Check className="h-4 w-4" />
                    </div>
                  )}
                  {!selectable && (
                    <Button
                      variant="destructive"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteMedia(item.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Устгах
                    </Button>
                  )}
                </div>
                <div className="p-2 text-sm truncate">{item.name}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectable && (
        <div className="flex justify-end pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => onSelect && onSelect("")}
            className="mr-2"
          >
            Цуцлах
          </Button>
          <Button
            disabled={selectedMediaId === null}
            onClick={() => {
              const selectedItem = mediaItems.find(
                (item) => item.id === selectedMediaId,
              );
              if (selectedItem && onSelect) {
                onSelect(selectedItem.url);
              }
            }}
          >
            <Check className="h-4 w-4 mr-1" />
            Зураг оруулах
          </Button>
        </div>
      )}
    </div>
  );
}
