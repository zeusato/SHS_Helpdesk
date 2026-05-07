import imageCompression from 'browser-image-compression'
import { createClient } from '@/lib/supabase/client'

const MAX_SIZE_MB = 0.5 // 500KB
const MAX_WIDTH_OR_HEIGHT = 1920

export async function compressImage(file: File): Promise<File> {
  // Skip if already under limit
  if (file.size <= MAX_SIZE_MB * 1024 * 1024) {
    return file
  }

  const options = {
    maxSizeMB: MAX_SIZE_MB,
    maxWidthOrHeight: MAX_WIDTH_OR_HEIGHT,
    useWebWorker: true,
    fileType: file.type as string,
  }

  const compressed = await imageCompression(file, options)
  return new File([compressed], file.name, { type: compressed.type })
}

export async function uploadImage(
  file: File,
  folder: string
): Promise<string | null> {
  const supabase = createClient()

  // Compress first
  const compressed = await compressImage(file)

  // Generate unique filename
  const ext = compressed.name.split('.').pop() || 'jpg'
  const filename = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`

  const { data, error } = await supabase.storage
    .from('attachments')
    .upload(filename, compressed, {
      cacheControl: '3600',
      upsert: false,
    })

  if (error) {
    console.error('Upload error:', error)
    return null
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('attachments')
    .getPublicUrl(data.path)

  return urlData.publicUrl
}

export async function uploadImages(
  files: File[],
  folder: string
): Promise<string[]> {
  const results = await Promise.all(
    files.map(f => uploadImage(f, folder))
  )
  return results.filter((url): url is string => url !== null)
}

// For anonymous uploads (public portal - no auth)
export async function uploadImageAnon(
  file: File,
  folder: string
): Promise<string | null> {
  const compressed = await compressImage(file)

  const ext = compressed.name.split('.').pop() || 'jpg'
  const filename = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  const formData = new FormData()
  formData.append('', compressed)

  const res = await fetch(
    `${supabaseUrl}/storage/v1/object/attachments/${filename}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${anonKey}`,
        'apikey': anonKey,
      },
      body: compressed,
    }
  )

  if (!res.ok) {
    console.error('Anon upload failed:', await res.text())
    return null
  }

  return `${supabaseUrl}/storage/v1/object/public/attachments/${filename}`
}
