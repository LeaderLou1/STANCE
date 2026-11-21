
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
      "error-callback"?: () => void;
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

    const widgetId = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      theme: "light",
      callback: handleTokenChange,
      "expired-callback": () => handleTokenChange(""),
      "error-callback": () => handleTokenChange(""),
    });

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
      />

      <div ref={containerRef} />

      <p className="text-xs text-[#89938a]">
        Complete the security check before submitting your report.
      </p>
    </div>
  );
}
