import React, { useState, useRef } from 'react';
import { Button } from './button';
import { Textarea } from './textarea';
import { 
  Bold, 
  Italic, 
  Underline, 
  Strikethrough,
  Quote,
  List,
  ListOrdered,
  Link,
  Image,
  Code,
  Type
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  onFormattingChange?: (formatting: any) => void;
  dir?: 'rtl' | 'ltr';
  disabled?: boolean;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = "اكتب تعليقك هنا...",
  className,
  onFormattingChange,
  dir = 'rtl',
  disabled = false
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [activeFormats, setActiveFormats] = useState<Set<string>>(new Set());

  const insertFormat = (format: string, wrapper: string, suffix?: string) => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.slice(start, end);
    const beforeText = value.slice(0, start);
    const afterText = value.slice(end);

    let newText: string;
    if (selectedText) {
      // إذا كان هناك نص محدد، لف النص بالتنسيق
      newText = beforeText + wrapper + selectedText + (suffix || wrapper) + afterText;
    } else {
      // إذا لم يكن هناك نص محدد، أدرج placeholder
      const placeholder = format === 'link' ? 'رابط' : format === 'image' ? 'صورة' : 'نص';
      newText = beforeText + wrapper + placeholder + (suffix || wrapper) + afterText;
    }

    onChange(newText);
    
    // التحديث بعد تغيير النص
    setTimeout(() => {
      if (textareaRef.current) {
        const newPosition = start + wrapper.length + (selectedText || format).length;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newPosition, newPosition);
      }
    }, 0);
  };

  const formatButtons = [
    {
      icon: Bold,
      label: 'عريض',
      format: 'bold',
      wrapper: '**',
      shortcut: 'Ctrl+B'
    },
    {
      icon: Italic,
      label: 'مائل',
      format: 'italic',
      wrapper: '*',
      shortcut: 'Ctrl+I'
    },
    {
      icon: Underline,
      label: 'تحته خط',
      format: 'underline',
      wrapper: '__',
      shortcut: 'Ctrl+U'
    },
    {
      icon: Strikethrough,
      label: 'يشطب',
      format: 'strikethrough',
      wrapper: '~~',
      shortcut: 'Ctrl+Shift+X'
    },
    {
      icon: Quote,
      label: 'اقتباس',
      format: 'quote',
      wrapper: '\n> ',
      suffix: '\n'
    },
    {
      icon: Code,
      label: 'كود',
      format: 'code',
      wrapper: '`'
    },
    {
      icon: List,
      label: 'قائمة',
      format: 'ul',
      wrapper: '\n- ',
      suffix: '\n'
    },
    {
      icon: ListOrdered,
      label: 'قائمة مرقمة',
      format: 'ol',
      wrapper: '\n1. ',
      suffix: '\n'
    },
    {
      icon: Link,
      label: 'رابط',
      format: 'link',
      wrapper: '[',
      suffix: '](url)'
    },
    {
      icon: Image,
      label: 'صورة',
      format: 'image',
      wrapper: '![',
      suffix: '](url)'
    }
  ];

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 'b':
          e.preventDefault();
          insertFormat('bold', '**');
          break;
        case 'i':
          e.preventDefault();
          insertFormat('italic', '*');
          break;
        case 'u':
          e.preventDefault();
          insertFormat('underline', '__');
          break;
        default:
          break;
      }
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      {/* شريط الأدوات */}
      <div className="flex items-center gap-1 p-2 bg-muted/30 rounded-md border border-border/50 flex-wrap">
        <div className="flex items-center gap-1">
          <Type className="h-4 w-4 text-muted-foreground mr-2" />
          {formatButtons.slice(0, 4).map(({ icon: Icon, label, format, wrapper, suffix }) => (
            <Button
              key={format}
              variant={activeFormats.has(format) ? "default" : "ghost"}
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => insertFormat(format, wrapper, suffix)}
              disabled={disabled}
              title={`${label}`}
            >
              <Icon className="h-3.5 w-3.5" />
            </Button>
          ))}
        </div>
        
        <div className="w-px h-6 bg-border mx-1" />
        
        <div className="flex items-center gap-1">
          {formatButtons.slice(4, 8).map(({ icon: Icon, label, format, wrapper, suffix }) => (
            <Button
              key={format}
              variant={activeFormats.has(format) ? "default" : "ghost"}
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => insertFormat(format, wrapper, suffix)}
              disabled={disabled}
              title={label}
            >
              <Icon className="h-3.5 w-3.5" />
            </Button>
          ))}
        </div>
        
        <div className="w-px h-6 bg-border mx-1" />
        
        <div className="flex items-center gap-1">
          {formatButtons.slice(8).map(({ icon: Icon, label, format, wrapper, suffix }) => (
            <Button
              key={format}
              variant={activeFormats.has(format) ? "default" : "ghost"}
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => insertFormat(format, wrapper, suffix)}
              disabled={disabled}
              title={label}
            >
              <Icon className="h-3.5 w-3.5" />
            </Button>
          ))}
        </div>
      </div>

      {/* منطقة النص */}
      <div className="relative">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={cn(
            "resize-none text-base leading-relaxed",
            dir === 'rtl' ? 'text-right' : 'text-left'
          )}
          dir={dir}
          disabled={disabled}
          style={{
            fontFamily: "'Noto Sans Arabic', 'Cairo', 'Amiri', sans-serif",
            unicodeBidi: "embed",
            minHeight: '120px'
          }}
        />
      </div>

      {/* نصائح التنسيق */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span>نصائح:</span>
        <span>**عريض**</span>
        <span>*مائل*</span>
        <span>`كود`</span>
        <span>&gt; اقتباس</span>
        <span>- قائمة</span>
      </div>
    </div>
  );
};

export default RichTextEditor;