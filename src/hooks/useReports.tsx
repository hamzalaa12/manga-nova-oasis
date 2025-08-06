import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export interface Report {
  id: string;
  reason: string;
  description: string | null;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  reporter_id: string;
  reported_user_id: string | null;
  manga_id: string | null;
  comment_id: string | null;
  reporter: {
    display_name: string | null;
    email: string | null;
  };
  reported_user?: {
    display_name: string | null;
    email: string | null;
  };
  manga?: {
    title: string;
    slug: string | null;
  };
  comment?: {
    content: string;
  };
}

export type ReportType = 'manga' | 'comment' | 'user' | 'chapter';

export const useReports = () => {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [reports, setReports] = useState<Report[]>([]);
  const [stats, setStats] = useState({
    pending: 0,
    total: 0,
    resolved: 0
  });

  useEffect(() => {
    if (user && isAdmin) {
      loadReports();
      loadStats();
    }
  }, [user, isAdmin]);

  const loadReports = async () => {
    if (!isAdmin) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('reports')
        .select(`
          *,
          reporter:profiles!reports_reporter_id_fkey (
            display_name,
            email
          ),
          reported_user:profiles!reports_reported_user_id_fkey (
            display_name,
            email
          ),
          manga (
            title,
            slug
          ),
          comment:comments (
            content
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReports(data || []);
    } catch (error) {
      console.error('Error loading reports:', {
        message: error?.message || 'Unknown error',
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        error: JSON.stringify(error, null, 2)
      });
      toast({
        title: 'خطأ',
        description: 'فشل في تحميل الإبلاغات',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    if (!isAdmin) return;

    try {
      const [
        { count: pending },
        { count: total },
        { count: resolved }
      ] = await Promise.all([
        supabase
          .from('reports')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending'),
        supabase
          .from('reports')
          .select('*', { count: 'exact', head: true }),
        supabase
          .from('reports')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'resolved')
      ]);

      setStats({
        pending: pending || 0,
        total: total || 0,
        resolved: resolved || 0
      });
    } catch (error) {
      console.error('Error loading stats:', {
        message: error?.message || 'Unknown error',
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        error: JSON.stringify(error, null, 2)
      });
    }
  };

  const submitReport = async (
    type: ReportType,
    reason: string,
    description?: string,
    targetId?: string,
    reportedUserId?: string
  ): Promise<boolean> => {
    if (!user) {
      toast({
        title: 'خطأ',
        description: 'يجب تسجيل الدخول للإبلاغ',
        variant: 'destructive'
      });
      return false;
    }

    try {
      const reportData: any = {
        reporter_id: user.id,
        reason,
        description,
        status: 'pending'
      };

      // Set the appropriate foreign key based on report type
      switch (type) {
        case 'manga':
          reportData.manga_id = targetId;
          break;
        case 'comment':
          reportData.comment_id = targetId;
          break;
        case 'user':
          reportData.reported_user_id = reportedUserId || targetId;
          break;
      }

      const { error } = await supabase
        .from('reports')
        .insert(reportData);

      if (error) throw error;

      toast({
        title: 'تم الإبلاغ',
        description: 'تم إرسال إبلاغك بنجاح. سيتم مراجعته قريباً.'
      });

      return true;
    } catch (error) {
      console.error('Error submitting report:', {
        message: error?.message || 'Unknown error',
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        error: JSON.stringify(error, null, 2)
      });
      toast({
        title: 'خطأ',
        description: 'فشل في إرسال الإبلاغ',
        variant: 'destructive'
      });
      return false;
    }
  };

  const updateReportStatus = async (
    reportId: string,
    status: Report['status'],
    reviewNotes?: string
  ): Promise<boolean> => {
    if (!isAdmin || !user) return false;

    try {
      const { error } = await supabase
        .from('reports')
        .update({
          status,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', reportId);

      if (error) throw error;

      await loadReports();
      await loadStats();

      toast({
        title: 'تم تحديث الإبلاغ',
        description: `تم تحديث حالة الإبلاغ إلى ${getStatusText(status)}`
      });

      return true;
    } catch (error) {
      console.error('Error updating report status:', {
        message: error?.message || 'Unknown error',
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        error: JSON.stringify(error, null, 2)
      });
      toast({
        title: 'خطأ',
        description: 'فشل في تحديث حالة الإبلاغ',
        variant: 'destructive'
      });
      return false;
    }
  };

  const deleteReport = async (reportId: string): Promise<boolean> => {
    if (!isAdmin) return false;

    try {
      const { error } = await supabase
        .from('reports')
        .delete()
        .eq('id', reportId);

      if (error) throw error;

      await loadReports();
      await loadStats();

      toast({
        title: 'تم حذف الإبلاغ',
        description: 'تم حذف الإبلاغ بنجاح'
      });

      return true;
    } catch (error) {
      console.error('Error deleting report:', {
        message: error?.message || 'Unknown error',
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        error: JSON.stringify(error, null, 2)
      });
      toast({
        title: 'خطأ',
        description: 'فشل في حذف الإبلاغ',
        variant: 'destructive'
      });
      return false;
    }
  };

  const getStatusText = (status: Report['status']): string => {
    switch (status) {
      case 'pending': return 'قيد المراجعة';
      case 'reviewed': return 'تمت المراجعة';
      case 'resolved': return 'تم الحل';
      case 'dismissed': return 'مرفوض';
      default: return status;
    }
  };

  const getReasonText = (reason: string): string => {
    const reasons: { [key: string]: string } = {
      'inappropriate_content': 'محتوى غير مناسب',
      'spam': 'رسائل مزعجة',
      'harassment': 'تحرش',
      'copyright': 'انتهاك حقوق الطبع',
      'fake_information': 'معلومات مزيفة',
      'offensive_language': 'لغة مسيئة',
      'other': 'أخرى'
    };
    return reasons[reason] || reason;
  };

  return {
    reports,
    stats,
    loading,
    submitReport,
    updateReportStatus,
    deleteReport,
    getStatusText,
    getReasonText,
    refreshReports: loadReports,
    refreshStats: loadStats
  };
};
