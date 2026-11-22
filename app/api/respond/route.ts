import { NextResponse } from "next/server";
import { createServerAdminClient } from "@/src/lib/serverSupabase";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ACTION_MAP = {
  acknowledged: {
    dbAction: "acknowledged",
    reportStatus: "Acknowledged",
  },
  assigned: {
    dbAction: "assigned",
    reportStatus: "Dispatched",
  },
  resolved: {
    dbAction: "resolved",
    reportStatus: "Resolved",
  },
} as const;

type ActionKey = keyof typeof ACTION_MAP;

interface RespondPayload {
  token?: string;
  action?: string;
  note?: string;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token")?.trim() || "";

  if (!UUID_REGEX.test(token)) {
    return NextResponse.json({ error: "Invalid response link." }, { status: 400 });
  }

  try {
    const supabase = createServerAdminClient();

    const { data: delivery, error: deliveryError } = await supabase
      .from("deliveries")
      .select("id, report_id, recipient_email, recipient_role")
      .eq("resend_token", token)
      .maybeSingle();

    if (deliveryError || !delivery) {
      return NextResponse.json(
        { error: "This response link is invalid or has expired." },
        { status: 404 }
      );
    }

    const { data: report, error: reportError } = await supabase
      .from("reports")
      .select("id, title, description, category, status, district_number, created_at")
      .eq("id", delivery.report_id)
      .single();

    if (reportError || !report) {
      return NextResponse.json({ error: "Associated report not found." }, { status: 404 });
    }

    return NextResponse.json({
      recipientRole: delivery.recipient_role,
      report,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to verify token.";
    console.error("Official respond GET error:", message);
    return NextResponse.json({ error: "Unable to load report." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RespondPayload;
    const token = body.token?.trim() || "";
    const action = body.action as ActionKey;
    const note = body.note?.trim() || null;

    if (!UUID_REGEX.test(token)) {
      return NextResponse.json({ error: "Invalid response token." }, { status: 400 });
    }

    if (!(action in ACTION_MAP)) {
      return NextResponse.json({ error: "Invalid action selected." }, { status: 400 });
    }

    const supabase = createServerAdminClient();

    const { data: delivery, error: deliveryError } = await supabase
      .from("deliveries")
      .select("id, report_id, recipient_email, recipient_role")
      .eq("resend_token", token)
      .maybeSingle();

    if (deliveryError || !delivery) {
      return NextResponse.json(
        { error: "This response link is invalid or has expired." },
        { status: 404 }
      );
    }

    const mapped = ACTION_MAP[action];

    // 1. Insert into responses log
    const { error: responseInsertError } = await supabase.from("responses").insert({
      report_id: delivery.report_id,
      delivery_id: delivery.id,
      action_type: mapped.dbAction,
      note,
    });

    if (responseInsertError) {
      throw new Error(responseInsertError.message);
    }

    // 2. Update parent report status
    const { error: reportUpdateError } = await supabase
      .from("reports")
      .update({ status: mapped.reportStatus })
      .eq("id", delivery.report_id);

    if (reportUpdateError) {
      throw new Error(reportUpdateError.message);
    }

    return NextResponse.json({
      success: true,
      newStatus: mapped.reportStatus,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to record response.";
    console.error("Official respond POST error:", message);
    return NextResponse.json({ error: "Unable to record response." }, { status: 500 });
  }
}