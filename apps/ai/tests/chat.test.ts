import { describe, expect, test } from "bun:test";
import { extractTopics, FALLBACK_REPLIES, SYSTEM_PROMPT } from "../src/chat/prompt";
import { stripThinking } from "../src/chat/responder";

describe("prompt", () => {
  test("system prompt berisi identitas MULAI+", () => {
    expect(SYSTEM_PROMPT).toContain("MULAI+");
    expect(SYSTEM_PROMPT).toContain("passing grade");
  });

  test("extractTopics mendeteksi kata kunci", () => {
    const topics = extractTopics("universitas negeri di Bandung");
    expect(topics.length).toBeGreaterThan(0);
    expect(topics).toContain("Cari universitas negeri");
  });

  test("fallback tersedia", () => {
    expect(FALLBACK_REPLIES.length).toBeGreaterThanOrEqual(1);
  });
});

describe("responder helpers", () => {
  test("stripThinking menghapus blok reasoning", () => {
    const raw =
      "Tentu! Basemantapkan\n\n" + "reasoning\n" + "<|start_header_id|>assistant<|end_header_id|>\n\nJawaban.";
    expect(stripThinking(raw)).toContain("Jawaban");
  });
});
