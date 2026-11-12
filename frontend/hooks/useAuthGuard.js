
"use client";

import { useEffect, useState } from "react";
import { clearApiCache } from "@/services/api";

export default function useAuthGuard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get("token");

    if (urlToken) {
      localStorage.setItem("token", urlToken);
      clearApiCache();

      params.delete("token");

      const remainingQuery = params.toString();
      const cleanUrl =
        window.location.pathname +
        (remainingQuery ? `?${remainingQuery}` : "") +
        window.location.hash;

      window.history.replaceState({}, "", cleanUrl);
    }

    const token = localStorage.getItem("token");

    if (!token) {
      window.location.replace(
        process.env.NEXT_PUBLIC_LOGOUT_URL || "http://localhost:3000"
      );
      return;
    }

    setIsAuthenticated(true);
  }, []);

  return isAuthenticated;
}
