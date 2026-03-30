import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { trpc } from "@/lib/trpc";

interface SiteContentContextValue {
  get: (key: string, defaultValue?: string) => string;
  set: (key: string, value: string) => Promise<void>;
  reset: (key: string) => Promise<void>;
  hasOverride: (key: string) => boolean;
  canEdit: boolean;
}

const SiteContentContext = createContext<SiteContentContextValue>({
  get: (_key, defaultValue = "") => defaultValue,
  set: async () => {},
  reset: async () => {},
  hasOverride: () => false,
  canEdit: false,
});

export function SiteContentProvider({ children }: { children: ReactNode }) {
  const canEdit = false; // Inline editing disabled

  // Local cache: key → overridden value
  const [overrides, setOverrides] = useState<Record<string, string>>({});

  // Load all site content on mount — hooks must always be called unconditionally
  const { data: siteContentList } = trpc.siteContent.getAll.useQuery(undefined, { staleTime: 60_000 });

  // Merge server data into overrides on load
  React.useEffect(() => {
    if (siteContentList && Array.isArray(siteContentList)) {
      const map: Record<string, string> = {};
      for (const item of siteContentList) {
        if (item.contentKey && item.contentValue != null) {
          map[item.contentKey] = item.contentValue;
        }
      }
      setOverrides(map);
    }
  }, [siteContentList]);

  const setSiteContentMutation = trpc.siteContent.update.useMutation();

  const resetSiteContentMutation = trpc.siteContent.reset.useMutation();

  const get = useCallback(
    (key: string, defaultValue = "") => {
      return overrides[key] ?? defaultValue;
    },
    [overrides]
  );

  const set = useCallback(
    async (key: string, value: string) => {
      setOverrides((prev) => ({ ...prev, [key]: value }));
      try {
        await setSiteContentMutation.mutateAsync({ contentKey: key, value });
      } catch (e) {
        console.error("Failed to persist site content:", e);
      }
    },
    [setSiteContentMutation]
  );

  const reset = useCallback(
    async (key: string) => {
      setOverrides((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      try {
        await resetSiteContentMutation.mutateAsync({ contentKey: key });
      } catch (e) {
        console.error("Failed to reset site content:", e);
      }
    },
    [resetSiteContentMutation]
  );

  const hasOverride = useCallback(
    (key: string) => key in overrides,
    [overrides]
  );

  return (
    <SiteContentContext.Provider value={{ get, set, reset, hasOverride, canEdit }}>
      {children}
    </SiteContentContext.Provider>
  );
}

export function useSiteContent() {
  return useContext(SiteContentContext);
}
