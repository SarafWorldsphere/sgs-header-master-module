"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import AIToolsModal from "./AIToolsModal";
import styles from "../app/styles/students.module.css";

export default function DashboardLayout({
  activeTab,
  headmaster,
  unreadCount = 0,
  students = [],
  children,
}) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [openAI, setOpenAI] = useState(false);

  const handleSidebarNavigation = (tab) => {
  if (tab === "dashboard") {
    router.push("/");
  } else {
    router.push(`/${tab}`);
  }
};

  return (
    <div className={styles.layout}>
      <Sidebar
        activeTab={activeTab}
        setActiveTab={handleSidebarNavigation}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className={styles.mainContent}>
        <Topbar
          headmaster={headmaster}
          notificationCount={unreadCount}
          onOpenAI={() => setOpenAI(true)}
          onOpenNotifications={() => router.push("/notifications")}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
        />

        <AIToolsModal
          open={openAI}
          onClose={() => setOpenAI(false)}
          students={students}
        />

        {children}
      </div>
    </div>
  );
}