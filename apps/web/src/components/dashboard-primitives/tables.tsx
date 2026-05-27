"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { motion } from "framer-motion";
import { fadeUpVariants } from "./layout";

export type DataTableColumn<Row> = {
  id: string;
  header: React.ReactNode;
  align?: "left" | "center" | "right";
  className?: string;
  render: (row: Row) => React.ReactNode;
};

export function Skeleton({ className }: { className?: string | undefined }) {
  return (
    <div
      className={clsx(
        "relative overflow-hidden rounded-full bg-[var(--bg-sunken)] before:absolute before:inset-y-[-40%] before:left-[-30%] before:w-1/3 before:rotate-12 before:bg-[var(--border)] before:content-[''] before:animate-[zook-shimmer_1200ms_linear_infinite]",
        className,
      )}
    />
  );
}

export function TableLoader({ label = "Rows are loading" }: { label?: string }) {
  return (
    <div role="status" aria-label={label} className="grid gap-2">
      {[0, 1, 2, 3, 4].map((item) => (
        <div key={item} className="grid grid-cols-[1.2fr_0.9fr_0.8fr] gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-raised)]/30 p-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3 justify-self-end" />
        </div>
      ))}
    </div>
  );
}

export function DataTable<Row>({
  columns,
  rows,
  rowKey,
  empty,
  className,
}: {
  columns: Array<DataTableColumn<Row>>;
  rows: Row[];
  rowKey: (row: Row) => string;
  empty: React.ReactNode;
  className?: string | undefined;
}) {
  return (
    <motion.div
      variants={fadeUpVariants}
      className={clsx(
        "relative overflow-x-auto rounded-[24px] border border-[var(--border)] bg-[var(--surface)]",
        className,
      )}
      aria-label="Scrollable table"
    >
      <table className="min-w-[720px] w-full text-left text-sm border-collapse">
        <thead className="sticky top-0 z-10 bg-[var(--bg-sunken)] text-[var(--text-tertiary)] shadow-[inset_0_-1px_0_var(--border)]">
          <tr>
            {columns.map((column) => (
              <th
                key={column.id}
                scope="col"
                className={clsx(
                  "px-4 py-3 font-medium",
                  column.align === "right"
                    ? "text-right"
                    : column.align === "center"
                      ? "text-center"
                      : "text-left",
                  column.className,
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border-subtle)]">
          {rows.length ? (
            rows.map((row) => (
              <tr key={rowKey(row)} className="align-top transition-colors duration-200 hover:bg-[var(--bg-sunken)]">
                {columns.map((column) => (
                  <td
                    key={column.id}
                    className={clsx(
                      "min-w-0 break-words px-4 py-3 text-[var(--text-secondary)]",
                      column.align === "right"
                        ? "text-right"
                        : column.align === "center"
                          ? "text-center"
                          : "text-left",
                      column.className,
                    )}
                  >
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td className="px-4 py-5 text-[var(--text-tertiary)]" colSpan={columns.length}>
                {empty}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </motion.div>
  );
}

export function VirtualizedDataTable<Row>({
  columns,
  rows,
  rowKey,
  empty,
  className,
  rowHeight = 88,
  maxHeight = 560,
  overscan = 6,
  gridTemplateColumns,
  tableMinWidth = "720px",
}: {
  columns: Array<DataTableColumn<Row>>;
  rows: Row[];
  rowKey: (row: Row) => string;
  empty: React.ReactNode;
  className?: string | undefined;
  rowHeight?: number | undefined;
  maxHeight?: number | undefined;
  overscan?: number | undefined;
  gridTemplateColumns?: string | undefined;
  tableMinWidth?: string | undefined;
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [viewport, setViewport] = useState({ height: maxHeight, top: 0 });
  const totalHeight = rows.length * rowHeight;
  const bodyHeight = rows.length ? Math.min(maxHeight, totalHeight) : undefined;
  const template = gridTemplateColumns ?? `repeat(${columns.length}, minmax(120px, 1fr))`;
  const visibleRange = useMemo(() => {
    if (!rows.length) {
      return { start: 0, end: 0 };
    }
    const visibleStart = Math.floor(viewport.top / rowHeight);
    const visibleEnd = Math.ceil((viewport.top + viewport.height) / rowHeight);
    return {
      start: Math.max(0, visibleStart - overscan),
      end: Math.min(rows.length, visibleEnd + overscan),
    };
  }, [overscan, rowHeight, rows.length, viewport.height, viewport.top]);
  const visibleRows = rows.slice(visibleRange.start, visibleRange.end);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) {
      return;
    }

    const syncViewport = () => {
      setViewport({ height: node.clientHeight || maxHeight, top: node.scrollTop });
    };
    syncViewport();
    node.addEventListener("scroll", syncViewport, { passive: true });

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(syncViewport);
      resizeObserver.observe(node);
    }

    return () => {
      node.removeEventListener("scroll", syncViewport);
      resizeObserver?.disconnect();
    };
  }, [maxHeight]);

  useEffect(() => {
    const node = scrollRef.current;
    if (node) {
      node.scrollTop = 0;
      setViewport({ height: node.clientHeight || maxHeight, top: 0 });
    }
  }, [maxHeight, rows]);

  return (
    <motion.div
      variants={fadeUpVariants}
      className={clsx(
        "relative overflow-x-auto rounded-[24px] border border-[var(--border)] bg-[var(--surface)]",
        className,
      )}
      aria-label="Virtualized scrollable table"
      role="grid"
    >
      <div style={{ minWidth: tableMinWidth }}>
        <div
          className="grid border-b border-[var(--border)] bg-[var(--bg-sunken)] text-sm text-[var(--text-tertiary)]"
          style={{ gridTemplateColumns: template }}
          role="row"
        >
          {columns.map((column) => (
            <div
              key={column.id}
              role="columnheader"
              className={clsx(
                "px-4 py-3 font-medium",
                column.align === "right"
                  ? "text-right"
                  : column.align === "center"
                    ? "text-center"
                    : "text-left",
                column.className,
              )}
            >
              {column.header}
            </div>
          ))}
        </div>

        {rows.length ? (
          <div
            ref={scrollRef}
            className="relative overflow-y-auto"
            style={{ height: bodyHeight, maxHeight }}
            role="rowgroup"
          >
            <div style={{ height: totalHeight, position: "relative" }}>
              {visibleRows.map((row, index) => {
                const rowIndex = visibleRange.start + index;
                return (
                  <div
                    key={rowKey(row)}
                    role="row"
                    className="absolute left-0 right-0 grid border-b border-[var(--border-subtle)] text-sm transition-colors duration-200 hover:bg-[var(--bg-sunken)]"
                    style={{
                      gridTemplateColumns: template,
                      minHeight: rowHeight,
                      transform: `translateY(${rowIndex * rowHeight}px)`,
                    }}
                  >
                    {columns.map((column) => (
                      <div
                        key={column.id}
                        role="cell"
                        className={clsx(
                          "min-w-0 self-center break-words px-4 py-3 text-[var(--text-secondary)]",
                          column.align === "right"
                            ? "text-right"
                            : column.align === "center"
                              ? "text-center"
                              : "text-left",
                          column.className,
                        )}
                      >
                        {column.render(row)}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="px-4 py-5 text-sm text-[var(--text-tertiary)]">{empty}</div>
        )}
      </div>
    </motion.div>
  );
}
