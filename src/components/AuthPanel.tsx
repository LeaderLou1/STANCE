"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/src/lib/supabase";

export interface AuthPanelProps {
  onUserChange: (user: User | null) => void | Promise<void>;
}

export function AuthPanel({ onUserChange }: AuthPanelProps) {
  const [user, setUser] = useState<User | null>(null);
  const [authMessage, setAuthMessage] = useState("");

  useEffect(() => {
    let mounted = true;

    void supabase.auth.getUser().then(({ data, error }) => {
      if (!mounted) return;
      if (error) {
        setAuthMessage("We could not verify your saved session.");
        setUser(null);
        void onUserChange(null);
        return;
      }
      setUser(data.user);
      void onUserChange(data.user);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      void onUserChange(nextUser);
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, [onUserChange]);

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      setAuthMessage(error.message);
      return;
    }
    setUser(null);
    void onUserChange(null);
  };

  return (
    <div className="flex items-center gap-2">
      {authMessage && (
        <Link href="/auth" role="status" className="text-xs font-semibold text-[#a33d2f] underline">
          {authMessage}
        </Link>
      )}
      {user ? (
        <>
          <span className="hidden max-w-36 truncate text-xs text-[#647168] sm:inline" title={user.email}>
            {user.email}
          </span>
          <button
            type="button"
            onClick={handleSignOut}
            className="border border-[#cbd5cc] bg-[#fffefa] px-3 py-2 text-xs font-bold text-[#263b48] transition hover:bg-[#e8edef]"
          >
            Sign out
          </button>
        </>
      ) : (
        <Link
          href="/auth"
          className="border border-[#cbd5cc] bg-[#fffefa] px-3 py-2 text-xs font-bold text-[#263b48] transition hover:bg-[#e8edef]"
        >
          Sign in / Sign up
        </Link>
      )}
    </div>
  );
}
