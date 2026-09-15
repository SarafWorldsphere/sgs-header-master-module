"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Shield,
  Bell,
  Search,
  Mic,
  Volume2,
  Languages,
  Check,
  ChevronDown,
  Bot,
  Menu,
} from "lucide-react";
import useVoice from "../hooks/useVoice";
import Image from "next/image";
export default function Topbar({
  headmaster,
  searchText,
  setSearchText,
  notificationCount = 0,
  language,
  setLanguage,
  onOpenAI,
  onOpenNotifications,
  sidebarOpen,
  setSidebarOpen,
}) {

  const router = useRouter();
  const { startVoice, listening } = useVoice();

  // Language Dropdown
 
  const [showLangMenu, setShowLangMenu] = useState(false);

  const langRef = useRef(null);
const languages = [
  { label: "English", value: "English" },
  { label: "తెలుగు", value: "Telugu" },
  { label: "हिन्दी", value: "Hindi" },
];

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (langRef.current && !langRef.current.contains(e.target)) {
        setShowLangMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const speakText = (text) => {
    if (!text || !text.trim()) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 1;

    window.speechSynthesis.speak(utterance);
  };

const handleVoiceInput = () => {
  startVoice((text) => {
    if (!text) return;

    setSearchText("");

    let i = 0;

    const interval = setInterval(() => {
      setSearchText(text.slice(0, i));
      i++;

      if (i > text.length) clearInterval(interval);
    }, 12);
  });
};

  return (
    
    <div className="topbar">
      <button
  className="mobile-menu-btn"
  onClick={() => setSidebarOpen(!sidebarOpen)}
  type="button"
>
  <Menu size={24} />
</button>
        {/* Profile */}
        <div className="profile-card">
          <Shield size={22} />

          <div>
<h3>
  Welcome {headmaster?.name || "Headmaster"}
</h3>
<p>
  {headmaster?.role || "Headmaster Access"}
</p>
          </div>
        </div>
      {/* LEFT */}
      <div className="topbar-left">
        <div className="search-box">
          <div className="search-icon">
            <Search size={18} />
          </div>

          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search students..."
            className="search-input"
          />

          <div className="search-actions">
            <button
              className="speak-btn"
              onClick={() => speakText(searchText)}
              title="Speak text"
              type="button"
            >
             <Volume2
  size={16}
  stroke="#cbd5e1"
/>
            </button>

            <button
              className={`mic-btn ${listening ? "active" : ""}`}
              onClick={handleVoiceInput}
              title="Voice input"
              type="button"
            >
              <Mic size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* RIGHT */}
      <div className="topbar-right">
      <button
  className="ai-btn"
  onClick={onOpenAI}
  type="button"
>
  <Bot size={18} />
  <span>AI Tools</span>
</button>

        {/* Language */}
        <div className="language-wrapper" ref={langRef}>
          <button
            className="language-btn"
            type="button"
            onClick={() => setShowLangMenu((prev) => !prev)}
          >
            <Languages size={18} />

           <span>
  {languages.find((lang) => lang.value === language)?.label || language}
</span>

            <ChevronDown
              size={16}
              className={showLangMenu ? "rotate" : ""}
            />
          </button>

    {showLangMenu && (
  <div className="language-dropdown">
    {languages.map((lang) => (
      <button
        key={lang.value}
        type="button"
        className={`language-item ${
          language === lang.value ? "selected" : ""
        }`}
        onClick={() => {
        setLanguage(lang.value.trim());
          setShowLangMenu(false);
        }}
      >
        <span>{lang.label}</span>

        {language === lang.value && <Check size={16} />}
      </button>
    ))}
  </div>
)}
        </div>
{/* Notification */}
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
      {/* SWAIS Brand */}
{/* SWAIS Brand */}
<div className="brand">
  <div className="brand-logo">
    <img
      src="/headmaster/swais-logo.jpeg"
      alt="SWAIS Logo"
      width="50"
      height="50"
    />
  </div>

  <div className="brand-text">
    <span>SWAIS</span>
    <span>SARASWATI</span>
  </div>
</div>
       

      </div>
    </div>
  );
}