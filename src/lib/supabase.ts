import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Server-side Supabase client with service role key for storage operations
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

/**
 * Upload a file buffer to Supabase Storage and return the public URL.
 */
export async function uploadToSupabase(
  bucket: string,
  filename: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  const { error } = await supabaseAdmin.storage
    .from(bucket)
    .upload(filename, buffer, {
      contentType,
      upsert: true,
    });

  if (error) {
    console.error(`Supabase upload error (${bucket}/${filename}):`, error);
    throw new Error(`Failed to upload to Supabase: ${error.message}`);
  }

  const { data: urlData } = supabaseAdmin.storage
    .from(bucket)
    .getPublicUrl(filename);

  return urlData.publicUrl;
}
