import { useTheme } from "next-themes";
import type { ToasterProps } from "sonner";
import { Toaster as Sonner } from "sonner";

/**
 * Toast global MULAI+ — gaya Vercel/Goey: sunken, top-center, radius besar,
 * palet brand (navy/success-teal/error-red/warning-orange/info-navy).
 * Semua pemanggilan `sonner` di aplikasi otomatis kena style ini.
 */
const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      position="top-center"
      offset={16}
      mobileOffset={16}
      gap={10}
      visibleToasts={4}
      closeButton
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",

          // ── Success — Teal (mentor) ──
          "--success-bg": "#f0fdfa",
          "--success-border": "#0d9488",
          "--success-text": "#065f46",

          // ── Error — Brand Red ──
          "--error-bg": "#fff1f2",
          "--error-border": "#f93447",
          "--error-text": "#9f1239",

          // ── Warning — Brand Orange ──
          "--warning-bg": "#fff7ed",
          "--warning-border": "#fe9114",
          "--warning-text": "#9a3412",

          // ── Info — Brand Navy ──
          "--info-bg": "#eef2ff",
          "--info-border": "#1a1f6d",
          "--info-text": "#1e1b4b",

          "--width": "380px",
          "--border-radius": "16px",
        } as React.CSSProperties
      }
      toastOptions={{
        className: "font-manrope",
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-xl group-[.toaster]:p-4 group-[.toaster]:rounded-2xl backdrop-blur-md",
          title: "text-sm font-semibold tracking-tight",
          description: "text-xs text-muted-foreground leading-relaxed",
          actionButton:
            "group-[.toast]:bg-brand-navy group-[.toast]:text-white group-[.toast]:rounded-full group-[.toast]:px-3 group-[.toast]:py-1 group-[.toast]:font-medium group-[.toast]:hover:opacity-90",
          cancelButton:
            "group-[.toast]:bg-transparent group-[.toast]:text-muted-foreground group-[.toast]:rounded-full group-[.toast]:px-3 group-[.toast]:py-1 group-[.toast]:hover:bg-gray-100",
          closeButton:
            "group-[.toast]:bg-white/80 group-[.toast]:border-gray-200 group-[.toast]:shadow-sm group-[.toast]:hover:bg-gray-50 group-[.toast]:size-6 group-[.toast]:rounded-full",
          icon: "group-[.toast]:size-4 group-[.toast]:shrink-0",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
