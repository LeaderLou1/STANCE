import { createClient } from "@supabase/supabase-js";
import { CivicIssue } from "@/src/types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables in .env.local");
}

// Enabled experimental passkey support here:
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    experimental: {
      passkey: true,
    },
  },
});

/**
 * 1. FETCH ALL CIVIC ISSUES
 * Grabs the latest community posts, including basic reporter details
 */
export async function getIssues() {
  const { data, error } = await supabase
    .from("issues")
    .select("*, reporter:profiles!reporter_id(full_name)")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as (CivicIssue & { reporter: { full_name: string } })[];
}

/**
 * 2. UPVOTE AN ISSUE
 * Directly increments the upvote counter in the database
 */
export async function upvoteIssue(issueId: string, currentUpvotes: number) {
  const { data, error } = await supabase
    .from("issues")
    .update({ upvotes: currentUpvotes + 1 })
    .eq("id", issueId)
    .select()
    .single();

  if (error) throw error;
  return data as CivicIssue;
}

/**
 * 3. UPDATE ISSUE STATUS (For Representatives / Admins)
 * Transitions an issue from 'Submitted' through to 'Resolved'
 */
export async function updateIssueStatus(
  issueId: string,
  status: CivicIssue["status"],
  notes?: string,
  proofUrl?: string,
) {
  const { data, error } = await supabase
    .from("issues")
    .update({
      status,
      resolution_notes: notes || null,
      resolution_proof_url: proofUrl || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", issueId)
    .select()
    .single();

  if (error) throw error;
  return data as CivicIssue;
}

export async function fetchRecent311Data(zipCode: string) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const isoDate = thirtyDaysAgo.toISOString();

  const baseUrl = "https://data.cityofnewyork.us/resource/erm2-nwe9.json";
  const queryParams = new URLSearchParams({
    $where: `incident_zip = '${zipCode}' AND created_date >= '${isoDate}'`,
    $limit: "50",
    $order: "created_date DESC"
  });

  const response = await fetch(`${baseUrl}?${queryParams.toString()}`, {
    headers: {
      // App token goes here to prevent rate limiting
      "X-App-Token": process.env.NEXT_PUBLIC_NYC_APP_TOKEN || ""
    }
  });

  const data = await response.json();
  return data;
}