import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Flag } from "lucide-react";

interface ReportDialogProps {
  targetId: string;
  targetType: "chapter" | "comment" | "manga";
  triggerElement?: React.ReactNode;
}

const reportReasons = {
  inappropriate_content: "محتوى غير لائق",
  spam: "محتوى مزعج أو إعلان",
  copyright: "انتهاك حقوق الطبع والنشر",
  violence: "محتوى عنيف",
  hate_speech: "خطاب كراهية",
  misinformation: "معلومات مضللة",
  other: "أخرى",
};

const ReportDialog = ({ targetId, targetType, triggerElement }: ReportDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");

  const reportMutation = useMutation({
    mutationFn: async () => {
      if (!user) {
        throw new Error("يجب تسجيل الدخول للإبلاغ");
      }

      if (!reason) {
        throw new Error("يرجى اختيار سبب البلاغ");
      }

      // Check if user already reported this item
      const { data: existingReport } = await supabase
        .from("reports")
        .select("id")
        .eq("target_id", targetId)
        .eq("target_type", targetType)
        .eq("reporter_id", user.id)
        .single();

      if (existingReport) {
        throw new Error("لقد قمت بالإبلاغ عن هذا العنصر مسبقاً");
      }

      const { error } = await supabase.from("reports").insert({
        target_id: targetId,
        target_type: targetType,
        reporter_id: user.id,
        reason: reason,
        description: description.trim() || null,
        status: "pending",
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "تم الإبلاغ بنجاح",
        description: "شكراً لك، سيتم مراجعة البلاغ من قبل فريق الإدارة",
      });
      setIsOpen(false);
      setReason("");
      setDescription("");
    },
    onError: (error: any) => {
      toast({
        title: "خطأ في الإبلاغ",
        description: error.message || "حدث خطأ أثناء إرسال البلاغ",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    reportMutation.mutate();
  };

  if (!user) {
    return null; // Don't show report option for non-logged-in users
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {triggerElement || (
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/10 border border-white/20 rounded-full w-10 h-10 p-0"
            title="الإبلاغ عن مشكلة"
          >
            <Flag className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5 text-red-500" />
            الإبلاغ عن {targetType === "chapter" ? "الفصل" : targetType === "manga" ? "المانجا" : "التعليق"}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reason">سبب البلاغ *</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="اختر سبب البلاغ" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(reportReasons).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">تفاصيل إضافية (اختياري)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="أضف تفاصيل إضافية عن المشكلة..."
              rows={3}
              dir="rtl"
            />
          </div>

          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              ⚠️ الإبلاغات الكاذبة أو المتكررة قد تؤدي إلى تعليق حسابك.
            </p>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              onClick={() => setIsOpen(false)}
              variant="outline"
              className="flex-1"
            >
              إلغاء
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!reason || reportMutation.isPending}
              className="flex-1"
            >
              {reportMutation.isPending ? "جاري الإرسال..." : "إرسال البلاغ"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReportDialog;
