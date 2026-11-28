
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  Inbox,
} from "lucide-react";

import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import styles from "./page.module.css";

export default function TeacherAlertsPage() {
  const router = useRouter();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [language, setLanguage] = useState("English");

  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState(null);

  const [closeAlertId, setCloseAlertId] = useState(null);
  const [closeReason, setCloseReason] = useState("");

  // API configuration
  const getConfig = () => {
    const baseUrl =
      process.env.NEXT_PUBLIC_SYLLABUS_PLANNER_API_URL;

    const token =
      process.env.NEXT_PUBLIC_SYLLABUS_PLANNER_TOKEN;

    if (!baseUrl || !token) {
      throw new Error(
        "Syllabus Planner API configuration is missing."
      );
    }

    return {
      baseUrl: baseUrl.replace(/\/$/, ""),
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    };
  };

  // Fetch open teacher alerts
  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const { baseUrl, headers } = getConfig();

      const response = await fetch(
        `${baseUrl}/api/v1/teacher-alerts?status=open`,
        {
          method: "GET",
          headers,
          cache: "no-store",
        }
      );

      if (!response.ok) {
        const message = await response.text();

        throw new Error(
          `Teacher Alerts API Error ${response.status}: ${message}`
        );
      }

      const result = await response.json();

      setAlerts(
        Array.isArray(result.items)
          ? result.items
          : []
      );
    } catch (err) {
      setError(
        err.message || "Unable to load teacher alerts."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  // Update alert status
  const updateAlert = async (
    alertId,
    status,
    reason = ""
  ) => {
    setUpdatingId(alertId);
    setError("");

    try {
      const { baseUrl, headers } = getConfig();

      const body = { status };

      if (status === "closed" && reason.trim()) {
        body.closed_reason = reason.trim();
      }

      const response = await fetch(
        `${baseUrl}/api/v1/teacher-alerts/${alertId}`,
        {
          method: "PATCH",
          headers,
          body: JSON.stringify(body),
        }
      );

      if (!response.ok) {
        const message = await response.text();

        throw new Error(
          `Unable to update alert (${response.status}): ${message}`
        );
      }

      setCloseAlertId(null);
      setCloseReason("");

      await fetchAlerts();

    } catch (err) {
      setError(
        err.message || "Unable to update teacher alert."
      );
    } finally {
      setUpdatingId(null);
    }
  };

  // Search filter
  const filteredAlerts = alerts.filter((alert) => {
    const search = searchText.trim().toLowerCase();

    return (
      !search ||
      String(alert.teacher_id || "")
        .toLowerCase()
        .includes(search) ||
      String(alert.alert_type || "")
        .toLowerCase()
        .includes(search)
    );
  });

  // Date formatting
  const formatDate = (value) => {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // Sidebar navigation
  const handleSidebarNavigation = (tab) => {
    if (tab === "teacherAlerts") return;

    router.push("/");
  };

  return (
    <div className="layout">

      {/* Sidebar */}
      <Sidebar
        activeTab="teacherAlerts"
        setActiveTab={handleSidebarNavigation}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="main-content">

        {/* Topbar */}
        <Topbar
          headmaster={null}
          searchText={searchText}
          setSearchText={setSearchText}
          notificationCount={0}
          language={language}
          setLanguage={setLanguage}
          onOpenAI={() => {}}
          onOpenNotifications={() => router.push("/")}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
        />

        <main className={styles.container}>

          {/* Page Header */}
          <div className={styles.header}>
            <div>
              <h1>Teacher Alerts</h1>
              <p>
                Monitor teachers who have missed consecutive
                working-day teaching log entries.
              </p>
            </div>

            <button
              className={styles.refreshButton}
              onClick={fetchAlerts}
              disabled={loading || updatingId !== null}
            >
              <RefreshCw
                size={16}
                className={loading ? styles.spinning : ""}
              />
              {loading ? "Loading..." : "Refresh"}
            </button>
          </div>

          {/* Information Box */}
          <div className={styles.infoBox}>
  <AlertCircle size={19} />

  <div>
    <p>
      Teacher alerts are generated when a teacher misses
      scheduled teaching entries for 3 consecutive working days.
    </p>
    <p>
      Alerts exclude Sundays and school holidays. If a teacher
      records a teaching entry, the missed-day count resets.
    </p>
  </div>
</div>
        

          {/* Alerts Section */}
          <section className={styles.alertSection}>

            <div className={styles.sectionHeader}>
              <div>
                <h2>Teacher Alerts</h2>

                <p>
                  {loading
                    ? "Loading alerts..."
                    : `${alerts.length} open alert${
                        alerts.length !== 1 ? "s" : ""
                      }`}
                </p>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className={styles.errorMessage}>
                <AlertCircle size={17} />

                <span>{error}</span>

                <button onClick={fetchAlerts}>
                  Retry
                </button>
              </div>
            )}

            {/* Table */}
            <div className={styles.tableWrapper}>
              <table className={styles.alertTable}>

                <thead>
                  <tr>
                    <th>Teacher ID</th>
                    <th>First Missed Date</th>
                    <th>Missed Days</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>

                  {loading ? (
                    <tr>
                      <td
                        colSpan="5"
                        className={styles.emptyRow}
                      >
                        <div className={styles.emptyContent}>
                          <RefreshCw
                            size={25}
                            className={styles.spinning}
                          />
                          <strong>
                            Loading teacher alerts...
                          </strong>
                        </div>
                      </td>
                    </tr>
                  ) : filteredAlerts.length === 0 ? (
                    <tr>
                      <td
                        colSpan="5"
                        className={styles.emptyRow}
                      >
                        <div className={styles.emptyContent}>
                          <Inbox size={34} />

                          <strong>
                            {alerts.length === 0
                              ? "No teacher alerts found"
                              : "No matching alerts"}
                          </strong>

                          <span>
                            {alerts.length === 0
                              ? "There are currently no open teacher alerts."
                              : "Try another search."}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredAlerts.map((alert) => (
                      <tr key={alert.alert_id}>

                        <td className={styles.teacherId}>
                          {alert.teacher_id}
                        </td>

                        <td>
                          {formatDate(
                            alert.first_missed_date
                          )}
                        </td>

                        <td>
                          <span className={styles.missedDays}>
                            {alert.missed_days}
                          </span>
                        </td>

                        <td>
                          <span
                            className={`${styles.status} ${
                              styles[alert.status] || ""
                            }`}
                          >
                            {alert.status}
                          </span>
                        </td>

                        <td>
                          <div className={styles.actions}>

                            <button
                              className={
                                styles.acknowledgeButton
                              }
                              disabled={
                                updatingId === alert.alert_id ||
                                alert.status === "acknowledged"
                              }
                              onClick={() =>
                                updateAlert(
                                  alert.alert_id,
                                  "acknowledged"
                                )
                              }
                            >
                              <CheckCircle size={14} />
                              Acknowledge
                            </button>

                            <button
                              className={styles.closeButton}
                              disabled={
                                updatingId === alert.alert_id
                              }
                              onClick={() => {
                                setCloseAlertId(alert.alert_id);
                                setCloseReason("");
                              }}
                            >
                              <XCircle size={14} />
                              Close
                            </button>

                          </div>

                          {updatingId === alert.alert_id && (
                            <small className={styles.updating}>
                              Updating...
                            </small>
                          )}
                        </td>

                      </tr>
                    ))
                  )}

                </tbody>
              </table>
            </div>

          </section>
        </main>
      </div>

      {/* Close Confirmation Modal */}
      {closeAlertId !== null && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>

            <h2>Close Teacher Alert</h2>

            <p>
              Enter a reason for closing this alert.
              This field is optional.
            </p>

            <textarea
              value={closeReason}
              onChange={(e) =>
                setCloseReason(e.target.value)
              }
              placeholder="Enter reason (optional)"
              rows={3}
            />

            <div className={styles.modalActions}>

              <button
                className={styles.cancelButton}
                onClick={() => {
                  setCloseAlertId(null);
                  setCloseReason("");
                }}
                disabled={updatingId !== null}
              >
                Cancel
              </button>

              <button
                className={styles.confirmCloseButton}
                onClick={() =>
                  updateAlert(
                    closeAlertId,
                    "closed",
                    closeReason
                  )
                }
                disabled={updatingId !== null}
              >
                {updatingId !== null
                  ? "Closing..."
                  : "Confirm Close"}
              </button>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
