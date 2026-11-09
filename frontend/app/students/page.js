
"use client";

import { useEffect, useState } from "react";
import StudentsSection from "@/components/StudentsSection";
import { getCached } from "@/services/api";

export default function StudentsPage() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const loadStudents = async () => {
      try {
        setError("");

        const response = await getCached("/students/");

        if (!active) return;

        setStudents(
          Array.isArray(response.data) ? response.data : []
        );
      } catch (err) {
        console.error("Students API Error:", err);

        if (!active) return;

        setError(
          err.response?.data?.detail ||
            err.message ||
            "Unable to load students."
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadStudents();

    return () => {
      active = false;
    };
  }, []);

  return (
    <StudentsSection
      students={students}
      loaded={!loading}
      error={error}
    />
  );
}
