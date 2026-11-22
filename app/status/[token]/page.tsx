import Link from "next/link";
import { CivicProgressTracker } from "@/src/components/CivicProgressTracker";

interface StatusPageProps {
  params: Promise<{ token: string }>;
}

export default async function ReportStatusPage({ params }: StatusPageProps) {
  const { token } = await params;

  return (
    <main className="min-h-screen bg-[#fcfbf9] px-4 py-10 text-neutral-900">
      <div className="mx-auto max-w-xl space-y-6">
        <header className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-900 text-xs font-extrabold tracking-wider text-white">
              ST
            </div>
            <div>
              <p className="text-sm font-black tracking-tight text-neutral-900">
                STANCE
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-500">
                Live Report Status
              </p>
            </div>
          </Link>

          <Link
            href="/"
            className="rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-xs font-bold text-neutral-700 hover:bg-neutral-100"
          >
            Back to Map
          </Link>
        </header>

        <CivicProgressTracker statusToken={token} />
      </div>
    </main>
  );
}