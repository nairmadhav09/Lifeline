import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { OnboardingFlow } from "@/components/features/onboarding/onboarding-flow";
import { getProfile } from "@/lib/data/profile";
import { getUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Welcome" };

export default async function OnboardingPage() {
  const [user, profile] = await Promise.all([getUser(), getProfile()]);
  if (!user) redirect("/login");
  if (profile?.onboarding_completed) redirect("/dashboard");

  const meta = user.user_metadata as Record<string, unknown>;
  const name =
    profile?.display_name ||
    (typeof meta.full_name === "string" ? meta.full_name : "") ||
    (user.email?.split("@")[0] ?? "");

  return <OnboardingFlow initialName={name} initialCurrency={profile?.currency ?? "USD"} />;
}
