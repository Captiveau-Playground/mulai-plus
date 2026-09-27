export type UserContext = {
  school?: string;
  level?: string;
  riasecPrimary?: string;
  goals?: string[];
  prefs?: { targetMajor?: string[] };
  applications?: { programId: string; status: string }[];
} | null;
