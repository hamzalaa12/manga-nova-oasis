/**
 * Utility function to properly log error objects
 * This prevents the "[object Object]" issue when logging errors
 */
export const logError = (context: string, error: any, additionalInfo?: any) => {
  console.error(`${context}:`, {
    message: error?.message || 'Unknown error',
    code: error?.code,
    details: error?.details,
    hint: error?.hint,
    status: error?.status,
    statusCode: error?.statusCode,
    additionalInfo,
    fullError: JSON.stringify(error, null, 2)
  });
};

/**
 * Utility function to log Supabase-specific errors with better formatting
 */
export const logSupabaseError = (context: string, error: any, additionalInfo?: any) => {
  console.error(`${context} [Supabase]:`, {
    message: error?.message || 'Unknown error',
    code: error?.code,
    details: error?.details,
    hint: error?.hint,
    statusCode: error?.statusCode,
    additionalInfo,
    fullError: JSON.stringify(error, null, 2)
  });
};

/**
 * Utility function to create toast-friendly error messages
 */
export const getErrorMessage = (error: any, fallback: string = 'حدث خطأ غير متوقع'): string => {
  if (error?.message) {
    return error.message;
  }
  
  if (error?.hint) {
    return error.hint;
  }
  
  if (error?.details) {
    return error.details;
  }
  
  return fallback;
};

/**
 * Check if error is a network/connection error
 */
export const isNetworkError = (error: any): boolean => {
  return error?.code === 'NETWORK_ERROR' || 
         error?.message?.includes('fetch') ||
         error?.message?.includes('network') ||
         !navigator.onLine;
};

/**
 * Check if error is an authentication error
 */
export const isAuthError = (error: any): boolean => {
  return error?.code === 'PGRST301' || 
         error?.message?.includes('JWT') ||
         error?.message?.includes('auth');
};

/**
 * Check if error is a permission error
 */
export const isPermissionError = (error: any): boolean => {
  return error?.code === 'PGRST103' || 
         error?.message?.includes('permission') ||
         error?.message?.includes('RLS');
};
