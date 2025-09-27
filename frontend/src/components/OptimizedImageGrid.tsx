import { useState, useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import LazyImage from "@/components/LazyImage";

interface OptimizedImageGridProps {
  images: Array<{
    src: string;
    alt: string;
    id: string;
  }>;
  gridCols?: number;
  className?: string;
  onImageClick?: (id: string) => void;
}

const OptimizedImageGrid = ({
  images,
  gridCols = 6,
  className = "",
  onImageClick
}: OptimizedImageGridProps) => {
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());

  const gridClassName = useMemo(() => {
    const baseClasses = `grid gap-6 ${className}`;
    const responsiveClasses = `
      grid-cols-1 
      sm:grid-cols-2 
      md:grid-cols-3 
      lg:grid-cols-4 
      xl:grid-cols-${gridCols}
    `;
    return `${baseClasses} ${responsiveClasses}`;
  }, [gridCols, className]);

  const handleImageLoad = (imageId: string) => {
    setLoadedImages(prev => new Set(prev).add(imageId));
  };

  return (
    <div className={gridClassName}>
      {images.map((image, index) => (
        <div
          key={image.id}
          className="relative group cursor-pointer overflow-hidden rounded-lg"
          onClick={() => onImageClick?.(image.id)}
        >
          <div className="aspect-[3/4] relative">
            <LazyImage
              src={image.src}
              alt={image.alt}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              placeholder="/placeholder.svg"
            />
            {!loadedImages.has(image.id) && (
              <Skeleton className="absolute inset-0 w-full h-full" />
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default OptimizedImageGrid;