
"use client";

import { useEffect, useState } from "react";
import axios from "axios";

import useAuthGuard from "@/hooks/useAuthGuard";
import DashboardLayout from "../../components/DashboardLayout";
import ReportsSection from "../../components/ReportsSection";


const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
  timeout: 30000,
});

export default function ReportsPage() {
  useAuthGuard();

  const [headmaster, setHeadmaster] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const loadHeaderDetails = async () => {
      try {
        const response = await api.get("/dashboard/");

        if (!cancelled) {
          const data = response.data || {};

          setHeadmaster(data.headmaster || null);
          setUnreadCount(data.unread_count || 0);
        }
      } catch (error) {
        console.error("Dashboard Header API Error:", error);
      }
    };

    loadHeaderDetails();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <DashboardLayout
      activeTab="reports"
      headmaster={headmaster}
      unreadCount={unreadCount}
    >
     <ReportsSection />
      
    </DashboardLayout>
  );
}
