import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Ban, 
  UserCheck, 
  Search,
  Users,
  AlertTriangle
} from 'lucide-react';
import { useUserManagement } from '@/hooks/useUserManagement';
import { useUserRestrictions, RestrictionType } from '@/hooks/useUserRestrictions';
import { UserRole, getRoleDisplayName, getRoleColor } from '@/types/user';
import RestrictionsMenu from '../RestrictionsMenu';

const LimitedUserManagement = () => {
  const {
    users,
    loading: usersLoading,
    banUser,
    unbanUser
  } = useUserManagement();

  const {
    restrictions,
    addRestriction,
    removeRestriction,
    getUserRestrictions
  } = useUserRestrictions();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole | 'all'>('all');

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = selectedRole === 'all' || user.role === selectedRole;
    return matchesSearch && matchesRole;
  });

  const handleBanUser = async (userId: string, reason: string) => {
    await banUser(userId, reason, 'temporary', undefined);
  };

  const handleUnbanUser = async (userId: string) => {
    await unbanUser(userId);
  };

  if (usersLoading) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">جاري التحميل...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* معلومات الصلاحيات */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            <div>
              <h3 className="font-medium">صلاحيات محدودة</h3>
              <p className="text-sm text-muted-foreground">
                كقائد قبيلة، يمكنك حظر وتقييد المستخدمين فقط. لا يمكنك تغيير الرتب أو حذف الحسابات.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* فلترة وبحث */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            إدارة المستخدمين (محدود)
          </CardTitle>
          <CardDescription>
            يمكنك حظر المستخدمين المسيئين وتطبيق قيود عليهم
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="ابحث عن مستخدم..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10"
              />
            </div>
          </div>

          {/* قائمة المستخدمين */}
          <div className="space-y-4">
            {filteredUsers.map((user) => (
              <Card key={user.user_id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Avatar>
                      <AvatarImage src={user.avatar_url} />
                      <AvatarFallback>
                        {(user.display_name || user.email)?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{user.display_name || 'مستخدم'}</h3>
                        <Badge className={getRoleColor(user.role as UserRole)} variant="secondary">
                          {getRoleDisplayName(user.role as UserRole)}
                        </Badge>
                        {(user.is_banned) && (
                          <Badge variant="destructive">محظور</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                      <p className="text-xs text-muted-foreground">
                        انضم في: {new Date(user.created_at).toLocaleDateString('ar')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* قائمة القيود */}
                    <RestrictionsMenu
                      userId={user.user_id}
                      userName={user.display_name || user.email || 'مستخدم'}
                      addRestriction={addRestriction}
                      removeRestriction={removeRestriction}
                      getUserRestrictions={getUserRestrictions}
                    />

                    {/* أزرار الحظر */}
                    {user.is_banned ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUnbanUser(user.user_id)}
                      >
                        <UserCheck className="h-4 w-4 mr-2" />
                        إلغاء الحظر
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleBanUser(user.user_id, "سلوك مسيء")}
                      >
                        <Ban className="h-4 w-4 mr-2" />
                        حظر مؤقت
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}

            {filteredUsers.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>لا توجد نتائج للبحث</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* إرشادات */}
      <Card>
        <CardHeader>
          <CardTitle>إرشادات الاستخدام</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>• يمكنك حظر المستخدمين المسيئين مؤقتاً</p>
            <p>• يمكنك تطبيق قيود مختلفة (حظر التعليقات، القراءة، الرفع)</p>
            <p>• لا يمكنك تغيير رتب المستخدمين أو حذف حساباتهم</p>
            <p>• للمساعدة في إجراءات أكثر تقدماً، تواصل مع المديرين</p>
            <p>• جميع إجراءاتك مسجلة ومراقبة</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LimitedUserManagement;
