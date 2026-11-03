
"use client";

import { useEffect, useRef } from "react";

const GUEST_AUDIT_KEY = "storepilot_guest_audit";

type GuestAuditStorage = {
  version: number;
  savedAt?: string;
  data?: {
    websiteUrl?: string;
  };
};

export function GuestAuditMigration() {
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    async function migrateGuestAudit() {
      try {
        const savedAudit = localStorage.getItem(GUEST_AUDIT_KEY);

        if (!savedAudit) return;

        const parsed: GuestAuditStorage = JSON.parse(savedAudit);

        if (
          parsed.version !== 1 ||
          typeof parsed.savedAt !== "string" ||
          !parsed.savedAt.trim() ||
          typeof parsed.data?.websiteUrl !== "string" ||
          !parsed.data.websiteUrl.trim()
        ) {
          console.warn("Guest audit data is invalid. Keeping local copy.");
          return;
        }

        const response = await fetch("/api/audit", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url: parsed.data.websiteUrl,
            idempotencyKey: `guest-audit-v1:${parsed.savedAt}`,
          }),
        });

        if (!response.ok) {
          console.warn("Guest audit migration failed. Local copy preserved.");
          return;
        }

        const result = await response.json();

        if (result.success) {
          localStorage.removeItem(GUEST_AUDIT_KEY);
          console.info("Guest audit migrated successfully.");
        }
      } catch (error) {
        console.warn("Guest audit migration failed:", error);
      }
    }

    void migrateGuestAudit();
  }, []);

  return null;
}
