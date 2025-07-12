import { useState, useEffect } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase, UserProfile } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
      }
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        
        if (session?.user) {
          await fetchProfile(session.user.id)
        } else {
          setProfile(null)
        }
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error && error.code === 'PGRST116') {
        // Profile doesn't exist, create it
        await createProfile(userId)
        return
      }

      if (error) throw error
      setProfile(data)
    } catch (error) {
      console.error('Error fetching profile:', error)
    }
  }

  const createProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .insert({
          id: userId,
          email: user?.email || '',
          display_name: user?.email?.split('@')[0] || 'Player',
          coin_balance: 0,
          selected_skin: 'default',
          high_score: 0
        })
        .select()
        .single()

      if (error) throw error
      setProfile(data)
    } catch (error) {
      console.error('Error creating profile:', error)
    }
  }

  const signUp = async (email: string, password: string, displayName: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName
          }
        }
      })

      if (error) throw error

      toast({
        title: "Account created!",
        description: "Please check your email to verify your account.",
      })

      return { data, error: null }
    } catch (error: any) {
      toast({
        title: "Sign up failed",
        description: error.message,
        variant: "destructive",
      })
      return { data: null, error }
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      toast({
        title: "Welcome back!",
        description: "Successfully signed in.",
      })

      return { data, error: null }
    } catch (error: any) {
      toast({
        title: "Sign in failed",
        description: error.message,
        variant: "destructive",
      })
      return { data: null, error }
    }
  }

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error

      toast({
        title: "Signed out",
        description: "Successfully signed out.",
      })
    } catch (error: any) {
      toast({
        title: "Sign out failed", 
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user || !profile) return

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single()

      if (error) throw error
      setProfile(data)
      return { data, error: null }
    } catch (error: any) {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      })
      return { data: null, error }
    }
  }

  return {
    user,
    profile,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    updateProfile,
    fetchProfile
  }
}