import { useEffect, useState } from "react";

interface ServerSideContentProps {
  fallbackContent: React.ReactNode;
  children: React.ReactNode;
  loadingContent?: React.ReactNode;
}

/**
 * Component that shows fallback content immediately for search engines
 * and then progressively enhances with interactive content
 */
const ServerSideContent = ({ 
  fallbackContent, 
  children, 
  loadingContent 
}: ServerSideContentProps) => {
  const [isHydrated, setIsHydrated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Mark as hydrated when component mounts (client-side)
    setIsHydrated(true);
    
    // Small delay to show loading state
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // Show fallback content for search engines and initial load
  if (!isHydrated) {
    return <>{fallbackContent}</>;
  }

  // Show loading state briefly
  if (isLoading && loadingContent) {
    return <>{loadingContent}</>;
  }

  // Show interactive content
  return <>{children}</>;
};

export default ServerSideContent;
