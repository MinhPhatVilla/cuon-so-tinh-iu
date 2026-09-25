import type { Metadata } from "next";
import { GardenClient } from "@/components/garden-client";
import { getGarden } from "@/lib/garden/queries";
import { getMemoryViewer } from "@/lib/memories/server";
import { todayInVietnam } from "@/lib/calendar/date";

export const metadata: Metadata = { title: "Khu vườn" };

export const dynamic = "force-dynamic";

export default async function GardenPage() {
  const viewer = await getMemoryViewer();
  if (!viewer) return null;
  const garden = await getGarden(viewer.supabase, viewer.spaceId);
  return <GardenClient garden={garden} userId={viewer.id} spaceId={viewer.spaceId} today={todayInVietnam()} />;
}
