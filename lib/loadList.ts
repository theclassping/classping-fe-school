// Follow Django pagination through the same authenticated proxy so local
// search and filters include records beyond the first API page.
export async function loadList<T>(endpoint: string): Promise<T[]> {
  const records: T[] = [];
  const visited = new Set<string>();
  function orderedUrl(value: string): string {
    const params = new URL(value, window.location.origin).searchParams;
    params.set("ordering", "-created_at");
    return `${endpoint.split("?")[0]}?${params}`;
  }
  let url: string | null = orderedUrl(endpoint);
  while (url) {
    if (visited.has(url)) throw new Error("Repeated list page");
    visited.add(url);
    const response: Response = await fetch(url, { credentials: "include", cache: "no-store" });
    if (response.status === 401) {
      window.location.href = "/login";
      return [];
    }
    if (!response.ok) throw new Error("Failed to load list");
    const data: T[] | { results?: T[]; data?: T[]; next?: string | null } = await response.json();
    records.push(...(Array.isArray(data) ? data : data.results ?? data.data ?? []));
    url = !Array.isArray(data) && data.next
      ? orderedUrl(data.next)
      : null;
  }
  // Also enforce ordering when an endpoint ignores the ordering parameter.
  // Records without a creation timestamp retain their relative order at the end.
  function createdAt(record: T): number {
    if (!record || typeof record !== "object" || !("created_at" in record)
        || typeof record.created_at !== "string") return -Infinity;
    const timestamp = Date.parse(record.created_at);
    return Number.isNaN(timestamp) ? -Infinity : timestamp;
  }
  return records.sort((a, b) => {
    const first = createdAt(a);
    const second = createdAt(b);
    return first === second ? 0 : first > second ? -1 : 1;
  });
}
