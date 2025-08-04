import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Users, Flag, Ban, UserCheck, Shield, Trash2 } from 'lucide-react';
import { getRoleDisplayName, getRoleColor } from '@/types/user';

const AdminPanel = () => {
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const isAdmin = ['admin', 'site_admin'].includes(userRole as string);

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
      fetchReports();
    }
  }, [isAdmin]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('خطأ في جلب المستخدمين:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReports = async () => {
    try {
      const { data, error } = await supabase
        .from('reports')
        .select(`
          *,
          reporter:profiles!reports_reporter_id_fkey(display_name, email),
          reported_user:profiles!reports_reported_user_id_fkey(display_name, email)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReports(data || []);
    } catch (error) {
      console.error('خطأ في جلب البلاغات:', error);
    }
  };

  const changeUserRole = async (userId: string, newRole: string) => {
    try {
      const { error } = await supabase.rpc('change_user_role', {
        user_uuid: userId,
        role_name: newRole as any
      });

      if (error) throw error;

      toast({
        title: 'تم تحديث الرتبة',
        description: 'تم تغيير رتبة المستخدم بنجاح'
      });

      fetchUsers();
    } catch (error) {
      console.error('خطأ في تغيير الرتبة:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في تغيير رتبة المستخدم',
        variant: 'destructive'
      });
    }
  };

  const banUser = async (userId: string, duration: 'temporary' | 'permanent', reason: string) => {
    try {
      const expiresAt = duration === 'temporary' 
        ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() 
        : null;

      const { error } = await supabase
        .from('user_bans')
        .insert({
          user_id: userId,
          banned_by: user?.id,
          ban_type: duration,
          reason,
          expires_at: expiresAt
        });

      if (error) throw error;

      toast({
        title: 'تم حظر المستخدم',
        description: `تم حظر المستخدم ${duration === 'temporary' ? 'مؤقتاً' : 'نهائياً'}`
      });

      fetchUsers();
    } catch (error) {
      console.error('خطأ في حظر المستخدم:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في حظر المستخدم',
        variant: 'destructive'
      });
    }
  };

  const resolveReport = async (reportId: string, status: 'resolved' | 'dismissed') => {
    try {
      const { error } = await supabase
        .from('reports')
        .update({
          status,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', reportId);

      if (error) throw error;

      toast({
        title: 'تم تحديث البلاغ',
        description: `تم ${status === 'resolved' ? 'حل' : 'رفض'} البلاغ`
      });

      fetchReports();
    } catch (error) {
      console.error('خطأ في تحديث البلاغ:', error);
    }
  };

  if (!isAdmin) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="text-center py-8">
            <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">غير مخول</h2>
            <p className="text-muted-foreground">ليس لديك صلاحية للوصول لهذه الصفحة</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">لوحة الإدارة</h1>
        <p className="text-muted-foreground">إدارة المستخدمين والبلاغات</p>
      </div>

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            إدارة المستخدمين
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <Flag className="h-4 w-4" />
            البلاغات
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>المستخدمون المسجلون</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {users.map((userItem) => (
                  <div key={userItem.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium">{userItem.display_name || 'مستخدم'}</h3>
                        <Badge className={getRoleColor(userItem.role)}>
                          {getRoleDisplayName(userItem.role)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{userItem.email}</p>
                      <p className="text-xs text-muted-foreground">
                        انضم في: {new Date(userItem.created_at).toLocaleDateString('ar')}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {userRole === 'site_admin' && userItem.user_id !== user?.id && (
                        <Select
                          value={userItem.role}
                          onValueChange={(newRole) => changeUserRole(userItem.user_id, newRole)}
                        >
                          <SelectTrigger className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">مستخدم</SelectItem>
                            <SelectItem value="beginner_fighter">مقاتل مبتدئ</SelectItem>
                            <SelectItem value="elite_fighter">مقاتل نخبة</SelectItem>
                            <SelectItem value="tribe_leader">قائد القبيلة</SelectItem>
                            <SelectItem value="admin">مدير</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => banUser(userItem.user_id, 'temporary', 'حظر مؤقت من الإدارة')}
                      >
                        <Ban className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>البلاغات الواردة</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {reports.map((report) => (
                  <div key={report.id} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={report.status === 'pending' ? 'default' : 'secondary'}>
                            {report.status === 'pending' ? 'قيد المراجعة' : 
                             report.status === 'resolved' ? 'محلول' : 'مرفوض'}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {report.reason}
                          </span>
                        </div>
                        <p className="text-sm mb-2">{report.description}</p>
                        <p className="text-xs text-muted-foreground">
                          من: {report.reporter?.display_name || report.reporter?.email}
                        </p>
                      </div>
                      
                      {report.status === 'pending' && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => resolveReport(report.id, 'resolved')}
                          >
                            حل
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => resolveReport(report.id, 'dismissed')}
                          >
                            رفض
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPanel;