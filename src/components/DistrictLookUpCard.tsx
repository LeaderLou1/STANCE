"use client";

import { useState } from "react";
import { Search } from "lucide-react";

export function DistrictLookupCard() {
  const [houseNumber, setHouseNumber] = useState("");
  const [street, setStreet] = useState("");
  const [borough, setBorough] = useState("Manhattan");
  const [district, setDistrict] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setDistrict(null);

    try {
      const res = await fetch(`/api/lookup-district?houseNumber=${houseNumber}&street=${encodeURIComponent(street)}&borough=${borough}`);
      const data = await res.json();
      
      if (res.ok && data.district) {
        setDistrict(data.district);
      } else {
        setError(data.error || "Could not find a district for this address.");
      }
    } catch (err) {
      setError("An error occurred while looking up your address.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mb-10 border border-[#cbd5cc] bg-[#fffefa] p-6 shadow-sm rounded-xl max-w-2xl mx-auto">
      <div className="mb-4">
        <h3 className="text-xl font-black tracking-[-0.04em] text-[#17211d]">
          Find Your NYC Council District
        </h3>
        <p className="text-sm text-[#647168] mt-1">
          Enter your home address to instantly identify your local council district and community data.
        </p>
      </div>

      <form onSubmit={handleLookup} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#647168] mb-1">House #</label>
            <input
              type="text"
              placeholder="e.g. 250"
              value={houseNumber}
              onChange={(e) => setHouseNumber(e.target.value)}
              className="w-full rounded-lg border border-[#cbd5cc] bg-[#f3f1ec] px-3 py-2 text-sm text-[#17211d] outline-none focus:border-[#2f7d5b]"
              required
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#647168] mb-1">Street Name</label>
            <input
              type="text"
              placeholder="e.g. Broadway"
              value={street}
              onChange={(e) => setStreet(e.target.value)}
              className="w-full rounded-lg border border-[#cbd5cc] bg-[#f3f1ec] px-3 py-2 text-sm text-[#17211d] outline-none focus:border-[#2f7d5b]"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-[#647168] mb-1">Borough</label>
          <select
            value={borough}
            onChange={(e) => setBorough(e.target.value)}
            className="w-full rounded-lg border border-[#cbd5cc] bg-[#f3f1ec] px-3 py-2 text-sm text-[#17211d] outline-none focus:border-[#2f7d5b]"
          >
            <option value="Manhattan">Manhattan</option>
            <option value="Brooklyn">Brooklyn</option>
            <option value="Queens">Queens</option>
            <option value="Bronx">Bronx</option>
            <option value="Staten Island">Staten Island</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#123b2a] text-[#f3f1ec] px-4 py-2.5 text-sm font-bold shadow transition hover:bg-[#1e5b3d] disabled:opacity-50"
        >
          <Search className="w-4 h-4" />
          {loading ? "Searching..." : "Lookup District"}
        </button>
      </form>

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
          {error}
        </div>
      )}

      {district && (
        <div className="mt-6 p-4 bg-[#e5f0e7] border border-[#a9c8b3] rounded-lg text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-[#1e5b3d]">Matched District</p>
          <p className="text-3xl font-black text-[#123b2a] mt-1">District {district}</p>
        </div>
      )}
    </div>
  );
}