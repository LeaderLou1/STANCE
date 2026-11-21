
"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { User } from "@supabase/supabase-js";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Plus, Search } from "lucide-react";

import type { AuthPanelProps } from "../src/components/AuthPanel";
import { supabase } from "@/src/lib/supabase";
import type {
  AddressSuggestion,
  CivicIssue,
  IssueUrgency,
  ReportForm,
  UserRole,
} from "@/src/types";

import { IssueCard } from "@/src/components/IssueCard";
import { ReportModal } from "@/src/components/ReportModal";
import { MyReportsPanel } from "@/src/components/MyReportsPanel";

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

const IncidentMap = dynamic(
  () => import("@/src/components/IncidentMap"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-96 w-full animate-pulse items-center justify-center rounded-2xl bg-neutral-100 font-medium text-neutral-400">
        Loading civic map...
      </div>
    ),
  }
);

type IssueWithRep = CivicIssue & {
  lat?: number | null;
  lng?: number | null;
  representative?: RepresentativeRow | null;
};

type RepresentativeRow = {
  name: string;
  district: string;
};

type DistrictRow = {
  name: string;
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
  district:
    | DistrictRow
    | DistrictRow[]
    | null;
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
  const [loading, setLoading] = useState(true);

  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState<ReportForm>(defaultForm);
  const [isEditing, setIsEditing] = useState(false);
  const [activeEditId, setActiveEditId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");

  const [locating, setLocating] = useState(false);
  const [addressInput, setAddressInput] = useState("");
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);

  const [formError, setFormError] = useState("");
  const [issuesError, setIssuesError] = useState("");
  const [actionError, setActionError] = useState("");
  const [locationError, setLocationError] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [confirmationMessage, setConfirmationMessage] = useState("");

  const geosearchRequestRef = useRef(0);

  const [authenticatedUser, setAuthenticatedUser] = useState<User | null>(
    null
  );

  const [currentRole, setCurrentRole] = useState<UserRole>("resident");

  const [mapCenter, setMapCenter] = useState<[number, number]>([
    40.7128,
    -74.006,
  ]);

  const [mapZoom, setMapZoom] = useState(13);
  const [mapFocusRequest, setMapFocusRequest] = useState(0);

  const [selectedLocation, setSelectedLocation] =
    useState<[number, number] | null>(null);

  const [selectedDistrictName, setSelectedDistrictName] = useState<
    string | null
  >(null);

  const focusIncident = useCallback(
    (issue: {
      id: string;
      lat?: number | null;
      lng?: number | null;
    }) => {
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
    []
  );

  const handleUserChange = useCallback(async (user: User | null) => {
    setAuthenticatedUser(user);

    if (!user) {
      setCurrentRole("resident");
      return;
    }

    try {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        throw error;
      }

      setCurrentRole(
        profile?.role === "admin" ||
          profile?.role === "representative"
          ? profile.role
          : "resident"
      );
    } catch (error: unknown) {
      console.error("Unable to load user role:", getErrorMessage(error));
      setCurrentRole("resident");
    }
  }, []);

  const resolveDistrictForPoint = useCallback(
    async (latitude: number, longitude: number) => {
      setLocationError("");
      setSelectedDistrictName("Resolving Council District...");

      try {
        const response = await fetch(
          `/api/districts/resolve?lat=${latitude}&lng=${longitude}`
        );

        const result: {
          districtName?: string | null;
        } = await response.json();

        if (!response.ok || !result.districtName) {
          setSelectedDistrictName("Council District not resolved");
          return;
        }

        setSelectedDistrictName(result.districtName);
      } catch (error: unknown) {
        console.error(
          "District resolution failed:",
          getErrorMessage(error)
        );
        setSelectedDistrictName("Council District not resolved");
      }
    },
    []
  );

  const fetchIssues = useCallback(async () => {
    setLoading(true);
    setIssuesError("");

    try {
      let issueQuery = supabase
        .from("issues")
        .select(`
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
          district:districts!issues_district_id_fkey (
            name
          )
        `)
        .order("created_at", {
          ascending: false,
        })
        .limit(25);

      const trimmedSearch = searchQuery.trim();

      if (trimmedSearch) {
        const districtMatch = trimmedSearch.match(
          /(?:council\s+)?district\s+(\d{1,2})/i
        );

        if (districtMatch) {
          const districtNumber = Number(districtMatch[1]);

          const { data: district, error: districtError } = await supabase
            .from("districts")
            .select("id")
            .eq("name", `Council District ${districtNumber}`)
            .maybeSingle();

          if (districtError) {
            throw districtError;
          }

          issueQuery = district
            ? issueQuery.eq("district_id", district.id)
            : issueQuery.eq(
                "district_id",
                "00000000-0000-0000-0000-000000000000"
              );
        } else {
          issueQuery = issueQuery.or(
            `title.ilike.%${trimmedSearch}%,description.ilike.%${trimmedSearch}%,category.ilike.%${trimmedSearch}%`
          );
        }
      }

      const { data, error } = await issueQuery;

      if (error) {
        throw error;
      }

      const rows = await Promise.all(
        ((data ?? []) as IssueQueryRow[]).map(
          async (row): Promise<IssueWithRep> => {
            const mediaPath = row.resolution_proof_url;
            let mediaUrl = mediaPath;

            if (mediaPath && !mediaPath.startsWith("http")) {
              const { data: signedMedia, error: signedUrlError } =
                await supabase.storage
                  .from("issue-media")
                  .createSignedUrl(mediaPath, 3600);

              if (signedUrlError) {
                console.error(
                  "Unable to create signed media URL:",
                  signedUrlError.message
                );
              }

              mediaUrl = signedMedia?.signedUrl ?? null;
            }

            const districtRow = Array.isArray(row.district)
              ? row.district[0]
              : row.district;

            const districtMatch = districtRow?.name.match(/(\d+)$/);

            const representative = Array.isArray(row.representative)
              ? row.representative[0] ?? null
              : row.representative;

            return {
              id: row.id,
              created_at: row.created_at,
              title: row.title,
              description: row.description,
              category: row.category,
              status: row.status as CivicIssue["status"],
              zip_code: row.zip_code,
              latitude: row.lat,
              longitude: row.lng,
              upvotes: row.upvotes ?? 0,
              urgency: row.urgency ?? "Medium Baseline",
              reporter_id: row.reporter_id,
              representative_id: row.representative_id,
              council_district: districtMatch
                ? Number(districtMatch[1])
                : null,
              resolution_notes: row.resolution_notes,
              resolution_proof_url: mediaUrl,
              lat: row.lat,
              lng: row.lng,
              representative,
            };
          }
        )
      );

      setIssues(rows);
    } catch (error: unknown) {
      setIssuesError(
        "We could not load community reports. Please refresh and try again."
      );

      console.error("fetchIssues error:", getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchIssues();
    }, 0);

    const issueSubscription = supabase
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
        }
      )
      .subscribe();

    return () => {
      window.clearTimeout(timeoutId);
      void supabase.removeChannel(issueSubscription);
    };
  }, [fetchIssues]);

  const handleUpvote = async (issueId: string) => {
    const previousIssues = [...issues];

    setActionError("");

    setIssues((previous) =>
      previous.map((issue) =>
        issue.id === issueId
          ? {
              ...issue,
              upvotes: (issue.upvotes ?? 0) + 1,
            }
          : issue
      )
    );

    try {
      const { data: sessionData } = await supabase.auth.getSession();

      if (!sessionData.session) {
        throw new Error("Please sign in to vote.");
      }

      const response = await fetch(`/api/issues/${issueId}/vote`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
      });

      const result: {
        error?: string;
        upvotes?: number;
      } = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Unable to record vote.");
      }

      setIssues((previous) =>
        previous.map((issue) =>
          issue.id === issueId
            ? {
                ...issue,
                upvotes: result.upvotes ?? issue.upvotes ?? 0,
              }
            : issue
        )
      );
    } catch (error: unknown) {
      setIssues(previousIssues);
      setActionError(getErrorMessage(error));

      console.error(
        "Upvote failed:",
        getErrorMessage(error)
      );
    }
  };

  const handleUpdateStatus = async (
    issueId: string,
    newStatus: string
  ) => {
    setActionError("");

    try {
      const { data: sessionData } = await supabase.auth.getSession();

      if (!sessionData.session) {
        throw new Error("Please sign in to update reports.");
      }

      const response = await fetch(`/api/issues/${issueId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
        body: JSON.stringify({
          status: newStatus,
        }),
      });

      const result: {
        error?: string;
      } = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Unable to update report.");
      }

      await fetchIssues();

      setConfirmationMessage("Report status updated successfully.");
    } catch (error: unknown) {
      setActionError(getErrorMessage(error));

      console.error(
        "Update status failed:",
        getErrorMessage(error)
      );
    }
  };

  const handleDeleteIssue = async (issueId: string) => {
    setActionError("");

    try {
      const { data: sessionData } = await supabase.auth.getSession();

      if (!sessionData.session) {
        throw new Error("Please sign in to delete reports.");
      }

      const response = await fetch(`/api/issues/${issueId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
      });

      const result: {
        error?: string;
      } = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Unable to delete report.");
      }

      setIssues((previous) =>
        previous.filter((issue) => issue.id !== issueId)
      );

      setConfirmationMessage("Report deleted successfully.");
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
    replyText: string
  ) => {
    if (!replyText.trim()) {
      return;
    }

    setActionError("");

    try {
      const { data: sessionData } = await supabase.auth.getSession();

      if (!sessionData.session) {
        throw new Error("Please sign in to reply.");
      }

      const response = await fetch(`/api/issues/${issueId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
        body: JSON.stringify({
          resolution_notes: replyText.trim(),
        }),
      });

      const result: {
        error?: string;
      } = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Unable to add reply.");
      }

      await fetchIssues();

      setConfirmationMessage("Reply added successfully.");
    } catch (error: unknown) {
      setActionError(getErrorMessage(error));

      console.error(
        "Add reply failed:",
        getErrorMessage(error)
      );
    }
  };

  const startEditing = (issue: IssueWithRep) => {
    setIsEditing(true);
    setActiveEditId(issue.id);
    setFormError("");
    setActionError("");

    setForm({
      title: issue.title || "",
      description: issue.description || "",
      category: issue.category || "Infrastructure",
      zip_code: issue.zip_code || "",
      urgency: issue.urgency || "Medium Baseline",
      media_url: issue.resolution_proof_url || "",
    });

    const latitude = issue.lat ?? issue.latitude ?? null;
    const longitude = issue.lng ?? issue.longitude ?? null;

    if (latitude !== null && longitude !== null) {
      setSelectedLocation([latitude, longitude]);
      setMapCenter([latitude, longitude]);

      setSelectedDistrictName(
        issue.council_district
          ? `Council District ${issue.council_district}`
          : "Council District not resolved"
      );
    } else {
      setSelectedLocation(null);
      setSelectedDistrictName(null);
    }

    setAddressInput("");
    setSuggestions([]);
    setIsOpen(true);
  };

  const handleNYCAddressSearch = async (query: string) => {
    const requestId = ++geosearchRequestRef.current;

    setLocationError("");
    setAddressInput(query);
    setSelectedLocation(null);
    setSelectedDistrictName(null);
    setForm((previous) => ({
      ...previous,
      zip_code: "",
    }));

    if (query.trim().length < 3) {
      setSuggestions([]);
      setLocating(false);
      return;
    }

    setLocating(true);

    try {
      const response = await fetch(
        `/api/geosearch?text=${encodeURIComponent(query)}`
      );

      if (!response.ok) {
        throw new Error(
          `Address search failed with status ${response.status}.`
        );
      }

      const data: GeosearchResponse = await response.json();

      if (requestId !== geosearchRequestRef.current) {
        return;
      }

      const mapped: AddressSuggestion[] = [];

      for (const feature of data.features ?? []) {
        const coordinates = feature.geometry?.coordinates;
        const label = feature.properties?.label;

        if (
          !label ||
          !coordinates ||
          coordinates.length < 2 ||
          !Number.isFinite(coordinates[0]) ||
          !Number.isFinite(coordinates[1])
        ) {
          continue;
        }

        mapped.push({
          display_name: label,
          zip: feature.properties?.postalcode || "",
          lat: coordinates[1],
          lon: coordinates[0],
        });
      }

      setSuggestions(mapped);

      if (mapped.length === 0) {
        setLocationError(
          "No matching address was found. Try entering a more complete NYC address."
        );
      }
    } catch (error: unknown) {
      if (requestId === geosearchRequestRef.current) {
        setSuggestions([]);
        setLocationError(
          "We could not search this address. Please try again."
        );
      }

      console.error(
        "NYC Geosearch failed:",
        getErrorMessage(error)
      );
    } finally {
      if (requestId === geosearchRequestRef.current) {
        setLocating(false);
      }
    }
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setLocationError(
        "Location access is not supported by this browser."
      );
      return;
    }

    setLocating(true);
    setLocationError("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;

        setMapCenter([latitude, longitude]);
        setSelectedLocation([latitude, longitude]);

        void resolveDistrictForPoint(latitude, longitude);

        setAddressInput("Current location");
        setSuggestions([]);
        setLocating(false);
      },
      (error) => {
        setLocationError(
          error.message || "We could not access your location."
        );
        setLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
      }
    );
  };

  const closeModal = useCallback(
    (preserveMedia = false) => {
      if (!preserveMedia && !isEditing && form.media_url) {
        void supabase.storage
          .from("issue-media")
          .remove([form.media_url]);
      }

      geosearchRequestRef.current += 1;

      setForm(defaultForm);
      setFormError("");
      setAddressInput("");
      setSelectedLocation(null);
      setSelectedDistrictName(null);
      setSuggestions([]);
      setLocationError("");
      setLocating(false);
      setIsOpen(false);
      setIsEditing(false);
      setActiveEditId(null);
    },
    [form.media_url, isEditing]
  );

  const handleFormSubmit = async () => {
    const title = form.title.trim();
    const description = form.description.trim();
    const zipCode = form.zip_code.trim();

    if (title.length < 5) {
      setFormError(
        "Please provide a short issue summary (at least 5 characters)."
      );
      return;
    }

    if (description.length < 10) {
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
      } = await supabase.auth.getUser();

      if (authError) {
        throw authError;
      }

      if (!user) {
        throw new Error(
          "Please sign in before creating or updating a report."
        );
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error(
          "Your session expired. Please sign in again."
        );
      }

      const payload = {
        title,
        description,
        category: form.category,
        zip_code: zipCode || null,
        urgency: form.urgency,
        lat: selectedLocation[0],
        lng: selectedLocation[1],
        status: isEditing ? undefined : "Pending Review",
      };

      if (isEditing && activeEditId) {
        const response = await fetch(
          `/api/issues/${activeEditId}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify(payload),
          }
        );

        const result: {
          error?: string;
        } = await response.json();

        if (!response.ok) {
          throw new Error(
            result.error || "Unable to update report."
          );
        }
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

        const result: {
          error?: string;
        } = await response.json();

        if (!response.ok) {
          throw new Error(
            result.error || "Unable to save report."
          );
        }
      }

      const wasEditing = isEditing;

      closeModal(true);

      setConfirmationMessage(
        wasEditing
          ? "Report updated successfully."
          : "Report saved for review."
      );

      await fetchIssues();
    } catch (error: unknown) {
      const message = getErrorMessage(error);

      console.error("Report save failed:", message);

      setFormError(
        message || "We could not save this report. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const mapFilteredIssues = useMemo(
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

  const sortedIssues = useMemo(() => {
    const weights: Record<IssueUrgency, number> = {
      "Critical Danger": 4,
      "High Breakdown": 3,
      "Medium Baseline": 2,
      "Low Priority": 1,
    };

    return [...issues].sort((a, b) => {
      const urgencyA = a.urgency || "Medium Baseline";
      const urgencyB = b.urgency || "Medium Baseline";

      return (
        (weights[urgencyB] || 2) -
        (weights[urgencyA] || 2)
      );
    });
  }, [issues]);

  return (
    <main className="min-h-screen bg-[#fcfbf9] text-neutral-900">
      <header className="sticky top-0 z-50 border-b border-neutral-200/80 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-col items-stretch gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-900 font-extrabold tracking-wider text-white shadow-sm">
              ST
            </div>

            <div>
              <h1 className="text-lg font-black tracking-tight text-neutral-900">
                STANCE
              </h1>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-neutral-500">
                Report it. Get it seen.
              </p>
            </div>
          </Link>

          <div className="flex items-center justify-end gap-2 sm:gap-4">
            <Link
              href="/districts"
              className="whitespace-nowrap rounded-xl px-3 py-2 text-xs font-bold text-neutral-700 transition hover:bg-neutral-100 hover:text-neutral-950"
            >
              Districts
            </Link>

            <button
              type="button"
              onClick={() => {
                setFormError("");
                setIsOpen(true);
              }}
              className="flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl bg-neutral-900 px-4 py-2 text-xs font-bold text-white shadow-md transition hover:bg-neutral-800 active:scale-95"
            >
              <Plus className="h-4 w-4" />
              Report Issue
            </button>

            <AuthPanel onUserChange={handleUserChange} />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1600px] space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {(issuesError || actionError) && (
          <div
            role="alert"
            className="flex flex-col gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 sm:flex-row sm:items-center sm:justify-between"
          >
            <span>{actionError || issuesError}</span>

            <button
              type="button"
              onClick={() => {
                setActionError("");
                setIssuesError("");
                void fetchIssues();
              }}
              className="font-bold underline underline-offset-2"
            >
              Dismiss / Retry
            </button>
          </div>
        )}

        <section className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12 lg:gap-8">
          <div className="contents lg:col-span-7 lg:flex lg:flex-col lg:gap-6">
            <section className="order-1 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm lg:order-none">
              <div className="flex items-center justify-between gap-4 border-b border-neutral-100 px-4 py-3 sm:px-5">
                <div>
                  <h2 className="text-sm font-extrabold tracking-tight text-neutral-900">
                    Community map
                  </h2>
                  <p className="mt-0.5 text-xs text-neutral-500">
                    Select a marker or report to explore an issue.
                  </p>
                </div>

                <span className="inline-flex shrink-0 items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-800">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                  Community reports
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
              <MyReportsPanel
                issues={issues}
                userId={authenticatedUser?.id ?? null}
              />
            </div>
          </div>

          <div className="order-2 space-y-5 lg:order-none lg:col-span-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-extrabold tracking-tight text-neutral-900">
                  Community incident stream
                </h2>
                <p className="mt-0.5 text-xs text-neutral-500">
                  Recent reports, priorities, and updates
                </p>
              </div>

              <div className="relative w-full sm:max-w-64">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />

                <input
                  type="text"
                  placeholder="Search district or keyword..."
                  value={searchQuery}
                  onChange={(event) =>
                    setSearchQuery(event.target.value)
                  }
                  className="w-full rounded-xl border border-neutral-200 bg-white py-2 pl-9 pr-4 text-xs font-medium text-neutral-800 shadow-sm focus:border-neutral-900 focus:outline-none"
                />
              </div>
            </div>

            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((item) => (
                  <div
                    key={item}
                    className="h-32 w-full animate-pulse rounded-2xl bg-neutral-200/60"
                  />
                ))}
              </div>
            ) : sortedIssues.length === 0 ? (
              <div className="flex h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-300 bg-white p-6 text-center">
                <p className="text-sm font-semibold text-neutral-600">
                  No civic reports found.
                </p>
                <p className="mt-1 text-xs text-neutral-400">
                  Be the first to log a municipal issue in your neighborhood.
                </p>

                <button
                  type="button"
                  onClick={() => setIsOpen(true)}
                  className="mt-4 rounded-lg bg-neutral-900 px-4 py-2 text-xs font-bold text-white transition hover:bg-neutral-700"
                >
                  Create a report
                </button>
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

            {!loading && sortedIssues.length > 0 && (
              <p className="text-center text-xs text-neutral-400">
                Showing the latest {sortedIssues.length} reports
              </p>
            )}
          </div>
        </section>
      </div>

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
                suggestion.lon
              );
            } else {
              setSelectedLocation(null);
              setLocationError(
                "This address result does not include a usable location. Please choose another result."
              );
            }

            if (suggestion.zip) {
              setForm((previous) => ({
                ...previous,
                zip_code: suggestion.zip,
              }));
            }
          }}
        />
      )}

      {confirmationMessage && (
        <div
          role="status"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl bg-neutral-900 px-5 py-3 text-xs font-bold text-white shadow-2xl"
        >
          <span>✓ {confirmationMessage}</span>

          <button
            type="button"
            onClick={() => setConfirmationMessage("")}
            aria-label="Dismiss notification"
            className="text-neutral-400 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}
    </main>
  );
}
