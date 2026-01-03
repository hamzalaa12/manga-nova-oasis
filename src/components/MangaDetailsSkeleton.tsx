import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import ChapterSkeleton from "./ChapterSkeleton";

const MangaDetailsSkeleton = () => {
  return (
    <div className="min-h-screen bg-[#111119] text-white">
      <div className="container mx-auto p-4">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Cover Image Skeleton */}
          <div className="lg:w-1/3">
            <Skeleton className="w-full h-96 rounded-lg bg-gray-800" />
          </div>

          {/* Details Skeleton */}
          <div className="lg:w-2/3 space-y-4">
            <Skeleton className="h-8 w-3/4 bg-gray-800" />
            <div className="flex gap-2">
              <Skeleton className="h-6 w-16 bg-gray-700" />
              <Skeleton className="h-6 w-20 bg-gray-700" />
              <Skeleton className="h-6 w-24 bg-gray-700" />
            </div>
            <Skeleton className="h-20 w-full bg-gray-800" />
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <div className="space-y-2">
                <Skeleton className="h-4 w-12 bg-gray-700" />
                <Skeleton className="h-6 w-20 bg-gray-600" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-16 bg-gray-700" />
                <Skeleton className="h-6 w-24 bg-gray-600" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-14 bg-gray-700" />
                <Skeleton className="h-6 w-18 bg-gray-600" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-18 bg-gray-700" />
                <Skeleton className="h-6 w-16 bg-gray-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Chapters Section Skeleton */}
        <div className="mt-12">
          <Skeleton className="h-8 w-32 bg-gray-800 mb-6" />
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <ChapterSkeleton key={index} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MangaDetailsSkeleton;
