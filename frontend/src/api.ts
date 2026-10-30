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
};
