export type UserRole = "resident" | "representative" | "admin";

export type IssueStatus =
  | "Submitted"
  | "In Progress"
  | "Pending Resolution"
  | "Resolved";

// src/types/index.ts
export type IssueUrgency =
  | "Low Priority"
  | "Medium Baseline"
  | "High Breakdown"
  | "Critical Danger";

export interface ReportForm {
  title: string;
  description: string;
  category: string;
  zip_code: string;
  district_id?: string | null;
  urgency: IssueUrgency;
  media_url: string;
}

export interface AddressSuggestion {
  display_name: string;
  zip: string;
  lat?: number;
  lon?: number;
}

export interface Profile {
  id: string;
  full_name: string | null;
  role: UserRole;
  zip_code: string | null;
  district_id: string | null;
  avatar_url?: string | null;
  created_at: string;
}

export interface RepMetrics {
  id: string;
  title: string;
  party: string | null;
  district: string;
  total_assigned_issues: number;
  resolved_issues: number;
  avg_resolution_days: number;
  accountability_score: number;
  response_rate_percent?: number;
}

export interface CivicIssue {
  id: string;
  created_at: string;
  updated_at?: string;
  title: string;
  description: string;
  category: string;
  status: IssueStatus;
  zip_code: string;
  latitude?: number | null;
  longitude?: number | null;
  upvotes: number;
  urgency: IssueUrgency;
  reporter_id: string;
  representative_id: string | null;
  resolution_notes?: string | null;
  resolution_proof_url?: string | null;
  council_district?: number | null;
  community_board?: string | null;
  reporter_profile?: Profile;
  comments_count?: number;
}

export interface CivicInitiative {
  id: string;
  title: string;
  description: string;
  category?: string;
  status?: "Draft" | "Active" | "Passed" | "Archived" | string;
  sponsors_count?: number;
  upvotes?: number;
  sponsored_by_id?: string | null;
  district_id?: string | null;
  created_at?: string;
  target_budget?: number | null;
  primary_sponsor_id?: string | null;
  council_district?: number | null;
  community_board?: string | null;
  lat?: number | null;
  lng?: number | null;
  zip_code?: string;
}