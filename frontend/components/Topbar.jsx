"use client";

import { Bell, Bot, Menu, Shield } from "lucide-react";
import styles from "./Topbar.module.css";

export default function Topbar({
  headmaster,
  notificationCount = 0,
  onOpenAI,
  onOpenNotifications,
  sidebarOpen,
  setSidebarOpen,
}) {
  return (
    <>
      <header className={styles.topbar}>
        <button
          className={styles.menuButton}
          onClick={() => setSidebarOpen?.(!sidebarOpen)}
          type="button"
          aria-label="Open menu"
        >
          <Menu size={22} />
        </button>

        <div className={styles.profile}>
          <div className={styles.profileIcon}>
            <Shield size={23} />
          </div>

          <div className={styles.profileContent}>
            <h3>Welcome {headmaster?.name || "Headmaster"}</h3>
            <p>{headmaster?.role || "Headmaster Access"}</p>
          </div>
        </div>

        <div className={styles.actions}>
          <button
            className={styles.aiButton}
            onClick={onOpenAI}
            type="button"
          >
            <Bot size={19} />
            <span>AI Tools</span>
          </button>

          <button
            className={styles.notificationButton}
            onClick={onOpenNotifications}
            type="button"
            aria-label="Notifications"
          >
            <Bell size={20} />

            {notificationCount > 0 && (
              <span className={styles.notificationBadge}>
                {notificationCount > 99 ? "99+" : notificationCount}
              </span>
            )}
          </button>
        </div>
      </header>

      <div className={styles.spacer} />
    </>
  );
}