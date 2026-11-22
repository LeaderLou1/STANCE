"use client";

import React, { useEffect, useRef } from "react";
import { X, MapPin, Loader2 } from "lucide-react";

import type {
  AddressSuggestion,
  ReportForm,
} from "@/src/types";

const SANS = '"Helvetica Neue", "Arial Nova", Arial, sans-serif';
const SERIF = 'Georgia, "Iowan Old Style", "Palatino Linotype", serif';

interface ReportModalProps {
  isEditing: boolean;
  form: ReportForm;
  setForm: React.Dispatch<React.SetStateAction<ReportForm>>;
  addressInput: string;
  districtName: string | null;
  suggestions: AddressSuggestion[];
  locating: boolean;
  formError: string;
  submitting: boolean;
  locationError: string;
  onAddressSearch: (text: string) => void;
  onUseMyLocation: () => void;
  onSelectSuggestion: (suggestion: AddressSuggestion) => void;
  onClose: () => void;
  onSubmit: () => void;
}

export function ReportModal({
  isEditing,
  form,
  setForm,
  addressInput,
  districtName,
  suggestions,
  locating,
  formError,
  submitting,
  locationError,
  onAddressSearch,
  onUseMyLocation,
  onSelectSuggestion,
  onClose,
  onSubmit,
}: ReportModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCloseRef.current();
        return;
      }

      if (event.key !== "Tab" || !modalRef.current) return;

      const focusableElements =
        modalRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
        );

      const firstElement = focusableElements[0];
      const lastElement =
        focusableElements[focusableElements.length - 1];

      if (!firstElement || !lastElement) return;

      if (
        event.shiftKey &&
        document.activeElement === firstElement
      ) {
        event.preventDefault();
        lastElement.focus();
      } else if (
        !event.shiftKey &&
        document.activeElement === lastElement
      ) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    (form.reporterEmail ?? "").trim()
  );

  const canSubmit =
    !submitting &&
    !locating &&
    validEmail &&
    form.title.trim().length >= 5 &&
    form.title.trim().length <= 120 &&
    form.description.trim().length >= 10 &&
    form.description.trim().length <= 2000 &&
    Boolean(addressInput.trim());

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#1b1f1d]/70 px-4 py-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-modal-title"
        className="my-auto max-h-[calc(100dvh-2rem)] w-full max-w-2xl overflow-y-auto overscroll-contain rounded-[20px] bg-[#f7f6f1] shadow-2xl"
        style={{ fontFamily: SERIF }}
      >
        {/* Street-sign plate header */}
        <div className="bg-[#0d5c3f] p-3 sm:p-4 rounded-t-[20px]">
          <div className="relative rounded-[13px] border-2 border-[#f7f6f1] px-5 py-5 sm:px-8 sm:py-6 flex items-start justify-between gap-4">
            {["left-3 top-3", "right-3 top-3", "bottom-3 left-3", "bottom-3 right-3"].map((position) => (
              <span
                key={position}
                aria-hidden="true"
                className={`absolute h-2 w-2 rounded-full bg-[#f7f6f1]/70 ${position}`}
              />
            ))}
            <div>
              <h2
                id="report-modal-title"
                className="text-2xl font-extrabold tracking-tight text-[#f7f6f1]"
                style={{ fontFamily: SANS }}
              >
                {isEditing ? "Edit report" : "Report a neighborhood issue"}
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-[#dcebe3]">
                {isEditing
                  ? "Update the details of your report."
                  : "Tell us what happened and where it's located."}
              </p>
            </div>

            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              disabled={submitting}
              aria-label="Close report form"
              className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#f7f6f1]/10 text-[#f7f6f1] transition hover:bg-[#f7f6f1]/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f7f6f1] disabled:opacity-50"
            >
              <X aria-hidden="true" className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="space-y-6 px-6 py-6 sm:px-8">
          <div>
            <label
              htmlFor="reporter-email"
              className="mb-2 block text-sm font-bold text-[#1b1f1d]"
              style={{ fontFamily: SANS }}
            >
              Email address
            </label>

            <input
              id="reporter-email"
              type="email"
              autoComplete="email"
              maxLength={254}
              required
              value={form.reporterEmail ?? ""}
              onChange={(event) =>
                setForm((previous) => ({
                  ...previous,
                  reporterEmail: event.target.value,
                }))
              }
              placeholder="you@example.com"
              className="min-h-12 w-full rounded-lg border border-[#1b1f1d]/20 bg-white px-4 py-3 text-sm text-[#1b1f1d] outline-none transition placeholder:text-[#1b1f1d]/40 focus:border-[#0d5c3f] focus:ring-2 focus:ring-[#0d5c3f]/20"
            />

            <p className="mt-2 text-xs leading-5 text-[#4d5a52]">
              We use your email to verify your report and provide updates.
            </p>
          </div>

          <div>
            <label
              htmlFor="report-title"
              className="mb-2 block text-sm font-bold text-[#1b1f1d]"
              style={{ fontFamily: SANS }}
            >
              Report title
            </label>

            <input
              id="report-title"
              type="text"
              maxLength={120}
              required
              value={form.title}
              onChange={(event) =>
                setForm((previous) => ({
                  ...previous,
                  title: event.target.value,
                }))
              }
              placeholder="e.g. Broken streetlight on Eastern Pkwy & Utica Ave"
              className="min-h-12 w-full rounded-lg border border-[#1b1f1d]/20 bg-white px-4 py-3 text-sm text-[#1b1f1d] outline-none transition placeholder:text-[#1b1f1d]/40 focus:border-[#0d5c3f] focus:ring-2 focus:ring-[#0d5c3f]/20"
            />

            <p className="mt-1 text-right text-xs text-[#4d5a52]">
              {form.title.length}/120
            </p>
          </div>

          <div>
            <label
              htmlFor="report-description"
              className="mb-2 block text-sm font-bold text-[#1b1f1d]"
              style={{ fontFamily: SANS }}
            >
              Describe the issue
            </label>

            <textarea
              id="report-description"
              rows={5}
              maxLength={2000}
              required
              value={form.description}
              onChange={(event) =>
                setForm((previous) => ({
                  ...previous,
                  description: event.target.value,
                }))
              }
              placeholder="Describe what happened, where it is happening, and any details that could help..."
              className="w-full resize-y rounded-lg border border-[#1b1f1d]/20 bg-white px-4 py-3 text-sm leading-6 text-[#1b1f1d] outline-none transition placeholder:text-[#1b1f1d]/40 focus:border-[#0d5c3f] focus:ring-2 focus:ring-[#0d5c3f]/20"
            />

            <p className="mt-1 text-right text-xs text-[#4d5a52]">
              {form.description.length}/2,000
            </p>
          </div>

          <div>
            <label
              htmlFor="report-category"
              className="mb-2 block text-sm font-bold text-[#1b1f1d]"
              style={{ fontFamily: SANS }}
            >
              Issue category
            </label>

            <select
              id="report-category"
              value={form.category}
              onChange={(event) =>
                setForm((previous) => ({
                  ...previous,
                  category: event.target.value,
                }))
              }
              className="min-h-12 w-full rounded-lg border border-[#1b1f1d]/20 bg-white px-4 py-3 text-sm text-[#1b1f1d] outline-none transition focus:border-[#0d5c3f] focus:ring-2 focus:ring-[#0d5c3f]/20"
            >
              {[
                "Infrastructure",
                "Roads & Sidewalks",
                "Public Safety",
                "Sanitation",
                "Transit",
                "Parks & Recreation",
                "Housing",
                "Environment",
                "Other",
              ].map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
            <div>
              <label
                htmlFor="report-address"
                className="mb-2 block text-sm font-bold text-[#1b1f1d]"
                style={{ fontFamily: SANS }}
              >
                Issue location (Address, Intersection, or Landmark)
              </label>

              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  id="report-address"
                  type="text"
                  autoComplete="street-address"
                  value={addressInput}
                  onChange={(event) =>
                    onAddressSearch(event.target.value)
                  }
                  placeholder="e.g. Eastern Pkwy & Utica Ave"
                  className="min-h-12 min-w-0 flex-1 rounded-lg border border-[#1b1f1d]/20 bg-white px-4 py-3 text-sm text-[#1b1f1d] outline-none transition placeholder:text-[#1b1f1d]/40 focus:border-[#0d5c3f] focus:ring-2 focus:ring-[#0d5c3f]/20"
                />

                <button
                  type="button"
                  onClick={onUseMyLocation}
                  disabled={locating}
                  style={{ fontFamily: SANS }}
                  className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-lg border border-[#1b1f1d]/20 bg-white px-4 py-3 text-sm font-bold text-[#0d5c3f] transition hover:bg-[#1b1f1d]/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0d5c3f] disabled:opacity-50"
                >
                  {locating ? (
                    <Loader2
                      aria-hidden="true"
                      className="h-4 w-4 animate-spin"
                    />
                  ) : (
                    <MapPin aria-hidden="true" className="h-4 w-4" />
                  )}

                  Use my location
                </button>
              </div>
            </div>

            {suggestions.length > 0 && (
              <div
                role="listbox"
                aria-label="Address suggestions"
                className="max-h-52 overflow-y-auto rounded-lg border border-[#1b1f1d]/20 bg-white shadow-sm"
              >
                {suggestions.map((suggestion, index) => (
                  <button
                    key={`${suggestion.lat}-${suggestion.lon}-${index}`}
                    type="button"
                    role="option"
                    aria-selected={false}
                    onClick={() => onSelectSuggestion(suggestion)}
                    className="block w-full border-b border-[#1b1f1d]/10 px-4 py-3 text-left text-sm leading-5 text-[#1b1f1d] transition last:border-b-0 hover:bg-[#0d5c3f]/10 focus-visible:bg-[#0d5c3f]/10 focus-visible:outline-none"
                  >
                    {suggestion.display_name}
                  </button>
                ))}
              </div>
            )}

            {locationError && (
              <p role="alert" className="text-sm font-bold text-red-700">
                {locationError}
              </p>
            )}

            {districtName && (
              <div
                aria-live="polite"
                className="rounded-lg border border-[#0d5c3f]/30 bg-[#0d5c3f]/5 p-4"
              >
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#0d5c3f]" style={{ fontFamily: SANS }}>
                  Location verification
                </p>

                <p className="mt-1 text-sm font-bold text-[#1b1f1d]">
                  {districtName}
                </p>
              </div>
            )}
          </div>

          {formError && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-800"
            >
              {formError}
            </div>
          )}

          <div className="rounded-lg border border-[#1b1f1d]/15 bg-white p-4">
            <p className="text-sm font-bold text-[#1b1f1d]" style={{ fontFamily: SANS }}>
              Your report is ready for submission.
            </p>

            <p className="mt-1 text-sm leading-6 text-[#4d5a52]">
              After submission, your report remains pending review and verification.
            </p>
          </div>
        </div>

        <div className="sticky bottom-0 flex flex-col-reverse gap-3 border-t border-[#1b1f1d]/15 bg-[#f7f6f1] px-6 py-4 sm:flex-row sm:justify-end sm:px-8 rounded-b-[20px]">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            style={{ fontFamily: SANS }}
            className="inline-flex min-h-12 items-center justify-center rounded-lg border border-[#1b1f1d]/20 bg-white px-5 py-3 text-sm font-bold text-[#1b1f1d] transition hover:bg-[#1b1f1d]/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0d5c3f] disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onSubmit}
            disabled={!canSubmit}
            style={{ fontFamily: SANS }}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[#f7b500] px-6 py-3 text-sm font-extrabold text-[#1b1f1d] transition hover:bg-[#ffc933] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0d5c3f] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting && (
              <Loader2
                aria-hidden="true"
                className="h-4 w-4 animate-spin"
              />
            )}

            {submitting
              ? "Submitting..."
              : isEditing
                ? "Save changes"
                : "Submit report for review"}
          </button>
        </div>
      </div>
    </div>
  );
}