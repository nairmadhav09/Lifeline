import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CategoriesManager } from "@/components/features/settings/categories-manager";
import { DangerZone } from "@/components/features/settings/danger-zone";
import { DataExport } from "@/components/features/settings/data-export";
import { ProfileForm } from "@/components/features/settings/profile-form";
import { SettingsSection } from "@/components/features/settings/settings-section";
import { PageHeader } from "@/components/shared/page-header";
import { getCategories } from "@/lib/data/categories";
import { getProfile } from "@/lib/data/profile";
import { createClient, getUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const [user, profile, categories] = await Promise.all([getUser(), getProfile(), getCategories()]);
  if (!user || !profile) redirect("/login");

  const supabase = await createClient();
  const { data: tasks } = await supabase
    .from("tasks")
    .select("category_id")
    .eq("is_archived", false);
  const counts: Record<string, number> = {};
  for (const t of tasks ?? [])
    if (t.category_id) counts[t.category_id] = (counts[t.category_id] ?? 0) + 1;

  return (
    <>
      <PageHeader title="Settings" description="Your profile, preferences, categories and data." />
      <div className="space-y-6">
        <SettingsSection
          title="Profile & preferences"
          description="How Lifeline greets you, and how money and dates are shown."
        >
          <ProfileForm
            email={user.email ?? ""}
            initial={{
              displayName: profile.display_name ?? "",
              currency: profile.currency,
              timezone: profile.timezone,
              monthlyBudget: profile.monthly_budget === null ? "" : String(profile.monthly_budget),
            }}
          />
        </SettingsSection>

        <SettingsSection
          title="Categories"
          description="Group your bills. Rename, recolor or add your own."
        >
          <CategoriesManager categories={categories} counts={counts} />
        </SettingsSection>

        <SettingsSection title="Your data" description="Download everything you've tracked.">
          <DataExport />
        </SettingsSection>

        <SettingsSection title="Danger zone" description="Permanent actions." tone="danger">
          <DangerZone email={user.email ?? ""} />
        </SettingsSection>
      </div>
    </>
  );
}
