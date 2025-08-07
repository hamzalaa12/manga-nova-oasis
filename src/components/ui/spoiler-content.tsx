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
          "relative overflow-hidden rounded-lg p-6 cursor-pointer group",
          "bg-gradient-to-br from-gray-900/90 via-gray-800/90 to-black/90",
          "border-2 border-orange-500/40 hover:border-orange-400/60",
          "transition-all duration-300 hover:scale-[1.02]",
          "backdrop-blur-sm shadow-lg hover:shadow-xl",
          "flex items-center justify-center gap-3 min-h-[100px]",
          className
        )}
        onClick={handleReveal}
      >
        {/* خلفية متحركة */}
        <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-red-500/10 animate-pulse" />
        
        {/* المحتوى */}
        <div className="relative z-10 flex items-center gap-3 text-center">
          <AlertTriangle className="h-6 w-6 text-orange-400 animate-bounce" />
          <div className="space-y-1">
            <span className="font-bold text-orange-300 text-lg block">
              ⚠️ تحذير: محتوى محرق
            </span>
            <span className="text-orange-400/80 text-sm block">
              انقر لإظهار المحتوى المخفي
            </span>
          </div>
          <EyeOff className="h-6 w-6 text-orange-400 group-hover:scale-110 transition-transform" />
        </div>
        
        {/* تأثير الإضاءة */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between bg-gradient-to-r from-orange-500/15 to-red-500/15 rounded-lg p-3 border border-orange-500/30">
        <div className="flex items-center gap-2 text-orange-400">
          <AlertTriangle className="h-4 w-4" />
          <span className="font-medium">⚠️ محتوى محرق - تم إظهاره</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 text-orange-400 hover:text-orange-300 hover:bg-orange-500/20"
          onClick={() => setIsRevealed(false)}
          title="إخفاء المحتوى"
        >
          <EyeOff className="h-3.5 w-3.5" />
        </Button>
      </div>
      
      <div 
        className={cn(
          "text-foreground leading-relaxed whitespace-pre-wrap text-right",
          "border-r-4 border-orange-500 pr-4 bg-gradient-to-l from-orange-500/5 to-transparent",
          "rounded-l-lg py-3 px-4 shadow-sm",
          "animate-in slide-in-from-top-2 duration-500"
        )}
        style={{ 
          fontFamily: "'Noto Sans Arabic', 'Cairo', 'Amiri', sans-serif",
          unicodeBidi: "embed"
        }}
      >
        {content}
      </div>
    </div>
  );
};

export default SpoilerContent;
