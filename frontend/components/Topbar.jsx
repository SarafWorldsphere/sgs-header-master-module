"use client";

import {
  Shield,
  Bell,
  Bot,
  Menu,
} from "lucide-react";

export default function Topbar({
  headmaster,
  notificationCount = 0,
  onOpenAI,
  onOpenNotifications,
  sidebarOpen,
  setSidebarOpen,
}) {
  return (
    <div className="topbar">
      {/* Mobile Menu */}
      <button
        className="mobile-menu-btn"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        type="button"
        aria-label="Open menu"
      >
        <Menu size={24} />
      </button>

      {/* Profile */}
      <div className="profile-card">
        <Shield size={22} />

        <div className="profile-content">
          <h3>
            Welcome {headmaster?.name || "Headmaster"}
          </h3>

          <p>
            {headmaster?.role || "Headmaster Access"}
          </p>
        </div>
      </div>

      {/* Right Controls */}
      <div className="topbar-right">
        {/* AI Tools */}
        <button
          className="ai-btn"
          onClick={onOpenAI}
          type="button"
        >
          <Bot size={18} />
          <span>AI Tools</span>
        </button>

        {/* Notifications */}
        <div className="notification-bell">
          <button
            type="button"
            onClick={onOpenNotifications}
            aria-label="Notifications"
          >
            <Bell size={18} />

            {notificationCount > 0 && (
              <span className="notification-badge">
                {notificationCount}
              </span>
            )}
          </button>
        </div>

        {/* School Logo */}
        <div className="brand">
          <div className="brand-logo">
            <img
              src="/headmaster/swais-logo.jpeg"
              alt="School Logo"
              width="50"
              height="50"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
