"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { KeyRound, LogOut, UserCheck } from "lucide-react";
import { supabase } from "@/src/lib/supabase";
import type { UserRole } from "@/src/types";

interface AuthPanelProps {
  onUserChange: (user: User | null) => void;
}

/** The full sign-in and registration flow lives at /auth. */
export function AuthPanel({ onUserChange }: AuthPanelProps) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole>("resident");
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState("");

  const updateSession = useCallback(
    async (session: Session | null) => {
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      onUserChange(nextUser);

      if (!nextUser) {
        setRole("resident");
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", nextUser.id)
        .maybeSingle();

      setRole(
        data?.role === "admin" || data?.role === "representative"
          ? data.role
          : "resident",
      );
    },
    [onUserChange],
  );

  useEffect(() => {
    void supabase.auth.getSession().then(({ data: { session } }) => updateSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      void updateSession(session);
    });
    return () => subscription.unsubscribe();
  }, [updateSession]);

  const signOut = async () => {
    setError("");
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      setError(signOutError.message);
      return;
    }
    setIsOpen(false);
  };

  if (!user) {
    return (
      <Link href="/auth" className="flex items-center gap-2 rounded-lg border border-[#cbd5cc] bg-[#fffefa] px-3 py-2 text-xs font-bold text-[#17211d] shadow-sm transition hover:bg-[#e9e7e0]">
        <KeyRound className="h-4 w-4 text-[#b7732d]" />
        Sign in / Sign up
      </Link>
    );
  }

  return (
    <div className="relative">
      <button type="button" onClick={() => setIsOpen((open) => !open)} className="flex items-center gap-2 rounded-lg border border-[#cbd5cc] bg-[#fffefa] px-3 py-2 text-xs font-bold text-[#17211d] shadow-sm transition hover:bg-[#e9e7e0]">
        <UserCheck className="h-4 w-4 text-[#2f7d5b]" />
        <span className="max-w-[120px] truncate">{user.email}</span>
        <span className="rounded bg-[#123b2a] px-1.5 py-0.5 text-[10px] uppercase text-white">{role}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-12 z-50 w-72 rounded-xl border border-[#cbd5cc] bg-[#f3f1ec] p-4 shadow-2xl">
          <p className="truncate text-sm font-bold text-[#17211d]">{user.email}</p>
          <p className="mt-1 text-xs font-semibold capitalize text-[#2f7d5b]">Active tier: {role}</p>
          {error && <p role="alert" className="mt-3 text-xs font-medium text-[#a33d2f]">{error}</p>}
          <button type="button" onClick={signOut} className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-[#b84a39] py-2 text-xs font-bold text-white transition hover:bg-[#9e3f30]">
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}
