import type { Language, QueryResponse } from "../types";
import { askMock } from "./mock";

const USE_MOCK = (import.meta.env.VITE_USE_MOCK ?? "false") === "true";

export async function ask(question: string, language: Language): Promise<QueryResponse> {
  if (USE_MOCK) {
    return askMock(question);
  }
  const res = await fetch("/query", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, language }),
  });
  if (!res.ok) {
    throw new Error(`/query failed: ${res.status} ${await res.text()}`);
  }
  return (await res.json()) as QueryResponse;
}
