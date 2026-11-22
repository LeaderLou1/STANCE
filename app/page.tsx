"use client";

import React, { useCallback, useRef, useState } from "react";
import { ReportModal } from "@/src/components/ReportModal";
import type { AddressSuggestion, ReportForm } from "@/src/types";

const SANS = '"Helvetica Neue", "Arial Nova", Arial, sans-serif';
const SERIF = 'Georgia, "Iowan Old Style", "Palatino Linotype", serif';

type GeosearchFeature = {
  properties?: { label?: string; postalcode?: string };
  geometry?: { coordinates?: [number, number] };
};

type GeosearchResponse = { features?: GeosearchFeature[] };

type ReportResponse = {
  reportId?: string;
  status?: string;
  moderationStatus?: string;
  districtNumber?: number;
  message?: string;
  error?: string;
};

const DISTRICT_PENDING = "Resolving Council District...";
const DISTRICT_UNRESOLVED = "Council District not resolved";

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
  return "An unexpected error occurred.";
}

export default function HomePage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<ReportForm>(defaultForm);

  const [addressInput, setAddressInput] = useState("");
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<[number, number] | null>(null);
  const [districtName, setDistrictName] = useState<string | null>(null);

  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [locationError, setLocationError] = useState("");
  const [success, setSuccess] = useState<ReportResponse | null>(null);

  const geosearchRequestRef = useRef(0);

  const resolveDistrictForPoint = useCallback(async (latitude: number, longitude: number) => {
    setLocationError("");
    setDistrictName(DISTRICT_PENDING);

    try {
      const response = await fetch(`/api/districts/resolve?lat=${latitude}&lng=${longitude}`);
      const result: { districtName?: string | null } = await response.json();
      setDistrictName(response.ok && result.districtName ? result.districtName : DISTRICT_UNRESOLVED);
    } catch (error: unknown) {
      console.error("District resolution failed:", getErrorMessage(error));
      setDistrictName(DISTRICT_UNRESOLVED);
    }
  }, []);

  const resetForm = useCallback(() => {
    geosearchRequestRef.current += 1;
    setForm(defaultForm);
    setAddressInput("");
    setSuggestions([]);
    setSelectedLocation(null);
    setDistrictName(null);
    setLocationError("");
    setFormError("");
    setLocating(false);
  }, []);

  const openReportModal = () => {
    setSuccess(null);
    resetForm();
    setIsModalOpen(true);
  };

  const closeReportModal = () => {
    if (submitting) return;
    resetForm();
    setIsModalOpen(false);
  };

  const handleAddressSearch = async (query: string) => {
    const requestId = ++geosearchRequestRef.current;

    setAddressInput(query);
    setSuggestions([]);
    setSelectedLocation(null);
    setDistrictName(null);
    setLocationError("");
    setForm((previous) => ({ ...previous, zip_code: "" }));

    if (query.trim().length < 3) {
      setLocating(false);
      return;
    }

    setLocating(true);

    try {
      const response = await fetch(`/api/geosearch?text=${encodeURIComponent(query)}`);
      if (!response.ok) throw new Error("Address search failed. Please try again.");

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
        setLocationError("No matching address was found. Try a more complete NYC address.");
      }
    } catch (error: unknown) {
      if (requestId === geosearchRequestRef.current) {
        setSuggestions([]);
        setLocationError("We could not search this address. Please try again.");
      }
      console.error("Address search failed:", getErrorMessage(error));
    } finally {
      if (requestId === geosearchRequestRef.current) setLocating(false);
    }
  };

  const handleSelectSuggestion = (suggestion: AddressSuggestion) => {
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
      setDistrictName(DISTRICT_UNRESOLVED);
      setLocationError("This address does not include a valid location. Choose another result.");
      return;
    }

    setSelectedLocation([suggestion.lat, suggestion.lon]);
    setForm((previous) => ({ ...previous, zip_code: suggestion.zip || "" }));
    void resolveDistrictForPoint(suggestion.lat, suggestion.lon);
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Location access is not supported by this browser.");
      return;
    }

    setLocating(true);
    setLocationError("");
    setDistrictName(null);
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
        setLocationError(error.message || "We could not access your location.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSubmitReport = async () => {
    const title = form.title.trim();
    const description = form.description.trim();
    const reporterEmail = (form.reporterEmail ?? "").trim();

    if (title.length < 5 || title.length > 120) {
      setFormError("Your title must be between 5 and 120 characters.");
      return;
    }
    if (description.length < 10 || description.length > 2000) {
      setFormError("Your description must be between 10 and 2,000 characters.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(reporterEmail) || reporterEmail.length > 254) {
      setFormError("Enter a valid email address.");
      return;
    }
    if (!selectedLocation) {
      setFormError("Select a valid NYC address or use your location.");
      return;
    }
    if (!districtName || districtName === DISTRICT_UNRESOLVED || districtName === DISTRICT_PENDING) {
      setFormError("Wait for your Council District to be verified before submitting.");
      return;
    }
    setSubmitting(true);
    setFormError("");

    try {
      // All submissions go through the server route, which rate limits,
      // resolves the district and sends the verification email.
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
      if (!response.ok) throw new Error(result.error || "We could not save your report.");

      setSuccess(result);
      setIsModalOpen(false);
      resetForm();
    } catch (error: unknown) {
      console.error("Report submission failed:", getErrorMessage(error));
      setFormError(getErrorMessage(error) || "We could not save your report. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen text-[#1b1f1d]" style={{ fontFamily: SERIF }}>
      <style>{`
        @keyframes plate-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
        @media (prefers-reduced-motion: no-preference) { .plate-in { animation: plate-in .7s ease-out both; } }
      `}</style>

      <header className="border-b border-[#1b1f1d]/15 bg-[#f7f6f1]/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <div className="flex items-baseline gap-3">
            <span className="text-xl font-extrabold tracking-tight" style={{ fontFamily: SANS }}>
              STANCE
            </span>
            <span className="text-sm text-[#4d5a52]">Early pilot</span>
          </div>
          <button
            type="button"
            onClick={openReportModal}
            style={{ fontFamily: SANS }}
            className="rounded-lg bg-[#0d5c3f] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#0a4a33] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0d5c3f]"
          >
            Report a problem
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 pb-20 pt-8 sm:px-8 sm:pt-12">
        {success && (
          <div
            role="status"
            className="mb-8 flex items-start justify-between gap-4 border-l-4 border-[#f7b500] bg-white px-5 py-4 text-[15px] leading-6 shadow-sm"
          >
            <p>
              {success.message ??
                "Your report is saved pending email verification. Check your inbox for a link."}
            </p>
            <button
              type="button"
              onClick={() => setSuccess(null)}
              style={{ fontFamily: SANS }}
              className="shrink-0 text-sm font-bold underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0d5c3f]"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* The street-sign plate: green board, white keyline, bolts. */}
        <section aria-labelledby="hero-title" className="plate-in rounded-[20px] bg-[#0d5c3f] p-3 sm:p-4">
          <div className="relative rounded-[13px] border-2 border-[#f7f6f1] px-6 py-14 sm:px-14 sm:py-20">
            {["left-4 top-4", "right-4 top-4", "bottom-4 left-4", "bottom-4 right-4"].map((position) => (
              <span
                key={position}
                aria-hidden="true"
                className={`absolute h-2.5 w-2.5 rounded-full bg-[#f7f6f1]/70 ${position}`}
              />
            ))}
            <h1
              id="hero-title"
              className="max-w-4xl text-[clamp(2.75rem,9vw,6.75rem)] font-extrabold leading-[0.95] tracking-[-0.045em] text-[#f7f6f1]"
              style={{ fontFamily: SANS }}
            >
              Report it.
              <br />
              Get it seen.
            </h1>
            <p className="mt-7 max-w-xl text-[1.0625rem] leading-[1.7] text-[#dcebe3]">
              Tell us about a problem on your block. You do not need an account. We review every
              report, and nothing goes to an official until you approve it.
            </p>
            <button
              type="button"
              onClick={openReportModal}
              style={{ fontFamily: SANS }}
              className="mt-9 rounded-lg bg-[#f7b500] px-7 py-4 text-base font-extrabold text-[#1b1f1d] transition hover:bg-[#ffc933] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#f7f6f1]"
            >
              Report a problem
            </button>
          </div>
        </section>

        <section aria-labelledby="steps-title" className="mt-20 grid gap-10 md:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] md:gap-16">
          <h2
            id="steps-title"
            className="text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl"
            style={{ fontFamily: SANS }}
          >
            What happens after you report
          </h2>
          <ol className="divide-y divide-[#1b1f1d]/15 border-y border-[#1b1f1d]/15">
            {[
              ["Describe it", "Say what is wrong and pick the address. We find your council district for you."],
              ["Confirm your email", "No account to create. One link in your inbox shows the address is yours."],
              ["We review, you approve", "Nothing is shared with an official until you have seen it and said yes."],
            ].map(([title, text], index) => (
              <li key={title} className="grid grid-cols-[3.5rem_1fr] gap-4 py-6 sm:grid-cols-[4.5rem_1fr]">
                <span
                  aria-hidden="true"
                  className="text-5xl font-extrabold leading-none text-[#0d5c3f] sm:text-6xl"
                  style={{ fontFamily: SANS }}
                >
                  {index + 1}
                </span>
                <div>
                  <h3 className="text-xl font-bold" style={{ fontFamily: SANS }}>{title}</h3>
                  <p className="mt-1.5 max-w-md leading-[1.7] text-[#3d4a42]">{text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="status-title" className="mt-20 grid gap-10 md:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] md:gap-16">
          <h2
            id="status-title"
            className="text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl"
            style={{ fontFamily: SANS }}
          >
            Where the pilot stands
          </h2>
          <dl className="space-y-6">
            <div className="border-l-4 border-[#0d5c3f] pl-5">
              <dt className="text-lg font-bold" style={{ fontFamily: SANS }}>Open now</dt>
              <dd className="mt-1 max-w-md leading-[1.7] text-[#3d4a42]">
                Report a problem anywhere in New York City and confirm your email.
              </dd>
            </div>
            <div className="border-l-4 border-[#f7b500] pl-5">
              <dt className="text-lg font-bold" style={{ fontFamily: SANS }}>Coming next</dt>
              <dd className="mt-1 max-w-md leading-[1.7] text-[#3d4a42]">
                Sending reports to the right officials, and following what happens to yours.
              </dd>
            </div>
          </dl>
        </section>
      </main>

      <footer className="border-t border-[#1b1f1d]/15">
        <p className="mx-auto max-w-6xl px-5 py-8 text-sm leading-6 text-[#4d5a52] sm:px-8">
          STANCE is an early pilot. Your email address is used to verify your report and is not
          shown to other residents.
        </p>
      </footer>

      {isModalOpen && (
        <ReportModal
          isEditing={false}
          form={form}
          setForm={setForm}
          addressInput={addressInput}
          districtName={districtName}
          suggestions={suggestions}
          locating={locating}
          formError={formError}
          submitting={submitting}
          locationError={locationError}
          onAddressSearch={handleAddressSearch}
          onUseMyLocation={handleUseMyLocation}
          onSelectSuggestion={handleSelectSuggestion}
          onClose={closeReportModal}
          onSubmit={handleSubmitReport}
        />
      )}
    </div>
  );
}