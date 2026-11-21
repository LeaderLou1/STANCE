
"use client";

import React, { useEffect, useRef } from "react";
import { X, MapPin, Loader2 } from "lucide-react";

import { TurnstileWidget } from "@/src/components/TurnstileWidget";

import type {
  AddressSuggestion,
  ReportForm,
} from "@/src/types";

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
  captchaToken: string;
  captchaResetKey: number;
  onCaptchaTokenChange: (token: string) => void;
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
  captchaToken,
  captchaResetKey,
  onCaptchaTokenChange,
  onAddressSearch,
  onUseMyLocation,
  onSelectSuggestion,
  onClose,
  onSubmit,
}: ReportModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }

      if (event.key !== "Tab" || !modalRef.current) return;

      const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
      );

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

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
  }, [onClose]);

  const canSubmit =
    !submitting &&
    !locating &&
    (isEditing || Boolean(captchaToken)) &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      (form.reporterEmail ?? "").trim()
    ) &&
    form.title.trim().length >= 5 &&
    form.title.trim().length <= 120 &&
    form.description.trim().length >= 10 &&
    form.description.trim().length <= 2000 &&
    Boolean(addressInput.trim()) &&
    Boolean(districtName) &&
    districtName !== "Council District not resolved" &&
    districtName !== "Resolving Council District...";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#17211d]/60 px-4 py-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-sm"
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
        className="my-auto max-h-[calc(100dvh-2rem)] w-full max-w-2xl overflow-y-auto overscroll-contain rounded-2xl border border-[#dce4da] bg-white shadow-2xl"
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[#e5e9e3] bg-white px-5 py-4 sm:px-7">
          <div>
            <h2
              id="report-modal-title"
              className="text-xl font-black tracking-tight text-[#17211d]"
            >
              {isEditing ? "Edit report" : "Report a neighborhood issue"}
            </h2>

            <p className="mt-1 text-sm leading-5 text-[#78847a]">
              {isEditing
                ? "Update the details of your report."
                : "Tell us what happened so we can identify the responsible district."}
            </p>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close report form"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[#78847a] transition hover:bg-[#f0f3ee] hover:text-[#17211d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#47745b] disabled:opacity-50"
          >
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 px-5 py-6 sm:px-7">
          <div>
            <label
              htmlFor="reporter-email"
              className="mb-2 block text-sm font-bold text-[#27372d]"
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
              className="min-h-12 w-full rounded-xl border border-[#dce4da] bg-white px-4 py-3 text-sm text-[#17211d] outline-none transition placeholder:text-[#a0aaa1] focus:border-[#47745b] focus:ring-2 focus:ring-[#47745b]/15"
            />

            <p className="mt-2 text-xs leading-5 text-[#89938a]">
              We use your email to verify your report and provide updates.
            </p>
          </div>

          <div>
            <label
              htmlFor="report-title"
              className="mb-2 block text-sm font-bold text-[#27372d]"
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
              placeholder="e.g. Broken streetlight on Fulton Street"
              className="min-h-12 w-full rounded-xl border border-[#dce4da] bg-white px-4 py-3 text-sm text-[#17211d] outline-none transition placeholder:text-[#a0aaa1] focus:border-[#47745b] focus:ring-2 focus:ring-[#47745b]/15"
            />

            <p className="mt-1 text-right text-xs text-[#89938a]">
              {form.title.length}/120
            </p>
          </div>

          <div>
            <label
              htmlFor="report-description"
              className="mb-2 block text-sm font-bold text-[#27372d]"
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
              className="w-full resize-y rounded-xl border border-[#dce4da] bg-white px-4 py-3 text-sm leading-6 text-[#17211d] outline-none transition placeholder:text-[#a0aaa1] focus:border-[#47745b] focus:ring-2 focus:ring-[#47745b]/15"
            />

            <p className="mt-1 text-right text-xs text-[#89938a]">
              {form.description.length}/2,000
            </p>
          </div>

          <div>
            <label
              htmlFor="report-category"
              className="mb-2 block text-sm font-bold text-[#27372d]"
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
              className="min-h-12 w-full rounded-xl border border-[#dce4da] bg-white px-4 py-3 text-sm text-[#17211d] outline-none transition focus:border-[#47745b] focus:ring-2 focus:ring-[#47745b]/15"
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
                className="mb-2 block text-sm font-bold text-[#27372d]"
              >
                Issue location
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
                  placeholder="Enter an NYC address"
                  className="min-h-12 min-w-0 flex-1 rounded-xl border border-[#dce4da] bg-white px-4 py-3 text-sm text-[#17211d] outline-none transition placeholder:text-[#a0aaa1] focus:border-[#47745b] focus:ring-2 focus:ring-[#47745b]/15"
                />

                <button
                  type="button"
                  onClick={onUseMyLocation}
                  disabled={locating}
                  className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl border border-[#dce4da] bg-[#f7f9f6] px-4 py-3 text-sm font-bold text-[#365444] transition hover:bg-[#edf2eb] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#47745b] disabled:opacity-50"
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
                className="max-h-52 overflow-y-auto rounded-xl border border-[#dce4da] bg-white shadow-sm"
              >
                {suggestions.map((suggestion, index) => (
                  <button
                    key={`${suggestion.lat}-${suggestion.lon}-${index}`}
                    type="button"
                    role="option"
                    aria-selected={false}
                    onClick={() => onSelectSuggestion(suggestion)}
                    className="block w-full border-b border-[#edf0eb] px-4 py-3 text-left text-sm leading-5 text-[#365444] transition last:border-b-0 hover:bg-[#f1f6ef] focus-visible:bg-[#f1f6ef] focus-visible:outline-none"
                  >
                    {suggestion.display_name}
                  </button>
                ))}
              </div>
            )}

            {locationError && (
              <p role="alert" className="text-sm text-red-700">
                {locationError}
              </p>
            )}

            {districtName && (
              <div
                aria-live="polite"
                className="rounded-xl border border-[#dce7d9] bg-[#f1f6ef] p-4"
              >
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#829084]">
                  Location verification
                </p>

                <p className="mt-1 text-sm font-bold text-[#31583e]">
                  {districtName}
                </p>
              </div>
            )}
          </div>

          {!isEditing && (
            <div className="space-y-3">
              <p className="text-sm font-bold text-[#27372d]">
                Security verification
                <span className="ml-1 text-red-600">*</span>
              </p>

              <TurnstileWidget
                onTokenChange={onCaptchaTokenChange}
                resetKey={captchaResetKey}
              />
            </div>
          )}

          {formError && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-800"
            >
              {formError}
            </div>
          )}

          <div className="rounded-xl border border-[#dce7d9] bg-[#f1f6ef] p-4">
            <p className="text-sm font-bold text-[#31583e]">
              Your report is not automatically sent.
            </p>

            <p className="mt-1 text-sm leading-6 text-[#687c6b]">
              After submission, you must verify your email. Your report
              remains pending review. You will have an opportunity to
              review the exact report and verified recipients before
              explicitly approving delivery.
            </p>
          </div>
        </div>

        <div className="sticky bottom-0 flex flex-col-reverse gap-3 border-t border-[#e5e9e3] bg-white px-5 py-4 sm:flex-row sm:justify-end sm:px-7">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[#dce4da] bg-white px-5 py-3 text-sm font-bold text-[#536057] transition hover:bg-[#f5f7f4] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#47745b] disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onSubmit}
            disabled={!canSubmit}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#123b2a] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#1c563d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#47745b] disabled:cursor-not-allowed disabled:opacity-50"
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
