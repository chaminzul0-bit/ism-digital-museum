import { createClient } from '@supabase/supabase-js'
let url = import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY   // зөвхөн public anon key; service role хэзээ ч frontend-д орохгүй
// Vercel дээрх URL хувьсагч буруу бичигдсэн тохиолдолд (жишээ нь key орсон) anon JWT-ийн "ref"-ээс зөв URL-ийг сэргээнэ
function resolveUrl(u, k) {
  if (u && /^https:\/\/[a-z0-9]{20}\.supabase\.co\/?$/.test(u)) return u
  try { const ref = JSON.parse(atob(k.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).ref; if (ref) return `https://${ref}.supabase.co` } catch {}
  return u
}
url = resolveUrl(url, key)
export const configured = Boolean(url && key)
export const supabase = createClient(url || 'http://localhost', key || 'missing')
export async function uploadImage(file, uid) {
  const path = `${uid}/${Date.now()}-${file.name.replace(/[^\w.-]/g, '_')}`
  const { error } = await supabase.storage.from('images').upload(path, file)
  if (error) throw error
  return supabase.storage.from('images').getPublicUrl(path).data.publicUrl
}
