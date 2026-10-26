"use client";

import {
  Bell,
  Bot,
  Menu,
  UserRound,
} from "lucide-react";
import styles from "../app/styles/topbar.module.css";

export default function Topbar({
  headmaster,
  notificationCount = 0,
  onOpenAI,
  onOpenNotifications,
  sidebarOpen,
  setSidebarOpen,
}) {
  return (
    <header className={styles.topbar}>
      <button
        className={styles.mobileMenu}
        onClick={() => setSidebarOpen(!sidebarOpen)}
        type="button"
        aria-label="Toggle sidebar"
        aria-expanded={sidebarOpen}
      >
        <Menu size={22} />
      </button>

      <div className={styles.heading}>
        <div className={styles.headingContent}>
          <h1>
            Welcome, {headmaster?.name || "Headmaster"}
          </h1>
          <p>Headmaster Dashboard</p>
        </div>
      </div>

      <div className={styles.actions}>
        <button
          className={styles.aiButton}
          onClick={onOpenAI}
          type="button"
        >
          <Bot size={18} />
          <span>AI Tools</span>
        </button>

        <button
          className={styles.notificationButton}
          onClick={onOpenNotifications}
          type="button"
          aria-label={`Notifications${
            notificationCount > 0
              ? `, ${notificationCount} unread`
              : ""
          }`}
        >
          <Bell size={19} />

          {notificationCount > 0 && (
            <span className={styles.notificationBadge}>
              {notificationCount > 99 ? "99+" : notificationCount}
            </span>
          )}
        </button>

        <div
          className={styles.profileIcon}
          title={headmaster?.name || "User profile"}
          aria-label="User profile"
        >
          <UserRound size={20} />
        </div>
      </div>
    </header>
  );
}