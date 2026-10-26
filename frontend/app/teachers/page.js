
"use client";

import { useEffect, useState, useCallback } from "react";
import axios from "axios";

import useAuthGuard from "@/hooks/useAuthGuard";
import DashboardLayout from "../../components/DashboardLayout";
import TeachersSection from "../../components/TeachersSection";
import styles from "../styles/teachers.module.css";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
  timeout: 30000,
});

export default function TeachersPage() {
  useAuthGuard();

  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(true);

  const [headmaster, setHeadmaster] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);

  // Load teachers and subjects
  useEffect(() => {
    let cancelled = false;

    const loadTeacherData = async () => {
      try {
        setLoading(true);

        const [teachersResponse, subjectsResponse] =
          await Promise.all([
            api.get("/teachers/"),
            api.get("/teachers/subjects"),
          ]);

        if (cancelled) return;

        setTeachers(
          Array.isArray(teachersResponse.data)
            ? teachersResponse.data
            : []
        );

        setSubjects(
          Array.isArray(subjectsResponse.data)
            ? subjectsResponse.data
                .map((item) => item.subject_name)
                .filter(Boolean)
            : []
        );
      } catch (error) {
        console.error("Teachers Data API Error:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadTeacherData();

    return () => {
      cancelled = true;
    };
  }, []);

  // Load dashboard header information
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

  const fetchTeachersForFilter = useCallback(
    (teacherType, subject = "") => {
      return Promise.resolve(
        teachers.filter((teacher) => {
          const assignments = Array.isArray(teacher.assignments)
            ? teacher.assignments
            : [];

          if (teacherType === "all") {
            return true;
          }

          if (teacherType === "class") {
            return (
              teacher.is_class_teacher === true ||
              assignments.some(
                (item) => item.is_class_teacher === true
              )
            );
          }

          if (teacherType === "subject") {
            return assignments.some((item) => {
              const isSubjectTeacher =
                item.is_class_teacher === false;

              const matchesSubject =
                !subject ||
                String(item.subject_name || "")
                  .trim()
                  .toLowerCase() === subject.trim().toLowerCase();

              return isSubjectTeacher && matchesSubject;
            });
          }

          return true;
        })
      );
    },
    [teachers]
  );

  const fetchTeacherSubjects = useCallback(
    () => Promise.resolve(subjects),
    [subjects]
  );

  return (
    <DashboardLayout
      activeTab="teachers"
      headmaster={headmaster}
      unreadCount={unreadCount}
    >
      <main className={styles.teachersContent}>
        {loading && (
          <p className={styles.loadingMessage}>
            Loading teachers...
          </p>
        )}

        <TeachersSection
          teachers={teachers}
          searchText={searchText}
          setSearchText={setSearchText}
          fetchTeachers={fetchTeachersForFilter}
          fetchSubjects={fetchTeacherSubjects}
          loading={loading}
        />
      </main>
    </DashboardLayout>
  );
}
