"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { supabase } from "@/src/lib/supabase";

const inputClass =
  "w-full border border-[#cbd5cc] bg-white p-3 text-sm outline-none transition placeholder:text-[#98a49b] focus:border-[#2f7d5b] focus:ring-2 focus:ring-[#dbe8df]";

export default function AuthPage() {
  const [mode, setMode] = useState<"signin" | "signup" | "reset">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("access_token") || hash.includes("type=signup")) {
      setMessage("Your email is confirmed. You can now use STANCE.");
    }
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    if (mode === "reset") {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth`,
      });
      if (resetError) setError(resetError.message);
      else setMessage("If an account exists for that email, a reset link is on its way.");
      setLoading(false);
      return;
    }

    const result =
      mode === "signup"
        ? await supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: `${window.location.origin}/auth`,
              data: { full_name: fullName.trim(), zip_code: zipCode },
            },
          })
        : await supabase.auth.signInWithPassword({ email, password });

    if (result.error) {
      setError(result.error.message);
    } else if (mode === "signup" && !result.data.session) {
      setMessage("Account created. Check your email to confirm your account.");
    } else {
      window.location.href = "/";
    }
    setLoading(false);
  };

  const isSignup = mode === "signup";
  const isReset = mode === "reset";

  return (
    <main className="min-h-screen bg-[#f3f1ec] px-4 py-10 text-[#17211d] sm:py-16">
      <div className="mx-auto grid w-full max-w-5xl overflow-hidden border border-[#cbd5cc] bg-[#fffefa] shadow-[0_24px_80px_rgba(23,33,29,0.12)] md:grid-cols-[1fr_0.9fr]">
        <section className="bg-[#123b2a] p-8 text-[#f3f1ec] sm:p-12">
          <Link href="/" className="flex items-center gap-2 text-lg font-black tracking-[-0.04em]">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#d89542] text-sm text-[#17211d]">S</span>
            STANCE
          </Link>
          <div className="mt-20 max-w-sm">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-[#e8b86d]">A public record for local life</p>
            <h1 className="text-4xl font-black leading-[0.98] tracking-[-0.06em] sm:text-5xl">Make the issue visible.</h1>
            <p className="mt-5 text-sm leading-6 text-[#dbe8df]">Create an account to report concerns, follow progress, and add context to the issues your neighbors care about.</p>
          </div>
        </section>

        <section className="p-8 sm:p-12">
          <div className="mb-8">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#b7732d]">{isReset ? "Account recovery" : isSignup ? "New resident account" : "Welcome back"}</p>
            <h2 className="text-3xl font-black tracking-[-0.05em]">{isReset ? "Reset your password" : isSignup ? "Create your account" : "Sign in to STANCE"}</h2>
            <p className="mt-2 text-sm leading-6 text-[#647168]">{isReset ? "We will email a secure recovery link." : "Every new account starts as a resident. Staff access is granted separately by an authorized administrator."}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignup && (
              <>
                <label className="block text-[10px] font-bold uppercase tracking-[0.14em] text-[#647168]">Full name (optional)
                  <input className={`${inputClass} mt-2`} value={fullName} onChange={(event) => setFullName(event.target.value)} autoComplete="name" />
                </label>
                <label className="block text-[10px] font-bold uppercase tracking-[0.14em] text-[#647168]">ZIP code (optional)
                  <input className={`${inputClass} mt-2`} inputMode="numeric" maxLength={5} value={zipCode} onChange={(event) => setZipCode(event.target.value.replace(/\D/g, ""))} />
                </label>
              </>
            )}
            <label className="block text-[10px] font-bold uppercase tracking-[0.14em] text-[#647168]">Email address
              <input className={`${inputClass} mt-2`} type="email" required value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" />
            </label>
            {!isReset && (
              <label className="block text-[10px] font-bold uppercase tracking-[0.14em] text-[#647168]">Password
                <input className={`${inputClass} mt-2`} type="password" required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={isSignup ? "new-password" : "current-password"} />
              </label>
            )}
            {error && <p role="alert" className="border border-[#e6b7b0] bg-[#fdf0ed] p-3 text-sm font-semibold text-[#a33d2f]">{error}</p>}
            {message && <p role="status" className="border border-[#a9c8b3] bg-[#e5f0e7] p-3 text-sm font-semibold text-[#1e5b3d]">{message}</p>}
            <button disabled={loading} className="w-full bg-[#123b2a] px-4 py-3 text-sm font-bold text-white shadow-[0_3px_0_#081e15] transition hover:bg-[#1c563d] disabled:opacity-50">{loading ? "Please wait..." : isReset ? "Send reset link" : isSignup ? "Create resident account" : "Sign in"}</button>
          </form>

          <div className="mt-6 flex flex-wrap gap-x-4 gap-y-2 text-sm font-bold text-[#2f7d5b]">
            {!isReset && <button type="button" onClick={() => { setMode(isSignup ? "signin" : "signup"); setError(""); setMessage(""); }}>{isSignup ? "Already have an account? Sign in" : "Need an account? Sign up"}</button>}
            <button type="button" onClick={() => { setMode(isReset ? "signin" : "reset"); setError(""); setMessage(""); }}>{isReset ? "Back to sign in" : "Forgot password?"}</button>
          </div>
        </section>
      </div>
    </main>
  );
}
