import { supabase } from "@/integrations/supabase/client";

export const initializeAdsTable = async () => {
  try {
    // Try to create the ads table if it doesn't exist
    const { error: createTableError } = await supabase.rpc('create_ads_table_if_not_exists');
    
    if (createTableError) {
      console.log('Table creation RPC not available, trying direct SQL...');
      
      // If RPC doesn't exist, try to query the table to check if it exists
      const { error: testError } = await supabase
        .from('ads')
        .select('count')
        .limit(1);
      
      if (testError) {
        throw new Error(`Ads table is not available: ${testError.message}`);
      }
    }
    
    return { success: true };
  } catch (error) {
    console.error('Failed to initialize ads table:', error);
    return { success: false, error };
  }
};

export const createSampleAds = async () => {
  try {
    const sampleAds = [
      {
        title: 'دعم الموقع',
        description: 'ادعم موقعنا للحصول على محتوى أفضل',
        url: 'https://ko-fi.com/mangafas',
        reward_points: 10,
        duration_seconds: 5,
        is_active: true,
        type: 'ad'
      },
      {
        title: 'رابط سريع',
        description: 'رابط مفيد للمستخدمين',
        url: 'https://example.com',
        reward_points: 0,
        duration_seconds: 0,
        is_active: true,
        type: 'link'
      },
      {
        title: 'متجر الكتب',
        description: 'اكتشف أفضل الكتب والمانجا',
        url: 'https://bookstore.example.com',
        image_url: 'https://via.placeholder.com/300x200?text=متجر+الكتب',
        reward_points: 5,
        duration_seconds: 3,
        is_active: true,
        type: 'ad'
      }
    ];

    const { error } = await supabase.from('ads').insert(sampleAds);
    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error creating sample ads:', error);
    return { success: false, error };
  }
};
