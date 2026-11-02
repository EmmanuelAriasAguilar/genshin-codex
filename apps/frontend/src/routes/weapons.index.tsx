import type { Weapon, WeaponType } from "@genshin-codex/domain"
import { useQuery } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import type { ColumnDef } from "@tanstack/react-table"
import { useMemo, useState } from "react"
import { CodexDataTable } from "@/components/codex-data-table"
import { ScannerWrapper } from "@/components/scanner-wrapper"
import { listWeapons } from "@/lib/api"
import { GameIcon } from "@/lib/game-icon"
import { weaponEs } from "@/lib/genshin"
import { EffectText } from "@/lib/text"
import { PageHeader, Stars } from "@/lib/ui"

export const Route = createFileRoute("/weapons/")({ component: Weapons })

const TYPES: WeaponType[] = ["Sword", "Claymore", "Polearm", "Catalyst", "Bow"]

const columns: ColumnDef<Weapon>[] = [
  {
    accessorKey: "name",
    header: "Arma",
    cell: ({ row }) => {
      const w = row.original
      return (
        <div className="flex items-center gap-2.5">
          <GameIcon src={w.icon} alt={w.name} size={32} rarity={w.rarity} />
          <span className="font-medium">{w.name}</span>
        </div>
      )
    }
  },
  {
    accessorKey: "type",
    header: "Tipo",
    cell: ({ getValue }) => <span className="text-muted-foreground">{weaponEs(getValue<string>())}</span>
  },
  {
    accessorKey: "rarity",
    header: "Rareza",
    cell: ({ getValue }) => <Stars rarity={getValue<number>()} />
  },
  {
    accessorKey: "mainStat",
    header: "Stat principal",
    cell: ({ getValue }) => <span className="text-muted-foreground">{getValue<string>()}</span>
  },
  {
    accessorKey: "atk90",
    header: "ATK 90",
    cell: ({ getValue }) => (
      <span className="font-mono tabular-nums text-muted-foreground">{getValue<number>() ?? "—"}</span>
    )
  },
  {
    id: "passive",
    header: "Pasivo",
    enableSorting: false,
    cell: ({ row }) => {
      const w = row.original
      return w.passiveEffect ? (
        <span className="block max-w-md text-xs text-muted-foreground">
          {w.passiveName ? <span className="text-neon/80">{w.passiveName}: </span> : null}
          <EffectText text={w.passiveEffect} clamp={2} />
        </span>
      ) : (
        <span className="text-muted-foreground">—</span>
      )
    }
  }
]

function Weapons() {
  const navigate = useNavigate()
  const { data, isLoading, isError, error } = useQuery({ queryKey: ["weapons"], queryFn: listWeapons })
  const [q, setQ] = useState("")
  const [type, setType] = useState<WeaponType | "all">("all")

  const rows = useMemo(
    () => (data ?? []).filter((w) => type === "all" || w.type === type),
    [data, type]
  )

  return (
    <div className="space-y-5">
      <PageHeader
        title="Armas"
        subtitle={data ? `${rows.length} REGISTROS` : undefined}
        right={
          <>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar…" className="field" />
            <select
              value={type}
              onChange={(e) => setType(e.target.value as WeaponType | "all")}
              className="field"
            >
              <option value="all">Tipo</option>
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {weaponEs(t)}
                </option>
              ))}
            </select>
          </>
        }
      />

      <ScannerWrapper isLoading={isLoading} isError={isError} error={error}>
        <CodexDataTable
          columns={columns}
          data={rows}
          globalFilter={q}
          onRowClick={(w) => navigate({ to: "/weapons/$slug", params: { slug: w.slug } })}
          emptyMessage="SIN_ARMAS"
        />
      </ScannerWrapper>
    </div>
  )
}
