import React from "react";
import { MediaUploader } from "./MediaUploader";
import { AddressSuggestion, ReportForm } from "@/src/types";

interface ReportModalProps {
  isEditing: boolean;
  form: ReportForm;
  setForm: React.Dispatch<React.SetStateAction<ReportForm>>;
  addressInput: string;
  suggestions: AddressSuggestion[];
  locating: boolean;
  formError: string;
  submitting: boolean;
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
  suggestions,
  locating,
  formError,
  submitting,
  onAddressSearch,
  onUseMyLocation,
  onSelectSuggestion,
  onClose,
  onSubmit,
}: ReportModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#17211d]/55 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-modal-title"
        className="max-h-[90vh] w-full max-w-lg space-y-5 overflow-y-auto border border-[#cbd5cc] bg-[#fffefa] p-6 shadow-[0_24px_80px_rgba(23,33,29,0.22)] sm:p-8"
      >
        <h2
          id="report-modal-title"
          className="border-b border-[#cbd5cc] pb-4 text-2xl font-black tracking-[-0.04em] text-[#17211d]"
        >
          {isEditing
            ? "Modify Accountability Report"
            : "File Accountability Report"}
        </h2>

        {/* ISSUE SUMMARY */}
        <div className="space-y-1">
          <label htmlFor="issue-title" className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#647168]">
            Issue Summary
          </label>
          <input
            id="issue-title"
            required
            maxLength={120}
            aria-required="true"
            className="w-full border border-[#cbd5cc] bg-white p-3 text-sm outline-none transition placeholder:text-[#98a49b] focus:border-[#2f7d5b] focus:ring-2 focus:ring-[#dbe8df]"
            placeholder="e.g., Main Street Pothole causing lane closures"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
        </div>

        {/* CONTEXT DETAILS */}
        <div className="space-y-1">
          <label htmlFor="issue-description" className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#647168]">
            Context Details
          </label>
          <textarea
            id="issue-description"
            required
            maxLength={2000}
            aria-required="true"
            rows={3}
            className="w-full resize-none border border-[#cbd5cc] bg-white p-3 text-sm leading-6 outline-none transition placeholder:text-[#98a49b] focus:border-[#2f7d5b] focus:ring-2 focus:ring-[#dbe8df]"
            placeholder="Describe structural danger or urgency dimensions..."
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>

        {/* ISSUE CATEGORY */}
        <div className="space-y-1">
          <label htmlFor="issue-category" className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#647168]">
            Issue Category
          </label>
          <select
            className="w-full border border-[#cbd5cc] bg-white p-3 text-sm outline-none focus:border-[#2f7d5b] focus:ring-2 focus:ring-[#dbe8df]"
            id="issue-category"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
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

        {/* VISUAL EVIDENCE BLOCK */}
        <div className="space-y-1">
          <label htmlFor="incident-location" className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#647168]">
            Visual Evidence (Optional)
          </label>
          <MediaUploader
            onUploadComplete={(url) =>
              setForm((prev) => ({ ...prev, media_url: url }))
            }
          />
          {form.media_url && (
            <p className="text-xs font-semibold text-emerald-700 mt-1">
              ✓ Media attached successfully!
            </p>
          )}
        </div>

        {/* INCIDENT LOCATION WITH INTEGRATED AUTOCOMPLETE DROPDOWN */}
        <div className="space-y-1 relative">
          <label className="text-xs font-bold text-gray-500 uppercase">
            Incident Location (NYC Only)
          </label>
          <div className="flex gap-2">
            <input
              id="incident-location"
              className="min-w-0 flex-1 border border-[#cbd5cc] bg-white p-3 text-sm outline-none focus:border-[#2f7d5b] focus:ring-2 focus:ring-[#dbe8df]"
              placeholder="e.g., 400 Rockaway Ave or Barclays Center"
              value={addressInput}
              onChange={(e) => onAddressSearch(e.target.value)}
            />
            <button
              type="button"
              onClick={onUseMyLocation}
              disabled={locating}
              className="whitespace-nowrap border border-[#cbd5cc] bg-[#f3f1ec] px-3 text-xs font-bold text-[#365444] transition hover:bg-[#e8eee9] disabled:opacity-50"
            >
              {locating ? "Locating..." : "📍 Locate Me"}
            </button>
          </div>

          {/* Cleaned portal anchor frame matching your styles */}
          {suggestions.length > 0 && (
            <ul className="absolute left-0 right-0 bg-white border border-gray-200 rounded-xl mt-1 shadow-xl z-50 max-h-48 overflow-y-auto divide-y text-xs">
              {suggestions.map((suggestion, idx) => (
                <li key={idx}>
                  <button
                    type="button"
                    onClick={() => onSelectSuggestion(suggestion)}
                    className="w-full text-left p-3 hover:bg-emerald-50/60 font-medium transition duration-150 block truncate text-gray-700"
                  >
                    🏢 {suggestion.display_name}{" "}
                    <span className="text-emerald-700 font-bold ml-1">
                      ({suggestion.zip})
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* LOWER FORM METRICS */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label htmlFor="issue-zip" className="text-xs font-bold text-gray-500 uppercase">
              ZIP Code
            </label>
            <input
              id="issue-zip"
              required
              inputMode="numeric"
              maxLength={5}
              aria-required="true"
              className="w-full border border-[#cbd5cc] bg-white p-3 text-sm outline-none focus:border-[#2f7d5b] focus:ring-2 focus:ring-[#dbe8df]"
              placeholder="Enter ZIP or choose a location"
              value={form.zip_code}
              onChange={(e) =>
                setForm({ ...form, zip_code: e.target.value.replace(/\D/g, "") })
              }
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="issue-urgency" className="text-xs font-bold text-gray-500 uppercase">
              Severity Priority
            </label>
            <select
              className="w-full border border-[#cbd5cc] bg-white p-3 text-sm outline-none focus:border-[#2f7d5b] focus:ring-2 focus:ring-[#dbe8df]"
              id="issue-urgency"
              value={form.urgency}
              onChange={(e) => setForm({ ...form, urgency: e.target.value })}
            >
              <option value="Low Priority">Low Priority</option>
              <option value="Medium Baseline">Medium Baseline</option>
              <option value="High Breakdown">High Breakdown</option>
              <option value="Critical Danger">Critical Danger</option>
            </select>
          </div>
        </div>

        {/* SUBMIT ACTION BUTTON TRACKS */}
        <div className="flex justify-end gap-3 border-t border-[#cbd5cc] pt-5">
          <button
            type="button"
            onClick={onClose}
            className="border border-[#cbd5cc] px-4 py-2 text-sm font-bold text-[#647168] transition hover:bg-[#f3f1ec]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={submitting}
            className="bg-[#123b2a] px-5 py-2 text-sm font-bold text-white shadow-[0_3px_0_#081e15] transition hover:bg-[#1c563d] disabled:opacity-50"
          >
            {submitting
              ? "Submitting..."
              : isEditing
                ? "Save Changes"
                : "File Complaint"}
          </button>
        </div>
        {formError && (
          <p role="alert" className="text-sm font-semibold text-red-700">
            {formError}
          </p>
        )}
      </div>
    </div>
  );
}
