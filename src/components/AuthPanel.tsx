
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/src/lib/supabase";

export interface AuthPanelProps {
  onUserChange: (user: User | null) => void | Promise<void>;
}

export function AuthPanel({ onUserChange }: AuthPanelProps) {
  const [user, setUser] = useState<User | null>(null);
  const [authMessage, setAuthMessage] = useState("");
  const [signingOut, setSigningOut] = useState(false);

  // Keep the latest parent callback without recreating the auth subscription.
  const onUserChangeRef = useRef(onUserChange);
  onUserChangeRef.current = onUserChange;

  const notifyUserChange = useCallback((nextUser: User | null) => {
    setUser(nextUser);

    // Run parent work after the synchronous Supabase auth callback completes.
    void Promise.resolve()
      .then(() => onUserChangeRef.current(nextUser))
      .catch((error: unknown) => {
        console.error("Auth user change callback failed:", error);
      });
  }, []);

  useEffect(() => {
    let mounted = true;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;

      setAuthMessage("");
      notifyUserChange(session?.user ?? null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [notifyUserChange]);

  const handleSignOut = async () => {
    if (signingOut) return;

    setSigningOut(true);
    setAuthMessage("");

    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error("Supabase sign-out failed:", error);
        setAuthMessage("Sign out failed. Please try again.");
      }

      // The SIGNED_OUT event updates the local and parent state.
    } catch (error) {
      console.error("Unexpected sign-out error:", error);
      setAuthMessage("Something went wrong while signing out.");
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {authMessage && (
        <span
          role="alert"
          className="max-w-36 truncate text-xs font-semibold text-[#a33d2f]"
          title={authMessage}
        >
          {authMessage}
        </span>
      )}

      {user ? (
        <>
          <span
            className="hidden max-w-36 truncate text-xs text-[#647168] sm:inline"
            title={user.email ?? "Signed in"}
          >
            {user.email ?? "Signed in"}
          </span>

          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            className="whitespace-nowrap border border-[#cbd5cc] bg-[#fffefa] px-3 py-2 text-xs font-bold text-[#263b48] transition hover:bg-[#e8edef] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {signingOut ? "Signing out..." : "Sign out"}
          </button>
        </>
      ) : (
        <Link
          href="/auth"
          className="whitespace-nowrap border border-[#cbd5cc] bg-[#fffefa] px-3 py-2 text-xs font-bold text-[#263b48] transition hover:bg-[#e8edef]"
        >
          Sign in / Sign up
        </Link>
      )}
    </div>
  );
}
