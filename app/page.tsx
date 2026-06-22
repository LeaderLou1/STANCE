"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/src/lib/supabase";
import { CivicIssue, UserRole } from "@/src/types";
import { Plus, Search, MapPin } from "lucide-react";
import { IssueCard } from "@/src/components/IssueCard";
import { ReportModal } from "@/src/components/ReportModal";

// Import your newly created high-value portal layers
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
  sponsored_by_id: string | null;
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

const defaultForm = {
  title: "",
  description: "",
  category: "Infrastructure",
  zip_code: "",
  urgency: "Medium Baseline",
};

export default function Home() {
  const [issues, setIssues] = useState<IssueWithRep[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrderWithIssue[]>([]);
  const [riskAnalytics, setRiskAnalytics] = useState<RiskData[]>([]);
  const [campaignAnalytics, setCampaignAnalytics] = useState<
    IntelligenceData[]
  >([]);

  // 🌟 NEW: Added initiatives state tracker
  const [initiatives, setInitiatives] = useState<CivicInitiative[]>([]);

  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [isEditing, setIsEditing] = useState(false);
  const [activeEditId, setActiveEditId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [locating, setLocating] = useState(false);
  const [addressInput, setAddressInput] = useState("");
  const [suggestions, setSuggestions] = useState<
    { display_name: string; zip: string; lat?: number; lon?: number }[]
  >([]);

  const [currentRole, setCurrentRole] = useState<UserRole>("resident");
  const [mapCenter, setMapCenter] = useState<[number, number]>([
    40.7128, -74.006,
  ]);

  // Data Stream Sync Functions
  const fetchIssues = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("issues").select(`
        id, created_at, title, description, category, status, zip_code, lat, lng, upvotes, urgency, representative_id, resolution_notes,
        representative:representatives!fk_representative (name, district, party)
      `);
      if (error) throw error;
      setIssues(
        (data ?? []).map((row: any) => ({
          ...row,
          representative: Array.isArray(row.representative)
            ? row.representative[0]
            : row.representative,
        })),
      );
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // 🌟 NEW: Added fetch function for community initiatives
  const fetchInitiatives = async () => {
    try {
      const { data, error } = await supabase
        .from("initiatives")
        .select("*")
        .order("upvotes", { ascending: false });
      if (!error && data) {
        setInitiatives(data as CivicInitiative[]);
      }
    } catch (err) {
      console.error("Initiative stream loading error:", err);
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
    } catch (err) {
      console.error(err);
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
          aggregate_community_urgency: item.aggregate_community_urgency || 2,
        }));
        setRiskAnalytics(cleanData as RiskData[]);
      }
    } catch (err) {
      console.error("Analytics stream failed:", err);
    }
  };

  const fetchCampaignIntelligence = async () => {
    try {
      const { data, error } = await supabase
        .from("campaign_intelligence_analytics")
        .select("*")
        .order("aggregate_voter_friction", { ascending: false });
      if (!error && data) {
        const cleanData = data.map((item: any) => ({
          ...item,
          zip_code: item.zip_code || "10001",
        }));
        setCampaignAnalytics(cleanData as IntelligenceData[]);
      }
    } catch (err) {
      console.error("CRM metrics pull failed:", err);
    }
  };

  // 🌟 NEW: Added transactional sponsor handler for representatives
  const handleSponsorInitiative = async (
    initiativeId: string,
    currentRepId: string,
  ) => {
    try {
      const { error } = await supabase
        .from("initiatives")
        .update({ sponsored_by_id: currentRepId })
        .eq("id", initiativeId);

      if (!error) {
        alert(
          "🎉 Initiative officially sponsored! Mass notification update dispatched to local district upvoters.",
        );
        fetchInitiatives();
      } else {
        throw error;
      }
    } catch (err) {
      console.error("Sponsorship transaction halted:", err);
    }
  };

  useEffect(() => {
    fetchIssues();
    fetchInitiatives(); // Load initiatives on mount
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
  }, []);

  // Mutation Handlers
  const handleUpvote = async (issueId: string) => {
    try {
      const { error } = await supabase.rpc("increment_issue_upvote", {
        issue_id: issueId,
      });
      if (error) throw error;
      setIssues((prev) =>
        prev.map((issue) =>
          issue.id === issueId
            ? { ...issue, upvotes: (issue.upvotes || 0) + 1 }
            : issue,
        ),
      );
      fetchRiskAnalytics();
      fetchCampaignIntelligence();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateStatus = async (issueId: string, newStatus: string) => {
    try {
      const { data, error } = await supabase
        .from("issues")
        .update({ status: newStatus })
        .eq("id", issueId)
        .select()
        .single();
      if (!error) {
        setIssues((prev) =>
          prev.map((item) =>
            item.id === issueId ? { ...item, status: data.status } : item,
          ),
        );
        fetchWorkOrders();
        fetchRiskAnalytics();
        fetchCampaignIntelligence();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteIssue = async (issueId: string) => {
    if (!confirm("Are you sure you want to execute a system delete?")) return;
    try {
      const { error } = await supabase
        .from("issues")
        .delete()
        .eq("id", issueId);
      if (!error) {
        setIssues((prev) => prev.filter((item) => item.id !== issueId));
        fetchRiskAnalytics();
        fetchCampaignIntelligence();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDispatchWorkOrder = async (issueId: string) => {
    const contractor = prompt("Enter Contractor Name / Department:");
    if (!contractor) return;
    try {
      const { error: woError } = await supabase.from("work_orders").insert([
        {
          issue_id: issueId,
          assigned_contractor: contractor,
          status: "Dispatched",
        },
      ]);
      if (woError) throw woError;
      await supabase
        .from("issues")
        .update({ status: "In Progress" })
        .eq("id", issueId);
      fetchIssues();
      fetchWorkOrders();
      fetchRiskAnalytics();
      fetchCampaignIntelligence();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddReply = async (issueId: string) => {
    const replyText = prompt("Type official response:");
    if (!replyText) return;
    try {
      const { error } = await supabase
        .from("issues")
        .update({ resolution_notes: replyText })
        .eq("id", issueId);
      if (!error) {
        fetchIssues();
        fetchCampaignIntelligence();
      }
    } catch (err) {
      console.error(err);
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
    });
    setIsOpen(true);
  };

  const handleNYCAddressSearch = async (query: string) => {
    if (!query.trim()) return;
    setLocating(true);
    try {
      const res = await fetch(
        `https://geosearch.planninglabs.nyc/v1/search?text=${encodeURIComponent(query)}`,
      );
      const data = await res.json();

      if (data && data.features) {
        const mapped = data.features.map((feat: any) => ({
          display_name: feat.properties.label,
          zip: feat.properties.postalcode || "",
          lat: feat.geometry.coordinates[1],
          lon: feat.geometry.coordinates[0],
        }));
        setSuggestions(mapped);
      }
    } catch (err) {
      console.error("NYC Geosearch failed:", err);
    } finally {
      setLocating(false);
    }
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation)
      return alert("Geolocation not supported by your browser.");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setMapCenter([latitude, longitude]);

        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
          );
          const data = await res.json();
          const zip = data.address?.postcode || "";
          setForm((prev) => ({ ...prev, zip_code: zip }));
          setAddressInput(data.display_name || `${latitude}, ${longitude}`);
        } catch (err) {
          console.error("Reverse geocoding failed:", err);
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        console.error(err);
        setLocating(false);
      },
    );
  };

  const handleFormSubmit = async () => {
    try {
      const payload = {
        title: form.title,
        description: form.description,
        category: form.category,
        zip_code: form.zip_code,
        urgency: form.urgency,
        lat: mapCenter[0],
        lng: mapCenter[1],
        status: isEditing ? undefined : "Open",
      };

      if (isEditing && activeEditId) {
        const { error } = await supabase
          .from("issues")
          .update(payload)
          .eq("id", activeEditId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("issues").insert([payload]);
        if (error) throw error;
      }

      closeModal();
      fetchIssues();
      fetchRiskAnalytics();
      fetchCampaignIntelligence();
    } catch (err) {
      console.error("Database submission transaction aborted:", err);
    }
  };

  const closeModal = () => {
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
    <div className="min-h-screen bg-[#f8f9fa] flex flex-col">
      <nav className="bg-[#0f5132] text-white sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="text-2xl font-black tracking-tight">STANCE</span>
            <div className="flex bg-[#0a3621] p-1 rounded-lg border border-[#146c43]">
              {(["resident", "representative", "admin"] as UserRole[]).map(
                (role) => (
                  <button
                    key={role}
                    onClick={() => setCurrentRole(role)}
                    className={`px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${currentRole === role ? "bg-[#198754] text-white shadow" : "text-emerald-300/70 hover:text-white"}`}
                  >
                    {role === "resident"
                      ? "Resident Portal"
                      : role === "representative"
                        ? "Elected CRM"
                        : "System Admin"}
                  </button>
                ),
              )}
            </div>
          </div>
          <button
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-2 bg-[#198754] hover:bg-[#157347] px-4 py-2 rounded-lg text-sm font-semibold shadow"
          >
            <Plus className="w-5 h-5" /> File Infrastructure Report
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8 w-full flex-1">
        {/* 🌟 PREMIUM PORTAL LAYERS LINKED DIRECTLY TO STATE STREAMS */}
        {currentRole === "resident" && (
          <ResidentPortal
            issues={mapFilteredIssues}
            initiatives={initiatives} // ✅ Feeds initiatives state array down to the switcher map
            mapCenter={mapCenter}
            stats={stats}
            handleUpvote={handleUpvote}
          />
        )}

        {currentRole === "representative" && (
          <RepresentativePortal
            campaignAnalytics={campaignAnalytics}
            initiatives={initiatives} // ✅ Passed down state data
            onSponsorInitiative={(id) =>
              handleSponsorInitiative(id, "mock-rep-id-123")
            } // ✅ Passed transaction callback with mock ID
          />
        )}

        {currentRole === "admin" && (
          <AdminPortal workOrders={workOrders} riskAnalytics={riskAnalytics} />
        )}

        {/* --- GLOBAL LOWER TICKET FEED STREAM --- */}
        <div className="mt-10 border-t border-slate-200 pt-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h3 className="text-sm font-extrabold text-gray-900 uppercase tracking-wider">
                Localized Ledger Feed
              </h3>
              <p className="text-xs text-gray-400">
                Search and review open/historical repair parameters.
              </p>
            </div>
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input
                className="w-full pl-9 pr-4 py-1.5 text-xs border rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-[#0f5132]"
                placeholder="Filter by ZIP, category, keywords..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-4">
            {loading && (
              <div className="text-gray-500 animate-pulse text-xs">
                Synchronizing live data streams...
              </div>
            )}
            {!loading && sortedIssues.length === 0 && (
              <div className="text-gray-400 border border-dashed rounded-xl p-12 text-center text-xs">
                No active tickets discovered in this query path.
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
                onDispatchWorkOrder={handleDispatchWorkOrder}
              />
            ))}
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
            onAddressSearch={handleNYCAddressSearch}
            onUseMyLocation={handleUseMyLocation}
            onSelectSuggestion={(s) => {
              setForm((prev) => ({ ...prev, zip_code: s.zip }));
              setAddressInput(s.display_name);
              setSuggestions([]);
              if (s.lat && s.lon) setMapCenter([s.lat, s.lon]);
            }}
            onClose={closeModal}
            onSubmit={handleFormSubmit}
          />
        )}
      </main>
    </div>
  );
}
