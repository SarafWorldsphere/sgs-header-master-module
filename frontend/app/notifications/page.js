
"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import NotificationsSection from "@/components/NotificationsSection";
import { useHeadmaster } from "@/components/HeadmasterShell";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
  timeout: 30000,
});

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");

  const { setUnreadCount } = useHeadmaster();

  useEffect(() => {
    let cancelled = false;

    const loadNotifications = async () => {
      try {
        setError("");

        // Fetch notifications
        const res = await api.get("/notifications/");

        const data = Array.isArray(res.data) ? res.data : [];

        if (cancelled) return;

        setNotifications(data);

        // Mark notifications as read
        try {
          await api.put("/notifications/mark-read");

          if (!cancelled) {
            setUnreadCount(0);
          }
        } catch (markError) {
          console.error("Mark Notifications Read Error:", markError);
        }

      } catch (err) {
        console.error("Notifications API Error:", err);

        if (!cancelled) {
          setError(
            err.response?.data?.detail ||
              err.message ||
              "Unable to load notifications."
          );
        }
      } finally {
        if (!cancelled) {
          setLoaded(true);
        }
      }
    };

    loadNotifications();

    return () => {
      cancelled = true;
    };
  }, [setUnreadCount]);

  return (
    <NotificationsSection
      notifications={notifications}
      loaded={loaded}
      error={error}
    />
  );
}
