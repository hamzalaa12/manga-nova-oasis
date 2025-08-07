import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  AlertTriangle,
  Flag,
  Eye,
  EyeOff,
  Trash2,
  Edit,
  Ban,
  CheckCircle,
  XCircle,
  MoreHorizontal,
  User,
  Calendar,
  MessageSquare,
  Shield,
  Search,
  Filter
} from "lucide-react";
import { hasPermission } from "@/types/user";

interface Report {
  id: string;
  comment_id: string;
  user_id: string;
  reason: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  created_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
  resolution_note?: string;
  comment: {
    id: string;
    content: string;
    created_at: string;
    is_deleted: boolean;
    is_hidden: boolean;
    user_id: string;
    chapter_id: string;
    manga_id: string;
    profiles: {
      display_name: string;
      role: string;
    };
  };
  reporter: {
    display_name: string;
    role: string;
  };
}

interface BannedUser {
  id: string;
  user_id: string;
  reason: string;
  banned_until?: string;
  is_permanent: boolean;
  banned_by: string;
  created_at: string;
  profiles: {
    display_name: string;
    email: string;
    role: string;
  };
}

const CommentsModeration = () => {
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState("reports");
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [resolutionNote, setResolutionNote] = useState("");
  const [banReason, setBanReason] = useState("");
  const [banDuration, setBanDuration] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "reviewed">("pending");

  // التحقق من الصلاحيات
  const canModerate = hasPermission(userRole, "can_moderate_comments");
  const canBanUsers = hasPermission(userRole, "can_ban_users");

  if (!canModerate) {
    return (
      <div className="text-center py-8">
        <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground">ليس لديك صلاحية للوصول إلى هذه الصفحة</p>
      </div>
    );
  }

  // جلب البلاغات
  const { data: reports = [], isLoading: reportsLoading } = useQuery({
    queryKey: ["comment-reports", filterStatus, searchTerm],
    queryFn: async () => {
      let query = supabase
        .from("comment_reports")
        .select(`
          *,
          comment:comments!comment_reports_comment_id_fkey (
            id,
            content,
            created_at,
            is_deleted,
            is_hidden,
            user_id,
            chapter_id,
            manga_id,
            profiles!comments_user_id_fkey (display_name, role)
          ),
          reporter:profiles!comment_reports_user_id_fkey (display_name, role)
        `)
        .order("created_at", { ascending: false });

      if (filterStatus !== "all") {
        query = query.eq("status", filterStatus);
      }

      const { data, error } = await query;
      if (error) throw error;

      // فلترة البحث
      if (searchTerm) {
        return data.filter(report => 
          report.comment?.content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          report.reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
          report.reporter?.display_name?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      return data;
    },
    staleTime: 30 * 1000,
  });

  // جلب المستخدمين المحظورين
  const { data: bannedUsers = [], isLoading: bannedUsersLoading } = useQuery({
    queryKey: ["banned-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("banned_users")
        .select(`
          *,
          profiles!banned_users_user_id_fkey (display_name, email, role)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    staleTime: 60 * 1000,
  });

  // حل البلاغ
  const resolveReportMutation = useMutation({
    mutationFn: async ({ 
      reportId, 
      status, 
      action 
    }: { 
      reportId: string; 
      status: 'resolved' | 'dismissed'; 
      action?: 'hide' | 'delete' | 'ban';
    }) => {
      const report = reports.find(r => r.id === reportId);
      if (!report) throw new Error("تعذر العثور على البلاغ");

      // تحديث حالة البلاغ
      const { error: reportError } = await supabase
        .from("comment_reports")
        .update({
          status,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id,
          resolution_note: resolutionNote || null
        })
        .eq("id", reportId);

      if (reportError) throw reportError;

      // تنفيذ الإجراء المطلوب
      if (action === 'hide') {
        await supabase
          .from("comments")
          .update({ is_hidden: true })
          .eq("id", report.comment.id);
      } else if (action === 'delete') {
        await supabase
          .from("comments")
          .update({ 
            is_deleted: true,
            deleted_by: user?.id,
            deleted_reason: "حذف بسبب البلا��"
          })
          .eq("id", report.comment.id);
      } else if (action === 'ban' && canBanUsers) {
        const banUntil = banDuration ? 
          new Date(Date.now() + banDuration * 24 * 60 * 60 * 1000).toISOString() : 
          null;

        await supabase
          .from("banned_users")
          .insert({
            user_id: report.comment.user_id,
            reason: banReason || "انتهاك قوانين التعليقات",
            banned_until: banUntil,
            is_permanent: !banDuration,
            banned_by: user?.id
          });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comment-reports"] });
      queryClient.invalidateQueries({ queryKey: ["banned-users"] });
      setSelectedReport(null);
      setResolutionNote("");
      setBanReason("");
      setBanDuration(null);
      toast({
        title: "تم حل البلاغ",
        description: "تم معالجة البلاغ بنجاح",
      });
    },
    onError: (error: any) => {
      toast({
        title: "خطأ",
        description: error.message || "فشل في معالجة البلاغ",
        variant: "destructive",
      });
    },
  });

  // رفع الحظر عن المستخدم
  const unbanUserMutation = useMutation({
    mutationFn: async (banId: string) => {
      const { error } = await supabase
        .from("banned_users")
        .delete()
        .eq("id", banId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["banned-users"] });
      toast({
        title: "تم رفع الحظر",
        description: "تم رفع الحظر عن المستخدم بنجاح",
      });
    },
  });

  // إحصائيات البلاغات
  const reportStats = {
    pending: reports.filter(r => r.status === 'pending').length,
    resolved: reports.filter(r => r.status === 'resolved').length,
    dismissed: reports.filter(r => r.status === 'dismissed').length,
    total: reports.length
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500';
      case 'resolved': return 'bg-green-500';
      case 'dismissed': return 'bg-gray-500';
      default: return 'bg-blue-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'في الانتظار';
      case 'resolved': return 'تم الحل';
      case 'dismissed': return 'تم الرفض';
      default: return status;
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">إدارة التعليقات والبلاغات</h1>
        <p className="text-muted-foreground">مراجعة ومعالجة البلاغات المقدمة ضد التعليقات</p>
      </div>

      {/* إحصائيات سريعة */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-500/20 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">في الانتظار</p>
                <p className="text-2xl font-bold">{reportStats.pending}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">تم الحل</p>
                <p className="text-2xl font-bold">{reportStats.resolved}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-500/20 rounded-lg">
                <XCircle className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">تم الرفض</p>
                <p className="text-2xl font-bold">{reportStats.dismissed}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/20 rounded-lg">
                <Ban className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">محظورين</p>
                <p className="text-2xl font-bold">{bannedUsers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <Flag className="h-4 w-4" />
            البلاغات
          </TabsTrigger>
          <TabsTrigger value="banned" className="flex items-center gap-2">
            <Ban className="h-4 w-4" />
            المحظورين
          </TabsTrigger>
        </TabsList>

        <TabsContent value="reports" className="space-y-4">
          {/* أدوات البحث والفلترة */}
          <div className="flex gap-4 items-center">
            <div className="relative flex-1">
              <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="بحث في البلاغات..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Filter className="h-4 w-4 mr-2" />
                  {filterStatus === "all" ? "جميع البلاغات" : getStatusText(filterStatus)}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setFilterStatus("all")}>
                  جميع البلاغات
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterStatus("pending")}>
                  في الانتظار
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterStatus("reviewed")}>
                  تمت المراجعة
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* قائمة البلاغات */}
          <div className="space-y-4">
            {reportsLoading ? (
              <div className="text-center py-8">جاري التحميل...</div>
            ) : reports.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Flag className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>لا توجد بلاغات تطابق المعايير المحددة</p>
              </div>
            ) : (
              reports.map((report) => (
                <Card key={report.id} className="overflow-hidden">
                  <CardContent className="p-0">
                    <div className="flex">
                      {/* شريط الحالة */}
                      <div className={`w-1 ${getStatusColor(report.status)}`} />
                      
                      <div className="flex-1 p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className={getStatusColor(report.status).replace('bg-', 'border-')}>
                              {getStatusText(report.status)}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              <Calendar className="h-4 w-4 inline mr-1" />
                              {formatDate(report.created_at)}
                            </span>
                          </div>
                          
                          {report.status === 'pending' && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                <DropdownMenuItem
                                  onClick={() => setSelectedReport(report)}
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  مراجعة
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => resolveReportMutation.mutate({ 
                                    reportId: report.id, 
                                    status: 'dismissed' 
                                  })}
                                >
                                  <XCircle className="h-4 w-4 mr-2" />
                                  رفض البلاغ
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <h4 className="font-medium mb-2">التعليق المبلغ عنه:</h4>
                            <div className="bg-muted rounded-lg p-3 text-sm">
                              <p className="mb-2">{report.comment?.content}</p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <User className="h-3 w-3" />
                                {report.comment?.profiles?.display_name}
                                <Calendar className="h-3 w-3 ml-2" />
                                {formatDate(report.comment?.created_at)}
                              </div>
                            </div>
                          </div>

                          <div>
                            <h4 className="font-medium mb-2">سبب البلاغ:</h4>
                            <div className="bg-red-50 rounded-lg p-3 text-sm">
                              <p className="mb-2">{report.reason}</p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <User className="h-3 w-3" />
                                المبلغ: {report.reporter?.display_name}
                              </div>
                            </div>
                          </div>
                        </div>

                        {report.resolution_note && (
                          <div className="mt-4">
                            <h4 className="font-medium mb-2">ملاحظة الحل:</h4>
                            <p className="text-sm bg-green-50 rounded-lg p-3">{report.resolution_note}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="banned" className="space-y-4">
          <div className="space-y-4">
            {bannedUsersLoading ? (
              <div className="text-center py-8">جاري التحميل...</div>
            ) : bannedUsers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Ban className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>لا يوجد مستخدمين محظورين حالياً</p>
              </div>
            ) : (
              bannedUsers.map((ban) => (
                <Card key={ban.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{ban.profiles.display_name}</h4>
                        <p className="text-sm text-muted-foreground mb-2">{ban.profiles.email}</p>
                        <p className="text-sm">{ban.reason}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span>تاريخ الحظر: {formatDate(ban.created_at)}</span>
                          {ban.banned_until && (
                            <span>ينتهي في: {formatDate(ban.banned_until)}</span>
                          )}
                          {ban.is_permanent && (
                            <Badge variant="destructive">حظر دائم</Badge>
                          )}
                        </div>
                      </div>
                      
                      {canBanUsers && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => unbanUserMutation.mutate(ban.id)}
                        >
                          رفع الحظر
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* نموذج مراجعة البلاغ */}
      {selectedReport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>مراجعة البلاغ</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">التعليق المبلغ عنه:</h4>
                <div className="bg-muted rounded-lg p-3">
                  {selectedReport.comment?.content}
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">سبب البلاغ:</h4>
                <div className="bg-red-50 rounded-lg p-3">
                  {selectedReport.reason}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  ملاحظة الحل (اختيارية):
                </label>
                <Textarea
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  placeholder="اكتب ملاحظة حول قرار الحل..."
                  className="text-right"
                  dir="rtl"
                />
              </div>

              {canBanUsers && (
                <div className="space-y-3">
                  <h4 className="font-medium">إعدادات الحظر (اختيارية):</h4>
                  <Input
                    placeholder="سبب الحظر..."
                    value={banReason}
                    onChange={(e) => setBanReason(e.target.value)}
                    className="text-right"
                    dir="rtl"
                  />
                  <Input
                    type="number"
                    placeholder="مدة الحظر بالأيام (اتركه فارغاً للحظر الدائم)"
                    value={banDuration || ""}
                    onChange={(e) => setBanDuration(e.target.value ? parseInt(e.target.value) : null)}
                  />
                </div>
              )}

              <div className="flex gap-2 justify-end flex-wrap">
                <Button
                  variant="outline"
                  onClick={() => setSelectedReport(null)}
                >
                  إلغاء
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => resolveReportMutation.mutate({ 
                    reportId: selectedReport.id, 
                    status: 'dismissed' 
                  })}
                >
                  رفض البلاغ
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => resolveReportMutation.mutate({ 
                    reportId: selectedReport.id, 
                    status: 'resolved', 
                    action: 'hide' 
                  })}
                >
                  <EyeOff className="h-4 w-4 mr-2" />
                  إخفاء التعليق
                </Button>
                
                <Button
                  variant="destructive"
                  onClick={() => resolveReportMutation.mutate({ 
                    reportId: selectedReport.id, 
                    status: 'resolved', 
                    action: 'delete' 
                  })}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  حذف التعليق
                </Button>
                
                {canBanUsers && (
                  <Button
                    variant="destructive"
                    onClick={() => resolveReportMutation.mutate({ 
                      reportId: selectedReport.id, 
                      status: 'resolved', 
                      action: 'ban' 
                    })}
                    disabled={!banReason.trim()}
                  >
                    <Ban className="h-4 w-4 mr-2" />
                    حظر المستخدم
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default CommentsModeration;
