
"use client";

import { useEffect, useState } from "react";
import axios from "axios";

import useAuthGuard from "@/hooks/useAuthGuard";
import DashboardLayout from "../../components/DashboardLayout";
import NotificationsSection from "../../components/NotificationsSection";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
  timeout: 30000,
});

export default function NotificationsPage() {
  useAuthGuard();

  const [notifications, setNotifications] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [headmaster, setHeadmaster] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const loadNotifications = async () => {
      try {
        const response = await api.get("/notifications/");
        const data = Array.isArray(response.data)
          ? response.data
          : [];

        if (cancelled) return;

        setNotifications(data);
        setLoaded(true);

        // Mark notifications as read
        await api.put("/notifications/mark-read");

        if (!cancelled) {
          setUnreadCount(0);
        }
      } catch (error) {
        console.error("Notifications API Error:", error);

        if (!cancelled) {
          setLoaded(true);
        }
      }
    };

    const loadHeaderDetails = async () => {
      try {
        const response = await api.get("/dashboard/");
        const data = response.data || {};

        if (!cancelled) {
          setHeadmaster(data.headmaster || null);
          setUnreadCount(data.unread_count || 0);
        }
      } catch (error) {
        console.error("Dashboard Header API Error:", error);
      }
    };

    loadNotifications();
    loadHeaderDetails();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
   <DashboardLayout
  activeTab="notifications"
  headmaster={headmaster}
  unreadCount={unreadCount}
>
  <NotificationsSection
    notifications={notifications}
    loaded={loaded}
  />
</DashboardLayout>
  );
}
