// src/components/LiveActivityTicker.tsx
import React from 'react';

interface ActivityItem {
  id: string;
  text: string;
  timestamp: string;
}

export function LiveActivityTicker({ activities }: { activities: ActivityItem[] }) {
  return (
    <div className="w-full bg-neutral-900 text-neutral-100 px-4 py-2 text-xs flex items-center overflow-hidden border-b border-neutral-800">
      <div className="flex items-center gap-2 mr-4 shrink-0 font-semibold text-emerald-400">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        LIVE FEED
      </div>
      <div className="overflow-hidden whitespace-nowrap flex gap-8 animate-marquee">
        {activities.map((item) => (
          <div key={item.id} className="flex items-center gap-2 text-neutral-300">
            <span>{item.text}</span>
            <span className="text-neutral-500">•</span>
            <span className="text-neutral-500 text-[10px]">{item.timestamp}</span>
          </div>
        ))}
      </div>
    </div>
  );
}