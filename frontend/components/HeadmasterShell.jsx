
"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import { useRouter } from "next/navigation";
import axios from "axios";

import { getCached } from "@/services/api";

import useAuthGuard from "@/hooks/useAuthGuard";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import AIToolsModal from "@/components/AIToolsModal";

const HeadmasterContext = createContext(null);

export const useHeadmaster = () => {
  const context = useContext(HeadmasterContext);

  if (!context) {
    throw new Error(
      "useHeadmaster must be used inside HeadmasterShell"
    );
  }

  return context;
};

// ========================================
// API ERROR LOGGING
// ========================================

function logApiError(label, error) {
  if (axios.isCancel(error)) return;

  console.error(`[${label}] ERROR:`, {
    message: error?.message,
    code: error?.code,
    url: error?.config?.url,
    status: error?.response?.status,
    response: error?.response?.data,
  });
}

// ========================================
// HEADMASTER SHELL
// ========================================

export default function HeadmasterShell({ children }) {
  const isAuthenticated = useAuthGuard();

  const router = useRouter();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [openAI, setOpenAI] = useState(false);

  const [headmaster, setHeadmaster] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const [dashboardSummary, setDashboardSummary] = useState({});
  const [performanceData, setPerformanceData] = useState([]);
  const [pieData, setPieData] = useState([]);

  const [dashboardLoading, setDashboardLoading] = useState(true);

  const [aiStudents, setAiStudents] = useState([]);
  const [aiStudentsLoaded, setAiStudentsLoaded] = useState(false);

  // ========================================
  // LOAD DASHBOARD DATA
  // ========================================

  useEffect(() => {
    let active = true;

    const loadDashboard = async () => {
      try {
        const res = await getCached("/dashboard/");

        if (!active) return;

        const data = res.data || {};

        setDashboardSummary(data.summary || {});
        setPerformanceData(data.performance || []);
        setPieData(data.pass_fail || []);
        setHeadmaster(data.headmaster || null);
        setUnreadCount(data.unread_count || 0);
      } catch (error) {
        if (!active) return;

        logApiError("Dashboard API", error);
      } finally {
        if (active) {
          setDashboardLoading(false);
        }
      }
    };

    loadDashboard();

    return () => {
      active = false;
    };
  }, []);

  // ========================================
  // LOAD STUDENTS FOR AI TOOLS
  // USE SHARED API CACHE
  // ========================================

  useEffect(() => {
    if (!openAI || aiStudentsLoaded) return;

    let active = true;

    const loadStudentsForAI = async () => {
      try {
        const res = await getCached("/students/");

        if (!active) return;

        const students = Array.isArray(res.data)
          ? res.data
          : [];

        setAiStudents(students);
        setAiStudentsLoaded(true);
      } catch (error) {
        if (!active) return;

        logApiError("AI Tools Students API", error);
      }
    };

    loadStudentsForAI();

    return () => {
      active = false;
    };
  }, [openAI, aiStudentsLoaded]);

  // ========================================
  // CONTEXT
  // ========================================

  const contextValue = {
    dashboardSummary,
    performanceData,
    pieData,
    dashboardLoading,
    headmaster,
    unreadCount,
    setUnreadCount,
  };

  // ========================================
  // RENDER
  // ========================================

  if (!isAuthenticated) {
    return null;
  }
  return (
    <HeadmasterContext.Provider value={contextValue}>
      <div className="layout">

        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <div className="main-content">

          <Topbar
            headmaster={headmaster}
            notificationCount={unreadCount}
            onOpenAI={() => setOpenAI(true)}
            onOpenNotifications={() =>
              router.push("/notifications")
            }
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
          />

          <AIToolsModal
            open={openAI}
            onClose={() => setOpenAI(false)}
            headmaster={headmaster}
            students={aiStudents}
          />

          {children}

        </div>
      </div>
    </HeadmasterContext.Provider>
  );
}
