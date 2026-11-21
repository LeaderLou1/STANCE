
"use client";

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { CheckCircle2, MapPin, Plus } from "lucide-react";

import { ReportModal } from "@/src/components/ReportModal";
import type {
  AddressSuggestion,
  ReportForm,
} from "@/src/types";

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

type ReportResponse = {
  reportId?: string;
  status?: string;
  moderationStatus?: string;
  districtNumber?: number;
  message?: string;
  error?: string;
};

const AuthPanel = dynamic(
  () =>
    import("@/src/components/AuthPanel").then(
      (module) => module.AuthPanel
    ),
  {
    ssr: false,
    loading: () => (
      <div
        aria-hidden="true"
        className="h-10 w-28 animate-pulse rounded-lg bg-[#e9e7e0]"
      />
    ),
  }
);

const defaultForm: ReportForm = {
  title: "",
  description: "",
  category: "Infrastructure",
  reporterEmail: "",
  zip_code: "",
  urgency: "Medium Baseline",
  media_url: "",
};

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;

  if (typeof error === "string") return error;

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
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState<ReportForm>(defaultForm);

  const [addressInput, setAddressInput] = useState("");
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [selectedLocation, setSelectedLocation] =
    useState<[number, number] | null>(null);
  const [selectedDistrictName, setSelectedDistrictName] =
    useState<string | null>(null);

  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formError, setFormError] = useState("");
  const [locationError, setLocationError] = useState("");
  const [success, setSuccess] = useState<ReportResponse | null>(null);

  const geosearchRequestRef = useRef(0);
  const successCloseRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!success) return;

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    successCloseRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSuccess(null);
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [success]);

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

  const resetForm = useCallback(() => {
    geosearchRequestRef.current += 1;

    setForm(defaultForm);
    setAddressInput("");
    setSuggestions([]);
    setSelectedLocation(null);
    setSelectedDistrictName(null);
    setLocationError("");
    setFormError("");
    setLocating(false);
  }, []);

  const openReportModal = () => {
    setSuccess(null);
    setFormError("");
    setIsOpen(true);
  };

  const closeReportModal = () => {
    if (submitting) return;

    resetForm();
    setIsOpen(false);
  };

  const handleAddressSearch = async (query: string) => {
    const requestId = ++geosearchRequestRef.current;

    setAddressInput(query);
    setSuggestions([]);
    setSelectedLocation(null);
    setSelectedDistrictName(null);
    setLocationError("");

    setForm((previous) => ({
      ...previous,
      zip_code: "",
    }));

    if (query.trim().length < 3) {
      setLocating(false);
      return;
    }

    setLocating(true);

    try {
      const response = await fetch(
        `/api/geosearch?text=${encodeURIComponent(query)}`
      );

      if (!response.ok) {
        throw new Error("Address search failed. Please try again.");
      }

      const data: GeosearchResponse = await response.json();

      if (requestId !== geosearchRequestRef.current) return;

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
          "No matching address was found. Try a more complete NYC address."
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
        "Address search failed:",
        getErrorMessage(error)
      );
    } finally {
      if (requestId === geosearchRequestRef.current) {
        setLocating(false);
      }
    }
  };

  const handleSelectSuggestion = (
    suggestion: AddressSuggestion
  ) => {
    setAddressInput(suggestion.display_name);
    setSuggestions([]);
    setLocationError("");

    if (
      typeof suggestion.lat !== "number" ||
      !Number.isFinite(suggestion.lat) ||
      typeof suggestion.lon !== "number" ||
      !Number.isFinite(suggestion.lon)
    ) {
      setSelectedLocation(null);
      setSelectedDistrictName("Council District not resolved");
      setLocationError(
        "This address does not include a valid location. Choose another result."
      );
      return;
    }

    const latitude = suggestion.lat;
    const longitude = suggestion.lon;

    setSelectedLocation([latitude, longitude]);

    setForm((previous) => ({
      ...previous,
      zip_code: suggestion.zip || "",
    }));

    void resolveDistrictForPoint(latitude, longitude);
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
    setSelectedDistrictName(null);
    setSelectedLocation(null);
    setSuggestions([]);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;

        setSelectedLocation([latitude, longitude]);
        setAddressInput("Current location");

        void resolveDistrictForPoint(latitude, longitude);

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

  const handleSubmit = async () => {
    const title = form.title.trim();
    const description = form.description.trim();
    const reporterEmail = (form.reporterEmail ?? "").trim();

    if (title.length < 5 || title.length > 120) {
      setFormError("Your title must be between 5 and 120 characters.");
      return;
    }

    if (description.length < 10 || description.length > 2000) {
      setFormError(
        "Your description must be between 10 and 2,000 characters."
      );
      return;
    }

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(reporterEmail) ||
      reporterEmail.length > 254
    ) {
      setFormError("Enter a valid email address.");
      return;
    }

    if (!selectedLocation) {
      setFormError("Select a valid NYC address or use your location.");
      return;
    }

    if (
      !selectedDistrictName ||
      selectedDistrictName === "Council District not resolved" ||
      selectedDistrictName === "Resolving Council District..."
    ) {
      setFormError(
        "Wait for your Council District to be verified before submitting."
      );
      return;
    }

    setSubmitting(true);
    setFormError("");

    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          description,
          category: form.category,
          reporterEmail,
          lat: selectedLocation[0],
          lng: selectedLocation[1],
          photoUrl: form.media_url || null,
        }),
      });

      const result: ReportResponse = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "We could not save your report."
        );
      }

      setSuccess(result);
      setIsOpen(false);
      resetForm();
    } catch (error: unknown) {
      console.error(
        "Report submission failed:",
        getErrorMessage(error)
      );

      setFormError(
        getErrorMessage(error) ||
          "We could not save your report. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen overflow-x-clip bg-[#f8f8f4] text-[#17211d]">
      <header className="sticky top-0 z-40 border-b border-[#e3e7df] bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:px-8 sm:py-4 lg:flex-row lg:items-center lg:justify-between">
          <Link
            href="/"
            aria-label="STANCE home"
            className="flex min-h-11 items-center gap-3 self-start rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#47745b]"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#123b2a] text-sm font-black tracking-wider text-white">
              ST
            </div>

            <div>
              <h1 className="text-lg font-black tracking-tight">
                STANCE
              </h1>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#78847a]">
                Civic reporting
              </p>
            </div>
          </Link>

          <nav
            aria-label="Main navigation"
            className="flex w-full items-center justify-between gap-2 lg:w-auto lg:justify-end lg:gap-3"
          >
            <Link
              href="/districts"
              className="inline-flex min-h-11 items-center rounded-lg px-3 py-2 text-sm font-bold text-[#536057] transition hover:bg-[#f0f3ee] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#47745b]"
            >
              Districts
            </Link>

            <div className="flex min-h-11 items-center">
              <AuthPanel onUserChange={() => undefined} />
            </div>

            <button
              type="button"
              onClick={openReportModal}
              className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#123b2a] px-3 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#1c563d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#47745b] sm:px-4 sm:text-sm"
            >
              <Plus aria-hidden="true" className="h-4 w-4" />
              <span>Report an issue</span>
            </button>
          </nav>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 sm:gap-12 sm:px-8 sm:py-20 lg:grid-cols-[1.1fr_0.9fr] lg:py-24">
        <div className="min-w-0">
          <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.18em] text-[#47745b] sm:mb-5 sm:text-xs sm:tracking-[0.2em]">
            Your neighborhood. Your voice.
          </p>

          <h2 className="max-w-2xl text-[2.35rem] font-black leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
            Turn local problems into{" "}
            <span className="text-[#47745b]">accountability.</span>
          </h2>

          <p className="mt-5 max-w-xl text-base leading-7 text-[#68756b] sm:mt-6 sm:text-lg sm:leading-8">
            Report a problem in your neighborhood. STANCE identifies
            the responsible NYC Council District and gives you the
            opportunity to review your report before it is shared.
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:flex-wrap sm:items-center">
            <button
              type="button"
              onClick={openReportModal}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#123b2a] px-6 py-3.5 text-sm font-bold text-white shadow-[0_3px_0_#081e15] transition hover:bg-[#1c563d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#47745b] sm:w-auto"
            >
              <Plus aria-hidden="true" className="h-4 w-4" />
              Create a report
            </button>

            <Link
              href="/districts"
              className="inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-[#d8dfd6] bg-white px-6 py-3.5 text-sm font-bold text-[#365444] transition hover:bg-[#f0f3ee] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#47745b] sm:w-auto"
            >
              Explore districts
            </Link>
          </div>

          <div className="mt-9 grid max-w-lg grid-cols-1 gap-4 border-t border-[#e1e6de] pt-6 sm:mt-10 sm:grid-cols-3 sm:gap-4">
            <div className="flex items-start gap-3 sm:block">
              <p className="text-lg font-black text-[#123b2a]">01</p>
              <p className="pt-0.5 text-sm leading-5 text-[#78847a] sm:mt-1 sm:text-xs">
                Describe the issue
              </p>
            </div>

            <div className="flex items-start gap-3 sm:block">
              <p className="text-lg font-black text-[#123b2a]">02</p>
              <p className="pt-0.5 text-sm leading-5 text-[#78847a] sm:mt-1 sm:text-xs">
                Verify its district
              </p>
            </div>

            <div className="flex items-start gap-3 sm:block">
              <p className="text-lg font-black text-[#123b2a]">03</p>
              <p className="pt-0.5 text-sm leading-5 text-[#78847a] sm:mt-1 sm:text-xs">
                Review before sharing
              </p>
            </div>
          </div>
        </div>

        <div className="relative mx-1 min-w-0 sm:mx-0">
          <div
            aria-hidden="true"
            className="absolute -inset-2 rounded-[1.5rem] bg-[#e8eee6] sm:-inset-4 sm:rounded-[2rem]"
          />

          <div className="relative overflow-hidden rounded-2xl border border-[#dce4da] bg-white p-5 shadow-xl sm:rounded-3xl sm:p-8">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#829084]">
                  How STANCE works
                </p>
                <h3 className="mt-2 text-xl font-black tracking-tight sm:text-2xl">
                  From report to review
                </h3>
              </div>

              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#eaf2e9] text-[#47745b]">
                <MapPin aria-hidden="true" className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-7 space-y-6 sm:mt-8">
              <div className="flex items-start gap-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#123b2a] text-sm font-bold text-white">
                  1
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold">Submit your report</p>
                  <p className="mt-1 text-sm leading-6 text-[#78847a]">
                    Provide a description, contact email, and location.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#eaf2e9] text-sm font-bold text-[#47745b]">
                  2
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold">District verification</p>
                  <p className="mt-1 text-sm leading-6 text-[#78847a]">
                    Location coordinates are checked against NYC Council
                    District boundaries.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#eaf2e9] text-sm font-bold text-[#47745b]">
                  3
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold">Review and approval</p>
                  <p className="mt-1 text-sm leading-6 text-[#78847a]">
                    Review the report and verified recipients before
                    authorizing delivery.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-7 rounded-xl border border-[#dce7d9] bg-[#f1f6ef] p-4 sm:mt-8">
              <p className="text-sm font-bold text-[#31583e]">
                Your approval matters.
              </p>
              <p className="mt-1 text-sm leading-6 text-[#687c6b]">
                Saving a report does not automatically send it to a
                government office.
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#e3e7df] bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-sm leading-6 text-[#89938a] sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p>STANCE · Civic reporting and accountability</p>
          <p>Reports are reviewed before any official delivery.</p>
        </div>
      </footer>

      {isOpen && (
        <ReportModal
          isEditing={false}
          form={form}
          setForm={setForm}
          addressInput={addressInput}
          districtName={selectedDistrictName}
          suggestions={suggestions}
          locating={locating}
          formError={formError}
          submitting={submitting}
          locationError={locationError}
          onAddressSearch={handleAddressSearch}
          onUseMyLocation={handleUseMyLocation}
          onSelectSuggestion={handleSelectSuggestion}
          onClose={closeReportModal}
          onSubmit={handleSubmit}
        />
      )}

      {success && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-[#17211d]/60 px-4 py-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSuccess(null);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="report-success-title"
            aria-describedby="report-success-description"
            className="my-auto max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto overscroll-contain rounded-2xl border border-[#dce4da] bg-white p-5 shadow-2xl sm:p-7"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#eaf2e9] text-[#47745b]">
              <CheckCircle2 aria-hidden="true" className="h-6 w-6" />
            </div>

            <h2
              id="report-success-title"
              className="mt-5 text-xl font-black tracking-tight sm:text-2xl"
            >
              Report saved for review
            </h2>

            <p
              id="report-success-description"
              className="mt-3 text-sm leading-6 text-[#68756b]"
            >
              {success.message ||
                "Your report has been received by STANCE and is awaiting review."}
            </p>

            {typeof success.districtNumber === "number" && (
              <div className="mt-5 rounded-xl bg-[#f1f6ef] p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#829084]">
                  Verified Council District
                </p>
                <p className="mt-1 text-sm font-bold text-[#31583e]">
                  Council District {success.districtNumber}
                </p>
              </div>
            )}

            <p className="mt-4 text-sm leading-6 text-[#89938a]">
              Your report has not been sent to an official. You will
              need to review and explicitly approve its delivery after
              the required review process.
            </p>

            <button
              ref={successCloseRef}
              type="button"
              onClick={() => setSuccess(null)}
              className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[#123b2a] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#1c563d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#47745b]"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
