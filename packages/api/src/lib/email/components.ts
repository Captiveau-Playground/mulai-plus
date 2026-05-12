import { BRAND, COLORS, FONTS, RESPONSIVE_CSS } from "./config";

// ─── Base Layout ───────────────────────────────────────────────────────────

interface LayoutProps {
  title: string;
  children: string;
  bgColor?: string;
}

export function emailLayout({ title, children, bgColor = COLORS.background }: LayoutProps): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${title}</title>
  <!--[if mso]>
  <style type="text/css">
    table { border-collapse: collapse; }
    .column { display: inline-block; vertical-align: top; }
  </style>
  <![endif]-->
  <style type="text/css">${RESPONSIVE_CSS}</style>
</head>
<body style="margin: 0; padding: 0; background-color: ${bgColor}; -webkit-font-smoothing: antialiased; font-family: ${FONTS.family};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="wrapper" style="background-color: ${bgColor};">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" class="container" style="max-width: 600px; width: 100%; background-color: ${COLORS.white}; border-radius: 16px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);">
          ${children}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── Brand Header ──────────────────────────────────────────────────────────

export function emailHeader(): string {
  return `
    <tr>
      <td style="padding: 0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="height: 6px; background-color: ${COLORS.navy};"></td>
          </tr>
          <tr>
            <td style="padding: 0; background: linear-gradient(90deg, ${COLORS.navy} 0%, ${COLORS.orange} 100%); height: 3px;"></td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td align="center" style="padding: 36px 40px 24px 40px;">
        <img src="${BRAND.logoUrl}" alt="${BRAND.name}" width="120" height="34" style="display: block;" />
      </td>
    </tr>`;
}

// ─── Icon Circle (branded) ────────────────────────────────────────────────

interface IconCircleProps {
  bgColor?: string;
  icon: string;
  iconSize?: number;
  circleSize?: number;
}

export function iconCircle({ bgColor = COLORS.navy, icon, iconSize = 40, circleSize = 80 }: IconCircleProps): string {
  return `
    <tr>
      <td align="center" style="padding: 0 40px 20px 40px;">
        <table role="presentation" cellpadding="0" cellspacing="0">
          <tr>
            <td style="background-color: ${bgColor}; border-radius: 50%; width: ${circleSize}px; height: ${circleSize}px; text-align: center; vertical-align: middle;">
              <span style="display: inline-block; width: ${iconSize}px; height: ${iconSize}px; line-height: ${circleSize}px;">
                ${icon}
              </span>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
}

// ─── Heading ───────────────────────────────────────────────────────────────

interface HeadingProps {
  text: string;
  color?: string;
  align?: "center" | "left";
  size?: number;
}

export function heading({ text, color = COLORS.navy, align = "center", size = 26 }: HeadingProps): string {
  return `
    <tr>
      <td align="${align}" style="padding: 0 40px 12px 40px;">
        <h1 style="margin: 0; font-size: ${size}px; font-weight: 700; color: ${color}; line-height: 1.3;">
          ${text}
        </h1>
      </td>
    </tr>`;
}

// ─── Body Text ─────────────────────────────────────────────────────────────

interface TextProps {
  content: string;
  align?: "center" | "left";
  color?: string;
  size?: number;
  padding?: string;
  weight?: string;
}

export function text({
  content,
  align = "center",
  color = COLORS.textBody,
  size = 15,
  padding = "0 40px 24px 40px",
  weight = "normal",
}: TextProps): string {
  return `
    <tr>
      <td align="${align}" style="padding: ${padding};">
        <p style="margin: 0; font-size: ${size}px; color: ${color}; line-height: 1.7; font-weight: ${weight};${align === "center" ? " text-align: center;" : ""}">
          ${content}
        </p>
      </td>
    </tr>`;
}

// ─── CTA Button (navy brand) ──────────────────────────────────────────────

interface ButtonProps {
  href: string;
  label: string;
  bgColor?: string;
  textColor?: string;
}

export function ctaButton({ href, label, bgColor = COLORS.navy, textColor = COLORS.white }: ButtonProps): string {
  return `
    <tr>
      <td align="center" style="padding: 0 40px 32px 40px;">
        <table role="presentation" cellpadding="0" cellspacing="0" class="mobile-full-width">
          <tr>
            <td style="border-radius: 12px; background-color: ${bgColor};">
              <a href="${href}" style="display: inline-block; padding: 15px 36px; font-size: 15px; font-weight: 600; color: ${textColor}; text-decoration: none; text-align: center; font-family: ${FONTS.family}; border-radius: 12px;">
                ${label}
                <span style="display: inline-block; width: 16px; height: 16px; vertical-align: middle; margin-left: 8px;">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                    <polyline points="12 5 19 12 12 19"></polyline>
                  </svg>
                </span>
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
}

// ─── Info Card (branded) ──────────────────────────────────────────────────

interface InfoCardProps {
  children: string;
}

export function infoCard({ children }: InfoCardProps): string {
  return `
    <tr>
      <td style="padding: 0 40px 28px 40px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border-radius: 12px; border: 1px solid ${COLORS.border};">
          <tr>
            <td style="padding: 24px;">
              ${children}
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
}

// ─── Info Row ─────────────────────────────────────────────────────────────

interface InfoRowProps {
  label: string;
  value: string;
  valueColor?: string;
}

export function infoRow({ label, value, valueColor = COLORS.textPrimary }: InfoRowProps): string {
  return `
    <tr>
      <td style="padding: 10px 0; border-bottom: 1px solid ${COLORS.border};">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td>
              <p style="margin: 0; font-size: 13px; color: ${COLORS.textSubtle}; font-family: ${FONTS.family};">${label}</p>
            </td>
            <td align="right">
              <p style="margin: 0; font-size: 14px; font-weight: 600; color: ${valueColor}; font-family: ${FONTS.family};">${value}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
}

// ─── Notice Box ────────────────────────────────────────────────────────────

interface NoticeBoxProps {
  children: string;
  bgColor?: string;
  borderColor?: string;
  textColor?: string;
}

export function noticeBox({ children, bgColor = "#fef3c7", textColor = "#92400e" }: NoticeBoxProps): string {
  return `
    <tr>
      <td style="padding: 0 40px 28px 40px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: ${bgColor}; border-radius: 10px;">
          <tr>
            <td style="padding: 16px 20px; font-family: ${FONTS.family}; font-size: 14px; color: ${textColor}; line-height: 1.6;">
              ${children}
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
}

// ─── Step List (branded with navy/orange) ────────────────────────────────

interface StepItem {
  number: number;
  label: string;
  isActive?: boolean;
  isCompleted?: boolean;
}

export function stepList(steps: StepItem[]): string {
  const items = steps
    .map((step) => {
      const bgColor = step.isCompleted ? COLORS.orange : step.isActive ? COLORS.navy : "#e2e8f0";
      const textColor = "#ffffff";
      const labelColor = step.isCompleted || step.isActive ? COLORS.textPrimary : COLORS.textMuted;

      return `
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid ${COLORS.border};">
            <table role="presentation" cellpadding="0" cellspacing="0">
              <tr>
                <td style="vertical-align: middle; padding-right: 14px;">
                  <span style="display: inline-block; width: 28px; height: 28px; background-color: ${bgColor}; border-radius: 50%; text-align: center; line-height: 28px; font-size: 13px; font-weight: 700; color: ${textColor}; font-family: ${FONTS.family};">
                    ${step.isCompleted ? "✓" : step.number}
                  </span>
                </td>
                <td style="vertical-align: middle;">
                  <p style="margin: 0; font-size: 14px; color: ${labelColor}; font-family: ${FONTS.family}; font-weight: ${step.isActive ? "600" : "normal"};">
                    ${step.label}
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>`;
    })
    .join("");

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      ${items}
    </table>`;
}

// ─── Numbered List ────────────────────────────────────────────────────────

interface NumberedItem {
  number: number;
  text: string;
}

export function numberedList(items: NumberedItem[]): string {
  const rows = items
    .map(
      (item) => `
      <tr>
        <td style="padding-bottom: 10px;">
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr>
              <td style="vertical-align: top; padding-right: 14px;">
                <span style="display: inline-block; width: 26px; height: 26px; background-color: ${COLORS.navy}; border-radius: 50%; text-align: center; line-height: 26px; font-size: 12px; font-weight: 700; color: #ffffff; font-family: ${FONTS.family};">
                  ${item.number}
                </span>
              </td>
              <td style="font-family: ${FONTS.family}; font-size: 14px; color: ${COLORS.textBody}; line-height: 1.6;">
                ${item.text}
              </td>
            </tr>
          </table>
        </td>
      </tr>`,
    )
    .join("");

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>`;
}

// ─── Section Title (small heading inside cards) ───────────────────────────

export function sectionTitle(text: string): string {
  return `
    <p style="margin: 0 0 4px 0; font-size: 15px; font-weight: 600; color: ${COLORS.navy}; font-family: ${FONTS.family};">${text}</p>`;
}

// ─── Divider ───────────────────────────────────────────────────────────────

export function divider(): string {
  return `
    <tr>
      <td style="padding: 0 40px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="height: 1px; background-color: ${COLORS.borderLight};"></td>
          </tr>
        </table>
      </td>
    </tr>`;
}

// ─── Footer ────────────────────────────────────────────────────────────────

export function emailFooter(): string {
  return `
    <tr>
      <td style="padding: 24px 40px 32px 40px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="height: 1px; background-color: ${COLORS.borderLight};"></td>
          </tr>
        </table>
        <p style="margin: 20px 0 0 0; font-family: ${FONTS.family}; font-size: 13px; color: ${COLORS.textFooter}; line-height: 1.6; text-align: center;">
          Ada pertanyaan? Hubungi kami di
          <a href="mailto:${BRAND.supportEmail}" style="color: ${COLORS.navy}; text-decoration: underline; font-weight: 500;">${BRAND.supportEmail}</a>
        </p>
        <p style="margin: 6px 0 0 0; font-family: ${FONTS.family}; font-size: 12px; color: ${COLORS.textFooter}; text-align: center;">
          &copy; ${BRAND.year} ${BRAND.name}. All rights reserved.
        </p>
      </td>
    </tr>`;
}

// ─── Spacer ────────────────────────────────────────────────────────────────

export function spacer(height = 20): string {
  return `
    <tr>
      <td style="padding: 0; height: ${height}px;">&nbsp;</td>
    </tr>`;
}
