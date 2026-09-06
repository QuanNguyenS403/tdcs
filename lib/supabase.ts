import { createClient } from '@supabase/supabase-js'
import { createServerClient, createBrowserClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { CookieOptions } from '@supabase/ssr'

// Client-side Supabase client (browser only)
export function createBrowserSupabaseClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Server-side Supabase client (for middleware/API routes)
export function createServerSupabaseClient() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Handle error if cookies can't be set in middleware
          }
        }
      }
    }
  )
}

// Service role client (admin operations - server only)
export function createSupabaseServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

// Storage utilities
export async function getSignedVideoUrl(
  bucket: string,
  path: string,
  expiresIn: number = 3600 // 1 hour default
) {
  const supabase = createSupabaseServiceClient()
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn)

  if (error) throw error
  return data.signedUrl
}

export async function uploadToStorage(
  bucket: string,
  path: string,
  file: File | Buffer
) {
  const supabase = createSupabaseServiceClient()
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { upsert: false })

  if (error) throw error
  return data
}

export async function deleteFromStorage(bucket: string, path: string) {
  const supabase = createSupabaseServiceClient()
  const { error } = await supabase.storage.from(bucket).remove([path])

  if (error) throw error
}
