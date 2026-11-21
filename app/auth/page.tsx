
"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/src/lib/supabase";
import { ArrowLeft, Loader2, ShieldCheck } from "lucide-react";

type AuthMode = "signin" | "signup";

export default function AuthPage() {
  const router = useRouter();

  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (mounted && session) {
        router.replace("/");
        router.refresh();
      }
    };

    void checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        router.replace("/");
        router.refresh();
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (loading) return;

    setLoading(true);
    setMessage("");
    setErrorMessage("");

    try {
      const normalizedEmail = email.trim().toLowerCase();

      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
        });

        if (error) throw error;

        if (data.session) {
          router.replace("/");
          router.refresh();
          return;
        }

        setMessage(
          "Account created. Check your email for a confirmation link before signing in."
        );

        setMode("signin");
        setPassword("");
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (error) throw error;

      router.replace("/");
      router.refresh();
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Authentication failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f5ef] px-5 py-12">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-[#52645a] transition hover:text-[#263b48]"
        >
          <ArrowLeft size={16} />
          Back to STANCE
        </Link>

        <section className="border border-[#dce1d9] bg-[#fffefa] p-7 shadow-sm sm:p-9">
          <div className="mb-7">
            <div className="mb-5 flex h-12 w-12 items-center justify-center bg-[#e8eee7] text-[#315a43]">
              <ShieldCheck size={25} />
            </div>

            <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-[#58715e]">
              STANCE
            </p>

            <h1 className="text-3xl font-bold tracking-tight text-[#263b48]">
              {mode === "signin" ? "Welcome back." : "Create your account."}
            </h1>

            <p className="mt-3 text-sm leading-6 text-[#68746c]">
              {mode === "signin"
                ? "Sign in to access your STANCE account."
                : "Create an account to manage your civic reports and activity."}
            </p>
          </div>

          <div className="mb-6 grid grid-cols-2 border border-[#dce1d9] p-1">
            <button
              type="button"
              onClick={() => {
                setMode("signin");
                setMessage("");
                setErrorMessage("");
              }}
              className={`py-2.5 text-sm font-bold transition ${
                mode === "signin"
                  ? "bg-[#263b48] text-white"
                  : "text-[#68746c] hover:bg-[#f1f3ed]"
              }`}
            >
              Sign in
            </button>

            <button
              type="button"
              onClick={() => {
                setMode("signup");
                setMessage("");
                setErrorMessage("");
              }}
              className={`py-2.5 text-sm font-bold transition ${
                mode === "signup"
                  ? "bg-[#263b48] text-white"
                  : "text-[#68746c] hover:bg-[#f1f3ed]"
              }`}
            >
              Sign up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-bold text-[#263b48]"
              >
                Email address
              </label>

              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                className="w-full border border-[#cbd5cc] bg-white px-4 py-3 text-sm text-[#263b48] outline-none transition placeholder:text-[#a0aaa1] focus:border-[#526e5b] focus:ring-2 focus:ring-[#526e5b]/10"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-bold text-[#263b48]"
              >
                Password
              </label>

              <input
                id="password"
                type="password"
                autoComplete={
                  mode === "signin" ? "current-password" : "new-password"
                }
                required
                minLength={6}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                className="w-full border border-[#cbd5cc] bg-white px-4 py-3 text-sm text-[#263b48] outline-none transition placeholder:text-[#a0aaa1] focus:border-[#526e5b] focus:ring-2 focus:ring-[#526e5b]/10"
              />

              {mode === "signup" && (
                <p className="mt-2 text-xs text-[#7b857d]">
                  Use at least 6 characters.
                </p>
              )}
            </div>

            {errorMessage && (
              <div
                role="alert"
                className="border border-[#e7c7c1] bg-[#fff1ee] p-3 text-sm text-[#a33d2f]"
              >
                {errorMessage}
              </div>
            )}

            {message && (
              <div
                role="status"
                className="border border-[#cbdcca] bg-[#edf5eb] p-3 text-sm text-[#315a43]"
              >
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 bg-[#263b48] px-4 py-3.5 text-sm font-bold text-white transition hover:bg-[#344f5d] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 size={17} className="animate-spin" />
                  Please wait...
                </>
              ) : mode === "signin" ? (
                "Sign in"
              ) : (
                "Create account"
              )}
            </button>
          </form>

          <div className="mt-7 border-t border-[#e5e8e1] pt-5">
            <p className="text-center text-xs leading-5 text-[#7b857d]">
              You can still submit a civic report without creating an account.
            </p>

            <Link
              href="/"
              className="mt-3 block text-center text-sm font-bold text-[#315a43] hover:underline"
            >
              Continue as a guest
            </Link>
          </div>
        </section>

        <p className="mt-6 text-center text-xs text-[#89928a]">
          STANCE · Civic accountability through transparency.
        </p>
      </div>
    </main>
  );
}
