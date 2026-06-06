import { CircleCheckIcon, InfoIcon, Loader2Icon, OctagonXIcon, TriangleAlertIcon } from "lucide-react";
import { useTheme } from "next-themes";
import type { ToasterProps } from "sonner";
import { Toaster as Sonner } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      closeButton
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",

          // ── Success — Teal / Mentor brand ──
          "--success-bg": "#ecfdf5",
          "--success-border": "#0d9488",
          "--success-text": "#065f46",

          // ── Error — Brand Red ──
          "--error-bg": "#fef2f2",
          "--error-border": "#f93447",
          "--error-text": "#991b1b",

          // ── Warning — Brand Orange ──
          "--warning-bg": "#fff7ed",
          "--warning-border": "#fe9114",
          "--warning-text": "#9a3412",

          // ── Info — Brand Navy ──
          "--info-bg": "#eef2ff",
          "--info-border": "#1a1f6d",
          "--info-text": "#1e1b4b",

          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        className: "font-manrope",
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg group-[.toaster]:p-4",
          title: "text-sm font-semibold",
          description: "text-xs text-muted-foreground",
          closeButton:
            "group-[.toast]:bg-white group-[.toast]:border-gray-200 group-[.toast]:shadow-sm group-[.toast]:hover:bg-gray-50",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
