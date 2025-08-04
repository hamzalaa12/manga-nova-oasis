import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  MessageSquare, 
  Reply, 
  Edit, 
  Trash2, 
  Pin, 
  PinOff, 
  Flag, 
  Ban,
  MoreHorizontal,
  Send,
  Calendar,
  Crown,
  Shield
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useComments, Comment } from '@/hooks/useComments';
import { useAuth } from '@/hooks/useAuth';
import { useReports } from '@/hooks/useReports';
import { getUserRoleIcon, getRoleDisplayName, getRoleColor } from '@/types/user';
import ReportDialog from './ReportDialog';

interface AdvancedCommentsProps {
  mangaId: string;
  chapterId?: string;
  className?: string;
}

const AdvancedComments = ({ mangaId, chapterId, className }: AdvancedCommentsProps) => {
  const { user } = useAuth();
  const { 
    comments, 
    loading, 
    permissions, 
    addComment, 
    editComment, 
    deleteComment, 
    pinComment 
  } = useComments(mangaId, chapterId);
  
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [deleteReason, setDeleteReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmitComment = async () => {
    if (!newComment.trim() || submitting) return;

    setSubmitting(true);
    const success = await addComment(newComment, replyingTo || undefined);
    if (success) {
      setNewComment('');
      setReplyingTo(null);
    }
    setSubmitting(false);
  };

  const handleEditSubmit = async (commentId: string) => {
    if (!editContent.trim() || submitting) return;

    setSubmitting(true);
    const success = await editComment(commentId, editContent);
    if (success) {
      setEditingComment(null);
      setEditContent('');
    }
    setSubmitting(false);
  };

  const handleDeleteComment = async (commentId: string) => {
    if (submitting) return;

    setSubmitting(true);
    await deleteComment(commentId, deleteReason || undefined);
    setDeleteReason('');
    setSubmitting(false);
  };

  const startEdit = (comment: Comment) => {
    setEditingComment(comment.id);
    setEditContent(comment.content);
  };

  const cancelEdit = () => {
    setEditingComment(null);
    setEditContent('');
  };

  const CommentItem = ({ comment, isReply = false }: { comment: Comment; isReply?: boolean }) => {
    const isEditing = editingComment === comment.id;

    return (
      <div className={`space-y-3 ${isReply ? 'mr-8 border-r border-muted pr-4' : ''}`}>
        <div className="flex items-start gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={comment.user.avatar_url || undefined} />
            <AvatarFallback>
              {(comment.user.display_name || comment.user.email)?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">
                {comment.user.display_name || 'مستخدم'}
              </span>
              <Badge 
                variant="secondary" 
                className={`text-xs ${getRoleColor(comment.user.role)}`}
              >
                {getRoleDisplayName(comment.user.role)}
              </Badge>
              {comment.is_pinned && (
                <Badge variant="default" className="text-xs">
                  <Pin className="h-3 w-3 mr-1" />
                  مثبت
                </Badge>
              )}
              <span className="text-xs text-muted-foreground">
                {new Date(comment.created_at).toLocaleString('ar')}
              </span>
              {comment.updated_at !== comment.created_at && (
                <span className="text-xs text-muted-foreground">(معدل)</span>
              )}
            </div>

            {isEditing ? (
              <div className="space-y-2">
                <Textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  placeholder="اكتب تعليقك..."
                  className="min-h-[80px]"
                />
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    onClick={() => handleEditSubmit(comment.id)}
                    disabled={!editContent.trim() || submitting}
                  >
                    حفظ
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={cancelEdit}
                    disabled={submitting}
                  >
                    إلغاء
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-sm leading-relaxed">{comment.content}</p>
                
                <div className="flex items-center gap-2">
                  {!isReply && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setReplyingTo(comment.id)}
                      className="text-xs h-7"
                    >
                      <Reply className="h-3 w-3 mr-1" />
                      رد ({comment.reply_count || 0})
                    </Button>
                  )}

                  {(comment.can_edit || comment.can_delete || comment.can_pin) && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                          <MoreHorizontal className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {comment.can_edit && (
                          <DropdownMenuItem onClick={() => startEdit(comment)}>
                            <Edit className="h-4 w-4 mr-2" />
                            تعديل
                          </DropdownMenuItem>
                        )}
                        
                        {comment.can_pin && (
                          <DropdownMenuItem 
                            onClick={() => pinComment(comment.id, !comment.is_pinned)}
                          >
                            {comment.is_pinned ? (
                              <>
                                <PinOff className="h-4 w-4 mr-2" />
                                إلغاء التثبيت
                              </>
                            ) : (
                              <>
                                <Pin className="h-4 w-4 mr-2" />
                                تثبيت
                              </>
                            )}
                          </DropdownMenuItem>
                        )}

                        {comment.can_report && (
                          <>
                            <DropdownMenuSeparator />
                            <ReportDialog
                              type="comment"
                              targetId={comment.id}
                              reportedUserId={comment.user_id}
                            >
                              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                <Flag className="h-4 w-4 mr-2" />
                                إبلاغ
                              </DropdownMenuItem>
                            </ReportDialog>
                          </>
                        )}

                        {comment.can_delete && (
                          <>
                            <DropdownMenuSeparator />
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem 
                                  onSelect={(e) => e.preventDefault()}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  حذف
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>حذف التعليق</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    هل أنت متأكد من حذف هذا التعليق؟ هذا الإجراء لا يمكن التراجع عنه.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                
                                {permissions.canModerate && (
                                  <div className="space-y-2">
                                    <Label htmlFor="deleteReason">سبب الحذف (اختياري)</Label>
                                    <Input
                                      id="deleteReason"
                                      value={deleteReason}
                                      onChange={(e) => setDeleteReason(e.target.value)}
                                      placeholder="اذكر سبب حذف التعليق..."
                                    />
                                  </div>
                                )}

                                <AlertDialogFooter>
                                  <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteComment(comment.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    حذف التعليق
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* الردود */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="space-y-3">
            {comment.replies.map((reply) => (
              <CommentItem key={reply.id} comment={reply} isReply={true} />
            ))}
          </div>
        )}

        {/* نموذج الرد */}
        {replyingTo === comment.id && (
          <div className="mr-8 space-y-2">
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={`الرد على ${comment.user.display_name || 'المستخدم'}...`}
              className="min-h-[80px]"
            />
            <div className="flex gap-2">
              <Button 
                size="sm" 
                onClick={handleSubmitComment}
                disabled={!newComment.trim() || submitting}
              >
                <Send className="h-4 w-4 mr-1" />
                إرسال الرد
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => {
                  setReplyingTo(null);
                  setNewComment('');
                }}
                disabled={submitting}
              >
                إلغاء
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          التعليقات ({comments.length})
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* نموذج إضافة تعليق جديد */}
        {permissions.canComment && !replyingTo && (
          <div className="space-y-3">
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="اكتب تعليقك هنا..."
              className="min-h-[100px]"
            />
            <div className="flex justify-between items-center">
              <p className="text-xs text-muted-foreground">
                شارك رأيك بأدب واحترام
              </p>
              <Button 
                onClick={handleSubmitComment}
                disabled={!newComment.trim() || submitting}
              >
                <Send className="h-4 w-4 mr-1" />
                إضافة تعليق
              </Button>
            </div>
          </div>
        )}

        {/* قائمة التعليقات */}
        <div className="space-y-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">جاري تحميل التعليقات...</p>
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>لا توجد تعليقات بعد</p>
              <p className="text-sm">كن أول من يعلق!</p>
            </div>
          ) : (
            comments.map((comment) => (
              <CommentItem key={comment.id} comment={comment} />
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default AdvancedComments;
