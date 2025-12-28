"use client";

import { useAuthorizePage } from "@/lib/auth-client";

import Dashboard from "./dashboard";

export default function DashboardPage() {
  const { isAuthorized, isLoading, user } = useAuthorizePage({
    dashboard: ["access"],
  });

  if (isLoading) return <div>Loading...</div>;

  if (!user) {
    // redirect("/login"); // Cannot use server redirect in client component easily, handled by hook or auth guard usually
    // For now, let's just return null or let the hook handle it (it usually redirects)
    return null;
  }

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Welcome {user.name}</p>
      <Dashboard />
    </div>
  );
}
