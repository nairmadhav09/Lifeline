import Link from "next/link";
import { Logo } from "@/components/brand/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-page-wash px-4">
      <header className="mx-auto flex w-full max-w-[1200px] items-center py-6">
        <Logo />
      </header>
      <main className="flex flex-1 items-start justify-center pt-[8vh] pb-16">{children}</main>
      <footer className="space-y-1.5 pb-8 text-center text-xs text-meta">
        <p>Never miss a payment, and always know where your money goes.</p>
        <p>
          <Link
            href="/privacy"
            className="underline-offset-2 hover:text-foreground hover:underline"
          >
            Privacy
          </Link>
          {" · "}
          <Link href="/terms" className="underline-offset-2 hover:text-foreground hover:underline">
            Terms
          </Link>
        </p>
      </footer>
    </div>
  );
}
