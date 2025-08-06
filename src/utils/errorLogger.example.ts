// مثال على كيفية استخدام دوال تسجيل الأخطاء الجديدة

import { logError, logSupabaseError, getErrorMessage, isNetworkError, isAuthError, isPermissionError } from './errorLogger';

// مثال 1: استخدام logError للأخطاء العامة
const handleGeneralError = (error: any) => {
  logError('User profile update', error, { userId: 'user123', action: 'update_profile' });
};

// مثال 2: استخدام logSupabaseError للأخطاء الخاصة بـ Supabase
const handleSupabaseError = (error: any) => {
  logSupabaseError('Database query', error, { table: 'profiles', operation: 'select' });
};

// مثال 3: استخدام getErrorMessage لرسائل Toast
const showErrorToast = (error: any, toast: any) => {
  const message = getErrorMessage(error, 'فشل في تحميل البيانات');
  toast({
    title: 'خطأ',
    description: message,
    variant: 'destructive'
  });
};

// مثال 4: فحص أنواع الأخطاء المختلفة
const handleSpecificErrors = (error: any, toast: any) => {
  if (isNetworkError(error)) {
    toast({
      title: 'خطأ في الاتصال',
      description: 'تحقق من اتصالك بالإنترنت',
      variant: 'destructive'
    });
  } else if (isAuthError(error)) {
    toast({
      title: 'خطأ في المصادقة',
      description: 'يرجى تسجيل الدخول مرة أخرى',
      variant: 'destructive'
    });
  } else if (isPermissionError(error)) {
    toast({
      title: 'غير مخول',
      description: 'ليس لديك صلاحية لهذا الإجراء',
      variant: 'destructive'
    });
  } else {
    toast({
      title: 'خطأ',
      description: getErrorMessage(error),
      variant: 'destructive'
    });
  }
  
  // تسجيل الخطأ في جميع الحالات
  logError('Error handler', error, { 
    isNetwork: isNetworkError(error),
    isAuth: isAuthError(error), 
    isPermission: isPermissionError(error)
  });
};

// مثال 5: استخدام في try-catch
const exampleAsyncFunction = async () => {
  try {
    // ... some async operation
    throw new Error('Test error');
  } catch (error) {
    logError('Example function', error, { context: 'testing' });
    throw error; // re-throw if needed
  }
};

export {
  handleGeneralError,
  handleSupabaseError,
  showErrorToast,
  handleSpecificErrors,
  exampleAsyncFunction
};
