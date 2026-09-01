"use client";

import { useEffect } from "react";

async function verifyCurrentSession(): Promise<void> {
  try {
    const response = await fetch("/api/auth/session", {
      method: "GET",
      cache: "no-store",
      credentials: "same-origin",
      headers: { Accept: "application/json" },
    });

    if (response.status === 401 || response.status === 403) {
      window.location.replace("/sign-in");
    }
  } catch {
    // A transient network failure must not log the learner out. The next
    // pageshow/route request will re-check access, and server routes remain protected.
  }
}

export function SessionRevalidator() {
  useEffect(() => {
    void verifyCurrentSession();

    function handlePageShow() {
      void verifyCurrentSession();
    }

    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);

  return null;
}
