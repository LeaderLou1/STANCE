import type { Metadata } from "next";
import { DistrictDirectory } from "./DistrictDirectory";

export const metadata: Metadata = {
  title: "NYC Council Districts | STANCE",
  description:
    "Find your New York City Council district and elected official, see what neighbors have reported, and report a problem in your community.",
};

export default function DistrictsPage() {
  return <DistrictDirectory />;
}