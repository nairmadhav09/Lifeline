import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { SIDEBAR_COOKIE } from "@/components/layout/nav-config";
import type { ShellUser } from "@/components/layout/types";
import { getCategories } from "@/lib/data/categories";
import { getNotifications, hasAnyTasks } from "@/lib/data/notifications";
import { getProfile } from "@/lib/data/profile";
import { getUser } from "@/lib/supabase/server";
import { todayInTz } from "@/lib/utils/dates";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Reading cookies first opts every authenticated page into per-request rendering.
  const cookieStore = await cookies();

  // proxy.ts already guards these routes; this is defence in depth.
  const user = await getUser();
  if (!user) redirect("/login");

  const collapsed = cookieStore.get(SIDEBAR_COOKIE)?.value === "1";

  const [profile, categories] = await Promise.all([getProfile(), getCategories()]);
  const today = todayInTz(profile?.timezone ?? "UTC");

  // First run: new users go through onboarding. Anyone who already has bills
  // (e.g. seeded or pre-onboarding accounts) is never forced back into it.
  if (profile && !profile.onboarding_completed && !(await hasAnyTasks())) {
    redirect("/onboarding");
  }

  const notifications = await getNotifications(today);
  const meta = user.user_metadata as Record<string, unknown>;
  const email = user.email ?? "";
  const shellUser: ShellUser = {
    name:
      profile?.display_name ||
      (typeof meta.full_name === "string" && meta.full_name) ||
      (typeof meta.name === "string" && meta.name) ||
      email.split("@")[0] ||
      "You",
    email,
    avatarUrl: typeof meta.avatar_url === "string" ? meta.avatar_url : null,
  };

  return (
    <AppShell
      user={shellUser}
      defaultCollapsed={collapsed}
      categories={categories}
      currency={profile?.currency ?? "USD"}
      today={today}
      notifications={notifications}
    >
      {children}
    </AppShell>
  );
}
