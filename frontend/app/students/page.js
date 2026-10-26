
"use client";

import { useEffect, useState } from "react";
import axios from "axios";

import useAuthGuard from "@/hooks/useAuthGuard";
import DashboardLayout from "../../components/DashboardLayout";
import StudentsSection from "../../components/StudentsSection";
import styles from "../styles/students.module.css";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
  timeout: 30000,
});

export default function StudentsPage() {
  useAuthGuard();

  const [students, setStudents] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);

  const [headmaster, setHeadmaster] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);

  // Load students
  useEffect(() => {
    let cancelled = false;

    const fetchStudents = async () => {
      try {
        setLoading(true);

        const response = await api.get("/students/");
        const data = Array.isArray(response.data)
          ? response.data
          : [];

        if (!cancelled) {
          setStudents(data);
        }
      } catch (error) {
        console.error("Students API Error:", error);
      } finally {
        if (!cancelled) {
          setLoaded(true);
          setLoading(false);
        }
      }
    };

    fetchStudents();

    return () => {
      cancelled = true;
    };
  }, []);

  // Load dashboard header information
  useEffect(() => {
    let cancelled = false;

    const fetchHeaderDetails = async () => {
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

    fetchHeaderDetails();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <DashboardLayout
      activeTab="students"
      headmaster={headmaster}
      unreadCount={unreadCount}
      students={students}
    >
      <div className={styles.studentsContent}>
        {loading && (
          <p className={styles.loadingMessage}>
            Loading students...
          </p>
        )}

        <StudentsSection
          students={students}
          searchText={searchText}
          setSearchText={setSearchText}
          loaded={loaded}
        />
      </div>
    </DashboardLayout>
  );
}
