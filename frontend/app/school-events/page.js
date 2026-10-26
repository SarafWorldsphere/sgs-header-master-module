
"use client";

import { useEffect, useState } from "react";
import axios from "axios";

import useAuthGuard from "@/hooks/useAuthGuard";
import DashboardLayout from "../../components/DashboardLayout";
import FunctionsSection from "../../components/FunctionsSection";
import ToursSection from "../../components/ToursSection";
import styles from "../styles/school-events.module.css";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
  timeout: 30000,
});

export default function SchoolEventsPage() {
  useAuthGuard();

  const [functionsData, setFunctionsData] = useState([]);
  const [toursData, setToursData] = useState([]);
  const [headmaster, setHeadmaster] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeEventTab, setActiveEventTab] = useState("functions");

  useEffect(() => {
    let cancelled = false;

    const loadSchoolEvents = async () => {
      try {
        setLoading(true);
        setError("");

        const [
          functionsResponse,
          toursResponse,
          dashboardResponse,
        ] = await Promise.all([
          api.get("/functions/"),
          api.get("/tours/"),
          api.get("/dashboard/"),
        ]);

        if (cancelled) return;

        setFunctionsData(
          Array.isArray(functionsResponse.data)
            ? functionsResponse.data
            : []
        );

        setToursData(
          Array.isArray(toursResponse.data)
            ? toursResponse.data
            : []
        );

        const dashboardData = dashboardResponse.data || {};

        setHeadmaster(dashboardData.headmaster || null);
        setUnreadCount(dashboardData.unread_count || 0);
      } catch (err) {
        console.error("School Events API Error:", err);

        if (!cancelled) {
          setError(
            "School Events data load కాలేదు. దయచేసి మళ్లీ ప్రయత్నించండి."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadSchoolEvents();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <DashboardLayout
      activeTab="schoolEvents"
      headmaster={headmaster}
      unreadCount={unreadCount}
    >
      <main className={styles.page}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.title}>School Events</h1>
            <p className={styles.subtitle}>
              Manage school functions and tours in one place.
            </p>
          </div>
        </header>

        <div className={styles.eventCard}>
          <div
            className={styles.tabs}
            role="tablist"
            aria-label="School event categories"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeEventTab === "functions"}
              className={`${styles.tab} ${
                activeEventTab === "functions"
                  ? styles.activeTab
                  : ""
              }`}
              onClick={() => setActiveEventTab("functions")}
            >
              <span>School Functions</span>
              <span className={styles.count}>
                {functionsData.length}
              </span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeEventTab === "tours"}
              className={`${styles.tab} ${
                activeEventTab === "tours"
                  ? styles.activeTab
                  : ""
              }`}
              onClick={() => setActiveEventTab("tours")}
            >
              <span>School Tours</span>
              <span className={styles.count}>
                {toursData.length}
              </span>
            </button>
          </div>

          <div className={styles.content}>
            {loading && (
              <p className={styles.message}>
                Loading school events...
              </p>
            )}

            {!loading && error && (
              <div className={styles.error} role="alert">
                <p>{error}</p>
                <button
                  type="button"
                  className={styles.retryButton}
                  onClick={() => window.location.reload()}
                >
                  Retry
                </button>
              </div>
            )}

            {!loading && !error && (
              <>
                {activeEventTab === "functions" && (
                  <div role="tabpanel">
                    {functionsData.length > 0 ? (
                      <FunctionsSection
                        functionsData={functionsData}
                      />
                    ) : (
                      <div className={styles.emptyState}>
                        <h3>No school functions yet</h3>
                        <p>
                          School functions will appear here when
                          data is available.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {activeEventTab === "tours" && (
                  <div role="tabpanel">
                    {toursData.length > 0 ? (
                      <ToursSection toursData={toursData} />
                    ) : (
                      <div className={styles.emptyState}>
                        <h3>No school tours yet</h3>
                        <p>
                          School tours will appear here when
                          data is available.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </DashboardLayout>
  );
}
