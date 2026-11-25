import type { Metadata } from "next";
import { LoginCard } from "@/components/features/auth/login-card";
import { isSupabaseConfigured } from "@/lib/env";

export const metadata: Metadata = { title: "Sign in" };

const ERROR_MESSAGES: Record<string, string> = {
  link_invalid: "That sign-in link has expired or was already used. Request a new one below.",
  oauth_failed: "We couldn't connect to Google. Please try again.",
  not_configured: "Supabase isn't configured yet.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;

  return (
    <LoginCard
      next={next}
      errorMessage={
        error ? (ERROR_MESSAGES[error] ?? "Something went wrong. Please try again.") : undefined
      }
      configured={isSupabaseConfigured()}
    />
  );
}
