
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

import {
  Home,
  Users,
  GraduationCap,
  FileText,
  TrendingUp,
  Bell,
  BellRing,
  CalendarDays,
  MapPinned,
  UserCheck,
  LogOut,
  Activity,
} from "lucide-react";

import LogoutModal from "@/components/LogoutModal";

export default function Sidebar({
  activeTab,
  setActiveTab,
  isOpen,
  onClose,
}) {
  const router = useRouter();

  const [showLogout, setShowLogout] = useState(false);

  // Dynamic school branding
  const [schoolConfig, setSchoolConfig] = useState({
    schoolName: "School Dashboard",
    shortName: "School",
    logoUrl: null,
  });

  useEffect(() => {
    const fetchSchoolConfig = async () => {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

        const response = await fetch(
          `${baseUrl}/headmaster/school-config`,
          {
            method: "GET",
            cache: "no-store",
          }
        );

        if (!response.ok) {
          throw new Error(
            `School config API failed: ${response.status}`
          );
        }

        const result = await response.json();

        if (result.success && result.data) {
          setSchoolConfig((previous) => ({
            ...previous,
            ...result.data,
          }));
        }
      } catch (error) {
        console.error("School config fetch error:", error);
      }
    };

    fetchSchoolConfig();
  }, []);

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: Home },
    { id: "students", label: "Students", icon: Users },
    { id: "teachers", label: "Teachers", icon: GraduationCap },
    { id: "reports", label: "Reports", icon: FileText },
    { id: "coverage", label: "Syllabus Coverage", icon: TrendingUp },
    { id: "teacherAlerts", label: "Teacher Alerts", icon: BellRing },
    { id: "progress", label: "Progress", icon: TrendingUp },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "functions", label: "Functions", icon: CalendarDays },
    { id: "tours", label: "Tours", icon: MapPinned },
    { id: "classTeachers", label: "Class Teachers", icon: UserCheck },
    { id: "platformActivity", label: "Platform Activity", icon: Activity },
    { id: "logout", label: "Logout", icon: LogOut, danger: true },
  ];

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    sessionStorage.clear();

    document.cookie =
      "sgs_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC";

    window.location.href = process.env.NEXT_PUBLIC_LOGOUT_URL;
  };

  const handleClick = (item) => {
    if (item.id === "logout") {
      setShowLogout(true);
      return;
    }

    if (item.id === "coverage") {
      setActiveTab("coverage");
      router.push("/coverage");

      if (window.innerWidth <= 900) onClose();
      return;
    }

    if (item.id === "teacherAlerts") {
      setActiveTab("teacherAlerts");
      router.push("/teacher-alerts");

      if (window.innerWidth <= 900) onClose();
      return;
    }

    if (item.id === "platformActivity") {
      setActiveTab("platformActivity");
      router.push("/platform-activity");

      if (window.innerWidth <= 900) onClose();
      return;
    }

    setActiveTab(item.id);

    if (window.innerWidth <= 900) {
      onClose();
    }
  };

  return (
    <>
      <div className={`sidebar ${isOpen ? "open" : ""}`}>
        <div>
          {/* Dynamic School Branding */}
          <div className="brand-box">
            <div className="logo-circle">
              {schoolConfig.logoUrl ? (
                <img
                  src={schoolConfig.logoUrl}
                  alt={`${schoolConfig.schoolName} Logo`}
                  className="school-logo"
                />
              ) : (
                <GraduationCap
                  size={46}
                  color="#1e3a8a"
                  strokeWidth={1.8}
                />
              )}
            </div>

            <h2>{schoolConfig.schoolName}</h2>
            <p>Headmaster Dashboard</p>
          </div>

          <div className="menu-list">
            {menuItems.map((item) => {
              const Icon = item.icon;

              return (
                <button
                  key={item.id}
                  className={`menu-btn ${
                    activeTab === item.id ? "active" : ""
                  } ${item.danger ? "logout-style" : ""}`}
                  onClick={() => handleClick(item)}
                >
                  <Icon size={18} />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {isOpen && (
        <div
          className="sidebar-overlay"
          onClick={onClose}
        />
      )}

      <LogoutModal
        open={showLogout}
        onCancel={() => setShowLogout(false)}
        onConfirm={handleLogout}
      />
    </>
  );
}
