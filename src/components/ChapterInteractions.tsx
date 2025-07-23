import ChapterReactions from "./ChapterReactions";
import NewChapterComments from "./NewChapterComments";

interface ChapterInteractionsProps {
  chapterId: string;
}

const ChapterInteractions = ({ chapterId }: ChapterInteractionsProps) => {
  return (
    <div className="max-w-4xl mx-auto space-y-6 p-4">
      {/* قسم التفاعلات */}
      <ChapterReactions chapterId={chapterId} />

      {/* قسم التعليقات الجديد */}
      <NewChapterComments chapterId={chapterId} />
    </div>
  );
};

export default ChapterInteractions;
