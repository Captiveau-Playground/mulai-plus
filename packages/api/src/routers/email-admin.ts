import { z } from "zod";
import { protectedProcedure } from "../index";
import {
  getApplicationAcceptedHtml,
  getApplicationRejectedHtml,
  getRegistrationSuccessHtml,
  getScholarshipOfferHtml,
} from "../lib/email";
import { unosend } from "../lib/unosend";

// ─── Template Registry ─────────────────────────────────────────────────────

interface TemplateDefinition {
  id: string;
  label: string;
  description: string;
  variables: {
    key: string;
    label: string;
    defaultValue: string;
  }[];
  render: (vars: Record<string, string>) => string;
}

const EMAIL_TEMPLATES: TemplateDefinition[] = [
  {
    id: "registration-success",
    label: "Pendaftaran Berhasil",
    description: "Dikirim saat user berhasil mendaftar program mentoring",
    variables: [
      { key: "name", label: "Nama User", defaultValue: "Budi Santoso" },
      { key: "programName", label: "Nama Program", defaultValue: "Mentoring Program 2026" },
      { key: "batchName", label: "Nama Batch", defaultValue: "Batch 1" },
    ],
    render: (vars) =>
      getRegistrationSuccessHtml({
        name: vars.name ?? "",
        programName: vars.programName ?? "",
        batchName: vars.batchName ?? "",
      }),
  },
  {
    id: "application-accepted",
    label: "Pendaftaran Diterima",
    description: "Dikirim saat pendaftaran user diterima",
    variables: [
      { key: "firstName", label: "Nama Depan", defaultValue: "Budi" },
      { key: "programName", label: "Nama Program", defaultValue: "Mentoring Program 2026" },
      { key: "startDate", label: "Tanggal Mulai", defaultValue: "1 Juni 2026" },
    ],
    render: (vars) =>
      getApplicationAcceptedHtml({
        firstName: vars.firstName ?? "",
        programName: vars.programName ?? "",
        startDate: vars.startDate ?? "",
      }),
  },
  {
    id: "application-rejected",
    label: "Pendaftaran Ditolak",
    description: "Dikirim saat pendaftaran user ditolak",
    variables: [
      { key: "firstName", label: "Nama Depan", defaultValue: "Budi" },
      { key: "programName", label: "Nama Program", defaultValue: "Mentoring Program 2026" },
      { key: "registrationId", label: "Nomor Pendaftaran", defaultValue: "REG-001" },
      { key: "rejectionReason", label: "Alasan Penolakan", defaultValue: "Kuota sudah penuh" },
    ],
    render: (vars) =>
      getApplicationRejectedHtml({
        firstName: vars.firstName ?? "",
        programName: vars.programName ?? "",
        registrationId: vars.registrationId ?? "",
        rejectionReason: vars.rejectionReason ?? "",
      }),
  },
  {
    id: "scholarship-offer",
    label: "Program Beasiswa Mentoring",
    description: "Dikirim ke peserta riset sebagai undangan program beasiswa mentoring gratis",
    variables: [
      { key: "firstName", label: "Nama Depan", defaultValue: "Budi" },
      { key: "registrationLink", label: "Link Pendaftaran", defaultValue: "https://mulaiplus.id/beasiswa" },
    ],
    render: (vars) =>
      getScholarshipOfferHtml({
        firstName: vars.firstName ?? "",
        registrationLink: vars.registrationLink ?? "",
      }),
  },
];

// ─── Helpers ───────────────────────────────────────────────────────────────

function populateDefaults(vars: Record<string, string>, template: TemplateDefinition) {
  const result: Record<string, string> = {};
  for (const v of template.variables) {
    result[v.key] = vars[v.key] ?? v.defaultValue;
  }
  return result;
}

// ─── Router ────────────────────────────────────────────────────────────────

export const emailAdminRouter = {
  /** List all available email templates with their variable definitions */
  listTemplates: protectedProcedure.handler(async () => {
    return EMAIL_TEMPLATES.map((t) => ({
      id: t.id,
      label: t.label,
      description: t.description,
      variables: t.variables,
    }));
  }),

  /** Render a template with provided variables and return the HTML preview */
  renderPreview: protectedProcedure
    .input(
      z.object({
        templateId: z.string(),
        variables: z.record(z.string(), z.string()).optional(),
      }),
    )
    .handler(async ({ input }) => {
      const template = EMAIL_TEMPLATES.find((t) => t.id === input.templateId);
      if (!template) throw new Error(`Template "${input.templateId}" not found`);

      const vars = populateDefaults(input.variables ?? ({} as Record<string, string>), template);
      const html = template.render(vars);

      // Return stripped version with only body content for iframe preview
      const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
      const bodyContent = bodyMatch ? bodyMatch[1] : html;

      return {
        html,
        bodyContent,
        renderedWith: vars,
      };
    }),

  /** Send a rendered template as a test email */
  sendTemplate: protectedProcedure
    .input(
      z.object({
        templateId: z.string(),
        to: z.string().email(),
        variables: z.record(z.string(), z.string()).optional(),
        subject: z.string().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const template = EMAIL_TEMPLATES.find((t) => t.id === input.templateId);
      if (!template) throw new Error(`Template "${input.templateId}" not found`);

      const vars = populateDefaults(input.variables ?? ({} as Record<string, string>), template);
      const html = template.render(vars);

      // Build subject from template type
      const subject =
        input.subject ??
        {
          "registration-success": "Pendaftaran Berhasil — MULAI+",
          "application-accepted": "Selamat! Pendaftaran Diterima — MULAI+",
          "application-rejected": "Pendaftaran Ditolak — MULAI+",
          "scholarship-offer": "Program Beasiswa Mentoring Gratis — MULAI+",
        }[input.templateId] ??
        "Pesan dari MULAI+";

      const result = await unosend.send({
        to: input.to,
        subject,
        html,
      });

      if (!result.success) {
        throw new Error(result.error?.message || result.error?.error || "Failed to send email");
      }

      return {
        success: true,
        emailId: result.data?.id,
        sentTo: input.to,
        subject,
      };
    }),

  /** Send a rendered template to multiple recipients (batch) */
  sendBatch: protectedProcedure
    .input(
      z.object({
        templateId: z.string(),
        recipients: z.array(
          z.object({
            to: z.string().email(),
            variables: z.record(z.string(), z.string()).optional(),
          }),
        ),
        subject: z.string().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const template = EMAIL_TEMPLATES.find((t) => t.id === input.templateId);
      if (!template) throw new Error(`Template "${input.templateId}" not found`);

      const defaultSubject =
        input.subject ??
        {
          "registration-success": "Pendaftaran Berhasil — MULAI+",
          "application-accepted": "Selamat! Pendaftaran Diterima — MULAI+",
          "application-rejected": "Pendaftaran Ditolak — MULAI+",
          "scholarship-offer": "Program Beasiswa Mentoring Gratis — MULAI+",
        }[input.templateId] ??
        "Pesan dari MULAI+";

      const items = input.recipients.map((r) => {
        const vars = populateDefaults(r.variables ?? ({} as Record<string, string>), template);
        const html = template.render(vars);
        return {
          to: r.to,
          subject: defaultSubject,
          html,
        };
      });

      const results = await unosend.emails.sendBatch(items, 10);

      const successCount = results.filter((r) => r.success).length;
      const failCount = results.filter((r) => !r.success).length;

      return {
        success: true,
        total: results.length,
        sent: successCount,
        failed: failCount,
        results: results.map((r, i) => ({
          index: r.index,
          email: input.recipients[i]?.to,
          success: r.success,
          error: r.error?.message || r.error?.error || null,
        })),
      };
    }),

  /** Get unosend account/email statistics */
  getStats: protectedProcedure.handler(async () => {
    try {
      const templates = await unosend.templates.list();
      return {
        templateCount: templates.success ? (templates.data ?? []).length : null,
        unosendConfigured: true,
        message: "Untuk statistik lengkap (delivery, open, click), buka dashboard Unosend di https://app.unosend.co",
      };
    } catch {
      return {
        templateCount: null,
        unosendConfigured: false,
        message: "Unosend tidak terkonfigurasi atau API key tidak valid.",
      };
    }
  }),
};
