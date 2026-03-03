import { supabase } from './supabase';

const STORAGE_PROVIDER = import.meta.env.VITE_STORAGE_PROVIDER || 'supabase';
const LOCAL_MEDIA_URL = import.meta.env.VITE_LOCAL_MEDIA_URL || 'http://localhost:8000/media/';

export interface UploadResult {
    url: string;
    error?: string;
}

/**
 * Uploads a file to the configured storage provider.
 * Usage: const { url } = await StorageService.uploadFile(file, 'colleges', 'logo.png');
 */
export const StorageService = {
    async uploadFile(file: File, folder: string, filename?: string): Promise<UploadResult> {
        try {
            const ext = file.name.split('.').pop() || '';
            const name = filename || `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
            const path = `${folder}/${name}`;

            const bucket = folder === 'shorts' || folder === 'videos' ? 'videos' : 'images';

            if (STORAGE_PROVIDER === 'local') {
                console.log(`[Local Upload Simulation] Uploaded ${file.name} to ${path} in bucket ${bucket}`);
                return { url: `${LOCAL_MEDIA_URL}${bucket}/${path}` };
            }

            // Supabase upload logic
            const { data, error } = await supabase.storage
                .from(bucket)
                .upload(path, file, { cacheControl: '3600', upsert: false });

            if (error) {
                console.error('Supabase upload error:', error);
                return { error: error.message, url: '' };
            }

            // Get public URL
            const { data: publicUrlData } = supabase.storage
                .from(bucket)
                .getPublicUrl(data.path);

            return { url: publicUrlData.publicUrl };
        } catch (err: any) {
            console.error('StorageService.uploadFile error:', err);
            return { error: err.message || 'Unknown upload error', url: '' };
        }
    },

    /**
     * Helper to delete a file if needed.
     */
    async deleteFile(url: string, bucket: string = 'images'): Promise<boolean> {
        if (STORAGE_PROVIDER === 'local') {
            console.log(`[Local Delete Simulation] Deleted ${url}`);
            return true;
        }

        try {
            const bucketToUse = url.includes('/videos/') ? 'videos' : bucket;
            const urlParts = url.split(`/${bucketToUse}/`);
            if (urlParts.length === 2) {
                const path = urlParts[1];
                const { error } = await supabase.storage.from(bucketToUse).remove([path]);
                if (error) throw error;
            }
            return true;
        } catch (err) {
            console.error('StorageService.deleteFile error:', err);
            return false;
        }
    }
};
