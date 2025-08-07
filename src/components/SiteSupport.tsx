import { useState } from "react";
import { Heart, Play, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";

const SiteSupport = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isAdVisible, setIsAdVisible] = useState(false);
  const [adWatched, setAdWatched] = useState(false);

  const handleWatchAd = () => {
    setIsAdVisible(true);
    // Simulate ad completion after 5 seconds
    setTimeout(() => {
      setAdWatched(true);
      toast.success("شكراً لدعمك للموقع! تمت م��اهدة الإعلان بنجاح");
    }, 5000);
  };

  const closeAd = () => {
    if (adWatched) {
      setIsAdVisible(false);
      setIsOpen(false);
      setAdWatched(false);
    } else {
      toast.error("يرجى مشاهدة الإعلان كاملاً لدعم الموقع");
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button 
            variant="ghost" 
            className="text-foreground hover:text-primary transition-colors flex items-center gap-2"
          >
            <Heart className="h-4 w-4" />
            دعم الموقع
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-right">دعم الموقع</DialogTitle>
            <DialogDescription className="text-right">
              ساعدنا في الحفاظ على الموقع من خلال مشاهدة إعلان قصير
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-col gap-4 mt-4">
            <div className="text-center">
              <Heart className="h-12 w-12 mx-auto text-red-500 mb-4" />
              <p className="text-sm text-muted-foreground mb-4">
                مشاهدة الإعلانات تساعدنا في تطوير الموقع وإضافة محتوى جديد
              </p>
            </div>
            
            <Button 
              onClick={handleWatchAd}
              className="w-full flex items-center gap-2"
              disabled={isAdVisible}
            >
              <Play className="h-4 w-4" />
              مشاهدة إعلان
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Ad Modal */}
      {isAdVisible && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center">
          <div className="bg-background rounded-lg p-6 max-w-2xl w-full mx-4 relative">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2"
              onClick={closeAd}
              disabled={!adWatched}
            >
              <X className="h-4 w-4" />
            </Button>
            
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-4">إعلان داعم للموقع</h3>
              
              {/* Ad Content Placeholder */}
              <div className="bg-gradient-to-r from-primary/20 to-secondary/20 rounded-lg p-8 mb-4 min-h-[300px] flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-pulse">
                    <div className="w-24 h-24 bg-primary/30 rounded-full mx-auto mb-4"></div>
                    <div className="h-4 bg-primary/30 rounded w-3/4 mx-auto mb-2"></div>
                    <div className="h-4 bg-primary/30 rounded w-1/2 mx-auto"></div>
                  </div>
                  
                  {!adWatched && (
                    <div className="mt-6">
                      <p className="text-sm text-muted-foreground">
                        جاري تحميل الإعلان...
                      </p>
                      <div className="w-full bg-muted rounded-full h-2 mt-2">
                        <div 
                          className="bg-primary h-2 rounded-full transition-all duration-1000"
                          style={{
                            width: adWatched ? '100%' : '0%',
                            animation: 'progress 5s linear forwards'
                          }}
                        ></div>
                      </div>
                    </div>
                  )}
                  
                  {adWatched && (
                    <div className="mt-6">
                      <p className="text-green-600 font-semibold">
                        ✓ تم إكمال الإعلان - شكراً لدعمك!
                      </p>
                    </div>
                  )}
                </div>
              </div>
              
              <p className="text-xs text-muted-foreground">
                {adWatched 
                  ? "يمكنك الآن إغلاق الإعلان" 
                  : "يرجى انتظار انتهاء الإعلان لدعم الموقع"
                }
              </p>
            </div>
          </div>
        </div>
      )}
      
      <style jsx>{`
        @keyframes progress {
          from { width: 0%; }
          to { width: 100%; }
        }
      `}</style>
    </>
  );
};

export default SiteSupport;
