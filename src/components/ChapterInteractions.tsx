import ChapterReactions from "./ChapterReactions";
import ChapterComments from "./ChapterComments";

interface ChapterInteractionsProps {
  chapterId: string;
}

const ChapterInteractions = ({ chapterId }: ChapterInteractionsProps) => {
  return (
    <div className="max-w-4xl mx-auto space-y-6 p-4">
      {/* قسم التفاعلات */}
      <ChapterReactions chapterId={chapterId} />

      {/* قسم التعليقات */}
      <ChapterComments chapterId={chapterId} />
    </div>
  );
};

export default ChapterInteractions;
