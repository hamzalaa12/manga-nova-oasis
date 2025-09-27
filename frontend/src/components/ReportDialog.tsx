import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useReports, ReportType } from '@/hooks/useReports';
import { useAuth } from '@/hooks/useAuth';
import { Flag, AlertTriangle } from 'lucide-react';

interface ReportDialogProps {
  type: ReportType;
  targetId?: string;
  reportedUserId?: string;
  children?: React.ReactNode;
  className?: string;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

const ReportDialog = ({ 
  type, 
  targetId, 
  reportedUserId, 
  children, 
  className,
  variant = 'outline',
  size = 'sm'
}: ReportDialogProps) => {
  const { user } = useAuth();
  const { submitReport } = useReports();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const reasonOptions = [
    { value: 'inappropriate_content', label: 'محتوى غير مناسب' },
    { value: 'spam', label: 'رسائل مزعجة' },
    { value: 'harassment', label: 'تحرش أو إساءة' },
    { value: 'copyright', label: 'انتهاك حقوق الطبع' },
    { value: 'fake_information', label: 'معلومات مزيفة' },
    { value: 'offensive_language', label: 'لغة مسيئة' },
    { value: 'violence', label: 'عنف أو تهديد' },
    { value: 'adult_content', label: 'محتوى للبالغين' },
    { value: 'other', label: 'أخرى' }
  ];

  const getTypeText = (type: ReportType): string => {
    switch (type) {
      case 'manga': return 'المانجا';
      case 'comment': return 'التعليق';
      case 'user': return 'المستخدم';
      case 'chapter': return 'الفصل';
      default: return 'المحتوى';
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      return;
    }

    if (!reason) {
      return;
    }

    setLoading(true);
    try {
      const success = await submitReport(
        type,
        reason,
        description || undefined,
        targetId,
        reportedUserId
      );

      if (success) {
        setOpen(false);
        setReason('');
        setDescription('');
      }
    } catch (error) {
      console.error('Error submitting report:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children ? (
          children
        ) : (
          <Button 
            variant={variant} 
            size={size} 
            className={className}
          >
            <Flag className="h-4 w-4 mr-1" />
            إبلاغ
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[425px]" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            إبلاغ عن {getTypeText(type)}
          </DialogTitle>
          <DialogDescription>
            ساعدنا في الحفاظ على مجتمع آمن ومناسب للجميع. 
            جميع الإبلاغات سيتم مراجعتها بواسطة فريق الإدارة.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="reason">سبب الإبلاغ *</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="اختر سبب الإبلاغ..." />
              </SelectTrigger>
              <SelectContent>
                {reasonOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">تفاصيل إضافية (اختياري)</Label>
            <Textarea
              id="description"
              placeholder="اكتب تفاصيل إضافية حول المشكلة..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[100px]"
            />
            <p className="text-xs text-muted-foreground">
              أضف تفاصيل تساعد فريق الإدارة في فهم المشكلة بشكل أفضل
            </p>
          </div>

          <div className="p-3 bg-muted rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-muted-foreground space-y-1">
                <p>• سيتم مراجعة إبلاغك خلال 24-48 ساعة</p>
                <p>• الإبلاغات الكاذبة قد تؤدي لعقوبات على حسابك</p>
                <p>• لن يتم إشعار المستخدم المبلغ عنه بهوية المبلغ</p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => setOpen(false)}
            disabled={loading}
          >
            إلغاء
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!reason || loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? 'جاري الإرسال...' : 'إرسال الإبلاغ'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReportDialog;
