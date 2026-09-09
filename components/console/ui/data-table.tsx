"use client";

import { useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import type { ColumnDef, SortingState } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { TableSkeleton } from "./skeleton";

interface DataTableProps<T> {
  columns: ColumnDef<T, any>[];
  data: T[];
  loading?: boolean;
  globalFilter?: string;
  onRowClick?: (row: T) => void;
  initialSorting?: SortingState;
  pageSize?: number;
  emptyTitle: string;
  emptyDescription?: string;
  className?: string;
}

/**
 * The console's one table — TanStack under the hood, glass on the outside.
 * Every data table in every module renders through this so sorting, empty
 * states, and density stay identical everywhere.
 */
export function DataTable<T>({
  columns,
  data,
  loading,
  globalFilter,
  onRowClick,
  initialSorting,
  pageSize,
  emptyTitle,
  emptyDescription,
  className,
}: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>(initialSorting ?? []);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: pageSize ?? 10 });

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      globalFilter: globalFilter ?? "",
      pagination: pageSize ? pagination : { ...pagination, pageSize: data.length || 1 },
    },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: pageSize ? getPaginationRowModel() : undefined,
    globalFilterFn: "includesString",
  });

  if (loading) return <TableSkeleton rows={pageSize ?? 6} />;

  const rows = table.getRowModel().rows;

  if (!rows.length) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  const filteredCount = table.getFilteredRowModel().rows.length;
  const pageCount = table.getPageCount();

  return (
    <div className={cn("space-y-3", className)}>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const sorted = header.column.getIsSorted();
                  return (
                    <th
                      key={header.id}
                      className="border-b border-border/50 px-3 pb-2.5 pt-1 text-left"
                    >
                      {header.isPlaceholder ? null : canSort ? (
                        <button
                          onClick={header.column.getToggleSortingHandler()}
                          className="group inline-flex items-center gap-1.5"
                        >
                          <span className="card-label group-hover:text-foreground">
                            {flexRender(header.column.columnDef.header, header.getContext())}
                          </span>
                          {sorted === "asc" ? (
                            <ArrowUp className="h-3 w-3 text-foreground" />
                          ) : sorted === "desc" ? (
                            <ArrowDown className="h-3 w-3 text-foreground" />
                          ) : (
                            <ChevronsUpDown className="h-3 w-3 text-muted-foreground/40 opacity-0 transition-opacity group-hover:opacity-100" />
                          )}
                        </button>
                      ) : (
                        <span className="card-label">
                          {flexRender(header.column.columnDef.header, header.getContext())}
                        </span>
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                className={cn(
                  "border-b border-border/30 transition-colors last:border-0",
                  onRowClick && "cursor-pointer hover:bg-glass-hover"
                )}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-3 py-2.5 align-middle text-sm text-foreground/90">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pageSize && pageCount > 1 ? (
        <div className="flex items-center justify-between px-1 text-xs text-muted-foreground">
          <span className="tabular-nums">
            {filteredCount} record{filteredCount === 1 ? "" : "s"}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-7 rounded-lg px-2.5"
              disabled={!table.getCanPreviousPage()}
              onClick={() => table.previousPage()}
            >
              Prev
            </Button>
            <span className="tabular-nums">
              {table.getState().pagination.pageIndex + 1} / {pageCount}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-7 rounded-lg px-2.5"
              disabled={!table.getCanNextPage()}
              onClick={() => table.nextPage()}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
