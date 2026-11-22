
"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";

interface TurnstileWidgetProps {
  onTokenChange: (token: string) => void;
  resetKey: number;
}

interface TurnstileApi {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      theme?: "light" | "dark" | "auto";
      callback: (token: string) => void;
      "expired-callback"?: () => void;
      "error-callback"?: (errorCode: string) => boolean | void;
      "timeout-callback"?: () => void;
    }
  ) => string;
  remove: (widgetId: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

export function TurnstileWidget({
  onTokenChange,
  resetKey,
}: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const callbackRef = useRef(onTokenChange);
  const [scriptReady, setScriptReady] = useState(false);
  const [error, setError] = useState("");

  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  const handleTokenChange = useCallback((token: string) => {
    callbackRef.current(token);
  }, []);

  useEffect(() => {
    callbackRef.current = onTokenChange;
  }, [onTokenChange]);

  useEffect(() => {
    if (
      !scriptReady ||
      !siteKey ||
      !containerRef.current ||
      !window.turnstile
    ) {
      return;
    }

    setError("");

    let widgetId: string;

    try {
      widgetId = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        theme: "light",

        callback: (token) => {
          console.info("[Turnstile] Verification successful");
          setError("");
          handleTokenChange(token);
        },

        "expired-callback": () => {
          console.warn("[Turnstile] Token expired");
          handleTokenChange("");
        },

        "error-callback": (errorCode) => {
          console.error("[Turnstile] Error:", errorCode);
          setError(`Cloudflare verification error: ${errorCode}`);
          handleTokenChange("");
          return false;
        },

        "timeout-callback": () => {
          console.warn("[Turnstile] Challenge timed out");
          setError("Verification timed out. Please try again.");
          handleTokenChange("");
        },
      });
    } catch (err) {
      console.error("[Turnstile] Render failed:", err);
      setError("Unable to initialize security verification.");
      return;
    }

    return () => {
      window.turnstile?.remove(widgetId);
    };
  }, [scriptReady, siteKey, resetKey, handleTokenChange]);

  if (!siteKey) {
    return (
      <p role="alert" className="text-sm font-semibold text-red-700">
        Security verification is not configured.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onReady={() => setScriptReady(true)}
        onError={() => {
          console.error("[Turnstile] Cloudflare script failed to load");
          setError("Cloudflare security script failed to load.");
        }}
      />

      <div ref={containerRef} />

      {error && (
        <p role="alert" className="text-sm font-semibold text-red-700">
          {error}
        </p>
      )}

      <p className="text-xs text-[#89938a]">
        Complete the security check before submitting your report.
      </p>
    </div>
  );
}
