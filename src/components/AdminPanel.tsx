import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, BookOpen, FileText, RefreshCw } from "lucide-react";
import AddMangaForm from "./admin/AddMangaForm";
import AddChapterForm from "./admin/AddChapterForm";
import { useAuth } from "@/hooks/useAuth";
import {
  updateMangaSlugs,
  addSlugColumnIfMissing,
} from "@/utils/updateMangaSlugs";
import {
  updateChapterSlugs,
  addChapterSlugColumnIfMissing,
} from "@/utils/updateChapterSlugs";
import { useToast } from "@/hooks/use-toast";

const AdminPanel = () => {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [openMangaDialog, setOpenMangaDialog] = useState(false);
  const [openChapterDialog, setOpenChapterDialog] = useState(false);
  const [updatingSlugs, setUpdatingSlugs] = useState(false);

  const handleUpdateSlugs = async () => {
    setUpdatingSlugs(true);
    try {
      toast({
        title: "بدء التحديث",
        description: "جاري تحديث روابط المانجا...",
      });

      const columnExists = await addSlugColumnIfMissing();
      if (!columnExists) {
        toast({
          title: "خطأ",
          description:
            "حقل slug غير موجود في قاعدة البيانات. يجب تطبيق migration أولاً.",
          variant: "destructive",
        });
        return;
      }

      await updateMangaSlugs();

      toast({
        title: "تم التحديث!",
        description: "تم تحديث روابط المانجا بنجاح",
      });

      // إعادة تحميل الصفحة لتطبيق التغييرات
      window.location.reload();
    } catch (error) {
      console.error("Error updating slugs:", error);
      toast({
        title: "خطأ",
        description: "فشل في تحديث روابط المانجا",
        variant: "destructive",
      });
    } finally {
      setUpdatingSlugs(false);
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

      {/* زر تحديث Slugs */}
      <Button
        onClick={handleUpdateSlugs}
        disabled={updatingSlugs}
        size="lg"
        variant="outline"
        className="rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
      >
        <RefreshCw
          className={`h-5 w-5 ml-2 ${updatingSlugs ? "animate-spin" : ""}`}
        />
        {updatingSlugs ? "جاري التحديث..." : "تحديث روابط SEO"}
      </Button>

      {/* روابط سريعة للإدارة */}
      <div className="flex flex-col gap-2">
        <Button
          asChild
          size="sm"
          variant="ghost"
          className="rounded-full shadow-md"
        >
          <Link to="/health-check">فحص الموقع</Link>
        </Button>
        <Button
          asChild
          size="sm"
          variant="ghost"
          className="rounded-full shadow-md"
        >
          <Link to="/all-manga">جميع المانجا</Link>
        </Button>
        <Button
          asChild
          size="sm"
          variant="ghost"
          className="rounded-full shadow-md"
        >
          <Link to="/test-slugs">اختبار Slugs</Link>
        </Button>
      </div>
    </div>
  );
};

export default AdminPanel;
