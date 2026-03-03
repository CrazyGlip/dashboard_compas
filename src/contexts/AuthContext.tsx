import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

// Define the available roles based on our RLS plan
export type Role = 'admin' | 'news_editor' | 'content_editor' | null;

interface AuthContextType {
    user: User | null;
    role: Role;
    loading: boolean;
    signOut: () => Promise<void>;
    hasAccess: (allowedRoles: Role[]) => boolean;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    role: null,
    loading: true,
    signOut: async () => { },
    hasAccess: () => false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [role, setRole] = useState<Role>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
            if (session?.user) {
                fetchUserRole(session.user.id);
            } else {
                setLoading(false);
            }
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
            if (session?.user) {
                fetchUserRole(session.user.id);
            } else {
                setRole(null);
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const fetchUserRole = async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from('user_roles')
                .select('role')
                .eq('user_id', userId)
                .single();

            if (error) throw error;
            setRole(data?.role as Role);
        } catch (error) {
            console.error('Error fetching user role:', error);
            // Fallback if no role is found. In a real app we might reject access entirely.
            setRole(null);
        } finally {
            setLoading(false);
        }
    };

    const signOut = async () => {
        await supabase.auth.signOut();
    };

    const hasAccess = (allowedRoles: Role[]) => {
        if (!role) return false;
        if (role === 'admin') return true; // Admin has access to everything
        return allowedRoles.includes(role);
    };

    return (
        <AuthContext.Provider value={{ user, role, loading, signOut, hasAccess }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
