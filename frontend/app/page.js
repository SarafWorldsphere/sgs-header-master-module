
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";

import useAuthGuard from "@/hooks/useAuthGuard";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import AIToolsModal from "../components/AIToolsModal";
import DashboardSection from "../components/DashboardSection";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
  timeout: 30000,
});

export default function HomePage() {
  useAuthGuard();

  const router = useRouter();

  const [dashboardSummary, setDashboardSummary] = useState({});
  const [performanceData, setPerformanceData] = useState([]);
  const [pieData, setPieData] = useState([]);
  const [headmaster, setHeadmaster] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const [students, setStudents] = useState([]);
  const [studentsLoaded, setStudentsLoaded] = useState(false);

  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [openAI, setOpenAI] = useState(false);

  // Load dashboard data
  useEffect(() => {
    let cancelled = false;

    const loadDashboard = async () => {
      try {
        setLoading(true);

        const response = await api.get("/dashboard/");
        const data = response.data || {};

        if (cancelled) return;

        setDashboardSummary(data.summary || {});
        setPerformanceData(data.performance || []);
        setPieData(data.pass_fail || []);
        setHeadmaster(data.headmaster || null);
        setUnreadCount(data.unread_count || 0);
      } catch (error) {
        if (!cancelled) {
          console.error("Dashboard API Error:", error);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, []);

  // Load students when AI Tools opens
  useEffect(() => {
    if (!openAI || studentsLoaded) return;

    let cancelled = false;

    const loadStudents = async () => {
      try {
        const response = await api.get("/students/");
        const data = Array.isArray(response.data)
          ? response.data
          : [];

        if (!cancelled) {
          setStudents(data);
          setStudentsLoaded(true);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("AI Tools Students API Error:", error);
        }
      }
    };

    loadStudents();

    return () => {
      cancelled = true;
    };
  }, [openAI, studentsLoaded]);

  return (
    <div className="layout">
      <Sidebar
        activeTab="dashboard"
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="main-content">
        <Topbar
          headmaster={headmaster}
          notificationCount={unreadCount}
          onOpenAI={() => setOpenAI(true)}
          onOpenNotifications={() => router.push("/notifications")}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
        />

        <AIToolsModal
          open={openAI}
          onClose={() => setOpenAI(false)}
          headmaster={headmaster}
          students={students}
        />

        {loading ? (
          <div style={{ padding: "10px" }}>
            Loading dashboard...
          </div>
        ) : (
          <DashboardSection
            dashboardSummary={dashboardSummary}
            performanceData={performanceData}
            pieData={pieData}
          />
        )}
      </div>
    </div>
  );
}
