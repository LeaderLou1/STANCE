import React from "react";
import { MediaUploader } from "./MediaUploader";

interface ReportModalProps {
  isEditing: boolean;
  form: any;
  setForm: React.Dispatch<React.SetStateAction<any>>;
  addressInput: string;
  suggestions: any[];
  locating: boolean;
  onAddressSearch: (text: string) => void;
  onUseMyLocation: () => void;
  onSelectSuggestion: (suggestion: any) => void;
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
  onAddressSearch,
  onUseMyLocation,
  onSelectSuggestion,
  onClose,
  onSubmit,
}: ReportModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-lg rounded-2xl p-6 space-y-4 shadow-xl border max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-black text-gray-900 border-b pb-2">
          {isEditing
            ? "Modify Accountability Report"
            : "File Accountability Report"}
        </h2>

        {/* ISSUE SUMMARY */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-gray-500 uppercase">
            Issue Summary
          </label>
          <input
            className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-[#0f5132] outline-none"
            placeholder="e.g., Main Street Pothole causing lane closures"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
        </div>

        {/* CONTEXT DETAILS */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-gray-500 uppercase">
            Context Details
          </label>
          <textarea
            rows={3}
            className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-[#0f5132] outline-none resize-none"
            placeholder="Describe structural danger or urgency dimensions..."
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>

        {/* VISUAL EVIDENCE BLOCK */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-gray-500 uppercase">
            Visual Evidence
          </label>
          <MediaUploader
            onUploadComplete={(url) =>
              setForm((prev: any) => ({ ...prev, media_url: url }))
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
              className="flex-1 border p-3 rounded-lg focus:ring-2 focus:ring-[#0f5132] outline-none text-sm min-w-0"
              placeholder="e.g., 400 Rockaway Ave or Barclays Center"
              value={addressInput}
              onChange={(e) => onAddressSearch(e.target.value)}
            />
            <button
              type="button"
              onClick={onUseMyLocation}
              disabled={locating}
              className="px-3 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 border rounded-lg text-xs font-bold transition whitespace-nowrap"
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
            <label className="text-xs font-bold text-gray-500 uppercase">
              Verified Zip Code
            </label>
            <input
              readOnly
              className="w-full border p-3 rounded-lg bg-gray-50 text-gray-500 font-semibold text-sm cursor-not-allowed"
              placeholder="Wired via lookup above"
              value={form.zip_code}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase">
              Severity Priority
            </label>
            <select
              className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-[#0f5132] outline-none bg-white"
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
        <div className="flex justify-end gap-3 pt-4 border-t">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={!form.zip_code}
            className="px-5 py-2 bg-[#0f5132] hover:bg-[#0c4028] disabled:opacity-50 text-white rounded-lg font-bold transition shadow"
          >
            {isEditing ? "Save Changes" : "File Complaint"}
          </button>
        </div>
      </div>
    </div>
  );
}
