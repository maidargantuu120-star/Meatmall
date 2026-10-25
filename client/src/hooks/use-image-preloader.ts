import { useEffect, useState } from "react";

export function useImagePreloader(imageUrls: string[]) {
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (imageUrls.length === 0) {
      setIsLoading(false);
      return;
    }

    let loadedCount = 0;
    const totalImages = imageUrls.length;
    const newLoadedImages = new Set<string>();

    const preloadImage = (url: string) => {
      return new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => {
          newLoadedImages.add(url);
          loadedCount++;

          if (loadedCount >= Math.min(totalImages, 6)) {
            // Load first 6 images quickly
            setLoadedImages(new Set(newLoadedImages));
            setIsLoading(false);
          }
          resolve();
        };
        img.onerror = () => {
          loadedCount++;
          if (loadedCount >= Math.min(totalImages, 6)) {
            setLoadedImages(new Set(newLoadedImages));
            setIsLoading(false);
          }
          resolve();
        };
        img.src = url;
      });
    };

    // Preload first 6 images for initial display
    const priorityImages = imageUrls.slice(0, 6);
    Promise.all(priorityImages.map(preloadImage));

    // Preload remaining images in background
    if (imageUrls.length > 6) {
      setTimeout(() => {
        imageUrls.slice(6).forEach(preloadImage);
      }, 100);
    }
  }, [imageUrls]);

  return { loadedImages, isLoading };
}
