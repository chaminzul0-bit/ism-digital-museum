import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase'
const Ctx = createContext(null)
export const useAuth = () => useContext(Ctx)
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [ready, setReady] = useState(false)
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setUser(data.session?.user ?? null); setReady(true) })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUser(s?.user ?? null))
    return () => sub.subscription.unsubscribe()
  }, [])
  const loadProfile = () => user && supabase.from('profiles').select('*').eq('id', user.id).single().then(({ data }) => setProfile(data))
  useEffect(() => { if (!user) setProfile(null); else loadProfile() }, [user?.id])
  return <Ctx.Provider value={{ user, profile, ready, isAdmin: profile?.role === 'admin', refreshProfile: loadProfile }}>{children}</Ctx.Provider>
}
