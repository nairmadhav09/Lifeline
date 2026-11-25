import { Logo } from "@/components/brand/logo";

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-page-wash px-4">
      <header className="mx-auto flex w-full max-w-[1200px] items-center py-6">
        <Logo />
      </header>
      <main className="flex flex-1 justify-center pt-[4vh] pb-16">{children}</main>
    </div>
  );
}
