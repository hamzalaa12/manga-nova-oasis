import { useState, useEffect, useRef, memo } from "react";

interface AdvancedImageLoaderProps {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
  onLoad?: () => void;
  placeholder?: boolean;
}

// Simple in-memory cache for loaded images
const imageCache = new Map<string, boolean>();

// Preload important images
const preloadImage = (src: string) => {
  if (imageCache.has(src)) return;
  
  const img = new Image();
  img.onload = () => {
    imageCache.set(src, true);
  };
  img.src = src;
};

const AdvancedImageLoader = memo(({ 
  src, 
  alt, 
  className = "", 
  priority = false,
  onLoad,
  placeholder = true
}: AdvancedImageLoaderProps) => {
  const [loaded, setLoaded] = useState(imageCache.has(src));
  const [inView, setInView] = useState(priority);
  const [error, setError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver>();

  useEffect(() => {
    if (priority || loaded) return;

    // Enhanced intersection observer with better performance
    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observerRef.current?.disconnect();
        }
      },
      { 
        rootMargin: "100px", // Load earlier for smoother experience
        threshold: 0.1
      }
    );

    if (imgRef.current) {
      observerRef.current.observe(imgRef.current);
    }

    return () => observerRef.current?.disconnect();
  }, [priority, loaded]);

  // Preload next images for better UX
  useEffect(() => {
    if (priority && src) {
      preloadImage(src);
    }
  }, [src, priority]);

  const handleLoad = () => {
    setLoaded(true);
    imageCache.set(src, true);
    onLoad?.();
  };

  const handleError = () => {
    setError(true);
  };

  return (
    <div 
      ref={imgRef}
      className={`relative overflow-hidden ${className}`}
      style={{
        minHeight: priority ? "auto" : "200px",
        backgroundColor: placeholder ? "#1a1a1a" : "transparent"
      }}
    >
      {(inView || loaded) && !error && (
        <img
          src={src || "/placeholder.svg"}
          alt={alt}
          className={`w-full h-full object-cover transition-all duration-300 ${
            loaded ? "opacity-100 scale-100" : "opacity-0 scale-105"
          }`}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          onLoad={handleLoad}
          onError={handleError}
        />
      )}
      
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
          <div className="text-gray-400 text-sm">فشل التحميل</div>
        </div>
      )}
      
      {!loaded && inView && !error && placeholder && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
    </div>
  );
});

AdvancedImageLoader.displayName = "AdvancedImageLoader";

export default AdvancedImageLoader;
