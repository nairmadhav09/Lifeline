import type { Metadata } from "next";

export const metadata: Metadata = { title: "Terms of service" };

const UPDATED = "November 26, 2026";

export default function TermsPage() {
  return (
    <>
      <h1>Terms of service</h1>
      <p className="text-sm text-meta">Last updated {UPDATED}</p>

      <p>By creating an account or using Lifeline, you agree to these terms.</p>

      <h2>What Lifeline is</h2>
      <p>
        Lifeline is a free personal tool for tracking bills and payments you make on a schedule. It
        does not make payments, connect to your bank, or move money. Marking a bill as paid only
        records that you paid it.
      </p>

      <h2>Your responsibilities</h2>
      <ul>
        <li>Keep access to your email or Google account secure, since it is how you sign in.</li>
        <li>
          Lifeline is a reminder and record-keeping aid. You remain responsible for paying your
          bills on time and for checking amounts and due dates with the companies you pay.
        </li>
        <li>
          Don&apos;t use Lifeline for anything unlawful or to upload content you have no right to
          store.
        </li>
      </ul>

      <h2>Your data</h2>
      <p>
        You own the information you put into Lifeline. You can export it or delete your account at
        any time from Settings. See the{" "}
        <a href="/privacy" className="text-primary underline">
          privacy policy
        </a>{" "}
        for how it is handled.
      </p>

      <h2>No warranty</h2>
      <p>
        Lifeline is provided &ldquo;as is&rdquo;, without warranties of any kind. It may
        occasionally be unavailable, and features may change. To the extent the law allows, Lifeline
        is not liable for missed payments, late fees or other losses arising from its use.
      </p>

      <h2>Ending your use</h2>
      <p>
        You can stop using Lifeline and delete your account at any time. Accounts used to abuse the
        service may be suspended.
      </p>

      <h2>Changes</h2>
      <p>
        These terms may be updated. The date at the top shows the latest version, and continuing to
        use Lifeline after a change means you accept it.
      </p>
    </>
  );
}
