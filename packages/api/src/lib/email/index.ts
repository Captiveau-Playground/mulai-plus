/**
 * Email template system.
 *
 * Each template is a pure function that returns an HTML string.
 * Shared components live in ./components.ts, brand config in ./config.ts.
 *
 * Usage:
 *   import { getRegistrationSuccessHtml } from "./email";
 *   const html = getRegistrationSuccessHtml({ name: "...", programName: "...", batchName: "..." });
 */

export { getApplicationAcceptedHtml } from "./templates/application-accepted";
export { getApplicationRejectedHtml } from "./templates/application-rejected";
export type { NewsletterTemplate } from "./templates/newsletter";
export { getNewsletterTemplateList, NEWSLETTER_TEMPLATES } from "./templates/newsletter";
export { getRegistrationSuccessHtml } from "./templates/registration-success";
export { getScholarshipOfferHtml } from "./templates/scholarship-offer";
