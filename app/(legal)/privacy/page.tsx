import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy policy" };

const UPDATED = "November 26, 2026";

export default function PrivacyPage() {
  return (
    <>
      <h1>Privacy policy</h1>
      <p className="text-sm text-meta">Last updated {UPDATED}</p>

      <p>
        Lifeline helps you keep track of bills and other payments you make on a schedule. This page
        explains what information Lifeline stores, why, and the choices you have.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>Account details:</strong> your email address and, if you sign in with Google, the
          name and profile picture Google shares. We never see your Google password.
        </li>
        <li>
          <strong>What you enter:</strong> the bills you track (names, payees, amounts, due dates,
          categories, notes), payments you mark as paid, and your preferences such as currency,
          timezone and monthly budget.
        </li>
        <li>
          <strong>Files you upload:</strong> receipts and bill documents you choose to attach.
        </li>
        <li>
          <strong>Account numbers:</strong> only the last 4 digits, if you choose to add them. Full
          account or card numbers are never stored.
        </li>
      </ul>

      <h2>How we use it</h2>
      <p>
        Only to run the app for you: showing what&apos;s due, calculating totals and charts, and
        reminding you about upcoming bills. Your information is not sold, rented or used for
        advertising, and it is not shared with anyone except the service providers below.
      </p>

      <h2>Where it&apos;s stored</h2>
      <p>
        Data is stored with <strong>Supabase</strong> (database, sign-in and file storage) and the
        app is hosted on <strong>Vercel</strong>. Every user&apos;s data is isolated: the database
        only lets a signed-in user read or change their own records, and uploaded files are private
        to their owner.
      </p>

      <h2>Your choices</h2>
      <ul>
        <li>
          <strong>Export:</strong> download all your bills and payments as a CSV file from Settings.
        </li>
        <li>
          <strong>Correct:</strong> edit or archive any bill at any time.
        </li>
        <li>
          <strong>Delete:</strong> Settings → Danger zone → Delete account permanently removes your
          account, bills, payments and uploaded files.
        </li>
      </ul>

      <h2>Cookies</h2>
      <p>
        Lifeline uses cookies only to keep you signed in and to remember small display preferences
        (such as a collapsed sidebar). There are no advertising or tracking cookies.
      </p>

      <h2>Changes and contact</h2>
      <p>
        If this policy changes, the date at the top will be updated. Questions can be sent to the
        support email shown on Lifeline&apos;s Google sign-in screen.
      </p>
    </>
  );
}
