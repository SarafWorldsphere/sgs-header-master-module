
"use client";

import { useEffect, useState } from "react";
import axios from "axios";

import FunctionsSection from "@/components/FunctionsSection";
import ToursSection from "@/components/ToursSection";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
  timeout: 30000,
});

export default function SchoolEventsPage() {
  const [activeEventTab, setActiveEventTab] = useState("functions");

  const [functionsData, setFunctionsData] = useState([]);
  const [toursData, setToursData] = useState([]);

  const [functionsLoading, setFunctionsLoading] = useState(true);
  const [toursLoading, setToursLoading] = useState(true);

  const [functionsError, setFunctionsError] = useState("");
  const [toursError, setToursError] = useState("");

  // Load School Functions and Tours
  useEffect(() => {
    let cancelled = false;

    const loadFunctions = async () => {
      try {
        const res = await api.get("/functions/");

        if (!cancelled) {
          setFunctionsData(
            Array.isArray(res.data) ? res.data : []
          );
        }
      } catch (err) {
        console.error("Functions API Error:", err);

        if (!cancelled) {
          setFunctionsError(
            err.response?.data?.detail ||
              err.message ||
              "Unable to load school functions."
          );
        }
      } finally {
        if (!cancelled) {
          setFunctionsLoading(false);
        }
      }
    };

    const loadTours = async () => {
      try {
        const res = await api.get("/tours/");

        if (!cancelled) {
          setToursData(
            Array.isArray(res.data) ? res.data : []
          );
        }
      } catch (err) {
        console.error("Tours API Error:", err);

        if (!cancelled) {
          setToursError(
            err.response?.data?.detail ||
              err.message ||
              "Unable to load school tours."
          );
        }
      } finally {
        if (!cancelled) {
          setToursLoading(false);
        }
      }
    };

    loadFunctions();
    loadTours();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="reports-page school-events-page">

      {/* PAGE HEADER */}
      <div className="reports-heading">
        <div>
          <h2>School Events</h2>
          <p>View school functions and tours.</p>
        </div>
      </div>

      {/* SCHOOL EVENTS TABS */}
      <div className="reports-tabs" role="tablist">

        <button
          type="button"
          role="tab"
          aria-selected={activeEventTab === "functions"}
          className={`reports-tab ${
            activeEventTab === "functions" ? "active" : ""
          }`}
          onClick={() => setActiveEventTab("functions")}
        >
          School Functions
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeEventTab === "tours"}
          className={`reports-tab ${
            activeEventTab === "tours" ? "active" : ""
          }`}
          onClick={() => setActiveEventTab("tours")}
        >
          School Tours
        </button>

      </div>

      {/* SHOW ONLY SELECTED TAB */}
      {activeEventTab === "functions" && (
        <FunctionsSection
          functionsData={functionsData}
          loaded={!functionsLoading}
          error={functionsError}
        />
      )}

      {activeEventTab === "tours" && (
        <ToursSection
          toursData={toursData}
          loaded={!toursLoading}
          error={toursError}
        />
      )}

    </div>
  );
}
