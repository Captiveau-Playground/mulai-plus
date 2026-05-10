export default function InternalLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <div className="grid h-svh grid-rows-[auto_1fr] overflow-x-hidden">{children}</div>;
}
