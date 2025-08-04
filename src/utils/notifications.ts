import { supabase } from '@/integrations/supabase/client';

export const createNotificationForAdmin = async (
  type: string,
  title: string,
  message: string,
  data?: any
) => {
  try {
    // البحث عن المدير
    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('role', 'site_admin')
      .single();

    if (!adminProfile) return;

    // استخدام user_notifications بدلاً من notifications
    const { error } = await supabase
      .from('user_notifications')
      .insert({
        user_id: adminProfile.user_id,
        type,
        title,
        message,
        data
      });

    if (error) throw error;
  } catch (error) {
    console.error('خطأ في إنشاء الإشعار:', error);
  }
};

export const notifyContentSubmission = async (
  submissionId: string,
  submissionType: 'manga' | 'chapter'
) => {
  const title = 'محتوى جديد يحتاج موافقة';
  const message = `تم إرسال ${submissionType === 'manga' ? 'مانجا' : 'فصل'} جديد ويحتاج إلى موافقتك`;
  
  await createNotificationForAdmin(
    'content_submission',
    title,
    message,
    { submissionId, submissionType }
  );
};

export const notifyNewChapterToSubscribers = async (
  mangaId: string,
  chapterNumber: number
) => {
  try {
    // الحصول على معلومات المانجا
    const { data: manga } = await supabase
      .from('manga')
      .select('title')
      .eq('id', mangaId)
      .single();

    if (!manga) return;

    // الحصول على المشتركين
    const { data: subscribers } = await supabase
      .from('notification_subscriptions')
      .select('user_id')
      .eq('manga_id', mangaId)
      .eq('notify_new_chapters', true);

    if (!subscribers || subscribers.length === 0) return;

    // إنشاء الإشعارات
    const notifications = subscribers.map(sub => ({
      user_id: sub.user_id,
      type: 'new_chapter',
      title: 'فصل جديد متاح!',
      message: `تم نشر الفصل ${chapterNumber} من ${manga.title}`,
      data: { mangaId, chapterNumber }
    }));

    const { error } = await supabase
      .from('user_notifications')
      .insert(notifications);

    if (error) throw error;
  } catch (error) {
    console.error('خطأ في إشعار المشتركين:', error);
  }
};

export const notifyNewUserRegistration = async (newUserId: string) => {
  // الحصول على معلومات المستخدم الجديد
  const { data: userProfile } = await supabase
    .from('profiles')
    .select('email, display_name')
    .eq('user_id', newUserId)
    .single();

  if (!userProfile) return;

  const title = 'مستخدم جديد سجل';
  const message = `انضم مستخدم جديد: ${userProfile.display_name || userProfile.email}`;
  
  await createNotificationForAdmin(
    'new_user_registration',
    title,
    message,
    { newUserId }
  );
};