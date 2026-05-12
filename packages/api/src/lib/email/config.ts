/**
 * Brand configuration for email templates.
 * Matches the MULAI+ design system.
 */

export const BRAND = {
  name: "MULAI+",
  supportEmail: "hello@mulaiplus.id",
  dashboardUrl: "https://mulaiplus.id",
  homeUrl: "https://mulaiplus.id",
  logoUrl: "https://mulaiplus.id/light-type-logo.svg",
  year: new Date().getFullYear(),
} as const;

export const COLORS = {
  /** Primary brand - Navy */
  navy: "#1A1F6D",
  navyLight: "#272C75",
  /** Accent - Orange */
  orange: "#FE9114",
  /** Accent - Red */
  red: "#F93447",
  /** Status colors */
  green: "#22c55e",
  greenLight: "#dcfce7",
  greenDark: "#16a34a",
  /** Neutrals */
  textPrimary: "#1a1a1a",
  textBody: "#333333",
  textMuted: "#666666",
  textSubtle: "#64748b",
  textFooter: "#9ca3af",
  background: "#f4f4f4",
  white: "#ffffff",
  border: "#e2e8f0",
  borderLight: "#e5e7eb",
  /** Info */
  infoBg: "#f0f9ff",
  infoText: "#0369a1",
  /** Warning */
  warningBg: "#fef3c7",
  warningBorder: "#f59e0b",
  warningText: "#92400e",
  /** Rejection */
  rejectionBg: "#fef2f2",
  rejectionText: "#dc2626",
} as const;

export const FONTS = {
  family: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
} as const;

/** Shared responsive CSS injected into every email */
export const RESPONSIVE_CSS = `
  @media only screen and (max-width: 600px) {
    .wrapper { width: 100% !important; }
    .container { width: 100% !important; padding: 20px !important; }
    .column { display: block !important; width: 100% !important; }
    .mobile-center { text-align: center !important; }
    .mobile-padding { padding-left: 20px !important; padding-right: 20px !important; }
    .mobile-stack { display: block !important; width: 100% !important; margin-bottom: 20px !important; }
    .mobile-hide { display: none !important; }
    .mobile-full-width { width: 100% !important; }
    .button-td { display: block !important; width: 100% !important; }
    .button-a { display: block !important; width: 100% !important; text-align: center !important; }
    h1 { font-size: 24px !important; line-height: 1.3 !important; }
    h2 { font-size: 20px !important; line-height: 1.3 !important; }
  }
`;
