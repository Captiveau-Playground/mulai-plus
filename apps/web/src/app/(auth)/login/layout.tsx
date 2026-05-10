export default function LoginLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <div className="grid h-svh grid-rows-[auto_1fr]">{children}</div>;
}
