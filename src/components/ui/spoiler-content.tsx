import React, { useState } from 'react';
import { AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { Button } from './button';
import { cn } from '@/lib/utils';

interface SpoilerContentProps {
  content: string;
  isSpoiler: boolean;
  className?: string;
  onReveal?: () => void;
}

const SpoilerContent: React.FC<SpoilerContentProps> = ({
  content,
  isSpoiler,
  className,
  onReveal
}) => {
  const [isRevealed, setIsRevealed] = useState(false);

  const handleReveal = () => {
    setIsRevealed(true);
    onReveal?.();
  };

  if (!isSpoiler) {
    return (
      <div className={cn("text-foreground leading-relaxed whitespace-pre-wrap text-right", className)}>
        {content}
      </div>
    );
  }

  if (!isRevealed) {
    return (
      <div 
        className={cn(
          "bg-gradient-to-r from-gray-800 to-gray-900 text-gray-800 rounded-lg p-4 cursor-pointer",
          "hover:from-gray-700 hover:to-gray-800 transition-all duration-300",
          "flex items-center justify-center gap-2 min-h-[80px]",
          "border-2 border-orange-500/30 hover:border-orange-500/50",
          className
        )}
        onClick={handleReveal}
      >
        <AlertTriangle className="h-5 w-5 text-orange-500" />
        <span className="font-medium text-orange-500">انقر لإظهار المحتوى المحرق</span>
        <EyeOff className="h-5 w-5 text-orange-500" />
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-2 text-orange-500 text-sm bg-orange-500/10 rounded-md p-2">
        <AlertTriangle className="h-4 w-4" />
        <span>⚠️ تحذير: محتوى محرق</span>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-orange-500 hover:text-orange-400"
          onClick={() => setIsRevealed(false)}
        >
          <EyeOff className="h-3 w-3" />
        </Button>
      </div>
      <div 
        className="text-foreground leading-relaxed whitespace-pre-wrap text-right border-l-4 border-orange-500 pl-4 bg-orange-500/5 rounded-r-md py-2"
        style={{ 
          fontFamily: "'Noto Sans Arabic', 'Cairo', 'Amiri', sans-serif",
          unicodeBidi: "embed",
          animation: "spoiler-reveal 0.5s ease-out"
        }}
      >
        {content}
      </div>
    </div>
  );
};

export default SpoilerContent;
