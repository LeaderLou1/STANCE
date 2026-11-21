
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

  const onUserChangeRef = useRef(onUserChange);

  useEffect(() => {
    onUserChangeRef.current = onUserChange;
  }, [onUserChange]);

  const notifyUserChange = useCallback((nextUser: User | null) => {
    setUser(nextUser);

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
    } catch (error) {
      console.error("Unexpected sign-out error:", error);
      setAuthMessage("Something went wrong while signing out.");
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <div className="flex min-w-0 flex-col items-end gap-1">
      <div className="flex min-w-0 items-center gap-2">
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
              className="inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-lg border border-[#cbd5cc] bg-[#fffefa] px-3 text-xs font-bold text-[#263b48] transition hover:bg-[#e8edef] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#47745b] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {signingOut ? "Signing out..." : "Sign out"}
            </button>
          </>
        ) : (
          <Link
            href="/auth"
            className="inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-lg border border-[#cbd5cc] bg-[#fffefa] px-3 text-xs font-bold text-[#263b48] transition hover:bg-[#e8edef] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#47745b]"
          >
            Sign in
            <span className="hidden sm:inline"> / Sign up</span>
          </Link>
        )}
      </div>

      {authMessage && (
        <span
          role="alert"
          className="max-w-48 text-right text-xs font-semibold leading-4 text-[#a33d2f] sm:max-w-56"
        >
          {authMessage}
        </span>
      )}
    </div>
  );
}
