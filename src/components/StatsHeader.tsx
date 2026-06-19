import React from "react";
import { AlertCircle, Clock, CheckCircle2, TrendingUp } from "lucide-react";

interface StatsProps {
  stats: {
    total: number;
    inProgress: number;
    resolved: number;
    rate: number;
  };
}

export function StatsHeader({ stats }: StatsProps) {
  return (
    <section className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
      <div className="bg-white border p-5 rounded-2xl shadow-sm flex items-center gap-4">
        <div className="p-3 bg-blue-50 text-blue-700 rounded-xl">
          <AlertCircle className="w-6 h-6" />
        </div>
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">
            Total Reports
          </p>
          <h4 className="text-2xl font-black text-gray-900">{stats.total}</h4>
        </div>
      </div>

      <div className="bg-white border p-5 rounded-2xl shadow-sm flex items-center gap-4">
        <div className="p-3 bg-amber-50 text-amber-700 rounded-xl">
          <Clock className="w-6 h-6" />
        </div>
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">
            In Progress
          </p>
          <h4 className="text-2xl font-black text-gray-900">
            {stats.inProgress}
          </h4>
        </div>
      </div>

      <div className="bg-white border p-5 rounded-2xl shadow-sm flex items-center gap-4">
        <div className="p-3 bg-green-50 text-green-700 rounded-xl">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">
            Resolved Problems
          </p>
          <h4 className="text-2xl font-black text-gray-900">
            {stats.resolved}
          </h4>
        </div>
      </div>

      <div className="bg-white border p-5 rounded-2xl shadow-sm flex items-center gap-4">
        <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl">
          <TrendingUp className="w-6 h-6" />
        </div>
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">
            Resolution Index
          </p>
          <h4 className="text-2xl font-black text-emerald-800">
            {stats.rate}%
          </h4>
        </div>
      </div>
    </section>
  );
}
