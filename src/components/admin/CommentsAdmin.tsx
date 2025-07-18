import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import {
  MessageCircle,
  Flag,
  Eye,
  EyeOff,
  Trash2,
  Edit,
  Ban,
  Plus,
  Shield,
  AlertTriangle,
} from "lucide-react";

const CommentsAdmin = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [newBannedWord, setNewBannedWord] = useState("");
  const [newBannedWordReplacement, setNewBannedWordReplacement] =
    useState("***");
  const [banUserForm, setBanUserForm] = useState({
    userId: "",
    reason: "",
    bannedUntil: "",
  });

  // جلب التعليقات المبلغ عنها
  const { data: reportedComments = [] } = useQuery({
    queryKey: ["admin-reported-comments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chapter_comments")
        .select(
          `
          *,
          profiles:user_id (display_name),
          chapters:chapter_id (id, chapter_number, manga:manga_id (title))
        `,
        )
        .eq("is_reported", true)
        .order("report_count", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // جلب جميع التعليقات
  const { data: allComments = [] } = useQuery({
    queryKey: ["admin-all-comments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chapter_comments")
        .select(
          `
          *,
          profiles:user_id (display_name),
          chapters:chapter_id (id, chapter_number, manga:manga_id (title))
        `,
        )
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      return data;
    },
  });

  // جلب الكلمات الممنوعة
  const { data: bannedWords = [] } = useQuery({
    queryKey: ["admin-banned-words"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("banned_words")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // جلب المستخدمين المحظورين
  const { data: bannedUsers = [] } = useQuery({
    queryKey: ["admin-banned-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("banned_users")
        .select(
          `
          *,
          profiles:user_id (display_name, email)
        `,
        )
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // حذف تعليق
  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase
        .from("chapter_comments")
        .update({ is_deleted: true })
        .eq("id", commentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-reported-comments"] });
      queryClient.invalidateQueries({ queryKey: ["admin-all-comments"] });
      toast({ title: "تم الحذف!", description: "تم حذف التعليق بنجاح" });
    },
  });

  // إخفاء/إظهار تعليق
  const toggleCommentVisibilityMutation = useMutation({
    mutationFn: async ({
      commentId,
      isHidden,
    }: {
      commentId: string;
      isHidden: boolean;
    }) => {
      const { error } = await supabase
        .from("chapter_comments")
        .update({ is_hidden: !isHidden })
        .eq("id", commentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-reported-comments"] });
      queryClient.invalidateQueries({ queryKey: ["admin-all-comments"] });
      toast({ title: "تم التحديث!", description: "تم تحديث حالة التعليق" });
    },
  });

  // إضافة كلمة ممنوعة
  const addBannedWordMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("banned_words").insert({
        word: newBannedWord.trim(),
        replacement: newBannedWordReplacement.trim(),
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-banned-words"] });
      setNewBannedWord("");
      setNewBannedWordReplacement("***");
      toast({ title: "تمت الإضافة!", description: "تم إضافة الكلمة الممنوعة" });
    },
  });

  // حظر مستخدم
  const banUserMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("banned_users").insert({
        user_id: banUserForm.userId,
        reason: banUserForm.reason,
        banned_until: banUserForm.bannedUntil || null,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-banned-users"] });
      setBanUserForm({ userId: "", reason: "", bannedUntil: "" });
      toast({ title: "تم الحظر!", description: "تم حظر المستخدم بنجاح" });
    },
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ar-SA");
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center gap-2 mb-6">
        <Shield className="h-6 w-6" />
        <h1 className="text-2xl font-bold">إدارة التعليقات</h1>
      </div>

      <Tabs defaultValue="reported" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="reported" className="flex items-center gap-2">
            <Flag className="h-4 w-4" />
            التعليقات المبلغ عنها ({reportedComments.length})
          </TabsTrigger>
          <TabsTrigger value="all" className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            جميع التعليقات
          </TabsTrigger>
          <TabsTrigger value="banned-words" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            الكلمات الممنوعة
          </TabsTrigger>
          <TabsTrigger value="banned-users" className="flex items-center gap-2">
            <Ban className="h-4 w-4" />
            المستخدمين المحظورين
          </TabsTrigger>
        </TabsList>

        {/* التعليقات المبلغ عنها */}
        <TabsContent value="reported">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Flag className="h-5 w-5 text-red-500" />
                التعليقات المبلغ عنها
              </CardTitle>
            </CardHeader>
            <CardContent>
              {reportedComments.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  لا توجد تعليقات مبلغ عنها
                </p>
              ) : (
                <div className="space-y-4">
                  {reportedComments.map((comment: any) => (
                    <div key={comment.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <span className="font-semibold">
                            {comment.profiles?.display_name || "مستخدم"}
                          </span>
                          <Badge variant="destructive" className="ml-2">
                            {comment.report_count} بلاغات
                          </Badge>
                          {comment.is_hidden && (
                            <Badge variant="secondary" className="ml-2">
                              مخفي
                            </Badge>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              toggleCommentVisibilityMutation.mutate({
                                commentId: comment.id,
                                isHidden: comment.is_hidden,
                              })
                            }
                          >
                            {comment.is_hidden ? (
                              <Eye className="h-4 w-4" />
                            ) : (
                              <EyeOff className="h-4 w-4" />
                            )}
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="sm">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>حذف التعليق</AlertDialogTitle>
                                <AlertDialogDescription>
                                  هل أنت متأكد من حذف هذا التعليق؟ لا يمكن
                                  التراجع عن هذا الإجراء.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() =>
                                    deleteCommentMutation.mutate(comment.id)
                                  }
                                >
                                  حذف
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                      <p className="text-gray-700 mb-2">{comment.content}</p>
                      <div className="text-sm text-gray-500">
                        في فصل: {comment.chapters?.manga?.title} - الفصل{" "}
                        {comment.chapters?.chapter_number}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* جميع التعليقات */}
        <TabsContent value="all">
          <Card>
            <CardHeader>
              <CardTitle>جميع التعليقات</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>المستخدم</TableHead>
                    <TableHead>المحتوى</TableHead>
                    <TableHead>الفصل</TableHead>
                    <TableHead>التاريخ</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allComments.map((comment: any) => (
                    <TableRow key={comment.id}>
                      <TableCell>
                        {comment.profiles?.display_name || "مستخدم"}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {comment.content}
                      </TableCell>
                      <TableCell>{comment.chapters?.manga?.title}</TableCell>
                      <TableCell>{formatDate(comment.created_at)}</TableCell>
                      <TableCell>
                        {comment.is_deleted && (
                          <Badge variant="destructive">محذوف</Badge>
                        )}
                        {comment.is_hidden && (
                          <Badge variant="secondary">مخفي</Badge>
                        )}
                        {comment.is_reported && (
                          <Badge variant="outline">مبلغ عنه</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              toggleCommentVisibilityMutation.mutate({
                                commentId: comment.id,
                                isHidden: comment.is_hidden,
                              })
                            }
                          >
                            {comment.is_hidden ? (
                              <Eye className="h-4 w-4" />
                            ) : (
                              <EyeOff className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() =>
                              deleteCommentMutation.mutate(comment.id)
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* الكلمات الممنوعة */}
        <TabsContent value="banned-words">
          <Card>
            <CardHeader>
              <CardTitle>إدارة الكلمات الممنوعة</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="كلمة ممنوعة"
                  value={newBannedWord}
                  onChange={(e) => setNewBannedWord(e.target.value)}
                />
                <Input
                  placeholder="البديل"
                  value={newBannedWordReplacement}
                  onChange={(e) => setNewBannedWordReplacement(e.target.value)}
                />
                <Button onClick={() => addBannedWordMutation.mutate()}>
                  <Plus className="h-4 w-4 mr-2" />
                  إضافة
                </Button>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الكلمة</TableHead>
                    <TableHead>البديل</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bannedWords.map((word: any) => (
                    <TableRow key={word.id}>
                      <TableCell>{word.word}</TableCell>
                      <TableCell>{word.replacement}</TableCell>
                      <TableCell>
                        <Badge
                          variant={word.is_active ? "default" : "secondary"}
                        >
                          {word.is_active ? "نشط" : "غير نشط"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="destructive" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* المستخدمين المحظورين */}
        <TabsContent value="banned-users">
          <Card>
            <CardHeader>
              <CardTitle>إدارة المستخدمين المحظورين</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Dialog>
                <DialogTrigger asChild>
                  <Button>
                    <Ban className="h-4 w-4 mr-2" />
                    حظر مستخدم جديد
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>حظر مستخدم</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Input
                      placeholder="معرف المستخدم"
                      value={banUserForm.userId}
                      onChange={(e) =>
                        setBanUserForm((prev) => ({
                          ...prev,
                          userId: e.target.value,
                        }))
                      }
                    />
                    <Textarea
                      placeholder="سبب الحظر"
                      value={banUserForm.reason}
                      onChange={(e) =>
                        setBanUserForm((prev) => ({
                          ...prev,
                          reason: e.target.value,
                        }))
                      }
                    />
                    <Input
                      type="datetime-local"
                      placeholder="تاريخ انتهاء الحظر (اختياري للحظر الدائم)"
                      value={banUserForm.bannedUntil}
                      onChange={(e) =>
                        setBanUserForm((prev) => ({
                          ...prev,
                          bannedUntil: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <DialogFooter>
                    <Button onClick={() => banUserMutation.mutate()}>
                      حظر المستخدم
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>المستخدم</TableHead>
                    <TableHead>السبب</TableHead>
                    <TableHead>تاريخ الحظر</TableHead>
                    <TableHead>ينتهي في</TableHead>
                    <TableHead>الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bannedUsers.map((user: any) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        {user.profiles?.display_name || "مستخدم"}
                      </TableCell>
                      <TableCell>{user.reason}</TableCell>
                      <TableCell>{formatDate(user.created_at)}</TableCell>
                      <TableCell>
                        {user.banned_until
                          ? formatDate(user.banned_until)
                          : "دائم"}
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm">
                          إلغاء الحظر
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CommentsAdmin;
