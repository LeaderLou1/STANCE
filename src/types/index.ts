export type UserRole = "resident" | "representative" | "admin";
export type IssueStatus =
  | "Submitted"
  | "In Progress"
  | "Pending Resolution"
  | "Resolved";

export interface ReportForm {
  title: string;
  description: string;
  category: string;
  zip_code: string;
  district_id?: string | null;
  urgency: string;
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
  full_name: string;
  role: UserRole;
  zip_code: string | null;
  district_id: string | null;
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
}

export interface CivicIssue {
  id: string;
  created_at: string;
  title: string;
  description: string;
  category: string;
  status: IssueStatus;
  zip_code: string;
  latitude?: number;
  longitude?: number;
  upvotes: number;
  urgency: number;
  reporter_id: string;
  representative_id: string | null;
  resolution_notes?: string;
  resolution_proof_url?: string;
}
