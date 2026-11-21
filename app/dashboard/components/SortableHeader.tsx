import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import type { ReactNode } from "react";
import { nextSort, type SortDirection, type SortState } from "@/lib/sort";
import styles from "./SortableHeader.module.css";

type Props<K extends string> = {
  label: ReactNode;
  sortKey: K;
  sort: SortState<K>;
  onSort: (sort: SortState<K>) => void;
  /** Direction of the first click, e.g. "desc" for dates and amounts (newest / largest first). */
  firstDirection?: SortDirection;
  className?: string;
};

/** A table header cell whose label sorts the column; clicking again flips the direction. */
export default function SortableHeader<K extends string>({ label, sortKey, sort, onSort, firstDirection = "asc", className }: Props<K>) {
  const direction = sort?.key === sortKey ? sort.direction : null;
  const Icon = direction === "asc" ? ArrowUp : direction === "desc" ? ArrowDown : ArrowUpDown;

  return (
    <th className={className} aria-sort={direction === "asc" ? "ascending" : direction === "desc" ? "descending" : "none"}>
      <button
        type="button"
        className={`${styles.button} ${direction ? styles.active : ""}`}
        onClick={() => onSort(nextSort(sort, sortKey, firstDirection))}
      >
        {label}
        <Icon aria-hidden="true" />
      </button>
    </th>
  );
}
