import type { Metadata } from "next";
import { DistrictDirectory } from "./DistrictDirectory";

export const metadata: Metadata = {
  title: "NYC Council Districts | STANCE",
  description:
    "Find your New York City Council district, elected official, and local civic reports.",
};

export default function DistrictsPage() {
  return <DistrictDirectory />;
}
