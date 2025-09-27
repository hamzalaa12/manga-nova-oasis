import { Skeleton } from "@/components/ui/skeleton";

const ChapterReaderSkeleton = () => {
  return (
    <div className="min-h-screen bg-[#111119] text-white">
      {/* Header Section */}
      <div className="max-w-[1142px] mx-auto px-2.5 mb-4 text-center">
        <Skeleton className="h-8 w-64 bg-gray-800 mx-auto mb-2" />
        <Skeleton className="h-4 w-48 bg-gray-700 mx-auto" />
      </div>

      {/* Breadcrumb Navigation */}
      <div className="max-w-[1142px] mx-auto px-2.5 mb-5">
        <div className="bg-gray-800/20 p-2.5 rounded-[3px]">
          <Skeleton className="h-4 w-72 bg-gray-700" />
        </div>
      </div>

      {/* Top Control Bar */}
      <div className="max-w-[1142px] mx-auto px-2.5 mb-5">
        <div className="flex justify-between items-center flex-wrap gap-2">
          <Skeleton className="h-8 w-32 bg-gray-700 rounded-[20px]" />
          <Skeleton className="h-8 w-28 bg-gray-700 rounded-[20px]" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-20 bg-gray-700 rounded-[20px]" />
            <Skeleton className="h-8 w-20 bg-gray-700 rounded-[20px]" />
          </div>
          <Skeleton className="h-8 w-24 bg-gray-700 rounded-[20px]" />
        </div>
      </div>

      {/* Chapter Content */}
      <div className="max-w-[1142px] mx-auto px-2.5 mb-2.5 text-center">
        <div className="space-y-2.5">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton 
              key={index}
              className="w-full h-96 bg-gray-800 mx-auto"
              style={{ aspectRatio: '16/9' }}
            />
          ))}
        </div>
      </div>

      {/* Bottom Control Bar */}
      <div className="max-w-[1142px] mx-auto px-2.5 mb-5">
        <div className="flex justify-between items-center flex-wrap gap-2">
          <Skeleton className="h-8 w-32 bg-gray-700 rounded-[20px]" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-20 bg-gray-700 rounded-[20px]" />
            <Skeleton className="h-8 w-20 bg-gray-700 rounded-[20px]" />
          </div>
          <Skeleton className="h-8 w-24 bg-gray-700 rounded-[20px]" />
        </div>
      </div>
    </div>
  );
};

export default ChapterReaderSkeleton;
