"use client";

import DashboardSection from "@/components/DashboardSection";
import { useHeadmaster } from "@/components/HeadmasterShell";

export default function HomePage() {
  const {
    dashboardSummary,
    performanceData,
    pieData,
    dashboardLoading,
  } = useHeadmaster();

  return (
    <>
      {dashboardLoading && (
        <div style={{ padding: "10px" }}>
          Loading...
        </div>
      )}

      <DashboardSection
        dashboardSummary={dashboardSummary}
        performanceData={performanceData}
        pieData={pieData}
      />
    </>
  );
}