import { useState } from "react";
import { Copy, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface SearchableTitleProps {
  mangaTitle: string;
  chapterNumber: number;
  mangaSlug?: string;
}

export const SearchableTitle = ({
  mangaTitle,
  chapterNumber,
  mangaSlug,
}: SearchableTitleProps) => {
  const [copied, setCopied] = useState(false);

  // إنشاء النص القابل للبحث
  const searchableText = mangaSlug
    ? `${mangaSlug}/${chapterNumber}`
    : `${mangaTitle.toLowerCase().replace(/\s+/g, "-")}/${chapterNumber}`;

  // إنشاء رابط البحث في جوجل
  const googleSearchUrl = `https://www.google.com/search?q="${searchableText}"`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(searchableText);
      setCopied(true);
      toast.success("تم نسخ النص للبحث!");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("فشل في النسخ");
    }
  };

  const openGoogleSearch = () => {
    window.open(googleSearchUrl, "_blank");
  };

  return (
    <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
      <div className="flex flex-col gap-3">
        <div className="text-sm text-gray-400">نص البحث في جوجل:</div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="bg-gray-900 px-3 py-2 rounded-md font-mono text-sm text-white border border-gray-600 flex-1 min-w-0">
            <span className="break-all">{searchableText}</span>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={copyToClipboard}
              className={`transition-colors ${
                copied
                  ? "bg-green-600 text-white border-green-600"
                  : "text-white border-gray-600 hover:bg-gray-700"
              }`}
            >
              <Copy className="h-4 w-4" />
              {copied ? "تم النسخ" : "نسخ"}
            </Button>
            <Button
              size="sm"
              onClick={openGoogleSearch}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <ExternalLink className="h-4 w-4" />
              البحث
            </Button>
          </div>
        </div>
        <div className="text-xs text-gray-500">
          استخدم هذا النص للبحث في جوجل أو انسخه ولصقه في أي محرك بحث
        </div>
      </div>
    </div>
  );
};
