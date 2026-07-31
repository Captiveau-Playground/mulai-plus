import { ORPCError } from "@orpc/server";

export function notFound(message = "Resource not found"): never {
  throw new ORPCError("NOT_FOUND", { message });
}

export function badRequest(message: string): never {
  throw new ORPCError("BAD_REQUEST", { message });
}

export function unauthorized(message = "Unauthorized"): never {
  throw new ORPCError("UNAUTHORIZED", { message });
}

export function forbidden(message = "Forbidden"): never {
  throw new ORPCError("FORBIDDEN", { message });
}

export function conflict(message: string): never {
  throw new ORPCError("CONFLICT", { message });
}

export function preconditionFailed(message: string): never {
  throw new ORPCError("PRECONDITION_FAILED", { message });
}

export function tooManyRequests(message = "Too many requests"): never {
  throw new ORPCError("TOO_MANY_REQUESTS", { message });
}
