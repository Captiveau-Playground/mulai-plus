"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const DRAFT_KEY = "article-editor-draft";

interface DraftState {
  values: Record<string, unknown>;
  tab: string;
  savedAt: string;
  articleId?: string;
}

export function useFormDraft(articleId?: string) {
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);
  const draftKey = articleId ? `${DRAFT_KEY}-${articleId}` : DRAFT_KEY;

  const restoreDraft = useCallback((): DraftState | null => {
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return null;
      const draft: DraftState = JSON.parse(raw);
      setDraftSavedAt(draft.savedAt);
      return draft;
    } catch {
      return null;
    }
  }, [draftKey]);

  const saveDraft = useCallback(
    (values: Record<string, unknown>, activeTab: string) => {
      try {
        const draft: DraftState = {
          values,
          tab: activeTab,
          savedAt: new Date().toISOString(),
          articleId,
        };
        localStorage.setItem(draftKey, JSON.stringify(draft));
        setDraftSavedAt(draft.savedAt);
      } catch {
        // localStorage full or unavailable
      }
    },
    [draftKey, articleId],
  );

  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(draftKey);
      setDraftSavedAt(null);
    } catch {
      // ignore
    }
  }, [draftKey]);

  const useAutoSave = (getValues: () => Record<string, unknown>, activeTab: string, enabled: boolean) => {
    const getValuesRef = useRef(getValues);
    getValuesRef.current = getValues;
    const saveDraftRef = useRef(saveDraft);
    saveDraftRef.current = saveDraft;
    const activeTabRef = useRef(activeTab);
    activeTabRef.current = activeTab;

    useEffect(() => {
      if (!enabled) return;

      let debounceTimer: ReturnType<typeof setTimeout>;
      let lastSnapshot = JSON.stringify(getValuesRef.current());

      const pollTimer = setInterval(() => {
        const snapshot = JSON.stringify(getValuesRef.current());
        if (snapshot !== lastSnapshot) {
          lastSnapshot = snapshot;
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            saveDraftRef.current(getValuesRef.current(), activeTabRef.current);
          }, 3_000);
        }
      }, 1_000);

      const interval = setInterval(() => {
        saveDraftRef.current(getValuesRef.current(), activeTabRef.current);
      }, 30_000);

      return () => {
        clearInterval(interval);
        clearInterval(pollTimer);
        clearTimeout(debounceTimer);
        saveDraftRef.current(getValuesRef.current(), activeTabRef.current);
      };
    }, [enabled]);
  };

  return {
    draftSavedAt,
    restoreDraft,
    saveDraft,
    clearDraft,
    useAutoSave,
  };
}
