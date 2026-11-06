
"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import axios from "axios";

import useAuthGuard from "@/hooks/useAuthGuard";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import AIToolsModal from "@/components/AIToolsModal";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
  timeout: 30000,
});

const HeadmasterContext = createContext(null);

export const useHeadmaster = () => {
  const context = useContext(HeadmasterContext);

  if (!context) {
    throw new Error("useHeadmaster must be used inside HeadmasterShell");
  }

  return context;
};

// Detailed API error logging for debugging
const logApiError = (label, error, startedAt) => {
  if (axios.isCancel(error)) return;

  console.error(label, {
    url: error.config?.url,
    baseURL: error.config?.baseURL,
    method: error.config?.method?.toUpperCase(),
    timeout: error.config?.timeout,
    durationMs: Date.now() - startedAt,
    errorCode: error.code,
    status: error.response?.status,
    response: error.response?.data,
    message: error.message,
  });
};

export default function HeadmasterShell({ children }) {
  useAuthGuard();

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

  // Load dashboard data
  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    const loadDashboard = async () => {
      const startedAt = Date.now();

      try {
        setDashboardLoading(true);

        const res = await api.get("/dashboard/", {
          signal: controller.signal,
        });

        if (!active) return;

        const data = res.data || {};

        setDashboardSummary(data.summary || {});
        setPerformanceData(data.performance || []);
        setPieData(data.pass_fail || []);
        setHeadmaster(data.headmaster || null);
        setUnreadCount(data.unread_count || 0);
      } catch (error) {
        if (controller.signal.aborted || axios.isCancel(error)) {
          return;
        }

        logApiError("Dashboard API Error", error, startedAt);
      } finally {
        if (active) {
          setDashboardLoading(false);
        }
      }
    };

    loadDashboard();

    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  // Load students only when AI Tools modal is opened
  useEffect(() => {
    if (!openAI || aiStudentsLoaded) return;

    const controller = new AbortController();
    let active = true;

    const loadStudentsForAI = async () => {
      const startedAt = Date.now();

      try {
        const res = await api.get("/students/", {
          signal: controller.signal,
        });

        if (!active) return;

        setAiStudents(
          Array.isArray(res.data) ? res.data : []
        );

        setAiStudentsLoaded(true);
      } catch (error) {
        if (controller.signal.aborted || axios.isCancel(error)) {
          return;
        }

        logApiError("AI Tools Students API Error", error, startedAt);
      }
    };

    loadStudentsForAI();

    return () => {
      active = false;
      controller.abort();
    };
  }, [openAI, aiStudentsLoaded]);

  const contextValue = {
    dashboardSummary,
    performanceData,
    pieData,
    dashboardLoading,
    headmaster,
    unreadCount,
    setUnreadCount,
  };

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
            onOpenNotifications={() => router.push("/notifications")}
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
