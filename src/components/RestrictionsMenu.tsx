import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { ShieldAlert, MessageSquareOff, BookOpen, Upload, Shield } from 'lucide-react';
import { RestrictionType } from '@/hooks/useUserRestrictions';

interface RestrictionsMenuProps {
  userId: string;
  userName: string;
  addRestriction: (userId: string, type: RestrictionType, reason: string, expiresAt?: string) => Promise<boolean>;
  removeRestriction: (userId: string, type: RestrictionType) => Promise<boolean>;
  getUserRestrictions: (userId: string) => Promise<RestrictionType[]>;
}

const RestrictionsMenu = ({
  userId,
  userName,
  addRestriction,
  removeRestriction,
  getUserRestrictions
}: RestrictionsMenuProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedRestriction, setSelectedRestriction] = useState<RestrictionType>('comment_ban');
  const [reason, setReason] = useState('');
  const [duration, setDuration] = useState('7'); // days
  const [isPermanent, setIsPermanent] = useState(false);
  const [currentRestrictions, setCurrentRestrictions] = useState<RestrictionType[]>([]);
  const [isRemoving, setIsRemoving] = useState(false);
  const [restrictionToRemove, setRestrictionToRemove] = useState<RestrictionType | null>(null);

  const restrictionOptions = [
    { value: 'comment_ban', label: 'منع التعليق', icon: MessageSquareOff, color: 'bg-yellow-500' },
    { value: 'read_ban', label: 'منع القراءة', icon: BookOpen, color: 'bg-orange-500' },
    { value: 'upload_ban', label: 'منع الرفع', icon: UploadX, color: 'bg-red-500' },
    { value: 'complete_ban', label: 'حظر كامل', icon: ShieldX, color: 'bg-red-700' },
  ];

  useEffect(() => {
    loadUserRestrictions();
  }, [userId]);

  const loadUserRestrictions = async () => {
    try {
      const restrictions = await getUserRestrictions(userId);
      setCurrentRestrictions(restrictions);
    } catch (error) {
      console.error('Error loading user restrictions:', error);
    }
  };

  const handleAddRestriction = async () => {
    if (!reason.trim()) return;

    const expiresAt = isPermanent ? undefined : 
      new Date(Date.now() + parseInt(duration) * 24 * 60 * 60 * 1000).toISOString();

    const success = await addRestriction(userId, selectedRestriction, reason, expiresAt);
    if (success) {
      setIsDialogOpen(false);
      setReason('');
      await loadUserRestrictions();
    }
  };

  const handleRemoveRestriction = async (restrictionType: RestrictionType) => {
    const success = await removeRestriction(userId, restrictionType);
    if (success) {
      await loadUserRestrictions();
    }
    setIsRemoving(false);
    setRestrictionToRemove(null);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="outline" className="relative">
            <ShieldAlert className="h-4 w-4" />
            {currentRestrictions.length > 0 && (
              <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 text-xs bg-red-500">
                {currentRestrictions.length}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-64">
          <div className="p-2">
            <h4 className="font-medium text-sm mb-2">قيود المستخدم: {userName}</h4>
            
            {currentRestrictions.length > 0 ? (
              <>
                <div className="space-y-1 mb-2">
                  {currentRestrictions.map((restriction) => {
                    const option = restrictionOptions.find(opt => opt.value === restriction);
                    const Icon = option?.icon || ShieldAlert;
                    return (
                      <div key={restriction} className="flex items-center justify-between p-1 rounded bg-muted">
                        <div className="flex items-center gap-2">
                          <Icon className="h-3 w-3" />
                          <span className="text-xs">{option?.label}</span>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={() => {
                            setRestrictionToRemove(restriction);
                            setIsRemoving(true);
                          }}
                        >
                          ✕
                        </Button>
                      </div>
                    );
                  })}
                </div>
                <DropdownMenuSeparator />
              </>
            ) : (
              <p className="text-xs text-muted-foreground mb-2">لا توجد قيود</p>
            )}
            
            <DropdownMenuItem onClick={() => setIsDialogOpen(true)}>
              <ShieldAlert className="h-4 w-4 mr-2" />
              إضافة قيد جديد
            </DropdownMenuItem>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Add Restriction Dialog */}
      <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>إضافة قيد للمستخدم</AlertDialogTitle>
            <AlertDialogDescription>
              إضافة قيد جديد للمستخدم: {userName}
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>نوع القيد</Label>
              <Select value={selectedRestriction} onValueChange={(value) => setSelectedRestriction(value as RestrictionType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {restrictionOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        <option.icon className="h-4 w-4" />
                        {option.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>سبب القيد</Label>
              <Input 
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="أدخل سبب القيد..."
              />
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  id="temporary-restriction"
                  checked={!isPermanent}
                  onChange={() => setIsPermanent(false)}
                />
                <Label htmlFor="temporary-restriction">مؤقت</Label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  id="permanent-restriction"
                  checked={isPermanent}
                  onChange={() => setIsPermanent(true)}
                />
                <Label htmlFor="permanent-restriction">دائم</Label>
              </div>
            </div>

            {!isPermanent && (
              <div>
                <Label>مدة القيد (بالأيام)</Label>
                <Input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  min="1"
                  max="365"
                />
              </div>
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDialogOpen(false)}>إلغاء</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleAddRestriction}
              disabled={!reason.trim()}
              className="bg-orange-600 text-white hover:bg-orange-700"
            >
              إضافة القيد
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remove Restriction Confirmation */}
      <AlertDialog open={isRemoving} onOpenChange={setIsRemoving}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>رفع القيد</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأ��د من رغبتك في رفع هذا القيد عن المستخدم؟
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsRemoving(false)}>إلغاء</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => restrictionToRemove && handleRemoveRestriction(restrictionToRemove)}
              className="bg-green-600 text-white hover:bg-green-700"
            >
              رفع القيد
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default RestrictionsMenu;
