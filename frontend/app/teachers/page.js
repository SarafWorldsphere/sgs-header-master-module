
"use client";

import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import TeachersSection from "@/components/TeachersSection";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
  timeout: 30000,
});

export default function TeachersPage() {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ==========================================
  // LOAD ALL ACTIVE TEACHERS
  // ==========================================
  useEffect(() => {
    const controller = new AbortController();

    const loadTeachers = async () => {
      try {
        setLoading(true);
        setError("");

        const res = await api.get("/teachers/", {
          signal: controller.signal,
        });

        setTeachers(
          Array.isArray(res.data) ? res.data : []
        );
      } catch (err) {
        if (
          controller.signal.aborted ||
          axios.isCancel(err)
        ) {
          return;
        }

        console.error("Teachers API Error:", {
          url: err.config?.url,
          code: err.code,
          status: err.response?.status,
          message: err.message,
          response: err.response?.data,
        });

        setError(
          err.response?.data?.detail ||
            err.message ||
            "Unable to load teachers."
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    loadTeachers();

    return () => {
      controller.abort();
    };
  }, []);

  // ==========================================
  // FETCH TEACHERS BASED ON FILTERS
  // ==========================================
  const fetchTeachers = useCallback(
    async (teacherType, subject = "", signal) => {
      const params = {
        teacher_type: teacherType,
      };

      if (subject) {
        params.subject = subject;
      }

      const res = await api.get("/teachers/", {
        params,
        signal,
      });

      return Array.isArray(res.data) ? res.data : [];
    },
    []
  );

  // ==========================================
  // FETCH ACTIVE SUBJECTS
  // Called only when Subject filter is selected
  // ==========================================
  const fetchSubjects = useCallback(async (signal) => {
    const res = await api.get("/teachers/subjects", {
      signal,
    });

    return Array.isArray(res.data) ? res.data : [];
  }, []);

  // ==========================================
  // FETCH TEACHER FILTER OPTIONS
  // ==========================================
  const fetchTeacherFilters = useCallback(async (signal) => {
    const res = await api.get("/teachers/filters", {
      signal,
    });

    return Array.isArray(res.data) ? res.data : [];
  }, []);

  return (
    <TeachersSection
      teachers={teachers}
      loaded={!loading}
      loading={loading}
      error={error}
      fetchTeachers={fetchTeachers}
      fetchSubjects={fetchSubjects}
      fetchTeacherFilters={fetchTeacherFilters}
    />
  );
}
