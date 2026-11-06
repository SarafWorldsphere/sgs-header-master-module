"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import StudentsSection from "@/components/StudentsSection";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
  timeout: 30000,
});

export default function StudentsPage() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadStudents = async () => {
      try {
        setLoading(true);
        setError("");

        const res = await api.get("/students/");

        if (!cancelled) {
          setStudents(Array.isArray(res.data) ? res.data : []);
        }
      } catch (err) {
        console.error("Students API Error:", err);

        if (!cancelled) {
          setError(
            err.response?.data?.detail ||
              err.message ||
              "Unable to load students."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadStudents();

    return () => {
      cancelled = true;
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