export interface UserContext {
  school?: string;
  level?: string;
  riasecPrimary?: string;
  riasecCode?: string;
  isTmbTested?: boolean;
  goals?: string[];
  prefs?: Record<string, unknown>;
  applications?: { programId?: string; status?: string }[];
}
