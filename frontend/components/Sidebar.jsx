import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Home,
  Users,
  GraduationCap,
  FileText ,
  TrendingUp,
  Bell,
  CalendarDays,
  MapPinned,
  UserCheck,
  LogOut,
} from "lucide-react";
import Image from "next/image";
import LogoutModal from "@/components/LogoutModal";
export default function Sidebar({
  activeTab,
  setActiveTab,
  isOpen,
  onClose,
}) {
  const router = useRouter();

  // ✅ ADD STATE FOR MODAL
  const [showLogout, setShowLogout] = useState(false);

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: Home },
    { id: "students", label: "Students", icon: Users },
    { id: "teachers", label: "Teachers", icon: GraduationCap },
    { id: "reports", label: "Reports", icon: FileText },
    { id: "progress", label: "Progress", icon: TrendingUp },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "functions", label: "Functions", icon: CalendarDays },
    { id: "tours", label: "Tours", icon: MapPinned },
    { id: "classTeachers", label: "Class Teachers", icon: UserCheck },

    // logout item stays same
    { id: "logout", label: "Logout", icon: LogOut, danger: true },
  ];

  // ✅ LOGOUT LOGIC
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    sessionStorage.clear();

    // clear cookie (if used)
    document.cookie =
      "sgs_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC";

    window.location.href = process.env.NEXT_PUBLIC_LOGOUT_URL;
  };

  const handleClick = (item) => {
    if (item.id === "logout") {
      setShowLogout(true); // ✅ open modal instead of confirm
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
          {/* BRAND */}
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

          {/* MENU */}
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

      {/* ✅ LOGOUT MODAL (ADD HERE - OUTSIDE SIDEBAR DIV) */}
      <LogoutModal
        open={showLogout}
        onCancel={() => setShowLogout(false)}
        onConfirm={handleLogout}
      />
    </>
  );
}