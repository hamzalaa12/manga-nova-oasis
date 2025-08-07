import { useState, useEffect, useRef } from "react";

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
  onLoad?: () => void;
}

const OptimizedImage = ({ 
  src, 
  alt, 
  className = "", 
  priority = false,
  onLoad 
}: OptimizedImageProps) => {
  const [loaded, setLoaded] = useState(false);
  const [inView, setInView] = useState(priority);
  const imgRef = useRef<HTMLImageElement>(null);

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
        rootMargin: "50px",
        threshold: 0.1
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [priority]);

  const handleLoad = () => {
    setLoaded(true);
    onLoad?.();
  };

  return (
    <div 
      ref={imgRef}
      className={`relative ${className}`}
      style={{
        minHeight: priority ? "auto" : "400px",
        backgroundColor: "#1a1a1a"
      }}
    >
      {inView && (
        <img
          src={src || "/placeholder.svg"}
          alt={alt}
          className={`w-full max-w-full object-contain mx-auto select-none transition-opacity duration-200 ${
            loaded ? "opacity-100" : "opacity-0"
          }`}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          draggable={false}
          onLoad={handleLoad}
        />
      )}
      {!loaded && inView && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
        </div>
      )}
    </div>
  );
};

export default OptimizedImage;
