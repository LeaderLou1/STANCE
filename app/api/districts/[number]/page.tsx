// app/districts/[number]/page.tsx
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { getDistrict311Baseline } from "@/src/lib/nyc311";
import { DistrictIntelligencePanel } from "@/src/components/DistrictIntelligencePanel";

const supabaseServer = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface PageProps {
  params: Promise<{ number: string }>;
}

export default async function DistrictPage({ params }: PageProps) {
  const { number } = await params;
  const districtNumber = Number(number.replace(/\D/g, ""));

  if (!districtNumber || districtNumber < 1 || districtNumber > 51) {
    notFound();
  }

  const [{ data: district }, stats311] = await Promise.all([
    supabaseServer
      .from("districts")
      .select("*")
      .eq("name", `Council District ${districtNumber}`)
      .maybeSingle(),
    getDistrict311Baseline(districtNumber),
  ]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 space-y-8">
      <h1 className="text-3xl font-black">Council District {districtNumber}</h1>
      <DistrictIntelligencePanel
        districtNumber={districtNumber}
        neighborhoods={district?.neighborhoods ?? []}
        activeBids={district?.active_bids ?? []}
        communityBoards={district?.community_boards ?? []}
        officeAddress={district?.office_address ?? null}
        officePhone={district?.office_phone ?? null}
        officeEmail={district?.office_email ?? null}
        stats311={stats311}
      />
    </main>
  );
}