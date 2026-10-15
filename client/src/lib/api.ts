import { QueryClient, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import type { AppData } from "@shared/engine";
import { buildContext } from "@shared/engine";
import type { PublicUser, Section } from "@shared/schema";

export class ApiError extends Error {
  constructor(public status: number, message: string, public need?: string) {
    super(message);
  }
}

export async function api<T = unknown>(method: string, url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    credentials: "include",
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : null;
  if (!res.ok) throw new ApiError(res.status, json?.error || "Não foi possível concluir agora. Tente de novo.", json?.need);
  return json as T;
}

export const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false, staleTime: 30_000 }, mutations: { retry: false } },
});

export function useMe() {
  return useQuery<PublicUser | null>({
    queryKey: ["me"],
    queryFn: async () => {
      try {
        return await api<PublicUser>("GET", "/api/me");
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) return null;
        throw e;
      }
    },
    staleTime: Infinity,
  });
}

export function useSnapshot(enabled = true) {
  return useQuery<AppData>({ queryKey: ["snapshot"], queryFn: () => api<AppData>("GET", "/api/snapshot"), enabled });
}

/** Contexto do motor financeiro a partir do snapshot (com decisões locais para recalcular na hora). */
export function useCtx(decisions?: Record<string, Section>) {
  const q = useSnapshot();
  const ctx = useMemo(() => (q.data ? buildContext(q.data, decisions ? { ...q.data.decisions, ...decisions } : undefined) : null), [q.data, decisions]);
  return { ...q, ctx };
}

/** Mutação que atualiza o snapshot depois de gravar. */
export function useAction<V, R = unknown>(fn: (v: V) => Promise<R>, opts: { onDone?: (r: R, v: V) => void; me?: boolean } = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: async (r, v) => {
      await qc.invalidateQueries({ queryKey: ["snapshot"] });
      if (opts.me) await qc.invalidateQueries({ queryKey: ["me"] });
      opts.onDone?.(r, v);
    },
  });
}

export function readFileAsText(f: File): Promise<string> {
  return new Promise((ok, fail) => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result));
    r.onerror = () => fail(r.error);
    r.readAsText(f, /\.ofx$/i.test(f.name) ? "latin1" : "utf-8");
  });
}

export function readFileAsBase64(f: Blob): Promise<string> {
  return new Promise((ok, fail) => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result).split(",")[1] || "");
    r.onerror = () => fail(r.error);
    r.readAsDataURL(f);
  });
}

export async function filesToUpload(files: File[]) {
  return Promise.all(
    files.map(async (f) => {
      const binary = /\.(pdf|jpe?g|png|heic|webp)$/i.test(f.name) || f.type.startsWith("image/");
      return { name: f.name, content: binary ? await readFileAsBase64(f) : await readFileAsText(f), encoding: binary ? ("base64" as const) : ("text" as const), mime: f.type || undefined };
    }),
  );
}
