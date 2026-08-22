"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/src/lib/supabase";
import { AddressSuggestion, CivicIssue, ReportForm, UserRole } from "@/src/types";
import { Plus, Search } from "lucide-react";
import { IssueCard } from "@/src/components/IssueCard";
import { ReportModal } from "@/src/components/ReportModal";
import { AuthPanel } from "@/src/components/AuthPanel";

// Import portal layers
import { ResidentPortal } from "@/src/components/portals/ResidentPortal";
import { RepresentativePortal } from "@/src/components/portals/RepresentativePortal";
import { AdminPortal } from "@/src/components/portals/AdminPortal";

// Import core types directly from CivicCRM to prevent duplicate locally declared interfaces
import { IntelligenceData } from "@/src/components/CivicCRM";

// 👑 COMPONENT-ALIGNED TYPE INTERFACES
export interface WorkOrderWithIssue {
  id: string;
  dispatched_at: string;
  completed_at: string | null;
  assigned_contractor: string;
  issue: {
    title: string;
    urgency: string;
  };
}

export interface CivicInitiative {
  id: string;
  created_at: string;
  title: string;
  description: string;
  category: string;
  zip_code: string;
  lat: number | null;
  lng: number | null;
  upvotes: number;
  event_date?: string;
  representative?: { name: string; district: string; party: string } | null;
}

export interface RiskData {
  id: string;
  zip_code: string;
  calculated_risk_score: number;
  macro_category_vulnerability: string;
  historical_failure_count: number;
  last_evaluated_at: string;
  category: string;
  total_complaints: number;
  aggregate_community_urgency: number;
}

type IssueWithRep = CivicIssue & {
  urgency?: string;
  lat?: number | null;
  lng?: number | null;
  representative?: { name: string; district: string; party: string } | null;
};

const defaultForm: ReportForm = {
  title: "",
  description: "",
  category: "Infrastructure",
  zip_code: "",
  urgency: "Medium Baseline",
  media_url: "",
};

export default function Home() {
  const [issues, setIssues] = useState<IssueWithRep[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrderWithIssue[]>([]);
  const [riskAnalytics, setRiskAnalytics] = useState<RiskData[]>([]);
  const [campaignAnalytics, setCampaignAnalytics] = useState<
    IntelligenceData[]
  >([]);

  const [initiatives, setInitiatives] = useState<CivicInitiative[]>([]);

  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState<ReportForm>(defaultForm);
  const [isEditing, setIsEditing] = useState(false);
  const [activeEditId, setActiveEditId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [issuePage, setIssuePage] = useState(0);
  const [hasMoreIssues, setHasMoreIssues] = useState(false);
  const [locating, setLocating] = useState(false);
  const [addressInput, setAddressInput] = useState("");
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmationMessage, setConfirmationMessage] = useState("");
  const geosearchRequestRef = useRef(0);
  const [authenticatedUser, setAuthenticatedUser] = useState<User | null>(null);
  const handleUserChange = useCallback(async (user: User | null) => {
    setAuthenticatedUser(user);
    if (!user) {
      setCurrentRole("resident");
      return;
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    setCurrentRole(profile?.role === "admin" || profile?.role === "representative" ? profile.role : "resident");
  }, []);

  const [currentRole, setCurrentRole] = useState<UserRole>("resident");
  const [mapCenter, setMapCenter] = useState<[number, number]>([
    40.7128, -74.006,
  ]);

  // Data Stream Sync Functions
  const fetchIssues = async () => {
    setLoading(true);
    try {
      const pageSize = 25;
      let issueQuery = supabase.from("issues").select(`
        id, created_at, title, description, category, status, zip_code, district_id, lat, lng, upvotes, urgency, representative_id, resolution_notes, resolution_proof_url,
        representative:representatives!fk_representative (name, district, party)
      `, { count: "exact" }).order("created_at", { ascending: false }).range(
        issuePage * pageSize,
        issuePage * pageSize + pageSize - 1,
      );
      if (searchQuery.trim()) {
        issueQuery = issueQuery.or(
          `title.ilike.%${searchQuery.trim()}%,description.ilike.%${searchQuery.trim()}%,category.ilike.%${searchQuery.trim()}%,zip_code.ilike.%${searchQuery.trim()}%`,
        );
      }
      const { data, error, count } = await issueQuery;
      if (error) throw error;
      setHasMoreIssues((count ?? 0) > (issuePage + 1) * pageSize);
      const rows = await Promise.all(
        (data ?? []).map(async (row: any) => {
          const mediaPath = row.resolution_proof_url;
          let mediaUrl = mediaPath;
          if (mediaPath && !mediaPath.startsWith("http")) {
            const { data: signedMedia } = await supabase.storage
              .from("issue-media")
              .createSignedUrl(mediaPath, 3600);
            mediaUrl = signedMedia?.signedUrl ?? null;
          }
          return {
            ...row,
            resolution_proof_url: mediaUrl,
            representative: Array.isArray(row.representative)
              ? row.representative[0]
              : row.representative,
          };
        }),
      );
      setIssues(rows);
    } catch (err: any) {
      console.error("fetchIssues error:", err?.message || err);
    } finally {
      setLoading(false);
    }
  };

  const fetchInitiatives = async () => {
    try {
      const { data, error } = await supabase
        .from("initiatives")
        .select("*")
        .order("upvotes", { ascending: false });
      if (!error && data) {
        setInitiatives(data as CivicInitiative[]);
      }
    } catch (err: any) {
      console.error("Initiative stream loading error:", err?.message || err);
    }
  };

  const fetchWorkOrders = async () => {
    try {
      const { data, error } = await supabase
        .from("work_orders")
        .select(
          `id, dispatched_at, completed_at, assigned_contractor, issue:issues(title, urgency)`,
        );
      if (!error && data) {
        const cleanData = data.map((item: any) => ({
          ...item,
          issue: item.issue
            ? item.issue
            : { title: "Unknown Assignment", urgency: "Medium Baseline" },
        }));
        setWorkOrders(cleanData as WorkOrderWithIssue[]);
      }
    } catch (err: any) {
      console.error("fetchWorkOrders error:", err?.message || err);
    }
  };

  const fetchRiskAnalytics = async () => {
    try {
      const { data, error } = await supabase
        .from("district_risk_analytics")
        .select("*")
        .order("calculated_risk_score", { ascending: false });
      if (!error && data) {
        const cleanData = data.map((item: any) => ({
          ...item,
          category:
            item.category || item.macro_category_vulnerability || "General",
          total_complaints:
            item.total_complaints || item.historical_failure_count || 0,
          aggregate_community_urgency: item.aggregate_community_urgency ?? null,
        }));
        setRiskAnalytics(cleanData as RiskData[]);
      }
    } catch (err: any) {
      console.error("Analytics stream failed:", err?.message || err);
    }
  };

  const fetchCampaignIntelligence = async () => {
    try {
      const { data, error } = await supabase
        .from("campaign_intelligence_analytics")
        .select("*")
        .order("aggregate_voter_friction", { ascending: false });
      if (!error && data) {
        const cleanData = data.filter((item: any) => item.zip_code);
        setCampaignAnalytics(cleanData as IntelligenceData[]);
      }
    } catch (err: any) {
      console.error("CRM metrics pull failed:", err?.message || err);
    }
  };

  useEffect(() => {
    fetchIssues();
    fetchInitiatives();
    fetchWorkOrders();
    fetchRiskAnalytics();
    fetchCampaignIntelligence();

    // Setup listener updates across both tables
    const issueSubscription = supabase
      .channel("public:civic_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "issues" },
        () => {
          fetchIssues();
          fetchWorkOrders();
          fetchRiskAnalytics();
          fetchCampaignIntelligence();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "initiatives" },
        () => {
          fetchInitiatives();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(issueSubscription);
    };
  }, [issuePage, searchQuery]);

  // Mutation Handlers
  const handleUpvote = async (issueId: string) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error("Please sign in to vote.");
      const response = await fetch(`/api/issues/${issueId}/vote`, {
        method: "POST",
        headers: { Authorization: `Bearer ${sessionData.session.access_token}` },
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to record vote.");
      setIssues((prev) =>
        prev.map((issue) =>
          issue.id === issueId
            ? { ...issue, upvotes: result.upvotes }
            : issue,
        ),
      );
      fetchRiskAnalytics();
      fetchCampaignIntelligence();
    } catch (err: any) {
      console.error("Upvote failed:", err?.message || err);
    }
  };

  const handleUpdateStatus = async (issueId: string, newStatus: string) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error("Please sign in to update reports.");
      const response = await fetch(`/api/issues/${issueId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!response.ok) throw new Error((await response.json()).error || "Unable to update report.");
      fetchIssues();
      fetchWorkOrders();
      fetchRiskAnalytics();
      fetchCampaignIntelligence();
    } catch (err: any) {
      console.error("Update status failed:", err?.message || err);
    }
  };

  const handleDeleteIssue = async (issueId: string) => {
    if (!confirm("Are you sure you want to execute a system delete?")) return;
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error("Please sign in to delete reports.");
      const response = await fetch(`/api/issues/${issueId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${sessionData.session.access_token}` },
      });
      if (!response.ok) throw new Error((await response.json()).error || "Unable to delete report.");
      setIssues((prev) => prev.filter((item) => item.id !== issueId));
      fetchRiskAnalytics();
      fetchCampaignIntelligence();
    } catch (err: any) {
      console.error("Delete issue failed:", err?.message || err);
    }
  };

  const handleAddReply = async (issueId: string) => {
    const replyText = prompt("Type official response:");
    if (!replyText) return;
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error("Please sign in to reply.");
      const response = await fetch(`/api/issues/${issueId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
        body: JSON.stringify({ resolution_notes: replyText }),
      });
      if (!response.ok) throw new Error((await response.json()).error || "Unable to add reply.");
      fetchIssues();
      fetchCampaignIntelligence();
    } catch (err: any) {
      console.error("Add reply failed:", err?.message || err);
    }
  };

  const startEditing = (issue: IssueWithRep) => {
    setIsEditing(true);
    setActiveEditId(issue.id);
    setForm({
      title: issue.title || "",
      description: issue.description || "",
      category: issue.category || "Infrastructure",
      zip_code: issue.zip_code || "",
      urgency: issue.urgency || "Medium Baseline",
      media_url: issue.resolution_proof_url || "",
    });
    setIsOpen(true);
  };

 const handleNYCAddressSearch = async (query: string) => {
  const requestId = ++geosearchRequestRef.current;
  setAddressInput(query);
  if (query.trim().length < 3) {
    setSuggestions([]);
    return;
  }

  setLocating(true);
  try {
    const res = await fetch(`/api/geosearch?text=${encodeURIComponent(query)}`);
    if (!res.ok) {
      throw new Error(`Geosearch request failed with status: ${res.status}`);
    }
    const data = await res.json();
    if (requestId !== geosearchRequestRef.current) return;

    if (data && data.features) {
      const mapped = data.features.map((feat: any) => ({
        display_name: feat.properties.label,
        zip: feat.properties.postalcode || "",
        lat: feat.geometry.coordinates[1],
        lon: feat.geometry.coordinates[0],
      }));
      setSuggestions(mapped);
    }
  } catch (err: any) {
    console.error("NYC Geosearch failed:", err?.message || err);
  } finally {
    setLocating(false);
  }
};

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      console.error("Geolocation is not supported by this browser.");
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setMapCenter([latitude, longitude]);
        setAddressInput("Current location");
        setSuggestions([]);
        setLocating(false);
      },
      (err) => {
        console.error("Location access failed:", err.message || err);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const handleFormSubmit = async () => {
    const title = form.title.trim();
    const description = form.description.trim();
    const zipCode = form.zip_code.trim();

    if (title.length < 5) {
      setFormError("Please provide a short issue summary (at least 5 characters).");
      return;
    }
    if (description.length < 10) {
      setFormError("Please describe the issue in at least 10 characters.");
      return;
    }
    if (!/^\d{5}$/.test(zipCode)) {
      setFormError("Enter a valid 5-digit ZIP code.");
      return;
    }

    setFormError("");
    setSubmitting(true);
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;
      if (!user) {
        throw new Error("Please sign in before submitting a report.");
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Your session expired. Please sign in again.");

      const payload = {
        title,
        description,
        category: form.category,
        zip_code: zipCode,
        urgency: form.urgency,
        lat: mapCenter[0],
        lng: mapCenter[1],
        status: isEditing ? undefined : "Submitted",
      };

      if (isEditing && activeEditId) {
        const { error } = await supabase
          .from("issues")
          .update(payload)
          .eq("id", activeEditId);
        if (error) throw error;
      } else {
        const response = await fetch("/api/issues", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            ...payload,
            resolution_proof_url: form.media_url || null,
          }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Unable to submit report.");
      }

      closeModal(true);
      setConfirmationMessage(
        isEditing ? "Report updated successfully." : "Report submitted successfully.",
      );
      fetchIssues();
      fetchRiskAnalytics();
      fetchCampaignIntelligence();
    } catch (err: any) {
      console.error("Database submission failed:", err?.message || err);
      setFormError(
        err?.message || "We could not submit this report. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const closeModal = (preserveMedia = false) => {
    if (!preserveMedia && !isEditing && form.media_url) {
      void supabase.storage.from("issue-media").remove([form.media_url]);
    }
    setForm(defaultForm);
    setAddressInput("");
    setSuggestions([]);
    setIsOpen(false);
    setIsEditing(false);
    setActiveEditId(null);
  };

  const mapFilteredIssues = useMemo(
    () => issues.filter((i) => i.lat !== null && i.lng !== null),
    [issues],
  );

  const sortedIssues = useMemo(() => {
    const weights: Record<string, number> = {
      "Critical Danger": 4,
      "High Breakdown": 3,
      "Medium Baseline": 2,
      "Low Priority": 1,
    };
    const search = searchQuery.toLowerCase().trim();
    return issues
      .filter(
        (i) =>
          !search ||
          i.title?.toLowerCase().includes(search) ||
          i.zip_code?.toLowerCase().includes(search) ||
          i.category?.toLowerCase().includes(search),
      )
      .sort(
        (a, b) =>
          ((weights[b.urgency || ""] || 0) - (weights[a.urgency || ""] || 0)) *
            100 +
          ((b.upvotes ?? 0) - (a.upvotes ?? 0)),
      );
  }, [issues, searchQuery]);

  const stats = useMemo(() => {
    const total = issues.length;
    const resolved = issues.filter((i) => i.status === "Resolved").length;
    const inProgress = issues.filter((i) => i.status === "In Progress").length;
    return {
      total,
      inProgress,
      resolved,
      rate: total > 0 ? Math.round((resolved / total) * 100) : 0,
    };
  }, [issues]);

  return (
    <div className="min-h-screen flex flex-col text-[#17211d]">
      <nav className="sticky top-0 z-50 border-b border-[#cbd5cc] bg-[#f3f1ec]/95 text-[#17211d] shadow-[0_4px_20px_rgba(23,33,29,0.05)] backdrop-blur">
        <div className="mx-auto flex min-h-[4.5rem] w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-5">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#123b2a] text-sm font-black text-[#f3f1ec]">S</span>
              <span className="text-xl font-black tracking-[-0.04em]">STANCE</span>
            </div>
            <div className="hidden items-center gap-2 border border-[#cbd5cc] bg-[#e9e7e0] px-3 py-2 sm:flex">
              <span className="h-2 w-2 rounded-full bg-[#2f7d5b]" />
              <span className="text-xs font-bold capitalize text-[#365444]">{currentRole} workspace</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
          <button
            disabled={!authenticatedUser}
            title={
              authenticatedUser
                ? "Create a civic report"
                : "Sign in to create a civic report"
            }
            onClick={() => {
              setConfirmationMessage("");
              setFormError("");
              setIsOpen(true);
            }}
            className="flex items-center gap-2 rounded-lg bg-[#d89542] px-4 py-2 text-sm font-bold text-[#17211d] shadow-[0_3px_0_#b7732d] transition hover:-translate-y-0.5 hover:bg-[#e2a351] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
          >
            <Plus className="h-4 w-4" /> New report
          </button>
          <AuthPanel onUserChange={handleUserChange} />
          </div>
        </div>
      </nav>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:py-12">
        {confirmationMessage && (
          <div
            role="status"
            className="mb-6 border border-[#a9c8b3] bg-[#e5f0e7] px-4 py-3 text-sm font-semibold text-[#1e5b3d]"
          >
            {confirmationMessage}
          </div>
        )}
        {/* PORTAL LAYERS */}
        {currentRole === "resident" && (
          <ResidentPortal
            issues={mapFilteredIssues}
            initiatives={initiatives}
            mapCenter={mapCenter}
            stats={stats}
            handleUpvote={handleUpvote}
          />
        )}

        {currentRole === "representative" && (
          <RepresentativePortal campaignAnalytics={campaignAnalytics} />
        )}

        {currentRole === "admin" && (
          <AdminPortal workOrders={workOrders} riskAnalytics={riskAnalytics} />
        )}

        {/* LOWER TICKET FEED STREAM */}
        <div className="mt-14 border-t border-[#cbd5cc] pt-10">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#b7732d]">
                Public record
              </p>
              <h3 className="text-2xl font-black tracking-[-0.04em] text-[#17211d]">
                Reports in your community
              </h3>
              <p className="mt-1 text-sm text-[#647168]">
                Search, support, and follow the issues neighbors have raised.
              </p>
            </div>
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input
                className="w-full rounded-lg border border-[#cbd5cc] bg-[#fffefa] py-2.5 pl-9 pr-4 text-sm shadow-sm outline-none transition focus:border-[#2f7d5b] focus:ring-2 focus:ring-[#dbe8df]"
                placeholder="Filter by ZIP, category, keywords..."
                value={searchQuery}
                onChange={(e) => {
                  setIssuePage(0);
                  setSearchQuery(e.target.value);
                }}
              />
            </div>
          </div>

          <div className="space-y-4">
            {loading && (
              <div className="border border-[#cbd5cc] bg-[#fffefa] p-8 text-sm text-[#647168] animate-pulse">
                Loading community reports...
              </div>
            )}
            {!loading && sortedIssues.length === 0 && (
              <div className="border border-dashed border-[#aebbb1] bg-[#fffefa]/60 p-12 text-center">
                <p className="text-sm font-bold text-[#17211d]">No reports found</p>
                <p className="mt-1 text-sm text-[#647168]">Try another search or be the first to report an issue here.</p>
              </div>
            )}

            {sortedIssues.map((issue) => (
              <IssueCard
                key={issue.id}
                issue={issue}
                currentRole={currentRole}
                onUpvote={handleUpvote}
                onUpdateStatus={handleUpdateStatus}
                onStartEditing={startEditing}
                onDelete={handleDeleteIssue}
                onAddReply={handleAddReply}
              />
            ))}

            {!loading && (issuePage > 0 || hasMoreIssues) && (
              <div className="flex items-center justify-between border-t border-[#cbd5cc] pt-4">
                <button
                  type="button"
                  disabled={issuePage === 0}
                  onClick={() => setIssuePage((page) => Math.max(0, page - 1))}
                  className="border border-[#cbd5cc] bg-[#fffefa] px-3 py-2 text-xs font-bold text-[#647168] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="text-xs font-bold text-[#647168]">Page {issuePage + 1}</span>
                <button
                  type="button"
                  disabled={!hasMoreIssues}
                  onClick={() => setIssuePage((page) => page + 1)}
                  className="border border-[#cbd5cc] bg-[#123b2a] px-3 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>

        {isOpen && (
          <ReportModal
            isEditing={isEditing}
            form={form}
            setForm={setForm}
            addressInput={addressInput}
            suggestions={suggestions}
            locating={locating}
            formError={formError}
            submitting={submitting}
            onAddressSearch={handleNYCAddressSearch}
            onSelectSuggestion={(s) => {
              setForm((prev) => ({ ...prev, zip_code: s.zip }));
              setAddressInput(s.display_name);
              setSuggestions([]);
              if (s.lat && s.lon) setMapCenter([s.lat, s.lon]);
            } }
            onClose={closeModal}
            onSubmit={handleFormSubmit}
            onUseMyLocation={handleUseMyLocation}
          />
        )}
      </main>
    </div>
  );
}