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
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" class="container" style="max-width: 600px; width: 100%; background-color: ${COLORS.white}; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
          ${children}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── Header / Logo ─────────────────────────────────────────────────────────

export function emailHeader(): string {
  return `
    <tr>
      <td align="center" style="padding: 40px 40px 24px 40px;">
        <img src="${BRAND.logoUrl}" alt="${BRAND.name}" width="140" height="40" style="display: block;" />
      </td>
    </tr>`;
}

// ─── Icon Circle ───────────────────────────────────────────────────────────

interface IconCircleProps {
  bgColor?: string;
  icon: string; // SVG markup
  iconSize?: number;
}

export function iconCircle({ bgColor = COLORS.greenLight, icon, iconSize = 48 }: IconCircleProps): string {
  return `
    <tr>
      <td align="center" style="padding: 0 40px 24px 40px;">
        <table role="presentation" cellpadding="0" cellspacing="0">
          <tr>
            <td style="background-color: ${bgColor}; border-radius: 50%; padding: 20px;">
              <span style="display: block; width: ${iconSize}px; height: ${iconSize}px;">
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

export function heading({ text, color = COLORS.textPrimary, align = "center", size = 28 }: HeadingProps): string {
  return `
    <tr>
      <td align="${align}" style="padding: 0 40px 16px 40px;">
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
}

export function text({
  content,
  align = "center",
  color = COLORS.textBody,
  size = 16,
  padding = "0 40px 24px 40px",
}: TextProps): string {
  return `
    <tr>
      <td align="${align}" style="padding: ${padding};">
        <p style="margin: 0; font-size: ${size}px; color: ${color}; line-height: 1.6;${align === "center" ? " text-align: center;" : ""}">
          ${content}
        </p>
      </td>
    </tr>`;
}

// ─── CTA Button ────────────────────────────────────────────────────────────

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
            <td style="border-radius: 8px; background-color: ${bgColor};">
              <a href="${href}" style="display: inline-block; padding: 16px 32px; font-size: 14px; font-weight: 600; color: ${textColor}; text-decoration: none; text-align: center; font-family: ${FONTS.family};">
                ${label}
                <span style="display: inline-block; width: 16px; height: 16px; vertical-align: middle; margin-left: 6px;">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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

// ─── Outline Button ────────────────────────────────────────────────────────

interface OutlineButtonProps {
  href: string;
  label: string;
  textColor?: string;
  borderColor?: string;
}

export function outlineButton({
  href,
  label,
  textColor = COLORS.textMuted,
  borderColor = COLORS.borderLight,
}: OutlineButtonProps): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" class="mobile-full-width">
      <tr>
        <td style="border-radius: 8px; border: 2px solid ${borderColor};">
          <a href="${href}" style="display: inline-block; padding: 14px 28px; font-size: 15px; font-weight: 600; color: ${textColor}; text-decoration: none; border-radius: 6px; font-family: ${FONTS.family};">
            ${label}
          </a>
        </td>
      </tr>
    </table>`;
}

// ─── Info Card ─────────────────────────────────────────────────────────────

interface InfoCardProps {
  children: string;
  borderColor?: string;
  bgColor?: string;
}

export function infoCard({ children, borderColor = COLORS.border, bgColor = "#f8fafc" }: InfoCardProps): string {
  return `
    <tr>
      <td style="padding: 0 40px 32px 40px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: ${bgColor}; border-radius: 12px; border: 1px solid ${borderColor};">
          <tr>
            <td style="padding: 24px;">
              ${children}
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
}

// ─── Info Row (label + value) ──────────────────────────────────────────────

interface InfoRowProps {
  label: string;
  value: string;
  valueColor?: string;
  iconSvg?: string;
}

export function infoRow({ label, value, valueColor = COLORS.textPrimary, iconSvg }: InfoRowProps): string {
  const iconCell = iconSvg
    ? `
      <td style="vertical-align: top; padding-right: 12px;">
        <span style="display: inline-block; width: 20px; height: 20px;">
          ${iconSvg}
        </span>
      </td>`
    : "";

  return `
    <tr>
      <td style="padding: 8px 0; border-bottom: 1px solid ${COLORS.border};">
        <table role="presentation" cellpadding="0" cellspacing="0">
          <tr>
            ${iconCell}
            <td style="vertical-align: middle;">
              <p style="margin: 0; font-size: 14px; color: ${COLORS.textSubtle}; font-family: ${FONTS.family};">${label}</p>
              <p style="margin: 4px 0 0 0; font-size: 16px; font-weight: 600; color: ${valueColor}; font-family: ${FONTS.family};">${value}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
}

// ─── Notice / Alert Box ────────────────────────────────────────────────────

interface NoticeBoxProps {
  children: string;
  bgColor?: string;
  borderColor?: string;
  textColor?: string;
  iconSvg?: string;
}

export function noticeBox({
  children,
  bgColor = COLORS.warningBg,
  borderColor = COLORS.warningBorder,
  textColor = COLORS.warningText,
  iconSvg,
}: NoticeBoxProps): string {
  const iconCell = iconSvg
    ? `
      <td style="vertical-align: top; padding-right: 12px;">
        <span style="display: block; width: 20px; height: 20px;">
          ${iconSvg}
        </span>
      </td>`
    : "";

  return `
    <tr>
      <td style="padding: 0 40px 32px 40px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: ${bgColor}; border-radius: 8px; border-left: 4px solid ${borderColor};">
          <tr>
            <td style="padding: 16px 20px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  ${iconCell}
                  <td style="font-family: ${FONTS.family}; font-size: 14px; color: ${textColor}; line-height: 1.5;">
                    ${children}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
}

// ─── Step List ─────────────────────────────────────────────────────────────

interface StepItem {
  number: number;
  label: string;
  isActive?: boolean;
  isCompleted?: boolean;
}

export function stepList(steps: StepItem[]): string {
  const items = steps
    .map((step) => {
      const bgColor = step.isCompleted ? COLORS.greenLight : step.isActive ? COLORS.greenLight : "#e2e8f0";
      const textColor = step.isCompleted || step.isActive ? COLORS.greenDark : COLORS.textSubtle;
      const labelColor = step.isCompleted || step.isActive ? COLORS.textBody : COLORS.textMuted;
      const checkmark = step.isCompleted
        ? `<span style="display: inline-block; width: 16px; height: 16px;">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${COLORS.greenDark}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </span>`
        : "";

      return `
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid ${COLORS.border};">
            <table role="presentation" cellpadding="0" cellspacing="0">
              <tr>
                <td style="vertical-align: top; padding-right: 12px;">
                  <span style="display: inline-block; width: 24px; height: 24px; background-color: ${bgColor}; border-radius: 50%; text-align: center; line-height: 24px; font-size: 12px; font-weight: 600; color: ${textColor};">
                    ${step.isCompleted ? "" : step.number}
                  </span>
                </td>
                <td style="vertical-align: middle; font-family: ${FONTS.family};">
                  <p style="margin: 0; font-size: 14px; color: ${labelColor};">
                    ${step.label}
                  </p>
                </td>
                ${step.isCompleted ? `<td style="vertical-align: middle; text-align: right; padding-left: 12px;">${checkmark}</td>` : ""}
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

// ─── Numbered List (inline) ────────────────────────────────────────────────

interface NumberedItem {
  number: number;
  text: string;
}

export function numberedList(items: NumberedItem[], accentColor = COLORS.greenDark): string {
  const rows = items
    .map(
      (item) => `
      <tr>
        <td style="padding-bottom: 12px;">
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr>
              <td style="vertical-align: top; padding-right: 12px;">
                <span style="display: inline-block; width: 24px; height: 24px; background-color: ${COLORS.greenLight}; border-radius: 50%; text-align: center; line-height: 24px; font-size: 12px; font-weight: 600; color: ${accentColor}; font-family: ${FONTS.family};">
                  ${item.number}
                </span>
              </td>
              <td style="font-family: ${FONTS.family}; font-size: 15px; color: ${COLORS.textMuted}; line-height: 1.5;">
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
      <td style="padding: 24px 40px;">
        <p style="margin: 0 0 8px 0; font-family: ${FONTS.family}; font-size: 14px; color: ${COLORS.textFooter}; line-height: 1.6; text-align: center;">
          Jika kamu memiliki pertanyaan, hubungi kami di
          <a href="mailto:${BRAND.supportEmail}" style="color: ${COLORS.navy}; text-decoration: none;">${BRAND.supportEmail}</a>
        </p>
        <p style="margin: 0; font-family: ${FONTS.family}; font-size: 14px; color: ${COLORS.textFooter}; text-align: center;">
          &copy; ${BRAND.year} ${BRAND.name}. All rights reserved.
        </p>
      </td>
    </tr>`;
}

// ─── Spacer ────────────────────────────────────────────────────────────────

export function spacer(height = 24): string {
  return `
    <tr>
      <td style="padding: 0; height: ${height}px;">&nbsp;</td>
    </tr>`;
}
