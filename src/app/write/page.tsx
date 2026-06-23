"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useWorkspace } from "@/components/continuity/WorkspaceProvider";
import { DocumentEditor } from "@/components/continuity/writing/DocumentEditor";
import { HydrateSkeleton } from "@/components/continuity/page-parts";
import { Button } from "@/components/ui/Button";

export default function WritePage() {
  return (
    <Suspense fallback={<HydrateSkeleton />}>
      <WriteInner />
    </Suspense>
  );
}

function WriteInner() {
  const ws = useWorkspace();
  const router = useRouter();
  const params = useSearchParams();
  const docId = params.get("doc");
  const createdRef = useRef(false);

  const [resolvedId, setResolvedId] = useState<string | null>(docId);

  // If no/unknown doc id, create a fresh blank document once and replace the URL.
  useEffect(() => {
    if (!ws.hydrated || createdRef.current) return;
    const existing = docId ? ws.workspace.documents.find((d) => d.id === docId) : undefined;
    if (existing) {
      setResolvedId(existing.id);
      return;
    }
    createdRef.current = true;
    const doc = ws.createDocument();
    setResolvedId(doc.id);
    router.replace(`/write?doc=${doc.id}`);
  }, [ws.hydrated, docId, ws.workspace.documents, ws, router]);

  if (!ws.hydrated) return <HydrateSkeleton />;

  const doc = resolvedId ? ws.workspace.documents.find((d) => d.id === resolvedId) : undefined;
  if (!doc) {
    return (
      <div className="mx-auto max-w-md rounded-lg border border-rule bg-surface p-8 text-center shadow-card">
        <h1 className="font-display text-xl text-ink">Opening your document…</h1>
        <p className="mt-2 text-sm text-ink-muted">If this hangs, start a new one from Now.</p>
        <div className="mt-5">
          <Link href="/">
            <Button variant="primary">Back to Now</Button>
          </Link>
        </div>
      </div>
    );
  }

  // key forces a fresh editor instance per document.
  return <DocumentEditor key={doc.id} doc={doc} />;
}
