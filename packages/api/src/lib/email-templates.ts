/**
 * Backward-compatible re-exports.
 *
 * The email template system has been refactored into modular files under ./email/.
 * This file re-exports everything for backward compatibility.
 *
 * New imports should use:
 *   import { getRegistrationSuccessHtml } from "./email";
 *   import { getApplicationAcceptedHtml } from "./email";
 *   import { getApplicationRejectedHtml } from "./email";
 *
 * See ./email/README.md for full documentation.
 */

export { getApplicationAcceptedHtml } from "./email/templates/application-accepted";
export { getApplicationRejectedHtml } from "./email/templates/application-rejected";
export { getRegistrationSuccessHtml } from "./email/templates/registration-success";
export { getScholarshipOfferHtml } from "./email/templates/scholarship-offer";
