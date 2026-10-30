// Thin typed client for the FastAPI backend. Keep all fetch calls here.

export interface DocumentSummary {
  id: number;
  title: string;
  original_filename: string;
  file_size: number;
  page_count: number;
  indexing_status: string;
  created_at: string;
  duplicate?: boolean;
}

export interface OutlineItem {
  title: string;
  level: number;
  target_page: number | null; // 0-based
  kind: "internal" | "external" | "unresolved";
}

export interface LinkItem {
  page: number; // 0-based source page
  rect: [number, number, number, number];
  target_page: number | null; // 0-based
  kind: "internal" | "external" | "named" | "unresolved";
  uri: string | null;
}

export interface DocumentIndex {
  page_count: number;
  metadata: Record<string, string>;
  page_labels_present: boolean;
  outline: OutlineItem[];
  links: LinkItem[];
  warnings: string[];
}

export type Rect = [number, number, number, number]; // x0, y0, x1, y1 in PDF points, top-left origin

export interface Stanza {
  id: number;
  document_id: number;
  page: number; // 0-based
  rect: Rect;
  number: number;
  title: string;
  verified: boolean;
  new_page: boolean; // Handy Book: start this stanza on a fresh output page
  updated_at: string;
}

export type StanzaPatch = Partial<Pick<Stanza, "rect" | "number" | "title" | "verified" | "new_page">>;

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = res.statusText;
    try {
      detail = (await res.json()).detail ?? detail;
    } catch {
      /* non-JSON error body */
    }
    throw new Error(`${res.status}: ${detail}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  health: (): Promise<{ ok: boolean; version: string }> =>
    fetch("/api/health").then((r) => json<{ ok: boolean; version: string }>(r)),

  listDocuments: (): Promise<DocumentSummary[]> =>
    fetch("/api/documents").then((r) => json<DocumentSummary[]>(r)),

  uploadDocument: (file: File): Promise<DocumentSummary> => {
    const form = new FormData();
    form.append("file", file);
    return fetch("/api/documents", { method: "POST", body: form }).then((r) =>
      json<DocumentSummary>(r),
    );
  },

  indexDocument: (id: number): Promise<{ reused: boolean; index: DocumentIndex }> =>
    fetch(`/api/documents/${id}/index`, { method: "POST" }).then((r) =>
      json<{ reused: boolean; index: DocumentIndex }>(r),
    ),

  pdfUrl: (id: number) => `/api/documents/${id}/pdf`,

  pageImageUrl: (id: number, page0: number, zoom: number) =>
    `/api/documents/${id}/pages/${page0}.png?zoom=${zoom}`,

  listStanzas: (docId: number): Promise<Stanza[]> =>
    fetch(`/api/documents/${docId}/stanzas`).then((r) => json<Stanza[]>(r)),

  createStanza: (docId: number, body: { page: number; rect: Rect; number?: number; title?: string }): Promise<Stanza> =>
    fetch(`/api/documents/${docId}/stanzas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then((r) => json<Stanza>(r)),

  updateStanza: (id: number, patch: StanzaPatch): Promise<Stanza> =>
    fetch(`/api/stanzas/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }).then((r) => json<Stanza>(r)),

  deleteStanza: (id: number): Promise<void> =>
    fetch(`/api/stanzas/${id}`, { method: "DELETE" }).then(async (r) => {
      if (!r.ok) await json(r);
    }),
};
