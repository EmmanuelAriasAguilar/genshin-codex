import {
  type ColumnDef,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable
} from "@tanstack/react-table"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

interface Props<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  globalFilter?: string
  pageSize?: number
  onRowClick?: (row: TData) => void
  emptyMessage?: string
}

/** Tabla táctica: TanStack orquesta (sort/filter/paginate), shadcn pinta.
 *  Sin bordes de celda, headers monoespaciados, hover = borde izq de neón. */
export function CodexDataTable<TData, TValue>({
  columns,
  data,
  globalFilter = "",
  pageSize = 25,
  onRowClick,
  emptyMessage = "SIN_REGISTROS"
}: Props<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([])

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize } }
  })

  return (
    <div className="space-y-3">
      <div className="border border-border/60 bg-card/30 backdrop-blur-sm">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id} className="border-b border-border/60 hover:bg-transparent">
                {hg.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    onClick={header.column.getToggleSortingHandler()}
                    className={cn(
                      "select-none border-0 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground",
                      header.column.getCanSort() && "cursor-pointer hover:text-neon"
                    )}
                  >
                    {header.isPlaceholder ? null : (
                      <span className="inline-flex items-center gap-1">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        <span className="text-neon">
                          {{ asc: "▲", desc: "▼" }[header.column.getIsSorted() as string] ?? ""}
                        </span>
                      </span>
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={columns.length}
                  className="border-0 py-10 text-center font-mono text-sm text-muted-foreground"
                >
                  [ {emptyMessage} ]
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                  className={cn(
                    "group border-0 border-b border-border/25 transition-all",
                    "hover:bg-[rgb(var(--accent-neon)/0.06)]",
                    "hover:shadow-[inset_3px_0_0_0_rgb(var(--accent-neon)),inset_0_0_24px_-12px_rgb(var(--accent-neon))]",
                    onRowClick && "cursor-pointer"
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className="border-0 py-2.5 text-sm text-foreground/90 group-hover:text-foreground"
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {table.getPageCount() > 1 && (
        <div className="flex items-center justify-between gap-3 font-mono text-xs text-muted-foreground">
          <span>{table.getFilteredRowModel().rows.length} REGISTROS</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
              ◄ PREV
            </Button>
            <span className="tabular-nums text-neon">
              {String(table.getState().pagination.pageIndex + 1).padStart(2, "0")} / {String(table.getPageCount()).padStart(2, "0")}
            </span>
            <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
              NEXT ►
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
