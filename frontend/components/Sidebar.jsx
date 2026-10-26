
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Home,
  Users,
  GraduationCap,
  FileText,
  Bell,
  CalendarDays,
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

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: Home, route: "/" },
    { id: "students", label: "Students", icon: Users, route: "/students" },
    { id: "teachers", label: "Teachers", icon: GraduationCap, route: "/teachers" },
    { id: "reports", label: "Reports", icon: FileText, route: "/reports" },
    {
      id: "notifications",
      label: "Notifications",
      icon: Bell,
      route: "/notifications",
    },
    {
      id: "schoolEvents",
      label: "School Events",
      icon: CalendarDays,
      route: "/school-events",
    },
    {
      id: "platformActivity",
      label: "Platform Activity",
      icon: Activity,
      route: "/platform-activity",
    },
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

      if (window.innerWidth <= 900) {
        onClose?.();
      }
      return;
    }

    if (item.route) {
      router.push(item.route);
    } else {
      setActiveTab?.(item.id);
    }

    if (window.innerWidth <= 900) {
      onClose?.();
    }
  };

  return (
    <>
      <div className={`sidebar ${isOpen ? "open" : ""}`}>
        <div>
          <div className="brand-box">
            <div className="logo-circle">
              <img
                src="/headmaster/school-logo.jpeg"
                alt="SGS Logo"
                width={80}
                height={80}
                className="school-logo"
              />
            </div>

            <h2>SGS SCHOOL</h2>
            <p>Headmaster Dashboard</p>
          </div>

          <div className="menu-list">
            {menuItems.map((item) => {
              const Icon = item.icon;

              return (
                <button
                  key={item.id}
                  type="button"
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
        <div className="sidebar-overlay" onClick={onClose} />
      )}

      <LogoutModal
        open={showLogout}
        onCancel={() => setShowLogout(false)}
        onConfirm={handleLogout}
      />
    </>
  );
}
