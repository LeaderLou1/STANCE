
"use client";

import React, { useEffect, useRef } from "react";
import { X, MapPin, Loader2 } from "lucide-react";
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
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  const submittingRef = useRef(submitting);

  // Keep event handlers synchronized with the latest props.
  useEffect(() => {
    onCloseRef.current = onClose;
    submittingRef.current = submitting;
  }, [onClose, submitting]);

  // Manage dialog focus, keyboard interaction, and background scrolling.
  useEffect(() => {
    previousFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const dialog = dialogRef.current;

    const focusableSelector = [
      "button:not([disabled])",
      "input:not([disabled])",
      "textarea:not([disabled])",
      "select:not([disabled])",
      '[tabindex]:not([tabindex="-1"])',
    ].join(",");

    const getFocusableElements = () => {
      if (!dialog) return [];

      return Array.from(
        dialog.querySelectorAll<HTMLElement>(focusableSelector)
      ).filter(
        (element) =>
          element.getAttribute("aria-hidden") !== "true" &&
          element.offsetParent !== null
      );
    };

    // Focus the close control so the mobile keyboard does not open.
    dialog
      ?.querySelector<HTMLElement>("[data-dialog-close]")
      ?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (!submittingRef.current) {
          event.preventDefault();
          onCloseRef.current();
        }
        return;
      }

      if (event.key !== "Tab") return;

      const elements = getFocusableElements();

      if (elements.length === 0) {
        event.preventDefault();
        return;
      }

      const first = elements[0];
      const last = elements[elements.length - 1];

      if (
        event.shiftKey &&
        (document.activeElement === first ||
          !dialog?.contains(document.activeElement))
      ) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last ||
          !dialog?.contains(document.activeElement))
      ) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocusRef.current?.focus();
    };
  }, []);

  const updateField = <K extends keyof ReportForm>(
    field: K,
    value: ReportForm[K]
  ) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const email = form.reporterEmail ?? "";

  const emailValid =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) &&
    email.trim().length <= 254;

  const districtResolved =
    Boolean(districtName) &&
    districtName !== "Council District not resolved" &&
    districtName !== "Resolving Council District...";

  const canSubmit =
    !submitting &&
    !locating &&
    emailValid &&
    form.title.trim().length >= 5 &&
    form.title.trim().length <= 120 &&
    form.description.trim().length >= 10 &&
    form.description.trim().length <= 2000 &&
    Boolean(addressInput.trim()) &&
    districtResolved;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#17211d]/60 p-0 backdrop-blur-sm sm:p-5"
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget &&
          !submitting
        ) {
          onClose();
        }
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-modal-title"
        aria-describedby="report-modal-description"
        className="relative flex h-[100dvh] max-h-[100dvh] w-full flex-col overflow-hidden border border-[#dce3dc] bg-[#fffefa] shadow-2xl sm:h-auto sm:max-h-[min(90dvh,900px)] sm:max-w-xl sm:rounded-2xl"
      >
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[#e5e9e3] bg-[#fffefa] px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))] sm:px-7 sm:py-5">
          <div className="min-w-0">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#47745b]">
              STANCE · Community Reporting
            </p>

            <h2
              id="report-modal-title"
              className="text-xl font-black tracking-tight text-[#17211d] sm:text-2xl"
            >
              {isEditing ? "Edit your report" : "Report a local issue"}
            </h2>

            <p
              id="report-modal-description"
              className="mt-1 max-w-md text-sm leading-5 text-[#647168]"
            >
              {isEditing
                ? "Update the details of your existing report."
                : "Describe the issue and identify its location. You can review everything before deciding whether to share it with officials."}
            </p>
          </div>

          <button
            type="button"
            data-dialog-close
            onClick={onClose}
            disabled={submitting}
            aria-label="Close report form"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[#647168] transition hover:bg-[#f0f2ed] hover:text-[#17211d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#47745b] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable form */}
        <div
          className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain px-4 py-5 sm:px-7 sm:py-6"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {/* Email */}
          <div className="space-y-2">
            <label
              htmlFor="reporter-email"
              className="block text-sm font-bold text-[#27372d]"
            >
              Your email address
              <span className="ml-1 text-red-600">*</span>
            </label>

            <input
              id="reporter-email"
              type="email"
              required
              autoComplete="email"
              inputMode="email"
              maxLength={254}
              value={email}
              disabled={submitting}
              onChange={(event) =>
                updateField("reporterEmail", event.target.value)
              }
              placeholder="you@example.com"
              aria-invalid={email.length > 0 && !emailValid}
              aria-describedby="reporter-email-help"
              className="min-h-12 w-full rounded-xl border border-[#d5ded5] bg-white px-4 py-3 text-base text-[#17211d] outline-none transition placeholder:text-[#9aa59b] focus:border-[#47745b] focus:ring-2 focus:ring-[#dceade] disabled:bg-[#f5f5f1]"
            />

            <p
              id="reporter-email-help"
              className="text-xs leading-5 text-[#89938a]"
            >
              We&apos;ll use this to help you access your report and receive
              updates. Your report is not automatically sent to officials.
            </p>

            {email.length > 0 && !emailValid && (
              <p role="alert" className="text-sm font-semibold text-red-700">
                Enter a valid email address.
              </p>
            )}
          </div>

          {/* Title */}
          <div className="space-y-2">
            <label
              htmlFor="issue-title"
              className="block text-sm font-bold text-[#27372d]"
            >
              What&apos;s the issue?
              <span className="ml-1 text-red-600">*</span>
            </label>

            <input
              id="issue-title"
              type="text"
              required
              minLength={5}
              maxLength={120}
              value={form.title}
              disabled={submitting}
              onChange={(event) =>
                updateField("title", event.target.value)
              }
              placeholder="Example: Large pothole on Atlantic Avenue"
              className="min-h-12 w-full rounded-xl border border-[#d5ded5] bg-white px-4 py-3 text-base text-[#17211d] outline-none transition placeholder:text-[#9aa59b] focus:border-[#47745b] focus:ring-2 focus:ring-[#dceade] disabled:bg-[#f5f5f1]"
            />

            <p className="text-xs text-[#89938a]">
              Keep it short and specific.
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label
              htmlFor="issue-description"
              className="block text-sm font-bold text-[#27372d]"
            >
              Tell us more
              <span className="ml-1 text-red-600">*</span>
            </label>

            <textarea
              id="issue-description"
              required
              minLength={10}
              maxLength={2000}
              rows={4}
              value={form.description}
              disabled={submitting}
              onChange={(event) =>
                updateField("description", event.target.value)
              }
              placeholder="Describe what happened, where it is, and how it's affecting your neighborhood..."
              className="min-h-32 w-full resize-y rounded-xl border border-[#d5ded5] bg-white px-4 py-3 text-base leading-6 text-[#17211d] outline-none transition placeholder:text-[#9aa59b] focus:border-[#47745b] focus:ring-2 focus:ring-[#dceade] disabled:bg-[#f5f5f1]"
            />

            <div className="flex justify-between gap-3 text-xs text-[#89938a]">
              <span>At least 10 characters</span>
              <span aria-live="polite">
                {form.description.length}/2000
              </span>
            </div>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <label
              htmlFor="issue-category"
              className="block text-sm font-bold text-[#27372d]"
            >
              What type of issue is it?
            </label>

            <select
              id="issue-category"
              value={form.category}
              disabled={submitting}
              onChange={(event) =>
                updateField("category", event.target.value)
              }
              className="min-h-12 w-full rounded-xl border border-[#d5ded5] bg-white px-4 py-3 text-base text-[#17211d] outline-none transition focus:border-[#47745b] focus:ring-2 focus:ring-[#dceade] disabled:bg-[#f5f5f1]"
            >
              <option value="Infrastructure">Infrastructure</option>
              <option value="Roads & Sidewalks">Roads & Sidewalks</option>
              <option value="Public Safety">Public Safety</option>
              <option value="Sanitation">Sanitation</option>
              <option value="Transit">Transit</option>
              <option value="Parks & Recreation">Parks & Recreation</option>
              <option value="Housing">Housing</option>
              <option value="Environment">Environment</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Location */}
          <div className="space-y-3">
            <div>
              <label
                htmlFor="incident-location"
                className="block text-sm font-bold text-[#27372d]"
              >
                Where is the issue?
                <span className="ml-1 text-red-600">*</span>
              </label>

              <p className="mt-1 text-xs leading-5 text-[#89938a]">
                Use an address or your current location so STANCE can
                identify the correct Council District.
              </p>
            </div>

            <input
              id="incident-location"
              type="text"
              autoComplete="street-address"
              value={addressInput}
              disabled={submitting}
              onChange={(event) =>
                onAddressSearch(event.target.value)
              }
              placeholder="Enter a NYC address"
              aria-describedby="location-help"
              aria-autocomplete="list"
              aria-controls="address-suggestions"
              className="min-h-12 w-full rounded-xl border border-[#d5ded5] bg-white px-4 py-3 text-base text-[#17211d] outline-none transition placeholder:text-[#9aa59b] focus:border-[#47745b] focus:ring-2 focus:ring-[#dceade] disabled:bg-[#f5f5f1]"
            />

            <p id="location-help" className="sr-only">
              Enter at least three characters to search for a New York City
              address, or use your current location.
            </p>

            <button
              type="button"
              onClick={onUseMyLocation}
              disabled={locating || submitting}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#d5ded5] bg-[#f2f4ef] px-4 py-3 text-sm font-bold text-[#365444] transition hover:bg-[#e7ede6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#47745b] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              {locating ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <MapPin className="h-5 w-5" />
              )}
              {locating ? "Locating..." : "Use my location"}
            </button>

            {locating && (
              <p role="status" className="text-sm text-[#647168]">
                Searching for your location...
              </p>
            )}

            {suggestions.length > 0 && (
              <ul
                id="address-suggestions"
                aria-label="Address suggestions"
                className="max-h-56 divide-y divide-[#e5e9e3] overflow-y-auto rounded-xl border border-[#d5ded5] bg-white shadow-sm"
              >
                {suggestions.map((suggestion, index) => (
                  <li key={`${suggestion.lat}-${suggestion.lon}-${index}`}>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => onSelectSuggestion(suggestion)}
                      className="flex min-h-14 w-full items-start gap-3 px-4 py-4 text-left text-sm leading-5 text-[#27372d] transition hover:bg-[#f0f5ef] focus-visible:bg-[#f0f5ef] focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#47745b] disabled:opacity-50"
                    >
                      <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-[#47745b]" />
                      <span>{suggestion.display_name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {locationError && (
              <p role="alert" className="text-sm font-semibold text-red-700">
                {locationError}
              </p>
            )}

            <div
              className={`rounded-xl border px-4 py-4 ${
                districtResolved
                  ? "border-[#c9dfce] bg-[#eff6ef]"
                  : "border-[#e5e9e3] bg-[#f7f7f3]"
              }`}
              aria-live="polite"
            >
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-[#47745b]" />

                <div>
                  <p className="text-sm font-bold text-[#27372d]">
                    {districtName || "Council District"}
                  </p>

                  <p className="mt-1 text-xs leading-5 text-[#647168]">
                    {districtName === "Resolving Council District..."
                      ? "Checking the location against NYC Council District boundaries..."
                      : districtName === "Council District not resolved"
                        ? "We couldn't verify the district. Try selecting another address."
                        : districtName
                          ? "Your report location has been matched to this Council District."
                          : "Select an address or use your location to identify the responsible district."}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Errors */}
          {formError && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-sm font-medium text-red-800"
            >
              {formError}
            </div>
          )}

          {/* Consent explanation */}
          {!isEditing && (
            <div className="rounded-xl border border-[#dce3dc] bg-[#f6f7f2] px-4 py-4">
              <p className="text-sm font-bold text-[#27372d]">
                Your report won&apos;t be sent automatically.
              </p>
              <p className="mt-1 text-xs leading-5 text-[#647168]">
                After saving, you&apos;ll be able to review the report and its
                intended recipients. It will only be shared with officials
                after the required review and your explicit approval.
              </p>
            </div>
          )}
        </div>

        {/* Persistent action area */}
        <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-[#e5e9e3] bg-[#fffefa] px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:flex-row sm:items-center sm:justify-end sm:px-7 sm:py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="min-h-12 w-full rounded-xl border border-[#d5ded5] px-5 py-3 text-sm font-bold text-[#647168] transition hover:bg-[#f2f4ef] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#47745b] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#123b2a] px-6 py-3 text-sm font-bold text-white shadow-[0_3px_0_#081e15] transition hover:bg-[#1c563d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#47745b] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            {submitting && (
              <Loader2 className="h-5 w-5 animate-spin" />
            )}

            {submitting
              ? "Saving report..."
              : isEditing
                ? "Save Changes"
                : "Save Report for Review"}
          </button>
        </div>
      </div>
    </div>
  );
}
