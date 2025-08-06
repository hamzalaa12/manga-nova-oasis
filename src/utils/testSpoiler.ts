// Test file to verify spoiler functionality
// This file can be used to test the new comment features

import { supabase } from '@/integrations/supabase/client';

export const testSpoilerComments = async () => {
  try {
    // Test query to see current comments structure
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .limit(1);

    if (error) {
      console.error('Error fetching comments:', error);
      return;
    }

    console.log('Current comment structure:', data);
    
    // Check if is_spoiler column exists
    if (data && data.length > 0) {
      const comment = data[0];
      if ('is_spoiler' in comment) {
        console.log('✅ is_spoiler column exists');
      } else {
        console.log('❌ is_spoiler column missing - please run migration');
      }
    }
  } catch (error) {
    console.error('Test failed:', error);
  }
};
