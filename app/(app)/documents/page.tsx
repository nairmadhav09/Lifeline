import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DocumentsView } from "@/components/features/documents/documents-view";
import { PageHeader } from "@/components/shared/page-header";
import { getDocuments } from "@/lib/data/documents";
import { getUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Documents" };

export default async function DocumentsPage() {
  const [user, documents] = await Promise.all([getUser(), getDocuments()]);
  if (!user) redirect("/login");

  return (
    <>
      <PageHeader
        title="Documents"
        description="Bills and receipts you've uploaded, stored privately."
      />
      <DocumentsView documents={documents} userId={user.id} />
    </>
  );
}
