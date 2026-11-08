import { createClient } from '@supabase/supabase-js'
const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY   // зөвхөн public anon key; service role хэзээ ч frontend-д орохгүй
export const configured = Boolean(url && key)
export const supabase = createClient(url || 'http://localhost', key || 'missing')
export async function uploadImage(file, uid) {
  const path = `${uid}/${Date.now()}-${file.name.replace(/[^\w.-]/g, '_')}`
  const { error } = await supabase.storage.from('images').upload(path, file)
  if (error) throw error
  return supabase.storage.from('images').getPublicUrl(path).data.publicUrl
}
