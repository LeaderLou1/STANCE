"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { User } from "@supabase/supabase-js";
import type { AuthPanelProps } from "../src/components/AuthPanel";
import { supabase } from "@/src/lib/supabase";
import {
  AddressSuggestion,
  CivicIssue,
  IssueUrgency,
  ReportForm,
  UserRole,
} from "@/src/types";
import { Plus, Search } from "lucide-react";
import { IssueCard } from "@/src/components/IssueCard";
import { ReportModal } from "@/src/components/ReportModal";
import dynamic from "next/dynamic";

// Portal layers
import { ResidentPortal } from "@/src/components/portals/ResidentPortal";
import { RepresentativePortal } from "@/src/components/portals/RepresentativePortal";
import { AdminPortal } from "@/src/components/portals/AdminPortal";

// Core type from CivicCRM
import { IntelligenceData } from "@/src/components/CivicCRM";

const AuthPanel = dynamic<AuthPanelProps>(
  () =>
    import("../src/components/AuthPanel").then(
      (mod) => mod.AuthPanel
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-9 w-32 animate-pulse rounded-lg bg-[#e9e7e0]" />
    ),
  }
);

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
  representative?: {
    name: string;
    district: string;
    party: string;
  } | null;
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

/**
 * IMPORTANT:
 * Do NOT redeclare `urgency` here.
 *
 * CivicIssue already owns the urgency type.
 * Redefining it inside an intersection was causing
 * TypeScript to reduce IssueWithRep to `never`.
 */
type IssueWithRep = CivicIssue & {
  lat?: number | null;
  lng?: number | null;
  representative?: RepresentativeRow | null;
};

type RepresentativeRow = {
  name: string;
  district: string;
  party: string;
};

type IssueQueryRow = {
  id: string;
  created_at: string;
  title: string;
  description: string;
  category: string;
  status: string;
  zip_code: string;
  district_id: string | null;
  lat: number | null;
  lng: number | null;
  upvotes: number;
  urgency: IssueUrgency | null;
  reporter_id: string;
  representative_id: string | null;
  resolution_notes: string | null;
  resolution_proof_url: string | null;
  representative:
    | RepresentativeRow
    | RepresentativeRow[]
    | null;
};

type WorkOrderIssueRow = {
  title: string;
  urgency: string;
};

type WorkOrderQueryRow = {
  id: string;
  dispatched_at: string;
  completed_at: string | null;
  assigned_contractor: string;
  issue:
    | WorkOrderIssueRow
    | WorkOrderIssueRow[]
    | null;
};

type RiskAnalyticsRow = {
  id: string;
  zip_code: string;
  calculated_risk_score: number;
  macro_category_vulnerability: string;
  historical_failure_count: number;
  last_evaluated_at: string;
  category: string | null;
  total_complaints: number | null;
  aggregate_community_urgency: number | null;
};

type CampaignAnalyticsRow = IntelligenceData & {
  zip_code?: string | null;
};

type GeosearchFeature = {
  properties?: {
    label?: string;
    postalcode?: string;
  };
  geometry?: {
    coordinates?: [number, number];
  };
};

type GeosearchResponse = {
  features?: GeosearchFeature[];
};

const defaultForm: ReportForm = {
  title: "",
  description: "",
  category: "Infrastructure",
  zip_code: "",
  urgency: "Medium Baseline",
  media_url: "",
};

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return "An unexpected error occurred.";
}

export default function Home() {
  const [issues, setIssues] = useState<IssueWithRep[]>([]);

  const [workOrders, setWorkOrders] = useState<
    WorkOrderWithIssue[]
  >([]);

  const [riskAnalytics, setRiskAnalytics] = useState<
    RiskData[]
  >([]);

  const [campaignAnalytics, setCampaignAnalytics] =
    useState<IntelligenceData[]>([]);

  const [initiatives, setInitiatives] = useState<
    CivicInitiative[]
  >([]);

  const [loading, setLoading] = useState(true);

  const [isOpen, setIsOpen] = useState(false);

  const [form, setForm] =
    useState<ReportForm>(defaultForm);

  const [isEditing, setIsEditing] = useState(false);

  const [activeEditId, setActiveEditId] =
    useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");

  const [issuePage, setIssuePage] = useState(0);

  const [hasMoreIssues, setHasMoreIssues] =
    useState(false);

  const [locating, setLocating] = useState(false);

  const [addressInput, setAddressInput] = useState("");

  const [suggestions, setSuggestions] =
    useState<AddressSuggestion[]>([]);

  const [formError, setFormError] = useState("");

  const [submitting, setSubmitting] = useState(false);

  const [confirmationMessage, setConfirmationMessage] =
    useState("");

  const geosearchRequestRef = useRef(0);

  const [authenticatedUser, setAuthenticatedUser] =
    useState<User | null>(null);

  const [currentRole, setCurrentRole] =
    useState<UserRole>("resident");

  const [mapCenter, setMapCenter] =
    useState<[number, number]>([
      40.7128,
      -74.006,
    ]);

  const handleUserChange = useCallback(
    async (user: User | null) => {
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

      setCurrentRole(
        profile?.role === "admin" ||
          profile?.role === "representative"
          ? profile.role
          : "resident"
      );
    },
    []
  );

  const fetchIssues = useCallback(async () => {
    setLoading(true);

    try {
      const pageSize = 25;

      let issueQuery = supabase
        .from("issues")
        .select(
          `
          id,
          created_at,
          title,
          description,
          category,
          status,
          zip_code,
          district_id,
          lat,
          lng,
          upvotes,
          urgency,
          reporter_id,
          representative_id,
          resolution_notes,
          resolution_proof_url,
          representative:representatives!fk_representative (
            name,
            district,
            party
          )
        `,
          { count: "exact" }
        )
        .order("created_at", {
          ascending: false,
        })
        .range(
          issuePage * pageSize,
          issuePage * pageSize +
            pageSize -
            1
        );

      if (searchQuery.trim()) {
        issueQuery = issueQuery.or(
          `title.ilike.%${searchQuery.trim()}%,description.ilike.%${searchQuery.trim()}%,category.ilike.%${searchQuery.trim()}%,zip_code.ilike.%${searchQuery.trim()}%`
        );
      }

      const {
        data,
        error,
        count,
      } = await issueQuery;

      if (error) {
        throw error;
      }

      setHasMoreIssues(
        (count ?? 0) >
          (issuePage + 1) * pageSize
      );

      const rows = await Promise.all(
        ((data ?? []) as IssueQueryRow[]).map(
          async (
            row
          ): Promise<IssueWithRep> => {
            const mediaPath =
              row.resolution_proof_url;

            let mediaUrl =
              mediaPath;

            if (
              mediaPath &&
              !mediaPath.startsWith("http")
            ) {
              const {
                data: signedMedia,
              } =
                await supabase.storage
                  .from("issue-media")
                  .createSignedUrl(
                    mediaPath,
                    3600
                  );

              mediaUrl =
                signedMedia?.signedUrl ??
                null;
            }

            return {
              id: row.id,
              created_at: row.created_at,
              title: row.title,
              description: row.description,
              category: row.category,

              status:
                row.status as CivicIssue["status"],

              zip_code: row.zip_code,

              latitude: row.lat,
              longitude: row.lng,

              upvotes: row.upvotes ?? 0,

              urgency:
                row.urgency ??
                "Medium Baseline",

              reporter_id:
                row.reporter_id,

              representative_id:
                row.representative_id,

              resolution_notes:
                row.resolution_notes,

              resolution_proof_url:
                mediaUrl,

              lat: row.lat,
              lng: row.lng,

              representative:
                Array.isArray(
                  row.representative
                )
                  ? row.representative[0] ??
                    null
                  : row.representative,
            };
          }
        )
      );

      setIssues(rows);
    } catch (error: unknown) {
      console.error(
        "fetchIssues error:",
        getErrorMessage(error)
      );
    } finally {
      setLoading(false);
    }
  }, [issuePage, searchQuery]);

  const fetchInitiatives =
    useCallback(async () => {
      try {
        const {
          data,
          error,
        } = await supabase
          .from("initiatives")
          .select("*")
          .order("upvotes", {
            ascending: false,
          });

        if (error) {
          throw error;
        }

        if (data) {
          setInitiatives(
            data as CivicInitiative[]
          );
        }
      } catch (error: unknown) {
        console.error(
          "Initiative stream loading error:",
          getErrorMessage(error)
        );
      }
    }, []);

  const fetchWorkOrders =
    useCallback(async () => {
      try {
        const {
          data,
          error,
        } = await supabase
          .from("work_orders")
          .select(
            `
          id,
          dispatched_at,
          completed_at,
          assigned_contractor,
          issue:issues(title, urgency)
        `
          );

        if (error) {
          throw error;
        }

        if (data) {
          const cleanData = (
            data as WorkOrderQueryRow[]
          ).map((item) => {
            const issue =
              Array.isArray(item.issue)
                ? item.issue[0]
                : item.issue;

            return {
              ...item,
              issue:
                issue ?? {
                  title:
                    "Unknown Assignment",
                  urgency:
                    "Medium Baseline",
                },
            };
          });

          setWorkOrders(cleanData);
        }
      } catch (error: unknown) {
        console.error(
          "fetchWorkOrders error:",
          getErrorMessage(error)
        );
      }
    }, []);

  const fetchRiskAnalytics =
    useCallback(async () => {
      try {
        const {
          data,
          error,
        } = await supabase
          .from("district_risk_analytics")
          .select("*")
          .order(
            "calculated_risk_score",
            {
              ascending: false,
            }
          );

        if (error) {
          throw error;
        }

        if (data) {
          const cleanData = (
            data as RiskAnalyticsRow[]
          ).map((item) => ({
            ...item,

            category:
              item.category ||
              item.macro_category_vulnerability ||
              "General",

            total_complaints:
              item.total_complaints ??
              item.historical_failure_count ??
              0,

            aggregate_community_urgency:
              item.aggregate_community_urgency ??
              0,
          }));

          setRiskAnalytics(cleanData);
        }
      } catch (error: unknown) {
        console.error(
          "Analytics stream failed:",
          getErrorMessage(error)
        );
      }
    }, []);

  const fetchCampaignIntelligence =
    useCallback(async () => {
      try {
        const {
          data,
          error,
        } = await supabase
          .from(
            "campaign_intelligence_analytics"
          )
          .select("*")
          .order(
            "aggregate_voter_friction",
            {
              ascending: false,
            }
          );

        if (error) {
          throw error;
        }

        if (data) {
          const cleanData = (
            data as CampaignAnalyticsRow[]
          ).filter(
            (item) =>
              Boolean(
                item.zip_code
              )
          );

          setCampaignAnalytics(
            cleanData
          );
        }
      } catch (error: unknown) {
        console.error(
          "CRM metrics pull failed:",
          getErrorMessage(error)
        );
      }
    }, []);

  useEffect(() => {
    const timeoutId =
      window.setTimeout(() => {
        void Promise.all([
          fetchIssues(),
          fetchInitiatives(),
          fetchWorkOrders(),
          fetchRiskAnalytics(),
          fetchCampaignIntelligence(),
        ]);
      }, 0);

    const issueSubscription =
      supabase
        .channel("public:civic_changes")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "issues",
          },
          () => {
            void fetchIssues();
            void fetchWorkOrders();
            void fetchRiskAnalytics();
            void fetchCampaignIntelligence();
          }
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "initiatives",
          },
          () => {
            void fetchInitiatives();
          }
        )
        .subscribe();

    return () => {
      window.clearTimeout(timeoutId);

      void supabase.removeChannel(
        issueSubscription
      );
    };
  }, [
    fetchIssues,
    fetchInitiatives,
    fetchWorkOrders,
    fetchRiskAnalytics,
    fetchCampaignIntelligence,
  ]);

  const handleUpvote = async (
    issueId: string
  ) => {
    const previousIssues = [...issues];

    setIssues((prev) =>
      prev.map((issue) =>
        issue.id === issueId
          ? {
              ...issue,
              upvotes:
                (issue.upvotes ?? 0) + 1,
            }
          : issue
      )
    );

    try {
      const {
        data: sessionData,
      } =
        await supabase.auth.getSession();

      if (!sessionData.session) {
        throw new Error(
          "Please sign in to vote."
        );
      }

      const response =
        await fetch(
          `/api/issues/${issueId}/vote`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${sessionData.session.access_token}`,
            },
          }
        );

      const result: {
        error?: string;
        upvotes?: number;
      } = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Unable to record vote."
        );
      }

      setIssues((prev) =>
        prev.map((issue) =>
          issue.id === issueId
            ? {
                ...issue,
                upvotes:
                  result.upvotes ??
                  issue.upvotes ??
                  0,
              }
            : issue
        )
      );
    } catch (error: unknown) {
      setIssues(previousIssues);

      console.error(
        "Upvote failed, rolling back:",
        getErrorMessage(error)
      );
    }
  };

  const handleUpdateStatus =
    async (
      issueId: string,
      newStatus: string
    ) => {
      try {
        const {
          data: sessionData,
        } =
          await supabase.auth.getSession();

        if (!sessionData.session) {
          throw new Error(
            "Please sign in to update reports."
          );
        }

        const response =
          await fetch(
            `/api/issues/${issueId}`,
            {
              method: "PATCH",
              headers: {
                "Content-Type":
                  "application/json",
                Authorization: `Bearer ${sessionData.session.access_token}`,
              },
              body: JSON.stringify({
                status: newStatus,
              }),
            }
          );

        const result: {
          error?: string;
        } = await response.json();

        if (!response.ok) {
          throw new Error(
            result.error ||
              "Unable to update report."
          );
        }

        void fetchIssues();
        void fetchWorkOrders();
        void fetchRiskAnalytics();
        void fetchCampaignIntelligence();
      } catch (error: unknown) {
        console.error(
          "Update status failed:",
          getErrorMessage(error)
        );
      }
    };

  const handleDeleteIssue =
    async (issueId: string) => {
      if (
        !confirm(
          "Are you sure you want to execute a system delete?"
        )
      ) {
        return;
      }

      try {
        const {
          data: sessionData,
        } =
          await supabase.auth.getSession();

        if (!sessionData.session) {
          throw new Error(
            "Please sign in to delete reports."
          );
        }

        const response =
          await fetch(
            `/api/issues/${issueId}`,
            {
              method: "DELETE",
              headers: {
                Authorization: `Bearer ${sessionData.session.access_token}`,
              },
            }
          );

        const result: {
          error?: string;
        } = await response.json();

        if (!response.ok) {
          throw new Error(
            result.error ||
              "Unable to delete report."
          );
        }

        setIssues((prev) =>
          prev.filter(
            (item) =>
              item.id !== issueId
          )
        );

        void fetchRiskAnalytics();
        void fetchCampaignIntelligence();
      } catch (error: unknown) {
        console.error(
          "Delete issue failed:",
          getErrorMessage(error)
        );
      }
    };

  const handleAddReply = async (
    issueId: string
  ) => {
    const replyText = prompt(
      "Type official response:"
    );

    if (!replyText) {
      return;
    }

    try {
      const {
        data: sessionData,
      } =
        await supabase.auth.getSession();

      if (!sessionData.session) {
        throw new Error(
          "Please sign in to reply."
        );
      }

      const response =
        await fetch(
          `/api/issues/${issueId}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type":
                "application/json",
              Authorization: `Bearer ${sessionData.session.access_token}`,
            },
            body: JSON.stringify({
              resolution_notes:
                replyText,
            }),
          }
        );

      const result: {
        error?: string;
      } = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Unable to add reply."
        );
      }

      void fetchIssues();
      void fetchCampaignIntelligence();
    } catch (error: unknown) {
      console.error(
        "Add reply failed:",
        getErrorMessage(error)
      );
    }
  };

  const startEditing = (
    issue: IssueWithRep
  ) => {
    setIsEditing(true);
    setActiveEditId(issue.id);

    setForm({
      title: issue.title || "",
      description:
        issue.description || "",
      category:
        issue.category ||
        "Infrastructure",
      zip_code:
        issue.zip_code || "",
      urgency:
        issue.urgency ||
        "Medium Baseline",
      media_url:
        issue.resolution_proof_url ||
        "",
    });

    setIsOpen(true);
  };

  const handleNYCAddressSearch =
    async (query: string) => {
      const requestId =
        ++geosearchRequestRef.current;

      setAddressInput(query);

      if (
        query.trim().length < 3
      ) {
        setSuggestions([]);
        return;
      }

      setLocating(true);

      try {
        const res =
          await fetch(
            `/api/geosearch?text=${encodeURIComponent(
              query
            )}`
          );

        if (!res.ok) {
          throw new Error(
            `Geosearch request failed with status: ${res.status}`
          );
        }

        const data: GeosearchResponse =
          await res.json();

        if (
          requestId !==
          geosearchRequestRef.current
        ) {
          return;
        }

        if (data.features) {
          const mapped: AddressSuggestion[] =
            [];

          for (const feature of data.features) {
            const coordinates =
              feature.geometry
                ?.coordinates;

            const label =
              feature.properties
                ?.label;

            if (
              !label ||
              !coordinates ||
              coordinates.length < 2
            ) {
              continue;
            }

            mapped.push({
              display_name:
                label,
              zip:
                feature.properties
                  ?.postalcode ||
                "",
              lat:
                coordinates[1],
              lon:
                coordinates[0],
            });
          }

          setSuggestions(mapped);
        }
      } catch (error: unknown) {
        console.error(
          "NYC Geosearch failed:",
          getErrorMessage(error)
        );
      } finally {
        setLocating(false);
      }
    };

  const handleUseMyLocation =
    () => {
      if (!navigator.geolocation) {
        console.error(
          "Geolocation is not supported by this browser."
        );
        return;
      }

      setLocating(true);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const {
            latitude,
            longitude,
          } = position.coords;

          setMapCenter([
            latitude,
            longitude,
          ]);

          setAddressInput(
            "Current location"
          );

          setSuggestions([]);
          setLocating(false);
        },
        (error) => {
          console.error(
            "Location access failed:",
            error.message ||
              error
          );

          setLocating(false);
        },
        {
          enableHighAccuracy:
            true,
          timeout: 10000,
        }
      );
    };

  const closeModal = useCallback(
    (preserveMedia = false) => {
      if (
        !preserveMedia &&
        !isEditing &&
        form.media_url
      ) {
        void supabase.storage
          .from("issue-media")
          .remove([
            form.media_url,
          ]);
      }

      setForm(defaultForm);
      setAddressInput("");
      setSuggestions([]);
      setIsOpen(false);
      setIsEditing(false);
      setActiveEditId(null);
    },
    [
      form.media_url,
      isEditing,
    ]
  );

  const handleFormSubmit =
    async () => {
      const title =
        form.title.trim();

      const description =
        form.description.trim();

      const zipCode =
        form.zip_code.trim();

      if (title.length < 5) {
        setFormError(
          "Please provide a short issue summary (at least 5 characters)."
        );
        return;
      }

      if (
        description.length < 10
      ) {
        setFormError(
          "Please describe the issue in at least 10 characters."
        );
        return;
      }

      if (
        !/^\d{5}$/.test(zipCode)
      ) {
        setFormError(
          "Enter a valid 5-digit ZIP code."
        );
        return;
      }

      setFormError("");
      setSubmitting(true);

      try {
        const {
          data: { user },
          error: authError,
        } =
          await supabase.auth.getUser();

        if (authError) {
          throw authError;
        }

        if (!user) {
          throw new Error(
            "Please sign in before submitting a report."
          );
        }

        const {
          data: { session },
        } =
          await supabase.auth.getSession();

        if (!session) {
          throw new Error(
            "Your session expired. Please sign in again."
          );
        }

        const payload = {
          title,
          description,
          category:
            form.category,
          zip_code: zipCode,
          urgency:
            form.urgency,
          lat: mapCenter[0],
          lng: mapCenter[1],
          status: isEditing
            ? undefined
            : "Submitted",
        };

        if (
          isEditing &&
          activeEditId
        ) {
          const response = await fetch(
            `/api/issues/${activeEditId}`,
            {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${session.access_token}`,
              },
              body: JSON.stringify(payload),
            },
          );
          const result: { error?: string } = await response.json();
          if (!response.ok) {
            throw new Error(result.error || "Unable to update report.");
          }
        } else {
          const response =
            await fetch(
              "/api/issues",
              {
                method: "POST",
                headers: {
                  "Content-Type":
                    "application/json",
                  Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                  ...payload,
                  resolution_proof_url:
                    form.media_url ||
                    null,
                }),
              }
            );

          const result: {
            error?: string;
          } =
            await response.json();

          if (!response.ok) {
            throw new Error(
              result.error ||
                "Unable to submit report."
            );
          }
        }

        closeModal(true);

        setConfirmationMessage(
          isEditing
            ? "Report updated successfully."
            : "Report submitted successfully."
        );

        void fetchIssues();
        void fetchRiskAnalytics();
        void fetchCampaignIntelligence();
      } catch (error: unknown) {
        const message =
          getErrorMessage(error);

        console.error(
          "Database submission failed:",
          message
        );

        setFormError(
          message ||
            "We could not submit this report. Please try again."
        );
      } finally {
        setSubmitting(false);
      }
    };

  const mapFilteredIssues =
    useMemo(
      () =>
        issues.filter(
          (issue) =>
            issue.lat !== null &&
            issue.lat !== undefined &&
            issue.lng !== null &&
            issue.lng !== undefined
        ),
      [issues]
    );

  const sortedIssues =
    useMemo(() => {
      const weights: Record<
        IssueUrgency,
        number
      > = {
        "Critical Danger": 4,
        "High Breakdown": 3,
        "Medium Baseline": 2,
        "Low Priority": 1,
      };

      const search =
        searchQuery
          .toLowerCase()
          .trim();

      return issues
        .filter(
          (issue) =>
            !search ||
            issue.title
              ?.toLowerCase()
              .includes(search) ||
            issue.zip_code
              ?.toLowerCase()
              .includes(search) ||
            issue.category
              ?.toLowerCase()
              .includes(search)
        )
        .sort(
          (a, b) =>
            ((weights[
              b.urgency
            ] || 0) -
              (weights[
                a.urgency
              ] || 0)) *
              100 +
            ((b.upvotes ?? 0) -
              (a.upvotes ?? 0))
        );
    }, [
      issues,
      searchQuery,
    ]);

  const stats = useMemo(() => {
    const total =
      issues.length;

    const resolved =
      issues.filter(
        (issue) =>
          issue.status ===
          "Resolved"
      ).length;

    const inProgress =
      issues.filter(
        (issue) =>
          issue.status ===
          "In Progress"
      ).length;

    return {
      total,
      inProgress,
      resolved,
      rate:
        total > 0
          ? Math.round(
              (resolved /
                total) *
                100
            )
          : 0,
    };
  }, [issues]);

  return (
    <div className="flex min-h-screen flex-col text-[#17211d]">
      <nav className="sticky top-0 z-50 border-b border-[#cbd5cc] bg-[#f3f1ec]/95 text-[#17211d] shadow-[0_4px_20px_rgba(23,33,29,0.05)] backdrop-blur">
        <div className="mx-auto flex min-h-[4.5rem] w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-5">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#123b2a] text-sm font-black text-[#f3f1ec]">
                S
              </span>

              <span className="text-xl font-black tracking-[-0.04em]">
                STANCE
              </span>
            </div>

            <div className="hidden items-center gap-2 border border-[#cbd5cc] bg-[#e9e7e0] px-3 py-2 sm:flex">
              <span className="h-2 w-2 rounded-full bg-[#2f7d5b]" />

              <span className="text-xs font-bold capitalize text-[#365444]">
                {currentRole} workspace
              </span>
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
              <Plus className="h-4 w-4" />
              New report
            </button>

            <AuthPanel
              onUserChange={
                handleUserChange
              }
            />
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
          <RepresentativePortal
            campaignAnalytics={
              campaignAnalytics
            }
          />
        )}

        {currentRole === "admin" && (
          <AdminPortal
            workOrders={workOrders}
            riskAnalytics={
              riskAnalytics
            }
          />
        )}

        <div className="mt-14 border-t border-[#cbd5cc] pt-10">
          <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#b7732d]">
                Public record
              </p>

              <h3 className="text-2xl font-black tracking-[-0.04em] text-[#17211d]">
                Reports in your community
              </h3>

              <p className="mt-1 text-sm text-[#647168]">
                Search, support, and follow the issues
                neighbors have raised.
              </p>
            </div>

            <div className="relative w-full max-w-xs">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />

              <input
                className="w-full rounded-lg border border-[#cbd5cc] bg-[#fffefa] py-2.5 pl-9 pr-4 text-sm shadow-sm outline-none transition focus:border-[#2f7d5b] focus:ring-2 focus:ring-[#dbe8df]"
                placeholder="Filter by ZIP, category, keywords..."
                value={searchQuery}
                onChange={(event) => {
                  setIssuePage(0);
                  setSearchQuery(
                    event.target.value
                  );
                }}
              />
            </div>
          </div>

          <div className="space-y-4">
            {loading && (
              <div className="animate-pulse border border-[#cbd5cc] bg-[#fffefa] p-8 text-sm text-[#647168]">
                Loading community reports...
              </div>
            )}

            {!loading &&
              sortedIssues.length === 0 && (
                <div className="border border-dashed border-[#aebbb1] bg-[#fffefa]/60 p-12 text-center">
                  <p className="text-sm font-bold text-[#17211d]">
                    No reports found
                  </p>

                  <p className="mt-1 text-sm text-[#647168]">
                    Try another search or be the first to
                    report an issue here.
                  </p>
                </div>
              )}

            {sortedIssues.map(
              (issue) => (
                <IssueCard
                  key={issue.id}
                  issue={issue}
                  currentRole={
                    currentRole
                  }
                  onUpvote={
                    handleUpvote
                  }
                  onUpdateStatus={
                    handleUpdateStatus
                  }
                  onStartEditing={
                    startEditing
                  }
                  onDelete={
                    handleDeleteIssue
                  }
                  onAddReply={
                    handleAddReply
                  }
                />
              )
            )}

            {!loading &&
              (issuePage > 0 ||
                hasMoreIssues) && (
                <div className="flex items-center justify-between border-t border-[#cbd5cc] pt-4">
                  <button
                    type="button"
                    disabled={
                      issuePage === 0
                    }
                    onClick={() =>
                      setIssuePage(
                        (page) =>
                          Math.max(
                            0,
                            page - 1
                          )
                      )
                    }
                    className="border border-[#cbd5cc] bg-[#fffefa] px-3 py-2 text-xs font-bold text-[#647168] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Previous
                  </button>

                  <span className="text-xs font-bold text-[#647168]">
                    Page{" "}
                    {issuePage + 1}
                  </span>

                  <button
                    type="button"
                    disabled={
                      !hasMoreIssues
                    }
                    onClick={() =>
                      setIssuePage(
                        (page) =>
                          page + 1
                      )
                    }
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
            onAddressSearch={
              handleNYCAddressSearch
            }
            onSelectSuggestion={(
              suggestion
            ) => {
              setForm((prev) => ({
                ...prev,
                zip_code:
                  suggestion.zip,
              }));

              setAddressInput(
                suggestion.display_name
              );

              setSuggestions([]);

              if (
                suggestion.lat !==
                  undefined &&
                suggestion.lon !==
                  undefined
              ) {
                setMapCenter([
                  suggestion.lat,
                  suggestion.lon,
                ]);
              }
            }}
            onClose={closeModal}
            onSubmit={handleFormSubmit}
            onUseMyLocation={
              handleUseMyLocation
            }
          />
        )}
      </main>
    </div>
  );
}
