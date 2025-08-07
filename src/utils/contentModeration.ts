/**
 * أداة فلترة المحتوى والكلمات المحظورة
 */

interface BannedWord {
  word: string;
  severity: 'mild' | 'moderate' | 'severe';
  replacement?: string;
}

// قائمة الكلمات المحظورة (يمكن تحديثها من قاعدة البيانات)
const bannedWords: BannedWord[] = [
  // كلمات خفيفة - تستبدل تلقائياً
  { word: 'غبي', severity: 'mild', replacement: '***' },
  { word: 'أحمق', severity: 'mild', replacement: '***' },
  
  // كلمات متوسطة - تحتاج موافقة
  { word: 'لعين', severity: 'moderate' },
  { word: 'قبيح', severity: 'moderate' },
  
  // كلمات شديدة - ترفض تماماً
  { word: 'نص محظور شديد', severity: 'severe' }
];

interface ModerationResult {
  isClean: boolean;
  severity: 'clean' | 'mild' | 'moderate' | 'severe';
  filteredContent: string;
  detectedWords: string[];
  needsManualReview: boolean;
}

/**
 * فحص المحتوى وفلترة الكلمات المحظورة
 */
export const moderateContent = (content: string): ModerationResult => {
  const detectedWords: string[] = [];
  let filteredContent = content;
  let maxSeverity: 'clean' | 'mild' | 'moderate' | 'severe' = 'clean';

  // تحويل النص إلى أحرف صغيرة للفحص
  const lowerContent = content.toLowerCase();

  bannedWords.forEach(bannedWord => {
    const word = bannedWord.word.toLowerCase();
    
    if (lowerContent.includes(word)) {
      detectedWords.push(bannedWord.word);
      
      // تحديد أقصى درجة خطورة
      if (bannedWord.severity === 'severe') {
        maxSeverity = 'severe';
      } else if (bannedWord.severity === 'moderate' && maxSeverity !== 'severe') {
        maxSeverity = 'moderate';
      } else if (bannedWord.severity === 'mild' && maxSeverity === 'clean') {
        maxSeverity = 'mild';
      }

      // استبدال الكلمات الخفيفة تلقائياً
      if (bannedWord.severity === 'mild' && bannedWord.replacement) {
        const regex = new RegExp(word, 'gi');
        filteredContent = filteredContent.replace(regex, bannedWord.replacement);
      }
    }
  });

  return {
    isClean: maxSeverity === 'clean',
    severity: maxSeverity,
    filteredContent,
    detectedWords,
    needsManualReview: maxSeverity === 'moderate' || maxSeverity === 'severe'
  };
};

/**
 * فحص سريع للتحقق من وجود كلمات محظورة
 */
export const hasProhibitedContent = (content: string): boolean => {
  const result = moderateContent(content);
  return result.severity === 'severe';
};

/**
 * تنظيف المحتوى من الكلمات المحظورة الخفيفة
 */
export const cleanContent = (content: string): string => {
  const result = moderateContent(content);
  return result.filteredContent;
};

/**
 * فحص طول المحتوى والتحقق من التكرار
 */
interface ContentValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export const validateCommentContent = (
  content: string,
  maxLength: number = 2000,
  minLength: number = 2
): ContentValidation => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // فحص الطول
  if (content.length < minLength) {
    errors.push(`التعليق قصير جداً (الحد الأدنى ${minLength} أحرف)`);
  }
  
  if (content.length > maxLength) {
    errors.push(`التعليق طويل جداً (الحد الأقصى ${maxLength} حرف)`);
  }

  // فحص التكرار المفرط
  const repeatedChars = /(.)\1{10,}/g;
  if (repeatedChars.test(content)) {
    warnings.push('يحتوي التعليق على تكرار مفرط للأحرف');
  }

  // فحص الأرقام والرموز الزائدة
  const numbersOnly = /^\d+$/;
  if (numbersOnly.test(content.trim())) {
    errors.push('لا يمكن أن يحتوي التعليق على أرقام فقط');
  }

  // فحص المسافات الزائدة
  const excessiveSpaces = /\s{5,}/g;
  if (excessiveSpaces.test(content)) {
    warnings.push('يحتوي التعليق على مسافات زائدة');
  }

  // فحص النص باللغة العربية (تحقق أساسي)
  const hasArabic = /[\u0600-\u06FF]/g.test(content);
  const hasOnlyEnglish = /^[a-zA-Z0-9\s.,!?]*$/g.test(content);
  
  if (!hasArabic && hasOnlyEnglish && content.length > 50) {
    warnings.push('يُفضل كتابة التعليقات باللغة العربية');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

/**
 * تقييم جودة التعليق
 */
export const scoreCommentQuality = (content: string): number => {
  let score = 100;

  // خصم نقاط للمشاكل
  const moderation = moderateContent(content);
  if (moderation.severity === 'mild') score -= 10;
  if (moderation.severity === 'moderate') score -= 30;
  if (moderation.severity === 'severe') score -= 100;

  const validation = validateCommentContent(content);
  score -= validation.errors.length * 20;
  score -= validation.warnings.length * 5;

  // إضافة نقاط للجودة
  if (content.length > 20 && content.length < 500) score += 10;
  if (/[.!?]$/.test(content.trim())) score += 5; // ينتهي بعلامة ترقيم
  if (/[\u0600-\u06FF]/.test(content)) score += 10; // يحتوي على عربي

  return Math.max(0, Math.min(100, score));
};

/**
 * اكتشاف السبام والمحتوى المتكرر
 */
export const detectSpam = (content: string, userHistory: string[] = []): boolean => {
  // فحص التكرار في تاريخ المستخدم
  const similarComments = userHistory.filter(previousComment => {
    const similarity = calculateSimilarity(content, previousComment);
    return similarity > 0.8; // 80% تشابه أو أكثر
  });

  if (similarComments.length > 0) {
    return true;
  }

  // فحص الروابط المشبوهة
  const suspiciousLinks = /(bit\.ly|tinyurl|t\.co)/gi;
  if (suspiciousLinks.test(content)) {
    return true;
  }

  // فحص الأرقام أو الرموز المتكررة
  const repeatedPatterns = /(.{3,})\1{3,}/gi;
  if (repeatedPatterns.test(content)) {
    return true;
  }

  return false;
};

/**
 * حساب التشابه بين نصين
 */
function calculateSimilarity(text1: string, text2: string): number {
  const longer = text1.length > text2.length ? text1 : text2;
  const shorter = text1.length > text2.length ? text2 : text1;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

/**
 * حساب مسافة Levenshtein للتشابه
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

/**
 * تصدير جميع الوظائف
 */
export {
  type BannedWord,
  type ModerationResult,
  type ContentValidation,
  bannedWords
};
