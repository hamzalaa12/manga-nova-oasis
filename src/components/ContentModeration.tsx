import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Shield, 
  Filter, 
  Settings, 
  Plus, 
  Trash2, 
  Save,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye
} from 'lucide-react';

interface ModerationSettings {
  auto_moderation_enabled: boolean;
  word_filter_enabled: boolean;
  require_approval: boolean;
  spam_detection: boolean;
  banned_words: string[];
}

interface PendingContent {
  id: string;
  type: 'comment' | 'manga' | 'chapter';
  content: string;
  user: {
    display_name: string | null;
    email: string | null;
  };
  created_at: string;
  status: 'pending' | 'approved' | 'rejected';
}

const ContentModeration = () => {
  const { toast } = useToast();
  const [settings, setSettings] = useState<ModerationSettings>({
    auto_moderation_enabled: false,
    word_filter_enabled: true,
    require_approval: false,
    spam_detection: true,
    banned_words: []
  });
  const [newBannedWord, setNewBannedWord] = useState('');
  const [pendingContent, setPendingContent] = useState<PendingContent[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadModerationSettings();
    loadPendingContent();
  }, []);

  const loadModerationSettings = async () => {
    try {
      // هذا مثال لكيفية تحميل الإعدادات
      // في التطبيق الحقيقي ستحتاج لتخزين هذه الإعدادات في قاعدة البيانات
      const savedSettings = localStorage.getItem('moderation_settings');
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }
    } catch (error) {
      console.error('Error loading moderation settings:', error);
    }
  };

  const saveModerationSettings = async () => {
    setLoading(true);
    try {
      // حفظ الإعدادات في التخزين المحلي (يمكن تحسينه لاحقاً لحفظها في قاعدة البيانات)
      localStorage.setItem('moderation_settings', JSON.stringify(settings));
      
      toast({
        title: 'تم حفظ الإعدادات',
        description: 'تم حفظ إعدادات الإشراف بنجاح'
      });
    } catch (error) {
      console.error('Error saving moderation settings:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في حفظ الإعدادات',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadPendingContent = async () => {
    try {
      // تحميل المحتوى المعلق للمراجعة
      const { data: comments } = await supabase
        .from('comments')
        .select(`
          id,
          content,
          created_at,
          user:profiles!comments_user_id_fkey (
            display_name,
            email
          )
        `)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(20);

      const pendingItems: PendingContent[] = (comments || []).map(comment => ({
        id: comment.id,
        type: 'comment' as const,
        content: comment.content,
        user: comment.user,
        created_at: comment.created_at,
        status: 'pending' as const
      }));

      setPendingContent(pendingItems);
    } catch (error) {
      console.error('Error loading pending content:', error);
    }
  };

  const addBannedWord = () => {
    if (!newBannedWord.trim()) return;
    
    const word = newBannedWord.trim().toLowerCase();
    if (!settings.banned_words.includes(word)) {
      setSettings(prev => ({
        ...prev,
        banned_words: [...prev.banned_words, word]
      }));
      setNewBannedWord('');
    }
  };

  const removeBannedWord = (word: string) => {
    setSettings(prev => ({
      ...prev,
      banned_words: prev.banned_words.filter(w => w !== word)
    }));
  };

  const approveContent = async (contentId: string) => {
    try {
      // هنا يمكن إضافة منطق الموافقة على المحتوى
      setPendingContent(prev => 
        prev.map(item => 
          item.id === contentId 
            ? { ...item, status: 'approved' }
            : item
        )
      );
      
      toast({
        title: 'تمت الموافقة',
        description: 'تمت الموافقة على المحتوى'
      });
    } catch (error) {
      console.error('Error approving content:', error);
    }
  };

  const rejectContent = async (contentId: string) => {
    try {
      // منطق رفض المحتوى وحذفه
      await supabase
        .from('comments')
        .update({ 
          is_deleted: true,
          deleted_reason: 'رفض من قبل الإدارة'
        })
        .eq('id', contentId);

      setPendingContent(prev => 
        prev.filter(item => item.id !== contentId)
      );
      
      toast({
        title: 'تم الرفض',
        description: 'تم رفض المحتوى وحذفه'
      });
    } catch (error) {
      console.error('Error rejecting content:', error);
    }
  };

  const checkForBannedWords = (text: string): boolean => {
    const lowerText = text.toLowerCase();
    return settings.banned_words.some(word => 
      lowerText.includes(word.toLowerCase())
    );
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="settings" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="settings">الإعدادات العامة</TabsTrigger>
          <TabsTrigger value="words">فلترة الكلمات</TabsTrigger>
          <TabsTrigger value="review">مراجعة المحتوى</TabsTrigger>
        </TabsList>

        {/* الإعدادات العامة */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                إعدادات الإشراف
              </CardTitle>
              <CardDescription>
                إدارة إعدادات المراقبة والإشراف على المحتوى
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>تفعيل الإشراف التلقائي</Label>
                  <p className="text-sm text-muted-foreground">
                    مراجعة المحتوى تلقائياً باستخدام خوارزميات الذكاء الاصطناعي
                  </p>
                </div>
                <Switch
                  checked={settings.auto_moderation_enabled}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, auto_moderation_enabled: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>فلترة الكلمات المحظورة</Label>
                  <p className="text-sm text-muted-foreground">
                    منع الكلمات والعبارات غير المناسبة تلقائياً
                  </p>
                </div>
                <Switch
                  checked={settings.word_filter_enabled}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, word_filter_enabled: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>م��اجعة إلزامية للتعليقات</Label>
                  <p className="text-sm text-muted-foreground">
                    جميع التعليقات تحتاج موافقة الإدارة قبل النشر
                  </p>
                </div>
                <Switch
                  checked={settings.require_approval}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, require_approval: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>كشف الرسائل المزعجة</Label>
                  <p className="text-sm text-muted-foreground">
                    اكتشاف وحجب الرسائل المزعجة والمحتوى المكرر
                  </p>
                </div>
                <Switch
                  checked={settings.spam_detection}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, spam_detection: checked }))
                  }
                />
              </div>

              <div className="pt-4">
                <Button onClick={saveModerationSettings} disabled={loading}>
                  <Save className="h-4 w-4 mr-2" />
                  حفظ الإعدادات
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* فلترة الكلمات */}
        <TabsContent value="words" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                قائمة الكلمات المحظورة
              </CardTitle>
              <CardDescription>
                إدارة الكلمات والعبارات التي يتم حجبها تلقائياً
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={newBannedWord}
                  onChange={(e) => setNewBannedWord(e.target.value)}
                  placeholder="أضف كلمة محظورة..."
                  onKeyDown={(e) => e.key === 'Enter' && addBannedWord()}
                />
                <Button onClick={addBannedWord}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-2">
                <Label>الكلمات المحظورة ({settings.banned_words.length})</Label>
                {settings.banned_words.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    لا توجد كلمات محظورة
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {settings.banned_words.map((word, index) => (
                      <Badge key={index} variant="destructive" className="flex items-center gap-1">
                        {word}
                        <button
                          onClick={() => removeBannedWord(word)}
                          className="ml-1 hover:bg-destructive-foreground/20 rounded-full p-0.5"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-4">
                <Button onClick={saveModerationSettings}>
                  <Save className="h-4 w-4 mr-2" />
                  حفظ قائمة الكلمات
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* مراجعة المحتوى */}
        <TabsContent value="review" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                المحتوى المعلق للمراجعة
              </CardTitle>
              <CardDescription>
                مراجعة والموافقة على المحتوى المرسل من المستخدمين
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pendingContent.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>لا يوجد محتوى معلق للمراجعة</p>
                  </div>
                ) : (
                  pendingContent.map((item) => (
                    <div key={item.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{item.type}</Badge>
                          <span className="text-sm text-muted-foreground">
                            بواسطة: {item.user.display_name || item.user.email}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(item.created_at).toLocaleString('ar')}
                        </span>
                      </div>

                      <div className="bg-muted p-3 rounded">
                        <p className="text-sm">{item.content}</p>
                      </div>

                      {checkForBannedWords(item.content) && (
                        <div className="flex items-center gap-2 text-destructive text-sm">
                          <AlertTriangle className="h-4 w-4" />
                          يحتوي على كلمات محظورة
                        </div>
                      )}

                      {item.status === 'pending' && (
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            onClick={() => approveContent(item.id)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            موافقة
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => rejectContent(item.id)}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            رفض
                          </Button>
                        </div>
                      )}

                      {item.status !== 'pending' && (
                        <Badge 
                          variant={item.status === 'approved' ? 'default' : 'destructive'}
                        >
                          {item.status === 'approved' ? 'تمت الموافقة' : 'مرفوض'}
                        </Badge>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ContentModeration;
