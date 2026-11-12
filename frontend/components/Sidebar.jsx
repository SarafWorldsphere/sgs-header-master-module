"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Home,
  Users,
  GraduationCap,
  FileText,
  Bell,
  CalendarDays,
  LogOut,
  Activity,
  X,
} from "lucide-react";

import LogoutModal from "@/components/LogoutModal";
import styles from "./Sidebar.module.css";
import { clearApiCache } from "@/services/api";

const menuItems = [
  { label: "Dashboard", path: "/", icon: Home },
  { label: "Students", path: "/students", icon: Users },
  { label: "Teachers", path: "/teachers", icon: GraduationCap },
  { label: "Reports", path: "/reports", icon: FileText },
  { label: "Notifications", path: "/notifications", icon: Bell },
  { label: "School Events", path: "/school-events", icon: CalendarDays },
  {
    label: "Platform Activity",
    path: "/platform-activity",
    icon: Activity,
  },
];

export default function Sidebar({ isOpen, onClose }) {
  const router = useRouter();
  const pathname = usePathname();

  const [showLogout, setShowLogout] = useState(false);

  const activePath = pathname?.replace(/^\/headmaster(?=\/|$)/, "") || "/";

  const handleNavigation = (path) => {
    router.push(path);

    if (window.innerWidth <= 900) {
      onClose?.();
    }
  };

  const handleLogout = () => {
    // Clear JWT token
    localStorage.removeItem("token");
    localStorage.removeItem("role");

    // Clear cached API data
    clearApiCache();

    // Clear session data
    sessionStorage.clear();

    // Clear cookie
    document.cookie =
      "sgs_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC";

    // Redirect to Common Login
    window.location.href = process.env.NEXT_PUBLIC_LOGOUT_URL;
  };

  return (
    <>
      <aside className={`${styles.sidebar} ${isOpen ? styles.open : ""}`}>
      <button
  type="button"
  className={styles.closeButton}
  onClick={onClose}
  aria-label="Close sidebar"
>
  <X size={23} />
</button>
        <div className={styles.sidebarContent}>
          <div className={styles.brand}>
            <div className={styles.logoCircle}>
              <img
                src="/headmaster/school-logo.jpeg"
                alt="SGS School Logo"
              />
            </div>

            <h2>SGS SCHOOL</h2>
            <p>Headmaster Dashboard</p>
          </div>

          <nav className={styles.menuList}>
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.path === "/"
                  ? activePath === "/"
                  : activePath === item.path ||
                    activePath.startsWith(`${item.path}/`);

              return (
                <button
                  key={item.path}
                  type="button"
                  className={`${styles.menuButton} ${
                    isActive ? styles.active : ""
                  }`}
                  onClick={() => handleNavigation(item.path)}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </button>
              );
            })}

            <button
              type="button"
              className={`${styles.menuButton} ${styles.logout}`}
              onClick={() => setShowLogout(true)}
            >
              <LogOut size={18} />
              <span>Logout</span>
            </button>
          </nav>
        </div>
      </aside>

      {isOpen && (
        <button
          type="button"
          className={styles.overlay}
          onClick={onClose}
          aria-label="Close sidebar"
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