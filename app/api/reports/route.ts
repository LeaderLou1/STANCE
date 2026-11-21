
import { NextResponse } from "next/server";
import {
  createHash,
  createHmac,
  randomBytes,
} from "node:crypto";
import { createServerAdminClient } from "@/src/lib/serverSupabase";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 16 * 1024;
const MAX_REQUESTS_PER_HOUR = 5;
const EMAIL_VERIFICATION_MINUTES = 30;

interface ReportPayload {
  title?: unknown;
  description?: unknown;
  category?: unknown;
  lat?: unknown;
  lng?: unknown;
  reporterEmail?: unknown;
  photoUrl?: unknown;
  captchaToken?: unknown;
}

interface TurnstileResponse {
  success?: boolean;
  hostname?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidNYCCoordinates(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= 40.4 &&
    lat <= 41.0 &&
    lng >= -74.3 &&
    lng <= -73.6
  );
}

function isValidEmail(email: string): boolean {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getDistrictNumber(name: string): number | null {
  const match = name.match(/^Council District (\d{1,2})$/i);

  if (!match) return null;

  const number = Number(match[1]);

  return Number.isInteger(number) && number >= 1 && number <= 51
    ? number
    : null;
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function getClientIp(request: Request): string {
  const realIp = request.headers.get("x-real-ip")?.trim();

  if (realIp) return realIp;

  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  return "unknown";
}

function getAppUrl(): URL {
  const configuredUrl = process.env.APP_URL;

  if (!configuredUrl) {
    throw new Error("APP_URL is not configured.");
  }

  const url = new URL(configuredUrl);

  const allowedHosts = new Set([
    "localhost",
    "127.0.0.1",
    "thestanceapp.com",
    "www.thestanceapp.com",
  ]);

  if (!allowedHosts.has(url.hostname)) {
    throw new Error("APP_URL hostname is not allowed.");
  }

  if (
    url.protocol !== "https:" &&
    !(url.protocol === "http:" &&
      (url.hostname === "localhost" || url.hostname === "127.0.0.1"))
  ) {
    throw new Error("APP_URL must use HTTPS outside local development.");
  }

  return url;
}

async function verifyTurnstile(
  token: string,
  expectedHostname: string
): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;

  if (!secret || !token) return false;

  const formData = new URLSearchParams();
  formData.set("secret", secret);
  formData.set("response", token);

  const response = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
      cache: "no-store",
    }
  );

  if (!response.ok) return false;

  const result = (await response.json()) as TurnstileResponse;

  return (
    result.success === true &&
    result.hostname?.toLowerCase() === expectedHostname.toLowerCase()
  );
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return entities[character];
  });
}

async function sendVerificationEmail(
  email: string,
  verificationUrl: string
): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    throw new Error("Email service environment variables are missing.");
  }

  const safeUrl = escapeHtml(verificationUrl);

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: "Verify your email to continue with your STANCE report",
      html: `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;line-height:1.6">
          <h2>Verify your email address</h2>
          <p>We received a request to create a report through STANCE.</p>
          <p>Verify your email address to continue:</p>
          <p>
            <a href="${safeUrl}"
               style="display:inline-block;padding:12px 20px;background:#111;color:#fff;text-decoration:none;border-radius:6px">
              Verify my email
            </a>
          </p>
          <p>This link expires in ${EMAIL_VERIFICATION_MINUTES} minutes.</p>
          <p>Your report has not been sent to any government official. You will have an opportunity to review and explicitly approve delivery separately.</p>
          <p>If you did not request this, you can ignore this email.</p>
        </div>
      `,
      text: [
        "Verify your email address to continue with your STANCE report:",
        verificationUrl,
        "",
        `This link expires in ${EMAIL_VERIFICATION_MINUTES} minutes.`,
        "Your report has not been sent to any government official.",
        "If you did not request this, ignore this email.",
      ].join("\n"),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Resend email request failed:", response.status, errorText);
    return false;
  }

  return true;
}

export async function POST(request: Request) {
  let createdReportId: string | null = null;

  try {
    const contentLength = Number(request.headers.get("content-length") ?? 0);

    if (contentLength > MAX_BODY_BYTES) {
      return NextResponse.json(
        { error: "Request body is too large." },
        { status: 413 }
      );
    }

    const hmacSecret = process.env.RATE_LIMIT_HMAC_SECRET;

    if (!hmacSecret || hmacSecret.length < 32) {
      console.error("RATE_LIMIT_HMAC_SECRET is missing or too short.");

      return NextResponse.json(
        { error: "Report submission is temporarily unavailable." },
        { status: 503 }
      );
    }

    const supabase = createServerAdminClient();

    // Hash the client IP before storing it in the rate-limit table.
    const clientIp = getClientIp(request);
    const rateKey = createHmac("sha256", hmacSecret)
      .update(`guest-report:${clientIp}`)
      .digest("hex");

    // Use a fixed UTC hourly window for atomic database-backed limiting.
    const now = new Date();
    const windowStart = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        now.getUTCHours()
      )
    );

    const { data: allowed, error: rateLimitError } = await supabase.rpc(
      "check_report_rate_limit",
      {
        p_rate_key: rateKey,
        p_window_start: windowStart.toISOString(),
        p_max_requests: MAX_REQUESTS_PER_HOUR,
      }
    );

    if (rateLimitError) {
      console.error("Rate-limit check failed:", rateLimitError.message);

      return NextResponse.json(
        { error: "Report submission is temporarily unavailable." },
        { status: 503 }
      );
    }

    if (allowed !== true) {
      return NextResponse.json(
        { error: "Too many submissions. Please try again later." },
        {
          status: 429,
          headers: { "Retry-After": "3600" },
        }
      );
    }

    let rawBody: unknown;

    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Request body must contain valid JSON." },
        { status: 400 }
      );
    }

    if (!isRecord(rawBody)) {
      return NextResponse.json(
        { error: "Invalid report payload." },
        { status: 400 }
      );
    }

    const body = rawBody as ReportPayload;

    if (
      typeof body.title !== "string" ||
      typeof body.description !== "string" ||
      typeof body.category !== "string" ||
      typeof body.reporterEmail !== "string" ||
      typeof body.lat !== "number" ||
      typeof body.lng !== "number" ||
      typeof body.captchaToken !== "string"
    ) {
      return NextResponse.json(
        { error: "One or more required fields have invalid types." },
        { status: 400 }
      );
    }

    const title = body.title.trim();
    const description = body.description.trim();
    const category = body.category.trim();
    const reporterEmail = body.reporterEmail.trim().toLowerCase();
    const { lat, lng } = body;

    if (title.length < 5 || title.length > 120) {
      return NextResponse.json(
        { error: "Title must be 5 to 120 characters." },
        { status: 400 }
      );
    }

    if (description.length < 10 || description.length > 2000) {
      return NextResponse.json(
        { error: "Description must be 10 to 2,000 characters." },
        { status: 400 }
      );
    }

    if (category.length < 2 || category.length > 80) {
      return NextResponse.json(
        { error: "Category must be 2 to 80 characters." },
        { status: 400 }
      );
    }

    if (!isValidEmail(reporterEmail)) {
      return NextResponse.json(
        { error: "A valid email address is required." },
        { status: 400 }
      );
    }

    if (!isValidNYCCoordinates(lat, lng)) {
      return NextResponse.json(
        { error: "A valid NYC location coordinate is required." },
        { status: 400 }
      );
    }

    if (
      body.photoUrl !== undefined &&
      body.photoUrl !== null &&
      body.photoUrl !== ""
    ) {
      return NextResponse.json(
        { error: "Photo uploads are not enabled yet." },
        { status: 400 }
      );
    }

    if (!body.captchaToken.trim()) {
      return NextResponse.json(
        { error: "Please complete the security check." },
        { status: 400 }
      );
    }

    const appUrl = getAppUrl();

    const captchaValid = await verifyTurnstile(
      body.captchaToken,
      appUrl.hostname
    );

    if (!captchaValid) {
      return NextResponse.json(
        { error: "Security verification failed. Please try again." },
        { status: 403 }
      );
    }

    // Resolve the district from geographic boundaries, never ZIP code.
    const { data: districtId, error: districtLookupError } =
      await supabase.rpc("resolve_district_for_point", {
        p_lat: lat,
        p_lng: lng,
      });

    if (districtLookupError) {
      console.error(
        "District resolution failed:",
        districtLookupError.message
      );

      return NextResponse.json(
        { error: "Unable to determine the council district." },
        { status: 503 }
      );
    }

    if (typeof districtId !== "string") {
      return NextResponse.json(
        {
          error:
            "This location could not be matched to an NYC council district.",
        },
        { status: 422 }
      );
    }

    const { data: district, error: districtError } = await supabase
      .from("districts")
      .select("id, name, jurisdiction")
      .eq("id", districtId)
      .eq("jurisdiction", "New York City")
      .single();

    if (districtError || !district) {
      console.error(
        "District verification failed:",
        districtError?.message
      );

      return NextResponse.json(
        { error: "Unable to verify the council district." },
        { status: 503 }
      );
    }

    const districtNumber = getDistrictNumber(district.name);

    if (districtNumber === null) {
      console.error("Unexpected district name:", district.name);

      return NextResponse.json(
        { error: "The matched district is not configured correctly." },
        { status: 503 }
      );
    }

    // Generate independent, high-entropy tokens.
    // Only hashes are stored in the database.
    const statusToken = randomBytes(32).toString("hex");
    const verificationToken = randomBytes(32).toString("hex");

    const statusTokenHash = sha256(statusToken);
    const verificationTokenHash = sha256(verificationToken);

    const verificationExpiresAt = new Date(
      Date.now() + EMAIL_VERIFICATION_MINUTES * 60 * 1000
    ).toISOString();

    const { data: report, error: reportError } = await supabase
      .from("reports")
      .insert({
        title,
        description,
        category,
        district_number: districtNumber,
        district_id: district.id,
        lat,
        lng,
        photo_url: null,
        reporter_email: reporterEmail,
        status: "Pending Review",
        moderation_status: "Pending Review",
        resident_approved_at: null,
        approved_content: null,
        status_token_hash: statusTokenHash,
        email_verification_token_hash: verificationTokenHash,
        email_verification_expires_at: verificationExpiresAt,
        reporter_email_verified_at: null,
      })
      .select("id, status, moderation_status, district_number, created_at")
      .single();

    if (reportError || !report) {
      console.error("Report creation failed:", reportError?.message);

      return NextResponse.json(
        { error: "Unable to save your report. Please try again." },
        { status: 500 }
      );
    }

    createdReportId = report.id;

    const verificationUrl = new URL(
      "/reports/verify",
      appUrl.origin
    );

    verificationUrl.searchParams.set("token", verificationToken);

    const emailSent = await sendVerificationEmail(
      reporterEmail,
      verificationUrl.toString()
    );

    if (!emailSent) {
      // Do not leave a report behind when its verification email failed.
      const { error: deleteError } = await supabase
        .from("reports")
        .delete()
        .eq("id", report.id);

      if (deleteError) {
        console.error(
          "Cleanup after email failure failed:",
          deleteError.message
        );
      }

      createdReportId = null;

      return NextResponse.json(
        {
          error:
            "We could not send the verification email. Please try again later.",
        },
        { status: 502 }
      );
    }

    // The raw status token is intentionally not returned.
    // Its status-page workflow will be implemented separately.
    void statusToken;

    return NextResponse.json(
      {
        success: true,
        reportId: report.id,
        status: report.status,
        moderationStatus: report.moderation_status,
        districtNumber: report.district_number,
        createdAt: report.created_at,
        message:
          "Your report is saved pending email verification. Check your inbox for a verification link. It has not been sent to an official.",
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error(
      "Report creation failed:",
      error instanceof Error ? error.message : error
    );

    return NextResponse.json(
      { error: "Unable to submit your report. Please try again later." },
      { status: 500 }
    );
  }
}
