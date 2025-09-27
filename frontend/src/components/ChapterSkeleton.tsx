import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

const ChapterSkeleton = () => {
  return (
    <Card className="bg-gray-800/50 border-gray-700 hover:border-red-500/50 transition-colors duration-300">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <Skeleton className="h-4 w-16 bg-gray-700" />
            <Skeleton className="h-4 w-32 bg-gray-700" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-12 bg-gray-700" />
            <Skeleton className="h-4 w-20 bg-gray-700" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ChapterSkeleton;
