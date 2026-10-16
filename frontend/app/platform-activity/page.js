"use client";

import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import {
  Activity, Users, LogIn, Eye, BookOpen, Sparkles,
  Clock, RefreshCw, Search, ChevronDown, AlertCircle,
  GraduationCap, UserRound, School, LayoutDashboard,
  Menu, X
} from "lucide-react";
import styles from "./page.module.css";
import Sidebar from "@/components/Sidebar";
import { useRouter } from "next/navigation";

const platformActivityRequestQueue = (() => {
  const pending = [];
  let active = 0;
  const maxConcurrent = 2;

  const drain = () => {
    while (active < maxConcurrent && pending.length > 0) {
      const { task, resolve, reject } = pending.shift();
      active += 1;

      Promise.resolve()
        .then(task)
        .then(resolve, reject)
        .finally(() => {
          active -= 1;
          drain();
        });
    }
  };

  return (task) =>
    new Promise((resolve, reject) => {
      pending.push({ task, resolve, reject });
      drain();
    });
})();

const api = axios.create({
  adapter: (config) =>
    platformActivityRequestQueue(() =>
      axios.getAdapter("xhr")(config)
    ),
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
  timeout: 30000,
});






const roles = [
  { id: "all", label: "Overview" },
  { id: "faculty", label: "Teachers" },
  { id: "student", label: "Students" },
  { id: "parent", label: "Parents" },
  { id: "headmaster", label: "Headmaster" },
];

const errorMessage = (e) =>
  e?.response?.data?.detail || e?.message || "Unable to load data";

const formatNumber = (value) =>
  Number(value || 0).toLocaleString("en-IN");

const formatDate = (value) => {
  if (!value) return "No matching login";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getRows = (data, key) =>
  Array.isArray(data?.[key]) ? data[key] : [];

export default function PlatformActivityPage() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 650px)");

    const updateViewport = () => setIsMobile(media.matches);

    updateViewport();
    media.addEventListener("change", updateViewport);

    return () => media.removeEventListener("change", updateViewport);
  }, []);
  const [activeSection, setActiveSection] = useState("active");
  const [summary, setSummary] = useState({});
  const [roleStats, setRoleStats] = useState([]);
  const [classes, setClasses] = useState([]);
  const [users, setUsers] = useState([]);
  const [roleUserCounts, setRoleUserCounts] = useState([]);
  const [inactiveUsers, setInactiveUsers] = useState([]);
  const [features, setFeatures] = useState([]);
  const [events, setEvents] = useState([]);

  const [activeRole, setActiveRole] = useState("all");
  const [userRole, setUserRole] = useState("student");
  const [inactiveRole, setInactiveRole] = useState("student");
  const [className, setClassName] = useState("");
  const [section, setSection] = useState("");
  const [inactiveDays, setInactiveDays] = useState("7");
  const [featureDays, setFeatureDays] = useState("30");
  const [moduleName, setModuleName] = useState("");
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(false);
  const [inactiveLoading, setInactiveLoading] = useState(false);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const loadOverview = useCallback(async () => {
    try {
      const response = await api.get("/headmaster/platform-activity");
      const data = response.data || {};
      setSummary(data.summary || {});
      setRoleStats(data.role_wise_activity || []);
      return [];
    } catch (e) {
      const errors = ["Activity summary: " + errorMessage(e)];
      setError(errors.join(" | "));
      return errors;
    }
  }, []);

  const loadUsers = useCallback(async () => {
    if (userRole === "all") {
      setUsers([]);
      return;
    }

    setUsersLoading(true);
    try {
      const params = new URLSearchParams({ role: userRole, days: "7" });
      if (["student", "parent"].includes(userRole) && className) {
        params.set("class_name", className);
      }
      if (["student", "parent"].includes(userRole) && section) {
        params.set("section", section);
      }

      const response = await api.get(
        `/headmaster/platform-activity/users?${params.toString()}`
      );
      setUsers(getRows(response.data, "users"));
    } catch (e) {
      setError("Users: " + errorMessage(e));
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  }, [userRole, className, section]);

  const loadRoleUserCounts = useCallback(async () => {
    try {
      const response = await api.get(
        "/headmaster/platform-activity/user-counts?days=7"
      );
      setRoleUserCounts(getRows(response.data, "counts"));
    } catch (e) {
      setError("Role user counts: " + errorMessage(e));
    }
  }, []);

  const loadInactive = useCallback(async () => {
    setInactiveLoading(true);
    try {
      const params = new URLSearchParams({
        role: inactiveRole,
        days: inactiveDays,
      });
      if (["student", "parent"].includes(inactiveRole) && className) {
        params.set("class_name", className);
      }
      if (["student", "parent"].includes(inactiveRole) && section) {
        params.set("section", section);
      }

      const response = await api.get(
        `/headmaster/platform-activity/inactive-users?${params.toString()}`
      );
      setInactiveUsers(getRows(response.data, "users"));
    } catch (e) {
      setError("Inactive users: " + errorMessage(e));
      setInactiveUsers([]);
    } finally {
      setInactiveLoading(false);
    }
  }, [inactiveRole, inactiveDays, className, section]);

  const loadRemainingOverview = useCallback(async () => {
    const errors = [];

    try {
      const response = await api.get("/headmaster/platform-activity/classes");
      setClasses(getRows(response.data, "classes"));
    } catch (e) {
      errors.push("Classes: " + errorMessage(e));
    }

    try {
      const response = await api.get(
        "/headmaster/platform-activity/recent-events?limit=20&days=7&include_test_data=false"
      );
      setEvents(getRows(response.data, "events"));
    } catch (e) {
      errors.push("Recent events: " + errorMessage(e));
    }

    try {
      const response = await api.get(
        `/headmaster/platform-activity/feature-usage?days=${featureDays}`
      );
      setFeatures(getRows(response.data, "features"));
    } catch (e) {
      errors.push("AI feature usage: " + errorMessage(e));
    }

    if (errors.length) {
      setError((previous) =>
        [previous, ...errors].filter(Boolean).join(" | ")
      );
    }
  }, [featureDays]);

  const loadDashboardSequence = useCallback(async () => {
    setError("");
    await loadOverview();
    await loadUsers();
    await loadRoleUserCounts();
    await loadInactive();
    await loadRemainingOverview();
  }, [
    loadOverview,
    loadUsers,
    loadRoleUserCounts,
    loadInactive,
    loadRemainingOverview,
  ]);

  useEffect(() => {
    let alive = true;
    setLoading(true);

    loadDashboardSequence().finally(() => {
      if (alive) setLoading(false);
    });

    return () => {
      alive = false;
    };
  }, [loadDashboardSequence]);

  const refreshAll = async () => {
    setRefreshing(true);
    try {
      await loadDashboardSequence();
    } finally {
      setRefreshing(false);
    }
  };
  const classOptions = classes.map((item) => item.class_name).filter(Boolean);
  const selectedClass = classes.find((item) => item.class_name === className);
  const sectionOptions = selectedClass?.sections || [];

  const displayedUsers = users.filter((user) =>
    [user.full_name, user.user_id, user.role_name, user.class_name, user.section]
      .some((value) => String(value || "").toLowerCase().includes(search.toLowerCase()))
  );

  const displayedInactive = inactiveUsers.filter((user) =>
    [user.full_name, user.user_id, user.role_name, user.class_name, user.section]
      .some((value) => String(value || "").toLowerCase().includes(search.toLowerCase()))
  );

  const displayedRoles = activeRole === "all"
    ? roleStats
    : roleStats.filter((item) =>
        String(item.role_name || "").toLowerCase() === activeRole.toLowerCase()
        || (activeRole === "faculty" && String(item.role_name || "").toLowerCase() === "teacher")
      );

  const totalLogins = summary.total_logins ?? summary.total_logins_count ?? 0;
  const uniqueUsers = summary.unique_users ?? 0;
  const pageViews = summary.total_page_views ?? 0;
  const contentViews = summary.total_content_views ?? 0;
    const pageUsage = Object.values(
    events
      .filter((event) => event.page_path)
      .reduce((acc, event) => {
        const path = event.page_path;
        if (!acc[path]) {
          acc[path] = {
            page_path: path,
            total_views: 0,
            last_viewed: event.created_at,
          };
        }
        acc[path].total_views += 1;

        if (
          event.created_at &&
          (!acc[path].last_viewed ||
            new Date(event.created_at) > new Date(acc[path].last_viewed))
        ) {
          acc[path].last_viewed = event.created_at;
        }

        return acc;
      }, {})
  ).sort((a, b) => b.total_views - a.total_views);

  return (
    <div className={styles.platformLayout}>
      <Sidebar
        activeTab="platformActivity"
        setActiveTab={(tab) => router.push("/")}
        isOpen={!isMobile || sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className={styles.platformMain}>
        <main className={styles.page}>
          {isMobile && (
            <>
              <button
                type="button"
                className={styles.mobileMenuButton}
                onClick={() => setSidebarOpen((open) => !open)}
                aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
                aria-expanded={sidebarOpen}
              >
                {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
              </button>

              {sidebarOpen && (
                <button
                  type="button"
                  className={styles.sidebarBackdrop}
                  onClick={() => setSidebarOpen(false)}
                  aria-label="Close navigation"
                />
              )}
            </>
          )}
      <header className={styles.header}>
        <div className={styles.heading}>
          <div className={styles.eyebrow}><Activity size={15} /> PLATFORM ANALYTICS</div>
          <h1>Platform Activity</h1>
          <p>Monitor platform engagement, user activity and AI feature usage.</p>
        </div>
        <button className={styles.refreshButton} onClick={refreshAll} disabled={refreshing}>
          <RefreshCw size={16} className={refreshing ? styles.spin : ""} />
          {refreshing ? "Refreshing..." : "Refresh data"}
        </button>
      </header>

      {error && (
        <div className={styles.errorBanner}>
          <AlertCircle size={18} />
          <span>{error}</span>
          <button onClick={() => setError("")} aria-label="Dismiss error">ï¿½</button>
        </div>
      )}

      {loading && <div className={styles.loadingBar}>Loading platform analytics...</div>}

      <nav className={styles.sectionTabs} aria-label="Platform activity sections">
        {[
          ["recent", "Recent Activity"],
          ["active", "Active Users"],
          ["inactive", "Inactive Users"],
          ["pages", "Page Usage"],
          ["ai", "AI Features"],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`${styles.sectionTab} ${activeSection === id ? styles.sectionTabActive : ""}`}
            onClick={() => setActiveSection(id)}
          >
            {label}
          </button>
        ))}
      </nav>
      {activeSection === "active" && (
      <section className={styles.kpiGrid}>
        <Kpi icon={<LogIn />} label="Total Logins" value={totalLogins} tone="blue" />
        <Kpi icon={<Users />} label="Unique Users" value={uniqueUsers} tone="violet" />
        <Kpi icon={<Eye />} label="Page Views" value={pageViews} tone="cyan" />
        <Kpi icon={<BookOpen />} label="Content Views" value={contentViews} tone="amber" />
      </section>
      )}
      {activeSection === "active" && (
      <section className={styles.panel}>
        <div className={styles.panelHeading}>
          <div>
            <h2><LayoutDashboard size={19} /> Activity by Role</h2>
            <p>Compare recorded platform activity across user roles.</p>
          </div>
        </div>
        <div className={styles.tabs}>
          {roles.map((role) => (
            <button
              key={role.id}
              className={`${styles.tab} ${activeRole === role.id ? styles.activeTab : ""}`}
              onClick={() => setActiveRole(role.id)}
            >
              {role.label}
            </button>
          ))}
        </div>
        
        <div className={styles.roleGrid}>
          {roleUserCounts
            .filter((item) => activeRole === "all" || item.role === activeRole)
            .map((item) => {
              const roleLabel =
                roles.find((role) => role.id === item.role)?.label || item.role;

              return (
                <div className={styles.roleCard} key={item.role}>
                  <div className={styles.roleCardTop}>
                    <span className={styles.roleIcon}>
                      <UserRound size={19} />
                    </span>
                    <span className={styles.roleName}>{roleLabel}</span>
                  </div>

                  <div className={styles.roleMetrics}>
                    <div>
                      <strong>{formatNumber(item.total)}</strong>
                      <span>Total Users</span>
                    </div>
                    <div>
                      <strong>{formatNumber(item.active)}</strong>
                      <span>Active</span>
                    </div>
                    <div>
                      <strong>{formatNumber(item.inactive)}</strong>
                      <span>Inactive</span>
                    </div>
                  </div>
                </div>
              );
            })}

          {!roleUserCounts.length && (
            <Empty text="No user counts available." />
          )}
        </div>

      </section>
      )}

      {activeSection === "active" && (
      <section className={styles.panel}>
        <div className={styles.panelHeading}>
          <div>
            <h2><Users size={19} /> User Activity</h2>
            <p>Review users and their most recent recorded login.</p>
          </div>
        </div>

        <div className={styles.filters}>
          <div className={styles.filterField}>
            <label htmlFor="userRole">Role</label>
            <div className={styles.selectWrap}>
              <select id="userRole" value={userRole} onChange={(e) => setUserRole(e.target.value)}>
                <option value="student">Students</option>
                <option value="parent">Parents</option>
                <option value="faculty">Teachers</option>
                <option value="headmaster">Headmaster</option>
              </select>
              <ChevronDown size={16} />
            </div>
          </div>

          {["student", "parent"].includes(userRole) && (
            <>
              <div className={styles.filterField}>
                <label htmlFor="classFilter">Class</label>
                <div className={styles.selectWrap}>
                  <select id="classFilter" value={className} onChange={(e) => {
                    setClassName(e.target.value);
                    setSection("");
                  }}>
                    <option value="">All classes</option>
                    {classOptions.map((name) => <option key={name} value={name}>{name}</option>)}
                  </select>
                  <ChevronDown size={16} />
                </div>
              </div>
              <div className={styles.filterField}>
                <label htmlFor="sectionFilter">Section</label>
                <div className={styles.selectWrap}>
                  <select id="sectionFilter" value={section} onChange={(e) => setSection(e.target.value)}>
                    <option value="">All sections</option>
                    {sectionOptions.map((name) => <option key={name} value={name}>{name}</option>)}
                  </select>
                  <ChevronDown size={16} />
                </div>
              </div>
            </>
          )}

          <div className={styles.searchField}>
            <Search size={17} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users..." />
          </div>
        </div>

        <DataTable
          loading={usersLoading}
          headers={["User", "Role", "Class", "Section", "Last login", "Logins (7 days)"]}
          rows={displayedUsers.map((user) => [
            <div className={styles.userCell} key="user">
              <span className={styles.avatar}>{String(user.full_name || "?").trim().charAt(0).toUpperCase()}</span>
              <div><strong>{user.full_name || "Unknown user"}</strong><small>ID: {user.user_id}</small></div>
            </div>,
            <span className={styles.pill} key="role">{user.role_name || userRole}</span>,
            user.class_name || "-",
            user.section || "-",
            <span className={user.last_login ? "" : styles.muted} key="login">{formatDate(user.last_login)}</span>,
            formatNumber(user.logins_in_period),
          ])}
          empty="No users match the selected filters."
        />
      </section>
      )}

      {activeSection === "inactive" && (
      <section className={styles.panel}>
        <div className={styles.panelHeading}>
          <div>
            <h2><Clock size={19} /> Inactive Users</h2>
            <p>Users without a matching login record during the selected period.</p>
          </div>
          <span className={styles.subtleBadge}>{displayedInactive.length} users</span>
        </div>

        <div className={styles.filters}>
          <div className={styles.filterField}>
            <label htmlFor="inactiveRole">Role</label>
            <div className={styles.selectWrap}>
              <select id="inactiveRole" value={inactiveRole} onChange={(e) => setInactiveRole(e.target.value)}>
                <option value="student">Students</option>
                <option value="parent">Parents</option>
                <option value="faculty">Teachers</option>
                <option value="headmaster">Headmaster</option>
              </select>
              <ChevronDown size={16} />
            </div>
          </div>
          <div className={styles.filterField}>
            <label htmlFor="inactiveDays">Inactive period</label>
            <div className={styles.selectWrap}>
              <select id="inactiveDays" value={inactiveDays} onChange={(e) => setInactiveDays(e.target.value)}>
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
              </select>
              <ChevronDown size={16} />
            </div>
          </div>
          {["student", "parent"].includes(inactiveRole) && (
            <>
              <div className={styles.filterField}>
                <label htmlFor="inactiveClass">Class</label>
                <div className={styles.selectWrap}>
                  <select id="inactiveClass" value={className} onChange={(e) => {
                    setClassName(e.target.value);
                    setSection("");
                  }}>
                    <option value="">All classes</option>
                    {classOptions.map((name) => <option key={name} value={name}>{name}</option>)}
                  </select>
                  <ChevronDown size={16} />
                </div>
              </div>
              <div className={styles.filterField}>
                <label htmlFor="inactiveSection">Section</label>
                <div className={styles.selectWrap}>
                  <select id="inactiveSection" value={section} onChange={(e) => setSection(e.target.value)}>
                    <option value="">All sections</option>
                    {sectionOptions.map((name) => <option key={name} value={name}>{name}</option>)}
                  </select>
                  <ChevronDown size={16} />
                </div>
              </div>
            </>
          )}
        </div>

        <DataTable
          loading={inactiveLoading}
          headers={["User", "Role", "Class", "Section", "Last login"]}
          rows={displayedInactive.map((user) => [
            <div className={styles.userCell} key="user">
              <span className={styles.avatar}>{String(user.full_name || "?").trim().charAt(0).toUpperCase()}</span>
              <div><strong>{user.full_name || "Unknown user"}</strong><small>ID: {user.user_id}</small></div>
            </div>,
            <span className={styles.pill} key="role">{user.role_name || inactiveRole}</span>,
            user.class_name || "-",
            user.section || "-",
            <span className={styles.muted} key="login">{formatDate(user.last_login)}</span>,
          ])}
          empty="No inactive users found for these filters."
        />
      </section>
      )}

            {activeSection === "pages" && (
        <section className={styles.panel}>
          <div className={styles.panelHeading}>
            <div>
              <h2><Eye size={19} /> Page Usage</h2>
              <p>Page-wise activity based on the recently recorded events.</p>
            </div>
            <span className={styles.subtleBadge}>
              {pageUsage.length} pages
            </span>
          </div>

          <div className={styles.featureSummary}>
            <div>
              <span>Total recorded page events</span>
              <strong>
                {formatNumber(
                  pageUsage.reduce((sum, page) => sum + page.total_views, 0)
                )}
              </strong>
            </div>
            <div>
              <span>Unique pages</span>
              <strong>{formatNumber(pageUsage.length)}</strong>
            </div>
          </div>

          <DataTable
            headers={["Page path", "Recorded events", "Last activity"]}
            rows={pageUsage.map((page) => [
              <span className={styles.path} key="path">
                {page.page_path}
              </span>,
              formatNumber(page.total_views),
              formatDate(page.last_viewed),
            ])}
            empty="No page usage recorded in the recent events."
          />

          <p className={styles.note}>
            Counts reflect only the recent events currently loaded by the API,
            not the complete historical page-view total.
          </p>
        </section>
      )}

      {activeSection === "ai" && (
      <section className={styles.panel}>
        <div className={styles.panelHeading}>
          <div>
            <h2><Sparkles size={19} /> AI Feature Usage</h2>
            <p>Recorded AI feature usage grouped by module and feature.</p>
          </div>
          <div className={styles.compactSelect}>
            <select value={featureDays} onChange={(e) => setFeatureDays(e.target.value)} aria-label="Feature usage period">
              <option value="7">7 days</option>
              <option value="30">30 days</option>
              <option value="90">90 days</option>
              <option value="365">365 days</option>
            </select>
          </div>
        </div>
        <div className={styles.featureSummary}>
          <div><span>Total usage</span><strong>{formatNumber(features.reduce((sum, f) => sum + Number(f.usage_count || 0), 0))}</strong></div>
          <div><span>Feature combinations</span><strong>{formatNumber(features.length)}</strong></div>
          <div><span>Total tokens</span><strong>{formatNumber(features.reduce((sum, f) => sum + Number(f.total_tokens || 0), 0))}</strong></div>
        </div>
        <DataTable
          headers={["Module", "Feature", "Usage count", "Unique users", "Total tokens", "Last used"]}
          rows={features
            .filter((f) => !moduleName || f.module_name === moduleName)
            .map((f) => [
              f.module_name || "-",
              <strong key="feature">{f.feature_used || "-"}</strong>,
              formatNumber(f.usage_count),
              formatNumber(f.unique_users),
              formatNumber(f.total_tokens),
              formatDate(f.last_used_at),
            ])}
          empty="No AI feature usage found for this period."
        />
      </section>
      )}


      {activeSection === "recent" && (
      <section className={styles.panel}>
        <div className={styles.panelHeading}>
          <div>
            <h2><Activity size={19} /> Recent Activity</h2>
            <p>Latest recorded login, page view and content view events.</p>
          </div>
          <span className={styles.subtleBadge}>Last 7 days - {events.length} events</span>
        </div>
        <DataTable
          headers={["User Name", "Role", "Event", "Login method", "Page", "Date & time"]}
          rows={events.map((event) => [
            <strong key="id">{event.full_name || event.user_id || "Unknown user"}</strong>,
            <span className={styles.pill} key="role">{event.role_name || "-"}</span>,
            <span className={styles.eventType} key="type">{String(event.activity_type || "event").replaceAll("_", " ")}</span>,
            event.login_method || "-",
            <span className={styles.path} key="path">{event.page_path || "-"}</span>,
            formatDate(event.created_at),
          ])}
          empty="No recent events recorded."
        />
        <p className={styles.note}>Recent events display the recorded user ID. Login logging and user identity mapping may need verification before interpreting missing activity as no login.</p>
      </section>
      )}

      <footer className={styles.footer}>
        <span><School size={15} /> SGS Headmaster Dashboard</span>
        <span>Platform Activity ï¿½ Live API data</span>
      </footer>
        </main>
      </div>
    </div>
  );
}

function Kpi({ icon, label, value, tone }) {
  return (
    <div className={styles.kpiCard}>
      <span className={`${styles.kpiIcon} ${styles[tone]}`}>{icon}</span>
      <div><span className={styles.kpiLabel}>{label}</span><strong className={styles.kpiValue}>{formatNumber(value)}</strong><span className={styles.kpiHint}>Recorded activity</span></div>
    </div>
  );
}

function Empty({ text }) {
  return <div className={styles.empty}><Activity size={22} /><span>{text}</span></div>;
}

function DataTable({ headers, rows, loading, empty }) {
  return (
    <div className={styles.tableScroll}>
      <table className={styles.table}>
        <thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={headers.length} className={styles.tableMessage}>Loading data...</td></tr>
          ) : rows.length ? rows.map((row, index) => (
            <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>
          )) : (
            <tr><td colSpan={headers.length} className={styles.tableMessage}>{empty}</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
