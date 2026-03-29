import { getDashboardSnapshot } from "@/lib/dashboard";
import { RealtimeDashboard } from "./realtime-dashboard";

export default async function DashboardPage() {
  const snapshot = await getDashboardSnapshot();

  return <RealtimeDashboard initialSnapshot={snapshot} />;
}
