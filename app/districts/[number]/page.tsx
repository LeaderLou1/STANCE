import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DistrictProfile } from "./DistrictProfile";

interface DistrictPageProps {
  params: Promise<{ number: string }>;
}

function parseDistrictNumber(value: string) {
  if (!/^(?:[1-9]|[1-4]\d|5[01])$/.test(value)) return null;
  return Number(value);
}

export async function generateMetadata({
  params,
}: DistrictPageProps): Promise<Metadata> {
  const { number: rawNumber } = await params;
  const number = parseDistrictNumber(rawNumber);
  if (!number) return { title: "District not found | STANCE" };

  return {
    title: `NYC Council District ${number} | STANCE`,
    description: `Meet the elected official and explore community reports for NYC Council District ${number}.`,
  };
}

export default async function DistrictPage({ params }: DistrictPageProps) {
  const { number: rawNumber } = await params;
  const number = parseDistrictNumber(rawNumber);
  if (!number) notFound();

  return <DistrictProfile number={number} />;
}
