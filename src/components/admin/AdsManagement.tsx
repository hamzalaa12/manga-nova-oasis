import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, Edit, Trash2, ExternalLink, Eye, Clock, Gift } from "lucide-react";

interface Ad {
  id: string;
  title: string;
  description: string;
  url: string;
  image_url?: string;
  reward_points?: number;
  duration_seconds?: number;
  is_active: boolean;
  click_count: number;
  created_at: string;
}

interface AdFormData {
  title: string;
  description: string;
  url: string;
  image_url: string;
  reward_points: number;
  duration_seconds: number;
  is_active: boolean;
}

const fetchAds = async (): Promise<Ad[]> => {
  const { data, error } = await supabase
    .from('ads')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

const AdsManagement = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingAd, setEditingAd] = useState<Ad | null>(null);
  const [formData, setFormData] = useState<AdFormData>({
    title: '',
    description: '',
    url: '',
    image_url: '',
    reward_points: 0,
    duration_seconds: 0,
    is_active: true,
  });

  const { data: ads, isLoading, error } = useQuery({
    queryKey: ['ads-management'],
    queryFn: fetchAds,
  });

  const createAdMutation = useMutation({
    mutationFn: async (adData: Omit<AdFormData, 'id'>) => {
      const { error } = await supabase.from('ads').insert([adData]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ads-management'] });
      setIsCreateDialogOpen(false);
      resetForm();
      toast({
        title: "تم الإنشاء بنجاح",
        description: "تم إضافة الإعلان الجديد",
      });
    },
    onError: (error) => {
      toast({
        title: "خطأ",
        description: "فشل في إنشاء الإعلان",
        variant: "destructive",
      });
    },
  });

  const updateAdMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<AdFormData> }) => {
      const { error } = await supabase
        .from('ads')
        .update(data)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ads-management'] });
      setEditingAd(null);
      resetForm();
      toast({
        title: "تم التحديث بنجاح",
        description: "تم تحديث الإعلان",
      });
    },
    onError: (error) => {
      toast({
        title: "خطأ",
        description: "فشل في تحديث الإعلان",
        variant: "destructive",
      });
    },
  });

  const deleteAdMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('ads').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ads-management'] });
      toast({
        title: "تم الحذف بنجاح",
        description: "تم حذف الإعلان",
      });
    },
    onError: (error) => {
      toast({
        title: "خطأ",
        description: "فشل في حذف الإعلان",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      url: '',
      image_url: '',
      reward_points: 0,
      duration_seconds: 0,
      is_active: true,
    });
  };

  const handleEdit = (ad: Ad) => {
    setEditingAd(ad);
    setFormData({
      title: ad.title,
      description: ad.description,
      url: ad.url,
      image_url: ad.image_url || '',
      reward_points: ad.reward_points || 0,
      duration_seconds: ad.duration_seconds || 0,
      is_active: ad.is_active,
    });
  };

  const handleSubmit = () => {
    if (!formData.title || !formData.url) {
      toast({
        title: "خطأ",
        description: "العنوان والرابط مطلوبان",
        variant: "destructive",
      });
      return;
    }

    if (editingAd) {
      updateAdMutation.mutate({ id: editingAd.id, data: formData });
    } else {
      createAdMutation.mutate(formData);
    }
  };

  const toggleAdStatus = (ad: Ad) => {
    updateAdMutation.mutate({
      id: ad.id,
      data: { is_active: !ad.is_active }
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">إدارة الإعلانات</h2>
        </div>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground mt-2">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">إدارة الإعلانات</h2>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="h-4 w-4 mr-2" />
              إضافة إعلان جديد
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>إضافة إعلان جديد</DialogTitle>
              <DialogDescription>
                أضف إعلان جديد ليتمكن المستخدمون من مشاهدته
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">العنوان</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="عنوان الإعلان"
                />
              </div>
              
              <div>
                <Label htmlFor="description">الوصف</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="وصف الإعلان"
                />
              </div>
              
              <div>
                <Label htmlFor="url">الرابط</Label>
                <Input
                  id="url"
                  type="url"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  placeholder="https://example.com"
                />
              </div>
              
              <div>
                <Label htmlFor="image_url">رابط الصورة (اختياري)</Label>
                <Input
                  id="image_url"
                  type="url"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  placeholder="https://example.com/image.jpg"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="reward_points">نقاط المكافأة</Label>
                  <Input
                    id="reward_points"
                    type="number"
                    min="0"
                    value={formData.reward_points}
                    onChange={(e) => setFormData({ ...formData, reward_points: parseInt(e.target.value) || 0 })}
                  />
                </div>
                
                <div>
                  <Label htmlFor="duration_seconds">مدة الانتظار (ثانية)</Label>
                  <Input
                    id="duration_seconds"
                    type="number"
                    min="0"
                    value={formData.duration_seconds}
                    onChange={(e) => setFormData({ ...formData, duration_seconds: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active">الإعلان نشط</Label>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                إلغاء
              </Button>
              <Button onClick={handleSubmit} disabled={createAdMutation.isPending}>
                {createAdMutation.isPending ? "جاري الإضافة..." : "إضافة الإعلان"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingAd} onOpenChange={(open) => !open && setEditingAd(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>تعديل الإعلان</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-title">العنوان</Label>
              <Input
                id="edit-title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            
            <div>
              <Label htmlFor="edit-description">الوصف</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            
            <div>
              <Label htmlFor="edit-url">الرابط</Label>
              <Input
                id="edit-url"
                type="url"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              />
            </div>
            
            <div>
              <Label htmlFor="edit-image_url">رابط الصورة</Label>
              <Input
                id="edit-image_url"
                type="url"
                value={formData.image_url}
                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-reward_points">نقاط المكافأة</Label>
                <Input
                  id="edit-reward_points"
                  type="number"
                  min="0"
                  value={formData.reward_points}
                  onChange={(e) => setFormData({ ...formData, reward_points: parseInt(e.target.value) || 0 })}
                />
              </div>
              
              <div>
                <Label htmlFor="edit-duration_seconds">مدة الانتظار (ثانية)</Label>
                <Input
                  id="edit-duration_seconds"
                  type="number"
                  min="0"
                  value={formData.duration_seconds}
                  onChange={(e) => setFormData({ ...formData, duration_seconds: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="edit-is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label htmlFor="edit-is_active">الإعلان نشط</Label>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingAd(null)}>
              إلغاء
            </Button>
            <Button onClick={handleSubmit} disabled={updateAdMutation.isPending}>
              {updateAdMutation.isPending ? "جاري التحديث..." : "تحديث الإعلان"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ads List */}
      <div className="grid gap-4">
        {ads?.map((ad) => (
          <Card key={ad.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {ad.title}
                    <Badge variant={ad.is_active ? "default" : "secondary"}>
                      {ad.is_active ? "نشط" : "غير نشط"}
                    </Badge>
                  </CardTitle>
                  <p className="text-muted-foreground mt-1">{ad.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleAdStatus(ad)}
                  >
                    {ad.is_active ? "إيقاف" : "تفعيل"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(ad)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>حذف الإعلان</AlertDialogTitle>
                        <AlertDialogDescription>
                          هل أنت متأكد من حذف هذا الإعلان؟ لا يمكن التراجع عن هذا الإجراء.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>إلغاء</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteAdMutation.mutate(ad.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          حذف
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <ExternalLink className="h-4 w-4" />
                  <a href={ad.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                    {ad.url}
                  </a>
                </div>
                <div className="flex items-center gap-1">
                  <Eye className="h-4 w-4" />
                  {ad.click_count} مشاهدة
                </div>
                {ad.reward_points && (
                  <div className="flex items-center gap-1">
                    <Gift className="h-4 w-4" />
                    {ad.reward_points} نقطة
                  </div>
                )}
                {ad.duration_seconds && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {ad.duration_seconds} ثانية
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        
        {ads?.length === 0 && (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">📢</div>
            <h3 className="text-lg font-semibold mb-2">لا توجد إعلانات</h3>
            <p className="text-muted-foreground">ابدأ بإضافة إعلانك الأول</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdsManagement;
