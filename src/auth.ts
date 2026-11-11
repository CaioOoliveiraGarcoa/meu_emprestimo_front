import { createClient, type Session } from '@supabase/supabase-js';
import { create } from 'zustand';
import { configuration } from './env';

export const supabase = configuration.success
  ? createClient(configuration.data.VITE_SUPABASE_URL, configuration.data.VITE_SUPABASE_PUBLISHABLE_KEY)
  : null;

type AuthState = {
  session: Session | null;
  ready: boolean;
  setSession: (session: Session | null) => void;
};

export const useAuth = create<AuthState>(set => ({
  session: null, ready: false, setSession: session => set({ session, ready: true }),
}));
