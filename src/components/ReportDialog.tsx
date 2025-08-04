import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Flag } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ReportDialogProps {
  mangaId?: string;
  commentId?: string;
  reportedUserId?: string;
  children?: React.ReactNode;
}

const ReportDialog = ({ mangaId, commentId, reportedUserId, children }: ReportDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !reason) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('reports')
        .insert({
          reporter_id: user.id,
          manga_id: mangaId,
          comment_id: commentId,
          reported_user_id: reportedUserId,
          reason,
          description: description || null
        });

      if (error) throw error;

      toast({
        title: 'تم إرسال البلاغ',
        description: 'شكراً لك، سيتم مراجعة البلاغ قريباً'
      });

      setOpen(false);
      setReason('');
      setDescription('');
    } catch (error) {
      console.error('خطأ في إرسال البلاغ:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في إرسال البلاغ',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm">
            <Flag className="h-4 w-4 mr-2" />
            إبلاغ
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>إرسال بلاغ</DialogTitle>
          <DialogDescription>
            ساعدنا في الحفاظ على مجتمع آمن بالإبلاغ عن المحتوى المخالف
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reason">سبب البلاغ</Label>
            <Select value={reason} onValueChange={setReason} required>
              <SelectTrigger>
                <SelectValue placeholder="اختر سبب البلاغ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="spam">محتوى مزعج</SelectItem>
                <SelectItem value="inappropriate">محتوى غير مناسب</SelectItem>
                <SelectItem value="harassment">تحرش أو إساءة</SelectItem>
                <SelectItem value="copyright">انتهاك حقوق الطبع</SelectItem>
                <SelectItem value="fake">محتوى مزيف</SelectItem>
                <SelectItem value="other">أخرى</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">تفاصيل إضافية (اختياري)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="أضف تفاصيل إضافية إذا أردت..."
              className="min-h-[80px]"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              إلغاء
            </Button>
            <Button type="submit" disabled={loading || !reason}>
              {loading ? 'جاري الإرسال...' : 'إرسال البلاغ'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ReportDialog;