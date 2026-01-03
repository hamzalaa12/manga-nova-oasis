import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const MangaCardSkeleton = () => {
  return (
    <Card className="overflow-hidden border border-border">
      <div className="relative">
        <Skeleton className="w-full h-48" />
        <div className="absolute top-2 right-2">
          <Skeleton className="h-5 w-12" />
        </div>
        <div className="absolute bottom-2 left-2">
          <Skeleton className="h-5 w-16" />
        </div>
      </div>

      <CardContent className="p-3 space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />

        <div className="flex items-center justify-between">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-3 w-16" />
        </div>

        <Skeleton className="h-3 w-20" />
      </CardContent>
    </Card>
  );
};

export default MangaCardSkeleton;
