"use client";

import { useEffect, useState } from "react";

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

  // Restore draft on mount
  const restoreDraft = (): DraftState | null => {
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return null;
      const draft: DraftState = JSON.parse(raw);
      setDraftSavedAt(draft.savedAt);
      return draft;
    } catch {
      return null;
    }
  };

  // Save draft
  const saveDraft = (values: Record<string, unknown>, activeTab: string) => {
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
  };

  // Clear draft
  const clearDraft = () => {
    try {
      localStorage.removeItem(draftKey);
      setDraftSavedAt(null);
    } catch {
      // ignore
    }
  };

  // Auto-save on interval
  const useAutoSave = (getValues: () => Record<string, unknown>, activeTab: string, enabled: boolean) => {
    useEffect(() => {
      if (!enabled) return;
      const interval = setInterval(() => {
        const values = getValues();
        saveDraft(values, activeTab);
      }, 3000); // every 3 seconds
      return () => clearInterval(interval);
    }, [enabled, activeTab, getValues]);
  };

  return {
    draftSavedAt,
    restoreDraft,
    saveDraft,
    clearDraft,
    useAutoSave,
  };
}
