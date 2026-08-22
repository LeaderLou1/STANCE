"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/src/lib/supabase";

interface AuthPanelProps {
  onUserChange: (user: User | null) => void;
}

export function AuthPanel({ onUserChange }: AuthPanelProps) {
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let mounted = true;

    void supabase.auth.getUser().then(({ data }) => {
      if (mounted) {
        setUser(data.user);
        onUserChange(data.user);
      }
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      onUserChange(session?.user ?? null);
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, [onUserChange]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const result = isSignUp
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });

    if (result.error) {
      setMessage(result.error.message);
    } else if (isSignUp && !result.data.session) {
      setMessage("Account created. Check your email to confirm your account.");
    } else {
      setMessage("Signed in successfully.");
      setIsOpen(false);
    }

    setLoading(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setMessage("");
  };

  if (user) {
    return (
      <div className="flex items-center gap-2 text-xs">
        <span className="max-w-36 truncate text-emerald-100" title={user.email}>
          {user.email}
        </span>
        <button
          type="button"
          onClick={handleSignOut}
          className="rounded-md border border-[#9aabb5] px-2 py-1 font-bold text-[#dbe8df] transition hover:bg-[#263b48]"
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="rounded-md border border-[#9aabb5] px-3 py-2 text-xs font-bold text-[#263b48] transition hover:bg-[#e8edef]"
      >
        Sign in / Sign up
      </button>
      {isOpen && (
        <form
          onSubmit={handleSubmit}
          className="absolute right-0 top-11 z-50 w-72 space-y-3 border border-[#cbd5cc] bg-[#fffefa] p-4 text-[#17211d] shadow-xl"
        >
          <h2 className="text-sm font-black">
            {isSignUp ? "Create your account" : "Sign in to STANCE"}
          </h2>
          <input
            type="email"
            required
            autoComplete="email"
            placeholder="Email address"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full border border-[#cbd5cc] p-2 text-sm outline-none focus:border-[#2f7d5b] focus:ring-2 focus:ring-[#dbe8df]"
          />
          <input
            type="password"
            required
            minLength={6}
            autoComplete={isSignUp ? "new-password" : "current-password"}
            placeholder="Password (6+ characters)"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full border border-[#cbd5cc] p-2 text-sm outline-none focus:border-[#2f7d5b] focus:ring-2 focus:ring-[#dbe8df]"
          />
          {message && (
            <p role="alert" className="text-xs font-semibold text-slate-700">
              {message}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#263b48] px-3 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            {loading ? "Please wait..." : isSignUp ? "Create account" : "Sign in"}
          </button>
          <button
            type="button"
            onClick={() => {
              setIsSignUp((signup) => !signup);
              setMessage("");
            }}
            className="w-full text-xs font-semibold text-emerald-800 hover:underline"
          >
            {isSignUp ? "Already have an account? Sign in" : "Need an account? Sign up"}
          </button>
          <Link
            href="/auth"
            className="block w-full text-center text-xs font-semibold text-[#647168] hover:text-[#2f7d5b] hover:underline"
          >
            Open full account page
          </Link>
        </form>
      )}
    </div>
  );
}
