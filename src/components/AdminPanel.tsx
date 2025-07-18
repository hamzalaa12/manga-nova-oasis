import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Plus,
  BookOpen,
  FileText,
  Settings,
  MessageCircle,
} from "lucide-react";
import AddMangaForm from "./admin/AddMangaForm";
import AddChapterForm from "./admin/AddChapterForm";
import CommentsAdmin from "./admin/CommentsAdmin";
import { useAuth } from "@/hooks/useAuth";
import { ensureMangaHasSlugs } from "@/utils/ensureSlugs";
import { useToast } from "@/hooks/use-toast";

const AdminPanel = () => {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [openMangaDialog, setOpenMangaDialog] = useState(false);
  const [openChapterDialog, setOpenChapterDialog] = useState(false);

  const handleEnsureSlugs = async () => {
    try {
      const success = await ensureMangaHasSlugs();
      if (success) {
        toast({
          title: "تم الإصلاح!",
          description: "تم التأكد من وجود slugs لجميع المانجا",
        });
      } else {
        toast({
          title: "خطأ",
          description: "فشل في إصلاح الـ slugs",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "��طأ",
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
            variant="outline"
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

      <Button
        onClick={handleEnsureSlugs}
        size="lg"
        variant="outline"
        className="rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
      >
        <Settings className="h-5 w-5 ml-2" />
        إصلاح Slugs
      </Button>
    </div>
  );
};

export default AdminPanel;
