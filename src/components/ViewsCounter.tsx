import { useState, useEffect } from "react";
import { Eye, TrendingUp, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ViewsCounterProps {
  viewsCount: number;
  type?: "manga" | "chapter";
  className?: string;
  showTrending?: boolean;
}

const ViewsCounter = ({
  viewsCount,
  type = "manga",
  className = "",
  showTrending = false,
}: ViewsCounterProps) => {
  const [displayCount, setDisplayCount] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    // أنيميشن تدريجي للأرقام
    if (viewsCount > displayCount) {
      setIsAnimating(true);
      const increment = Math.ceil((viewsCount - displayCount) / 20);
      const timer = setInterval(() => {
        setDisplayCount((prev) => {
          const next = prev + increment;
          if (next >= viewsCount) {
            clearInterval(timer);
            setIsAnimating(false);
            return viewsCount;
          }
          return next;
        });
      }, 50);

      return () => clearInterval(timer);
    }
  }, [viewsCount, displayCount]);

  const formatViews = (count: number): string => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  const getViewsText = () => {
    switch (type) {
      case "chapter":
        return "قراءة";
      default:
        return "مشاهدة";
    }
  };

  const getTrendingLevel = (count: number) => {
    if (count >= 100000) return "hot";
    if (count >= 50000) return "trending";
    if (count >= 10000) return "popular";
    return "normal";
  };

  const trendingLevel = getTrendingLevel(viewsCount);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex items-center gap-1 text-muted-foreground">
        <Eye
          className={`h-4 w-4 ${isAnimating ? "text-primary animate-pulse" : ""}`}
        />
        <span className={`font-medium ${isAnimating ? "text-primary" : ""}`}>
          {formatViews(displayCount)}
        </span>
        <span className="text-sm">{getViewsText()}</span>
      </div>

      {showTrending && trendingLevel !== "normal" && (
        <Badge
          variant={trendingLevel === "hot" ? "destructive" : "secondary"}
          className={`text-xs flex items-center gap-1 ${
            trendingLevel === "hot"
              ? "bg-red-500 text-white animate-pulse"
              : trendingLevel === "trending"
                ? "bg-orange-500 text-white"
                : "bg-blue-500 text-white"
          }`}
        >
          {trendingLevel === "hot" && <TrendingUp className="h-3 w-3" />}
          {trendingLevel === "trending" && <TrendingUp className="h-3 w-3" />}
          {trendingLevel === "popular" && <Users className="h-3 w-3" />}
          {trendingLevel === "hot" && "رائج جداً"}
          {trendingLevel === "trending" && "رائج"}
          {trendingLevel === "popular" && "شائع"}
        </Badge>
      )}
    </div>
  );
};

export default ViewsCounter;
