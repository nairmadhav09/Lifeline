import Link from "next/link";
import { Logo } from "@/components/brand/logo";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-page-wash px-4">
      <header className="mx-auto flex w-full max-w-[720px] items-center justify-between py-6">
        <Link
          href="/login"
          aria-label="Lifeline home"
          className="rounded-lg focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none"
        >
          <Logo />
        </Link>
        <nav aria-label="Legal" className="flex gap-4 text-sm">
          <Link href="/privacy" className="text-body hover:text-foreground">
            Privacy
          </Link>
          <Link href="/terms" className="text-body hover:text-foreground">
            Terms
          </Link>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-[720px] pb-16">
        <article className="surface p-6 sm:p-10 [&_h1]:text-page-title [&_h2]:mt-8 [&_h2]:mb-2 [&_h2]:text-section [&_li]:mt-1.5 [&_p]:mt-3 [&_p]:leading-relaxed [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5">
          {children}
        </article>
      </main>
    </div>
  );
}
