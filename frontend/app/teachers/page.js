
"use client";

import { useCallback, useEffect, useState } from "react";
import TeachersSection from "@/components/TeachersSection";
import { getCached } from "@/services/api";

export default function TeachersPage() {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ==========================================
  // LOAD ALL ACTIVE TEACHERS
  // ==========================================

  useEffect(() => {
    let active = true;

    const loadTeachers = async () => {
      try {
        setError("");

        const res = await getCached("/teachers/");

        if (!active) return;

        setTeachers(
          Array.isArray(res.data) ? res.data : []
        );
      } catch (err) {
        if (!active) return;

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
        if (active) {
          setLoading(false);
        }
      }
    };

    loadTeachers();

    return () => {
      active = false;
    };
  }, []);

  // ==========================================
  // FETCH TEACHERS BASED ON FILTERS
  // ==========================================

  const fetchTeachers = useCallback(
    async (teacherType, subject = "") => {
      const params = {
        teacher_type: teacherType,
      };

      if (subject) {
        params.subject = subject;
      }

      const res = await getCached("/teachers/", {
        params,
      });

      return Array.isArray(res.data) ? res.data : [];
    },
    []
  );

  // ==========================================
  // FETCH ACTIVE SUBJECTS
  // ==========================================

  const fetchSubjects = useCallback(async () => {
    const res = await getCached("/teachers/subjects");

    return Array.isArray(res.data) ? res.data : [];
  }, []);

  // ==========================================
  // FETCH TEACHER FILTER OPTIONS
  // ==========================================

  const fetchTeacherFilters = useCallback(async () => {
    const res = await getCached("/teachers/filters");

    return Array.isArray(res.data) ? res.data : [];
  }, []);

  // ==========================================
  // RENDER
  // ==========================================

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
