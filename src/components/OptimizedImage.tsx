import { useState, useEffect, useRef, useCallback } from "react";
import { ImageOff, Loader2 } from "lucide-react";

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
  onLoad?: () => void;
  onError?: () => void;
  placeholder?: string;
  fallbackSrc?: string;
  enableZoom?: boolean;
  quality?: "low" | "medium" | "high";
}

const OptimizedImage = ({ 
  src, 
  alt, 
  className = "", 
  priority = false,
  onLoad,
  onError,
  placeholder = "/placeholder.svg",
  fallbackSrc,
  enableZoom = false,
  quality = "medium"
}: OptimizedImageProps) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [inView, setInView] = useState(priority);
  const [isZoomed, setIsZoomed] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Quality-based image optimization
  const getOptimizedSrc = useCallback((originalSrc: string) => {
    if (!originalSrc || originalSrc === placeholder) return originalSrc;
    
    // Add quality parameters based on quality setting
    const qualityParams = {
      low: "?w=400&q=60",
      medium: "?w=800&q=75", 
      high: "?w=1200&q=90"
    };
    
    // Check if URL already has parameters
    const separator = originalSrc.includes('?') ? '&' : '';
    return `${originalSrc}${separator}${qualityParams[quality]}`;
  }, [quality, placeholder]);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (priority) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { 
        rootMargin: "100px", // Increased for better UX
        threshold: 0.1
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [priority]);

  // Handle image load
  const handleLoad = useCallback(() => {
    setLoaded(true);
    setError(false);
    onLoad?.();
  }, [onLoad]);

  // Handle image error with fallback
  const handleError = useCallback(() => {
    setError(true);
    setLoaded(false);
    onError?.();
    
    // Try fallback source if available
    if (fallbackSrc && imgRef.current && imgRef.current.src !== fallbackSrc) {
      imgRef.current.src = fallbackSrc;
      return;
    }
    
    // Use placeholder as final fallback
    if (imgRef.current && imgRef.current.src !== placeholder) {
      imgRef.current.src = placeholder;
    }
  }, [onError, fallbackSrc, placeholder]);

  // Zoom functionality
  const handleImageClick = useCallback(() => {
    if (enableZoom && loaded && !error) {
      setIsZoomed(!isZoomed);
    }
  }, [enableZoom, loaded, error, isZoomed]);

  // Handle keyboard navigation for zoom
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isZoomed && event.key === 'Escape') {
        setIsZoomed(false);
      }
    };

    if (isZoomed) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isZoomed]);

  const optimizedSrc = getOptimizedSrc(src);

  return (
    <>
      <div 
        ref={containerRef}
        className={`relative ${className}`}
        style={{
          minHeight: priority ? "auto" : "200px",
          backgroundColor: "#1a1a1a"
        }}
      >
        {inView && (
          <>
            <img
              ref={imgRef}
              src={optimizedSrc || placeholder}
              alt={alt}
              className={`w-full max-w-full object-contain mx-auto select-none transition-all duration-300 ${
                loaded ? "opacity-100" : "opacity-0"
              } ${
                enableZoom && loaded && !error ? "cursor-zoom-in hover:scale-105" : ""
              }`}
              loading={priority ? "eager" : "lazy"}
              decoding="async"
              draggable={false}
              onLoad={handleLoad}
              onError={handleError}
              onClick={handleImageClick}
            />
            
            {/* Loading state */}
            {!loaded && !error && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted/50 backdrop-blur-sm">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">جاري التحميل...</span>
                </div>
              </div>
            )}
            
            {/* Error state */}
            {error && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted/50 backdrop-blur-sm">
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <ImageOff className="h-12 w-12" />
                  <span className="text-sm">فشل في تحميل الصورة</span>
                </div>
              </div>
            )}
            
            {/* Quality indicator (development only) */}
            {process.env.NODE_ENV === 'development' && loaded && (
              <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                {quality}
              </div>
            )}
          </>
        )}
        
        {/* Placeholder for non-priority images */}
        {!inView && !priority && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/30">
            <div className="animate-pulse bg-muted rounded-lg w-full h-full min-h-[200px]" />
          </div>
        )}
      </div>

      {/* Zoom overlay */}
      {isZoomed && enableZoom && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setIsZoomed(false)}
        >
          <div className="relative max-w-full max-h-full">
            <img
              src={getOptimizedSrc(src).replace(/[?&]q=\d+/, '&q=95')} // Use highest quality for zoom
              alt={alt}
              className="max-w-full max-h-full object-contain"
              draggable={false}
            />
            
            {/* Close button */}
            <button
              className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                setIsZoomed(false);
              }}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            {/* Instructions */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/50 text-white px-4 py-2 rounded-full text-sm">
              اضغط ESC أو انقر خارج الصورة للإغلاق
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default OptimizedImage;
