// Column sorting shared by list tables. Pure: no React.

export type SortDirection = "asc" | "desc";

/** The sorted column and direction; null keeps the list's own order. */
export type SortState<K extends string> = { key: K; direction: SortDirection } | null;

/**
 * State after clicking a column header: a new column starts at `firstDirection`,
 * the same column flips direction.
 */
export function nextSort<K extends string>(current: SortState<K>, key: K, firstDirection: SortDirection = "asc"): SortState<K> {
  if (current?.key !== key) return { key, direction: firstDirection };
  return { key, direction: current.direction === "asc" ? "desc" : "asc" };
}

export type SortValue = string | number | null | undefined;

const collator = new Intl.Collator("id-ID", { numeric: true, sensitivity: "base" });

function isEmpty(value: SortValue): value is null | undefined | "" {
  return value === null || value === undefined || value === "" || (typeof value === "number" && Number.isNaN(value));
}

/**
 * Sorted copy of `items`. Strings compare by Indonesian collation (numbers
 * inside them in numeric order); empty values always go last. Stable.
 */
export function sortBy<T, K extends string>(items: readonly T[], sort: SortState<K>, valueOf: (item: T, key: K) => SortValue): T[] {
  if (!sort) return [...items];
  const sign = sort.direction === "asc" ? 1 : -1;
  return items
    .map((item, index) => ({ item, index, value: valueOf(item, sort.key) }))
    .sort((a, b) => {
      const aEmpty = isEmpty(a.value);
      const bEmpty = isEmpty(b.value);
      if (aEmpty || bEmpty) return aEmpty === bEmpty ? a.index - b.index : aEmpty ? 1 : -1;
      const order = typeof a.value === "number" && typeof b.value === "number"
        ? a.value - b.value
        : collator.compare(String(a.value), String(b.value));
      return order * sign || a.index - b.index;
    })
    .map(({ item }) => item);
}
