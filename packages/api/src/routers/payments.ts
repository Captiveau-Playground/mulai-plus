import { randomUUID } from "node:crypto";
import { and, db, eq } from "@better-auth-admin/db";
import { course, enrollment, paymentOrder } from "@better-auth-admin/db/schema/lms";
import { env } from "@better-auth-admin/env/server";
import { z } from "zod";
import { protectedProcedure, publicProcedure } from "../index";

const itemDetailSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: z.number().int(),
  quantity: z.number().int(),
});

const createOrderInput = z.object({
  tenant_id: z.string().uuid(),
  external_order_id: z.string(),
  amount: z.number().int().positive(),
  currency: z.string().min(1),
  customer_name: z.string().min(1),
  customer_email: z.string().email(),
  customer_phone: z.string().min(6),
  source_service: z.string().min(1),
  metadata: z.string().optional(),
  notes: z.string().optional(),
  item_details: z.array(itemDetailSchema).min(1),
  course_id: z.string().min(1),
  return_url: z.string().optional(),
});

function mapRemoteStatus(s?: string) {
  const x = (s || "").toLowerCase();
  if (x === "paid" || x === "settlement" || x === "capture" || x === "success") return "success";
  if (x === "pending") return "pending";
  if (x === "cancel") return "cancelled";
  if (x === "expire" || x === "expired" || x === "deny" || x === "failure" || x === "failed") return "failed";
  return "pending";
}

export const paymentsRouter = {
  create: protectedProcedure.input(createOrderInput).handler(async ({ input, context }) => {
    const id = randomUUID();

    await db.insert(paymentOrder).values({
      id,
      tenantId: input.tenant_id,
      externalOrderId: input.external_order_id,
      paymentNumber: null,
      amount: input.amount,
      currency: input.currency,
      customerName: input.customer_name,
      customerEmail: input.customer_email,
      customerPhone: input.customer_phone,
      sourceService: input.source_service,
      metadata: input.metadata,
      notes: input.notes,
      itemDetails: input.item_details.map((i) => JSON.stringify(i)),
      status: "pending",
      userId: context.session.user.id,
      courseId: input.course_id,
    });

    const res = await fetch(`${env.PAYMENT_API_URL}/api/v1/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.PAYMENT_API_KEY}`,
      },
      body: JSON.stringify({
        tenant_id: input.tenant_id,
        external_order_id: input.external_order_id,
        amount: input.amount,
        currency: input.currency,
        customer_name: input.customer_name,
        customer_email: input.customer_email,
        customer_phone: input.customer_phone,
        source_service: input.source_service,
        metadata: input.metadata,
        notes: input.notes,
        item_details: input.item_details,
        callbacks: input.return_url
          ? {
              finish: input.return_url,
              error: input.return_url,
              pending: input.return_url,
            }
          : undefined,
      }),
    });

    const rawBody = await res.text();
    if (!res.ok) {
      throw new Error(rawBody || "Failed to create payment order");
    }

    let json: Record<string, unknown> = {};
    try {
      json = rawBody ? (JSON.parse(rawBody) as Record<string, unknown>) : {};
    } catch {
      json = {};
    }

    const dataObj = (json?.data as Record<string, unknown>) ?? (json as Record<string, unknown>);

    const paymentNumberRaw =
      (dataObj?.payment_number as string | undefined) || (dataObj?.paymentNumber as string | undefined);
    const paymentNumber = typeof paymentNumberRaw === "string" && paymentNumberRaw.length > 0 ? paymentNumberRaw : null;

    function getByKeys(obj: Record<string, unknown>, keys: string[]) {
      for (const k of keys) {
        const v = obj[k];
        if (typeof v === "string" && v.length > 0) return v;
      }
      return undefined;
    }

    function walkFindString(obj: unknown, predicate: (s: string) => boolean): string | undefined {
      if (!obj) return undefined;
      if (typeof obj === "string") return predicate(obj) ? obj : undefined;
      if (Array.isArray(obj)) {
        for (const item of obj) {
          const found = walkFindString(item, predicate);
          if (found) return found;
        }
        return undefined;
      }
      if (typeof obj === "object") {
        for (const v of Object.values(obj as Record<string, unknown>)) {
          const found = walkFindString(v, predicate);
          if (found) return found;
        }
      }
      return undefined;
    }

    const snapTokenRaw = getByKeys(dataObj, ["snap_token", "snapToken", "token"]);
    const snapToken = typeof snapTokenRaw === "string" && /^[0-9A-Za-z-_]+$/.test(snapTokenRaw) ? snapTokenRaw : null;

    const directUrl =
      getByKeys(dataObj, [
        "snap_redirect_url",
        "snapRedirectUrl",
        "redirect_url",
        "redirectUrl",
        "payment_url",
        "paymentUrl",
        "deeplink_url",
        "deeplinkUrl",
      ]) ?? walkFindString(json, (s) => /^https?:\/\/\S+/.test(s));

    const baseFromToken = snapToken?.startsWith("SB")
      ? "https://app.sandbox.midtrans.com/snap/v4/redirection/"
      : "https://app.midtrans.com/snap/v4/redirection/";

    function isMidtransUrl(url: string) {
      try {
        const u = new URL(url);
        return /midtrans\.com$/.test(u.hostname) && u.pathname.includes("/snap/");
      } catch {
        return false;
      }
    }

    const paymentUrlCandidate =
      typeof directUrl === "string" && isMidtransUrl(directUrl)
        ? directUrl
        : snapToken
          ? `${baseFromToken}${snapToken}`
          : null;
    const paymentUrl =
      typeof paymentUrlCandidate === "string"
        ? paymentUrlCandidate.replace(/[`"\s]+$/g, "").replace(/^[`"\s]+/g, "")
        : null;

    const statusCandidate =
      getByKeys(dataObj, ["status", "payment_status", "order_status"]) ||
      (typeof (json as Record<string, unknown>).status === "string"
        ? ((json as Record<string, unknown>).status as string)
        : undefined);
    const status = mapRemoteStatus(statusCandidate);

    await db.update(paymentOrder).set({ paymentNumber, paymentUrl, status }).where(eq(paymentOrder.id, id));

    return {
      id,
      externalOrderId: input.external_order_id,
      paymentNumber,
      paymentUrl,
      status,
      snapToken,
      success: true,
      data: {
        payment_number: paymentNumber ?? "",
        snap_token: snapToken ?? undefined,
        snap_redirect_url: paymentUrl ?? undefined,
      },
    };
  }),
  cancel: protectedProcedure.input(z.object({ external_order_id: z.string() })).handler(async ({ input }) => {
    const res = await fetch(`${env.PAYMENT_API_URL}/orders/${input.external_order_id}/cancel`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.PAYMENT_API_KEY}`,
      },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || "Failed to cancel payment order");
    }
    await db
      .update(paymentOrder)
      .set({ status: "cancelled" })
      .where(eq(paymentOrder.externalOrderId, input.external_order_id));
    return { success: true };
  }),
  confirm: protectedProcedure.input(z.object({ external_order_id: z.string() })).handler(async ({ input, context }) => {
    const res = await fetch(`${env.PAYMENT_API_URL}/api/v1/payments/${input.external_order_id}/status`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${env.PAYMENT_API_KEY}`,
      },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || "Failed to fetch payment status");
    }
    const data = (await res.json()) as { status?: string };
    const status = mapRemoteStatus(data.status);
    await db.update(paymentOrder).set({ status }).where(eq(paymentOrder.externalOrderId, input.external_order_id));
    if (status === "success") {
      const order = await db
        .select()
        .from(paymentOrder)
        .where(eq(paymentOrder.externalOrderId, input.external_order_id))
        .limit(1);
      const courseId = order[0]?.courseId;
      const userId = context.session.user.id;
      if (courseId) {
        const existing = await db
          .select()
          .from(enrollment)
          .where(and(eq(enrollment.userId, userId), eq(enrollment.courseId, courseId)))
          .limit(1);
        if (!existing.length) {
          await db.insert(enrollment).values({
            id: randomUUID(),
            userId,
            courseId,
          });
        }
      }
    }
    return { status, success: true, data: { status } };
  }),
  status: protectedProcedure.input(z.object({ payment_number: z.string() })).handler(async ({ input, context }) => {
    const res = await fetch(`${env.PAYMENT_API_URL}/api/v1/payments/${input.payment_number}/status`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${env.PAYMENT_API_KEY}`,
      },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || "Failed to fetch payment status");
    }
    const data = (await res.json()) as { status?: string };
    const status = mapRemoteStatus(data.status);
    await db.update(paymentOrder).set({ status }).where(eq(paymentOrder.paymentNumber, input.payment_number));
    if (status === "success") {
      const order = await db
        .select()
        .from(paymentOrder)
        .where(eq(paymentOrder.paymentNumber, input.payment_number))
        .limit(1);
      const courseId = order[0]?.courseId;
      const userId = context.session.user.id;
      if (courseId) {
        const existing = await db
          .select()
          .from(enrollment)
          .where(and(eq(enrollment.userId, userId), eq(enrollment.courseId, courseId)))
          .limit(1);
        if (!existing.length) {
          await db.insert(enrollment).values({
            id: randomUUID(),
            userId,
            courseId,
          });
        }
      }
    }
    return { status, success: true, data: { status } };
  }),
  finish: publicProcedure
    .input(
      z.object({
        order_id: z.string().min(1),
        status_code: z.string().optional(),
        transaction_status: z.string().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const upstreamUrl = new URL(`${env.PAYMENT_API_URL}/api/v1/payments/finish`);
      upstreamUrl.searchParams.set("order_id", input.order_id);
      if (input.status_code) upstreamUrl.searchParams.set("status_code", input.status_code);
      if (input.transaction_status) upstreamUrl.searchParams.set("transaction_status", input.transaction_status);
      let finalStatus = mapRemoteStatus(input.transaction_status);
      try {
        const upstreamRes = await fetch(upstreamUrl.toString(), {
          method: "GET",
          headers: {
            Authorization: `Bearer ${env.PAYMENT_API_KEY}`,
            "Content-Type": "application/json",
          },
        });
        if (upstreamRes.ok) {
          const payload = (await upstreamRes.json()) as Record<string, unknown>;
          const s =
            (payload?.status as string | undefined) ||
            ((payload?.data as Record<string, unknown> | undefined)?.status as string | undefined) ||
            input.transaction_status ||
            "pending";
          finalStatus = mapRemoteStatus(s);
        }
      } catch {}
      try {
        const statusRes = await fetch(`${env.PAYMENT_API_URL}/api/v1/payments/${input.order_id}/status`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${env.PAYMENT_API_KEY}`,
          },
        });
        if (statusRes.ok) {
          const statusData = (await statusRes.json()) as { status?: string };
          if (statusData.status) {
            finalStatus = mapRemoteStatus(statusData.status);
          }
        }
      } catch {}
      const byNumber = await db
        .select()
        .from(paymentOrder)
        .where(eq(paymentOrder.paymentNumber, input.order_id))
        .limit(1);
      const orderRow =
        byNumber[0] ||
        (await db.select().from(paymentOrder).where(eq(paymentOrder.externalOrderId, input.order_id)).limit(1))[0];
      if (orderRow) {
        await db.update(paymentOrder).set({ status: finalStatus }).where(eq(paymentOrder.id, orderRow.id));
        if (finalStatus === "success") {
          const courseId = orderRow.courseId;
          const userId = orderRow.userId;
          if (courseId && userId) {
            const existing = await db
              .select()
              .from(enrollment)
              .where(and(eq(enrollment.userId, userId), eq(enrollment.courseId, courseId)))
              .limit(1);
            if (!existing.length) {
              await db.insert(enrollment).values({
                id: randomUUID(),
                userId,
                courseId,
              });
            }
          }
        }
      }
      return {
        success: true,
        order_id: input.order_id,
        mapped_status: finalStatus,
        data: { status: finalStatus },
      };
    }),
  myClasses: protectedProcedure.handler(async ({ context }) => {
    const items = await db
      .select({
        course: {
          id: course.id,
          title: course.title,
          slug: course.slug,
          description: course.description,
          thumbnailUrl: course.thumbnailUrl,
        },
      })
      .from(enrollment)
      .leftJoin(course, eq(enrollment.courseId, course.id))
      .where(eq(enrollment.userId, context.session.user.id));
    return items.flatMap((i) => (i.course ? [i.course] : []));
  }),
  checkEnrollment: protectedProcedure.input(z.object({ courseId: z.string() })).handler(async ({ input, context }) => {
    const existing = await db
      .select()
      .from(enrollment)
      .where(and(eq(enrollment.userId, context.session.user.id), eq(enrollment.courseId, input.courseId)))
      .limit(1);
    return { isEnrolled: existing.length > 0 };
  }),
  webhook: publicProcedure
    .input(
      z.object({
        transaction_status: z.string(),
        order_id: z.string(),
      }),
    )
    .handler(async ({ input }) => {
      const status = mapRemoteStatus(input.transaction_status);
      await db.update(paymentOrder).set({ status }).where(eq(paymentOrder.paymentNumber, input.order_id));
      if (status === "success") {
        const order = await db
          .select()
          .from(paymentOrder)
          .where(eq(paymentOrder.paymentNumber, input.order_id))
          .limit(1);
        const courseId = order[0]?.courseId;
        const userId = order[0]?.userId;
        if (courseId && userId) {
          const existing = await db
            .select()
            .from(enrollment)
            .where(and(eq(enrollment.userId, userId), eq(enrollment.courseId, courseId)))
            .limit(1);
          if (!existing.length) {
            await db.insert(enrollment).values({
              id: randomUUID(),
              userId,
              courseId,
            });
          }
        }
      }
      return { success: true };
    }),
};
