"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import styles from "./page.module.css";

export default function CoveragePage() {
  const router = useRouter();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [language, setLanguage] = useState("English");

  const [coverage, setCoverage] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedDetail, setSelectedDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

  const fetchCoverage = useCallback(async (signal) => {
    setLoading(true);
    setError("");

    try {
      const baseUrl =
        process.env.NEXT_PUBLIC_SYLLABUS_PLANNER_API_URL;
      const token =
        process.env.NEXT_PUBLIC_SYLLABUS_PLANNER_TOKEN;

      if (!baseUrl || !token) {
        throw new Error("Syllabus Planner API configuration is missing.");
      }

      const response = await fetch(
        `${baseUrl}/api/v1/coverage`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
          signal,
        }
      );

      if (!response.ok) {
        throw new Error(
          `Coverage API Error ${response.status}: ${await response.text()}`
        );
      }

      const result = await response.json();
      setCoverage(Array.isArray(result.items) ? result.items : []);
    } catch (err) {
      if (err.name !== "AbortError") {
        setError(err.message || "Unable to load coverage data.");
      }
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  const fetchCoverageDetail = async (item) => {
    setSelectedDetail(null);
    setDetailError("");
    setDetailLoading(true);

    try {
      const baseUrl =
        process.env.NEXT_PUBLIC_SYLLABUS_PLANNER_API_URL;
      const token =
        process.env.NEXT_PUBLIC_SYLLABUS_PLANNER_TOKEN;

      if (!baseUrl || !token) {
        throw new Error("Syllabus Planner API configuration is missing.");
      }

      const params = new URLSearchParams({
        class_id: String(item.class_id),
        subject_id: String(item.subject_id),
        teacher_id: String(item.teacher_id),
      });

      if (item.block_id !== null && item.block_id !== undefined) {
        params.append("block_id", String(item.block_id));
      }

      const response = await fetch(
        `${baseUrl}/api/v1/coverage/detail?${params.toString()}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(
          `Coverage Detail API Error ${response.status}: ${await response.text()}`
        );
      }

      const result = await response.json();
      setSelectedDetail(result);
    } catch (err) {
      setDetailError(err.message || "Unable to load topic details.");
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchCoverage(controller.signal);
    return () => controller.abort();
  }, [fetchCoverage]);

  // Close popup using Escape key
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setSelectedDetail(null);
        setDetailError("");
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, []);

  const totalTeachers = new Set(
    coverage.map(
      (item) =>
        `${item.class_id}-${item.subject_id}-${item.teacher_id}`
    )
  ).size;

  const onTrack = coverage.filter(
    (item) => item.status === "on_track"
  ).length;

  const behind = coverage.filter(
    (item) => item.status === "behind"
  ).length;

  const critical = coverage.filter(
    (item) => item.status === "critical"
  ).length;

  const filteredCoverage = coverage.filter((item) => {
    const search = searchText.trim().toLowerCase();

    return (
      !search ||
      String(item.class_id).toLowerCase().includes(search) ||
      String(item.subject_id).toLowerCase().includes(search) ||
      String(item.teacher_id).toLowerCase().includes(search) ||
      (item.class_name || "").toLowerCase().includes(search) ||
      (item.subject_name || "").toLowerCase().includes(search) ||
      (item.teacher_name || "").toLowerCase().includes(search)
    );
  });

  const handleSidebarNavigation = (tab) => {
    if (tab === "coverage") return;
    router.push("/");
  };

  const closePopup = () => {
    setSelectedDetail(null);
    setDetailError("");
    setDetailLoading(false);
  };

  const getStatusClass = (status) => {
    if (status === "on_track") return styles.onTrack;
    if (status === "behind") return styles.behind;
    return styles.critical;
  };

  const getStatusLabel = (status) => {
    if (!status) return "Not available";
    return status.replaceAll("_", " ");
  };

  return (
    <div className="layout">
      <Sidebar
        activeTab="coverage"
        setActiveTab={handleSidebarNavigation}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="main-content">
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
          <div className={styles.header}>
            <div>
              <h1>Syllabus Coverage</h1>
              <p>View syllabus progress for each assigned teacher.</p>
            </div>

            <button
              className={styles.refreshButton}
              onClick={() => {
                closePopup();
                fetchCoverage();
              }}
              disabled={loading}
            >
              {loading ? "Loading..." : "Refresh"}
            </button>
          </div>

          {/* SUMMARY */}
          <div className={styles.summaryGrid}>
            <div className={styles.summaryCard}>
              <span>Total Teachers</span>
              <strong>{loading ? "--" : totalTeachers}</strong>
            </div>

            <div className={styles.summaryCard}>
              <span>On Track</span>
              <strong className={styles.greenText}>
                {loading ? "--" : onTrack}
              </strong>
            </div>

            <div className={styles.summaryCard}>
              <span>Behind</span>
              <strong className={styles.amberText}>
                {loading ? "--" : behind}
              </strong>
            </div>

            <div className={styles.summaryCard}>
              <span>Critical</span>
              <strong className={styles.redText}>
                {loading ? "--" : critical}
              </strong>
            </div>
          </div>

          {/* TEACHER TABLE */}
          <section className={styles.coverageSection}>
            <div className={styles.sectionHeader}>
              <div>
                <h2>Teacher-wise Coverage</h2>
                <p>Click a teacher row to view topic details.</p>
              </div>

              <span className={styles.recordCount}>
                {filteredCoverage.length} Teachers
              </span>
            </div>

            {loading ? (
              <div className={styles.message}>
                Loading coverage data...
              </div>
            ) : error ? (
              <div className={styles.errorMessage}>
                <p>{error}</p>
                <button onClick={() => fetchCoverage()}>
                  Try Again
                </button>
              </div>
            ) : coverage.length === 0 ? (
              <div className={styles.message}>
                No syllabus coverage records found.
              </div>
            ) : filteredCoverage.length === 0 ? (
              <div className={styles.message}>
                No matching teachers found.
              </div>
            ) : (
              <div className={styles.tableWrapper}>
                <table className={styles.coverageTable}>
                  <thead>
                    <tr>
                      <th>Class</th>
                      <th>Subject</th>
                      <th>Teacher</th>
                      <th>Planned</th>
                      <th>Covered</th>
                      <th>Progress</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredCoverage.map((item) => {
                      const percent = Math.min(
                        100,
                        Math.max(0, Number(item.percent) || 0)
                      );

                      return (
                        <tr
                          key={`${item.class_id}-${item.subject_id}-${item.teacher_id}-${item.block_id ?? "all"}`}
                        >
                          <td>
                            {item.class_name || item.class_id}
                          </td>

                          <td>
                            {item.subject_name || item.subject_id}
                          </td>

                          <td>
                            <div className={styles.teacherInfo}>
                              <strong>
                                {item.teacher_name || "N/A"}
                              </strong>
                              <small>ID: {item.teacher_id}</small>
                            </div>
                          </td>

                          <td>{item.planned_topics ?? 0}</td>
                          <td>{item.covered_topics ?? 0}</td>

                          <td>
                            <div className={styles.progressCell}>
                              <div className={styles.progressTrack}>
                                <div
                                  className={styles.progressFill}
                                  style={{ width: `${percent}%` }}
                                />
                              </div>
                              <span>{percent}%</span>
                            </div>
                          </td>

                          <td>
                            <span
                              className={`${styles.status} ${getStatusClass(item.status)}`}
                            >
                              {getStatusLabel(item.status)}
                            </span>
                          </td>

                          <td>
                            <button
                              className={styles.viewButton}
                              onClick={() => fetchCoverageDetail(item)}
                            >
                              View Details
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <div className={styles.legend}>
            <span><i className={styles.greenDot} /> On Track</span>
            <span><i className={styles.amberDot} /> Behind</span>
            <span><i className={styles.redDot} /> Critical</span>
          </div>
        </main>
      </div>

      {/* TEACHER DETAILS POPUP */}
      {(detailLoading || detailError || selectedDetail) && (
        <div
          className={styles.modalOverlay}
          onClick={closePopup}
        >
          <section
            className={styles.modal}
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <div>
                <h2>Teacher Coverage Details</h2>
                <p>Individual syllabus progress</p>
              </div>

              <button
                className={styles.closeButton}
                onClick={closePopup}
                aria-label="Close popup"
              >
                &times;
              </button>
            </div>

            {detailLoading && (
              <div className={styles.message}>
                Loading teacher details...
              </div>
            )}

            {detailError && (
              <div className={styles.errorMessage}>
                {detailError}
              </div>
            )}

            {selectedDetail && (
              <>
                <div className={styles.teacherDetails}>
                  <div>
                    <span>Teacher</span>
                    <strong>{selectedDetail.teacher_name || "N/A"}</strong>
                  </div>

                  <div>
                    <span>Class</span>
                    <strong>
                      {selectedDetail.class_name || selectedDetail.class_id}
                    </strong>
                  </div>

                  <div>
                    <span>Subject</span>
                    <strong>
                      {selectedDetail.subject_name || selectedDetail.subject_id}
                    </strong>
                  </div>

                  <div>
                    <span>Teacher ID</span>
                    <strong>{selectedDetail.teacher_id || "N/A"}</strong>
                  </div>
                </div>

                <div className={styles.detailSummary}>
                  <div>
                    <span>Planned Topics</span>
                    <strong>{selectedDetail.planned_topics ?? 0}</strong>
                  </div>

                  <div>
                    <span>Covered Topics</span>
                    <strong>{selectedDetail.covered_topics ?? 0}</strong>
                  </div>

                  <div>
                    <span>Coverage</span>
                    <strong>{selectedDetail.percent ?? 0}%</strong>
                  </div>
                </div>

                <h3 className={styles.topicHeading}>Topic Details</h3>

                {selectedDetail.topics?.length > 0 ? (
                  <div className={styles.tableWrapper}>
                    <table className={styles.coverageTable}>
                      <thead>
                        <tr>
                          <th>Topic</th>
                          <th>Planned Periods</th>
                          <th>Periods Used</th>
                          <th>Status</th>
                          <th>Last Taught</th>
                        </tr>
                      </thead>

                      <tbody>
                        {selectedDetail.topics.map((topic) => (
                          <tr key={topic.plan_id}>
                            <td>{topic.topic_name}</td>
                            <td>{topic.planned_periods}</td>
                            <td>{topic.periods_used}</td>
                            <td>{topic.status}</td>
                            <td>
                              {topic.last_taught_on || "Not yet taught"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className={styles.message}>
                    No topic details found.
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}