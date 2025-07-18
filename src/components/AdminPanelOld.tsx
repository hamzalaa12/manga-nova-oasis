import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, BookOpen, FileText } from "lucide-react";
import AddMangaForm from "./admin/AddMangaForm";
import AddChapterForm from "./admin/AddChapterForm";
import { useAuth } from "@/hooks/useAuth";

const AdminPanel = () => {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [openMangaDialog, setOpenMangaDialog] = useState(false);
  const [openChapterDialog, setOpenChapterDialog] = useState(false);

  const handleFixSlugs = async () => {
    try {
      const healthCheck = await checkDatabaseHealth();
      if (healthCheck && healthCheck.mangaWithoutSlugs === 0) {
        toast({
          title: "لا توجد مشكلة",
          description: "جميع المانجا تحتوي على slugs بالفعل",
        });
        return;
      }

      await fixMissingSlugs();
      toast({
        title: "تم الإصلاح!",
        description: "تم إصلاح جميع الـ slugs المفقودة",
      });
    } catch (error) {
      toast({
        title: "خطأ",
        description: "فشل في إصلاح الـ slugs",
        variant: "destructive",
      });
    }
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-50">
      <Dialog open={openMangaDialog} onOpenChange={setOpenMangaDialog}>
        <DialogTrigger asChild>
          <Button
            size="lg"
            className="rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <BookOpen className="h-5 w-5 ml-2" />
            إضافة مانجا
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>إضافة مانجا/مانهوا/مانها جديدة</DialogTitle>
          </DialogHeader>
          <AddMangaForm onSuccess={() => setOpenMangaDialog(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={openChapterDialog} onOpenChange={setOpenChapterDialog}>
        <DialogTrigger asChild>
          <Button
            size="lg"
            variant="secondary"
            className="rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <FileText className="h-5 w-5 ml-2" />
            إضافة فصل
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>إضافة فصل جديد</DialogTitle>
          </DialogHeader>
          <AddChapterForm onSuccess={() => setOpenChapterDialog(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPanel;
