import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// Vercel-Supabase integration нь NEXT_PUBLIC_* нэртэй хувьсагч үүсгэдэг тул хоёуланг нь frontend-д нээнэ (зөвхөн public URL/anon key)
export default defineConfig({ plugins: [react()], envPrefix: ['VITE_', 'NEXT_PUBLIC_'] })
