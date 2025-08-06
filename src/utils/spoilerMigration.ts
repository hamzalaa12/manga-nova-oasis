import { supabase } from '@/integrations/supabase/client';

export const addSpoilerColumnToComments = async () => {
  try {
    // First, check if column exists
    const { data: columns } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'comments')
      .eq('column_name', 'is_spoiler');

    if (columns && columns.length > 0) {
      console.log('is_spoiler column already exists');
      return true;
    }

    // Since we can't run DDL directly, we'll need admin to run this manually
    console.log('Please run this SQL manually in your database:');
    console.log(`
      ALTER TABLE comments ADD COLUMN IF NOT EXISTS is_spoiler BOOLEAN DEFAULT FALSE;
      CREATE INDEX IF NOT EXISTS idx_comments_spoiler ON comments(is_spoiler) WHERE is_spoiler = true;
      UPDATE comments SET is_spoiler = FALSE WHERE is_spoiler IS NULL;
    `);
    
    return false;
  } catch (error) {
    console.error('Error checking for spoiler column:', error);
    return false;
  }
};
