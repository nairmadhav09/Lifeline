import { Logo } from "@/components/brand/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-page-wash px-4">
      <header className="mx-auto flex w-full max-w-[1200px] items-center py-6">
        <Logo />
      </header>
      <main className="flex flex-1 items-start justify-center pt-[8vh] pb-16">{children}</main>
      <footer className="pb-8 text-center text-xs text-meta">
        Never miss a payment, and always know where your money goes.
      </footer>
    </div>
  );
}
