"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { User } from "@supabase/supabase-js";
import Link from "next/link";
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

// Dynamically import IncidentMap with SSR disabled so Leaflet loads only in the browser
const IncidentMap = dynamic(
  () => import("@/src/components/IncidentMap"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-96 w-full items-center justify-center rounded-2xl bg-neutral-100 font-medium text-neutral-400 animate-pulse">
        Loading live civic map...
      </div>
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

type IssueWithRep = CivicIssue & {
  lat?: number | null;
  lng?: number | null;
  representative?: RepresentativeRow | null;
};

type RepresentativeRow = {
  name: string;
  district: string;
};

type DistrictRow = { name: string };

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
  district:
    | DistrictRow
    | DistrictRow[]
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

  const [issuesError, setIssuesError] = useState("");

  const [actionError, setActionError] = useState("");

  const [locationError, setLocationError] = useState("");

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
  const [mapZoom, setMapZoom] = useState(13);
  const [mapFocusRequest, setMapFocusRequest] = useState(0);

  const focusIncident = useCallback(
    (issue: { id: string; lat?: number | null; lng?: number | null }) => {
      const { lat, lng } = issue;
      if (
        typeof lat !== "number" ||
        !Number.isFinite(lat) ||
        typeof lng !== "number" ||
        !Number.isFinite(lng)
      ) {
        return;
      }

      setMapCenter([lat, lng]);
      setMapZoom(17);
      setMapFocusRequest((request) => request + 1);
    },
    [],
  );

  const [selectedLocation, setSelectedLocation] =
    useState<[number, number] | null>(null);
  const [selectedDistrictName, setSelectedDistrictName] =
    useState<string | null>(null);

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

  const resolveDistrictForPoint = async (
    latitude: number,
    longitude: number,
  ) => {
    setLocationError("");
    setSelectedDistrictName("Resolving Council District…");
    try {
      const response = await fetch(
        `/api/districts/resolve?lat=${latitude}&lng=${longitude}`,
      );
      const result: { districtName?: string | null } = await response.json();
      setSelectedDistrictName(
        response.ok && result.districtName
          ? result.districtName
          : "Council District not resolved",
      );
    } catch {
      setSelectedDistrictName("Council District not resolved");
    }
  };

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
            district
          ),
          district:districts!issues_district_id_fkey(name)
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
        const districtMatch = searchQuery.match(/(?:council\s+)?district\s+(\d{1,2})/i);
        if (districtMatch) {
          const { data: district } = await supabase
            .from("districts")
            .select("id")
            .eq("name", `Council District ${Number(districtMatch[1])}`)
            .maybeSingle();
          issueQuery = district
            ? issueQuery.eq("district_id", district.id)
            : issueQuery.eq("district_id", "00000000-0000-0000-0000-000000000000");
        } else {
          issueQuery = issueQuery.or(
            `title.ilike.%${searchQuery.trim()}%,description.ilike.%${searchQuery.trim()}%,category.ilike.%${searchQuery.trim()}%`
          );
        }
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

              council_district: (() => {
                const districtRow = Array.isArray(row.district)
                  ? row.district[0]
                  : row.district;
                const match = districtRow?.name.match(/(\d+)$/);
                return match ? Number(match[1]) : null;
              })(),

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
      setIssuesError(
        "We could not load community reports. Please refresh and try again.",
      );
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
        setActionError(getErrorMessage(error));
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
        setActionError(getErrorMessage(error));
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
        setLocationError(
          "We could not search this address. Check your connection and try again.",
        );
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
        setLocationError(
          "We could not search this address. Check your connection and try again.",
        );
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
      setActionError(getErrorMessage(error));

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
        setConfirmationMessage("Report status updated successfully.");
        setActionError("");
      } catch (error: unknown) {
        setActionError(getErrorMessage(error));
        console.error(
          "Update status failed:",
          getErrorMessage(error)
        );
      }
    };

  const handleDeleteIssue =
    async (issueId: string) => {
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
        setConfirmationMessage("Report deleted successfully.");
        setActionError("");

        void fetchRiskAnalytics();
        void fetchCampaignIntelligence();
      } catch (error: unknown) {
        setActionError(getErrorMessage(error));
        console.error(
          "Delete issue failed:",
          getErrorMessage(error)
        );
      }
    };

  const handleAddReply = async (
    issueId: string,
    replyText: string,
  ) => {
    if (!replyText.trim()) return;

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
      setConfirmationMessage("Official reply added successfully.");
      setActionError("");
    } catch (error: unknown) {
      setActionError(getErrorMessage(error));
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
    const latitude = issue.lat ?? issue.latitude ?? null;
    const longitude = issue.lng ?? issue.longitude ?? null;
    if (latitude !== null && longitude !== null) {
      setSelectedLocation([latitude, longitude]);
      setMapCenter([latitude, longitude]);
      setSelectedDistrictName(
        issue.council_district
          ? `Council District ${issue.council_district}`
          : "Council District not resolved",
      );
    } else {
      setSelectedLocation(null);
      setSelectedDistrictName(null);
    }

    setIsOpen(true);
  };

  const handleNYCAddressSearch =
    async (query: string) => {
      const requestId =
        ++geosearchRequestRef.current;

      setLocationError("");
      setAddressInput(query);
      setSelectedLocation(null);
      setSelectedDistrictName(null);
      setForm((previous) => ({ ...previous, zip_code: "" }));

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
        setLocationError("Location access is not supported by this browser.");
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

          setLocationError("");
          setMapCenter([
            latitude,
            longitude,
          ]);
          setSelectedLocation([latitude, longitude]);
          void resolveDistrictForPoint(latitude, longitude);

          setAddressInput(
            "Current location"
          );

          setSuggestions([]);
          setLocating(false);
        },
        (error) => {
          setLocationError(
            error.message ||
              "We could not access your location.",
          );
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
      setSelectedLocation(null);
      setSelectedDistrictName(null);
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

      const zipCode = form.zip_code.trim();

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

      if (!selectedLocation) {
        setFormError(
          "Choose a geocoded address or use your current location so we can assign the correct Council District."
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
          zip_code: zipCode || null,
          urgency:
            form.urgency,
          lat: selectedLocation[0],
          lng: selectedLocation[1],
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
        (Array.isArray(issues) ? issues : []).filter(
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
      const weights: Record<IssueUrgency, number> = {
        "Critical Danger": 4,
        "High Breakdown": 3,
        "Medium Baseline": 2,
        "Low Priority": 1,
      };

      const safeIssues = Array.isArray(issues) ? issues : [];

      return [...safeIssues].sort(
        (a, b) => {
          const uA = (a.urgency as IssueUrgency) || "Medium Baseline";
          const uB = (b.urgency as IssueUrgency) || "Medium Baseline";
          return (weights[uB] || 2) - (weights[uA] || 2);
        }
      );
    }, [issues]);

  return (
    <main className="min-h-screen bg-[#fcfbf9] text-neutral-900">
      {/* Header / Navbar */}
      <header className="sticky top-0 z-50 border-b border-neutral-200/80 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-col items-stretch gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-900 text-white font-extrabold tracking-wider shadow-sm">
              ST
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight text-neutral-900">STANCE</h1>
              <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-widest">NYC Civic Media & Intelligence</p>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 sm:gap-4">
            <Link
              href="/districts"
              className="whitespace-nowrap rounded-xl px-3 py-2 text-xs font-bold text-neutral-700 transition hover:bg-neutral-100 hover:text-emerald-800"
            >
              Districts
            </Link>
            <button
              onClick={() => setIsOpen(true)}
              className="flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl bg-neutral-900 px-4 py-2 text-xs font-bold text-white shadow-md transition-transform hover:bg-neutral-800 active:scale-95"
            >
              <Plus className="h-4 w-4" /> Report Issue
            </button>
            <AuthPanel onUserChange={handleUserChange} />
          </div>
        </div>
      </header>

      {/* Main Content Dashboard */}
      <div className="mx-auto max-w-[1600px] space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <section className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12 lg:gap-8">
          <div className="contents lg:col-span-7 lg:flex lg:flex-col lg:gap-6">
            <section className="order-1 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm lg:order-none">
              <div className="flex items-center justify-between gap-4 border-b border-neutral-100 px-4 py-3 sm:px-5">
                <div>
                  <h2 className="text-sm font-extrabold tracking-tight text-neutral-900">Live district map</h2>
                  <p className="mt-0.5 text-xs text-neutral-500">Select a marker or report to explore an issue.</p>
                </div>
                <span className="inline-flex shrink-0 items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-800">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                  Live
                </span>
              </div>
              <div className="h-[380px] sm:h-[480px]">
                <IncidentMap
                  issues={mapFilteredIssues}
                  centerCoordinates={mapCenter}
                  zoom={mapZoom}
                  focusRequest={mapFocusRequest}
                  onUpvote={handleUpvote}
                  onSelectIssue={focusIncident}
                />
              </div>
            </section>
            <div className="order-3 lg:order-none">
              {currentRole === "admin" && (
                <AdminPortal
                  workOrders={workOrders}
                  riskAnalytics={riskAnalytics}
                />
              )}
              {currentRole === "representative" && (
                <RepresentativePortal campaignAnalytics={campaignAnalytics} />
              )}
              {currentRole === "resident" && (
                <ResidentPortal
                  initiatives={initiatives}
                  issues={issues}
                />
              )}
            </div>
          </div>

          <div className="order-2 space-y-5 lg:order-none lg:col-span-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-extrabold tracking-tight text-neutral-900">Community incident stream</h2>
                <p className="mt-0.5 text-xs text-neutral-500">Recent reports, priorities, and updates</p>
              </div>
              <div className="relative w-full sm:max-w-64">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Search district or keyword..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-neutral-200 bg-white py-2 pl-9 pr-4 text-xs font-medium text-neutral-800 shadow-sm focus:border-neutral-900 focus:outline-none"
                />
              </div>
            </div>

            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="h-32 w-full animate-pulse rounded-2xl bg-neutral-200/60" />
                ))}
              </div>
            ) : sortedIssues.length === 0 ? (
              <div className="flex h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-300 bg-white p-6 text-center">
                <p className="text-sm font-semibold text-neutral-600">No civic reports found.</p>
                <p className="text-xs text-neutral-400 mt-1">Be the first to log a municipal issue in your neighborhood.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {sortedIssues.map((issue) => (
                  <IssueCard
                    key={issue.id}
                    issue={issue}
                    currentRole={currentRole}
                    onSelectIssue={focusIncident}
                    onUpvote={handleUpvote}
                    onUpdateStatus={handleUpdateStatus}
                    onDelete={handleDeleteIssue}
                    onAddReply={handleAddReply}
                    onStartEditing={startEditing}
                  />
                ))}
              </div>
            )}
          </div>

        </section>
      </div>

      {/* Report Modal */}
      {isOpen && (
        <ReportModal
          isEditing={isEditing}
          form={form}
          setForm={setForm}
          formError={formError}
          addressInput={addressInput}
          districtName={selectedDistrictName}
          locating={locating}
          suggestions={suggestions}
          locationError={locationError}
          submitting={submitting}
          onClose={() => closeModal(false)}
          onSubmit={handleFormSubmit}
          onAddressSearch={handleNYCAddressSearch}
          onUseMyLocation={handleUseMyLocation}
          onSelectSuggestion={(suggestion) => {
            setAddressInput(suggestion.display_name);
            setSuggestions([]);
            if (
              typeof suggestion.lat === "number" &&
              Number.isFinite(suggestion.lat) &&
              typeof suggestion.lon === "number" &&
              Number.isFinite(suggestion.lon)
            ) {
              const coordinates: [number, number] = [
                suggestion.lat,
                suggestion.lon,
              ];
              setSelectedLocation(coordinates);
              setMapCenter(coordinates);
              setLocationError("");
              void resolveDistrictForPoint(
                suggestion.lat,
                suggestion.lon,
              );
            } else {
              setSelectedLocation(null);
              setLocationError(
                "This address result does not include a usable location. Please choose another result.",
              );
            }
            if (suggestion.zip) {
              setForm((prev) => ({ ...prev, zip_code: suggestion.zip }));
            }
          }}
        />
      )}

      {/* Global Confirmation / Toast Messages */}
      {confirmationMessage && (
        <div className="fixed bottom-6 right-6 z-50 rounded-2xl bg-neutral-900 px-5 py-3 text-xs font-bold text-white shadow-2xl flex items-center gap-3">
          <span>✓ {confirmationMessage}</span>
          <button onClick={() => setConfirmationMessage("")} className="text-neutral-400 hover:text-white">✕</button>
        </div>
      )}
    </main>
  );
}