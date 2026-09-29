import { describe, expect, it } from "vitest";
import {
  badRequest,
  conflict,
  forbidden,
  notFound,
  preconditionFailed,
  tooManyRequests,
  unauthorized,
} from "../lib/errors";

describe("error helpers", () => {
  const cases = [
    { fn: notFound, code: "NOT_FOUND" },
    { fn: badRequest, code: "BAD_REQUEST" },
    { fn: unauthorized, code: "UNAUTHORIZED" },
    { fn: forbidden, code: "FORBIDDEN" },
    { fn: conflict, code: "CONFLICT" },
    { fn: preconditionFailed, code: "PRECONDITION_FAILED" },
    { fn: tooManyRequests, code: "TOO_MANY_REQUESTS" },
  ] as const;

  for (const { fn, code } of cases) {
    it(`${code} with custom message`, () => {
      try {
        fn("test message");
        expect.unreachable();
      } catch (e: any) {
        expect(e).toBeInstanceOf(Error);
        expect(e.code).toBe(code);
        expect(e.message).toBe("test message");
      }
    });

    it(`${code} with default message`, () => {
      try {
        (fn as () => never)();
        expect.unreachable();
      } catch (e: any) {
        expect(e).toBeInstanceOf(Error);
        expect(e.code).toBe(code);
      }
    });
  }
});
