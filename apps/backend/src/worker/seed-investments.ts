import type { InvestmentAnalysisDraft, Slug } from "@genshin-codex/domain"
import { BunRuntime } from "@effect/platform-bun"
import { Effect } from "effect"
import { migrate } from "../db/migrate.js"
import { PgLive } from "../db/sql.js"
import { InvestmentService } from "../modules/investments/application/investment-service.js"
import { ServicesLive } from "../runtime/live.js"

/**
 * Siembra análisis de inversión curados (no auto-scrapeables; son sheets/guías por personaje).
 * Correr: `bun run src/worker/seed-investments.ts`. Es idempotente (upsert por slug).
 */

const nefer: InvestmentAnalysisDraft = {
  slug: "nefer" as Slug,
  character: "Nefer",
  element: "Dendro",
  source: {
    author: "jamie (kb9v)",
    url: "https://www.youtube.com/watch?v=aS4eb_AK71I"
  },
  summary:
    "Orden costo-efectivo de inversión para el equipo de Nefer (hypercarry Dendro/Bloom). " +
    "Todo el orden pivota sobre una pregunta: ¿ya tienes la C2 de Lauma?",
  scenarios: [
    {
      title: "Si solo te alcanza para UN 5★ garantizado",
      items: [
        {
          rank: "1",
          what: "Nefer C1",
          teamDmg: "+18.5%",
          charDmg: "+23.1%",
          notes: "Depende de si ya tienes la C2 de Lauma."
        },
        {
          rank: "2",
          what: "Reliquary of Truth (arma sig.)",
          teamDmg: "+11.5%–18.9%",
          charDmg: "+14.4%–23.6%",
          notes: "Rango bajo: Dawning Frost R5. Rango alto: partiendo de Blackmarrow."
        },
        { rank: "3", what: "Nefer C2", teamDmg: "+16.4%–16.5%", charDmg: "+19.1%–19.2%" },
        {
          rank: "4",
          what: "Lauma C2",
          teamDmg: "+31.5%",
          charDmg: "+28.6%",
          notes: "Más débil por costo, pero te da healer. Cae en AoE."
        },
        {
          rank: "5",
          what: "Nefer a C6 🚀",
          notes: "A este punto normalmente rinde más maxear a tu Main DPS."
        }
      ]
    },
    {
      title: "Si puedes meter al menos DOS 5★ (o ya tienes Lauma C2)",
      items: [
        {
          rank: "1",
          what: "Lauma C2",
          teamDmg: "+35.5%",
          charDmg: "+33.0%",
          notes:
            "Aquí brilla: sus Quills escalan el daño de todo el equipo y su C1 de curación te deja jugar cómodo con los teammates más fuertes."
        },
        {
          rank: "2",
          what: "Nefer C1",
          teamDmg: "+14.8%",
          charDmg: "+19.1%",
          notes: "No buffea las Quills de Lauma → más débil cuando ya tienes su C2."
        },
        {
          rank: "3",
          what: "Reliquary of Truth (arma sig.)",
          teamDmg: "+21.5%",
          charDmg: "+25.9%",
          notes: "Se mantiene fuerte."
        },
        { rank: "4", what: "Nefer C2", teamDmg: "+13.6%", charDmg: "+16.2%" },
        { rank: "5", what: "Nefer a C6 🚀" }
      ]
    }
  ],
  optional: [
    {
      what: "Nightweaver's Looking Glass",
      notes: "Si pescaste la sig. de Lauma de camino a la de Nefer, es buena."
    },
    {
      what: "Columbina (inversión vertical)",
      notes: "No está mal después, pero siempre va a ser peor que conseguir Nefer C6."
    }
  ],
  comparisons: [
    {
      label: "Nefer C1R1 vs C2R0",
      value: "+2.8%",
      notes: "La C1 con arma sig. R1 rinde ~2.8% más que la C2 con arma R0."
    },
    {
      label: "Nefer C2 vs Lauma C2 (con Columbina)",
      value: "+1.2%",
      notes:
        "Casi empate: con Columbina, Lauma C2 gana valor porque sus Quills juician más el daño de los teammates."
    },
    {
      label: "Nefer C2 vs Lauma C2 (con Aino C6)",
      value: "+17.3%",
      notes:
        "Con Aino C6, Nefer es siempre el hypercarry (~95% del daño), así que el buff de equipo de Lauma importa poco."
    }
  ],
  tables: [
    {
      title: "Reparto de daño por miembro — equipo base (Nahida + Columbina)",
      columns: ["Miembro", "Base", "+ Nefer C1", "+ Nefer C2"],
      rows: [
        ["Nefer", "2,508,455 (79.3%)", "3,089,048", "3,683,516 (84.9%)"],
        ["Lauma", "173,671 (5.5%)", "173,671", "173,671 (4.0%)"],
        ["Columbina", "417,450 (13.2%)", "417,450", "417,450 (9.6%)"],
        ["Nahida", "62,358 (2.0%)", "62,358", "62,358 (1.4%)"],
        ["Total equipo", "3,161,933", "3,742,526", "4,336,994"]
      ],
      note: "Nefer C1 sube el total ~+18.5%; a C2 el total sube ~+37% vs base y Nefer pasa a ~85% del daño."
    },
    {
      title: "Reparto de daño por miembro — con Lauma C2",
      columns: ["Miembro", "Lauma C2", "+ Nefer C1", "+ Nefer C2"],
      rows: [
        ["Nefer", "3,335,926 (77.9%)", "3,971,805 (80.7%)", "4,615,857 (83.0%)"],
        ["Lauma", "198,861 (4.6%)", "198,861 (4.0%)", "198,861 (3.6%)"],
        ["Columbina", "687,472 (16.0%)", "687,472 (14.0%)", "687,472 (12.4%)"],
        ["Nahida", "62,358 (1.5%)", "62,358 (1.3%)", "62,358 (1.1%)"],
        ["Total equipo", "4,284,615", "4,920,495", "5,564,547"]
      ],
      note: "La C2 de Lauma sube el total del equipo a 4.28M (vs 3.16M base). Las Quills escalan a todo el equipo."
    }
  ],
  breakdowns: [
    {
      title: "Reparto de daño — equipo base",
      parts: [
        { label: "Nefer", share: 79.3 },
        { label: "Columbina", share: 13.2 },
        { label: "Lauma", share: 5.5 },
        { label: "Nahida", share: 2.0 }
      ]
    },
    {
      title: "Reparto con Nefer C2",
      parts: [
        { label: "Nefer", share: 84.9 },
        { label: "Columbina", share: 9.6 },
        { label: "Lauma", share: 4.0 },
        { label: "Nahida", share: 1.4 }
      ]
    },
    {
      title: "Reparto con Lauma C2",
      parts: [
        { label: "Nefer", share: 77.9 },
        { label: "Columbina", share: 16.0 },
        { label: "Lauma", share: 4.6 },
        { label: "Nahida", share: 1.5 }
      ]
    }
  ],
  notes: [
    "Arma sig.: considera los rangos ALTOS como los realistas — si tienes un Dawning Frost de refinamiento alto, probablemente ya tienes su firma.",
    "Nefer NO depende de Bursts (a diferencia del buff de Lauma C2), así que rinde algo mejor en Stygian y escala mejor en peleas de AoE.",
    "Comparaciones comunes: Nefer C2 vs Lauma C2 (con Columbina) ≈ +1.2% a favor de Nefer C2; con Aino C6 la brecha sube a ≈ +17.3%, porque con Aino Nefer es siempre el hypercarry y el buff de equipo de Lauma importa menos."
  ]
}

const skirk: InvestmentAnalysisDraft = {
  slug: "skirk" as Slug,
  character: "Skirk",
  element: "Cryo",
  source: {
    author: "jamie (kb9v)",
    url: "https://www.youtube.com/watch?v=eQX3o0GhmZ0"
  },
  summary:
    "Orden de inversión costo-efectivo para el equipo de Skirk (Cryo). Un solo escenario general; completar su equipo es bastante opcional.",
  scenarios: [
    {
      title: "Orden de inversión (aumento aprox. de daño de equipo)",
      items: [
        {
          rank: "1",
          what: "Combo N2D*",
          teamDmg: "+2%–3.5%",
          notes:
            "No vale tanto la pena, pero el combo casual N2D no es difícil y es daño gratis."
        },
        {
          rank: "2",
          what: "Azurelight (arma sig.)",
          teamDmg: "+22%",
          notes: "Debería ser alto, pero baja si no puedes reducir el overcap de CRIT."
        },
        {
          rank: "3",
          what: "Escoffier C1",
          teamDmg: "+14%–16%",
          notes: "100% uptime en cualquier situación (relevante en Stygian). Además flex."
        },
        { rank: "4", what: "Skirk C1", teamDmg: "+12%–13%" },
        {
          rank: "5",
          what: "Skirk C2*",
          teamDmg: "+15%",
          notes: "Se puede conseguir antes. QoL y versatilidad."
        },
        {
          rank: "6",
          what: "Symphonist of Scents",
          teamDmg: "+8%–13%",
          notes: "El aumento exacto depende de tu inversión. Requiere el Burst de Escoffier."
        },
        {
          rank: "7",
          what: "Furina C1",
          teamDmg: "+12%",
          notes: "Con C6 Dahlia específicamente."
        },
        {
          rank: "8",
          what: "Skirk a C6 🚀",
          notes: "A este punto normalmente rinde más maxear a tu Main DPS."
        }
      ]
    }
  ],
  optional: [
    {
      what: "Furina C2",
      teamDmg: "+6%",
      notes: "Aun con C2, quieres construir a Furina TOTM para buffear a Skirk."
    },
    { what: "Calamity Queller", notes: "Si los juegas." },
    { what: "Starcaller's Watch", notes: "Si los juegas." }
  ],
  notes: [
    "Set de artefactos (Galleries vs Marechaussee Hunter): nunca ha habido contenido donde MH te deje clear algo que si no no podrías; sí ha habido donde no usar Galleries te costó la run.",
    "Galleries escala mejor con inversión y con el playstyle de Burst/Hybrid; MH le grifa el Burst (no puedes stackear CRIT Rate y le faltan buffs de Burst). MH solo gana si ya farmeaste un buen set de antes.",
    "En cálculos va de MH +2.5% a Galleries +3.2% — pero las diferencias prácticas pesan más que esos números. No tienes que farmear Galleries ya; puedes esperar a un update de strongbox."
  ]
}

const ayaka: InvestmentAnalysisDraft = {
  slug: "ayaka" as Slug,
  character: "Ayaka",
  element: "Cryo",
  source: {
    author: "jamie (kb9v)",
    url: "https://www.youtube.com/watch?v=Lt81DXqxhRI"
  },
  summary:
    "Orden de inversión costo-efectivo para Ayaka Freeze tras el rework de sus equipos. Ya NO es hypercarry: ahora suele rendir más invertir en el soporte (Shenhe) que en su propia vertical.",
  scenarios: [
    {
      title: "Orden de inversión (aumento aprox. de daño de equipo)",
      items: [
        { rank: "1", what: "Shenhe C0", teamDmg: "+17.8%–35.4%" },
        {
          rank: "2",
          what: "Escoffier C1",
          teamDmg: "+16.7%",
          notes: "Escala algo peor con inversión."
        },
        {
          rank: "3",
          what: "Symphonist of Scents",
          teamDmg: "+10.0%",
          notes: "Escala bien con inversión."
        },
        { rank: "4", what: "Furina C1", teamDmg: "+9.7%" },
        {
          rank: "5",
          what: "Shenhe C1",
          teamDmg: "+6.6%–8.8%",
          notes: "Difícil de factorizar frontload y ER; tómalo con reservas."
        },
        {
          rank: "6",
          what: "Mistsplitter (arma sig.)",
          teamDmg: "+6.6%–7.5%",
          notes: "Compone bien con inversión."
        },
        {
          rank: "7",
          what: "Calamity Queller",
          teamDmg: "+7.8%",
          notes: "Puede ser más fuerte que Mistsplitter en vacío."
        },
        {
          rank: "8",
          what: "Furina C2",
          notes: "Difícil de calcular; más enfocada en Furina que en el equipo."
        },
        { rank: "9", what: "Escoffier C2" },
        { rank: "10", what: "Ayaka C1" },
        { rank: "11", what: "Ayaka C2", notes: "Su C2 es floja para el equipo." }
      ]
    }
  ],
  tables: [
    {
      title: "Teammates budget — tiempo de clear (5.6 Abyss, mitad superior)",
      columns: ["Cámara", "C6 Xingqiu (Fav)", "C0 Kazuha (Fav)", "Mona (TTDS)"],
      rows: [
        ["Cámara 1", "33s", "32s", "31s"],
        ["Cámara 2", "56s", "56s", "50s"],
        ["Cámara 3", "21s", "22s", "21s"]
      ],
      note: "Diferencias chicas; Mona (TTDS) da los mejores tiempos en este set de cámaras."
    }
  ],
  notes: [
    "Ayaka ya no es hypercarry: sus equipos cambiaron y ahora conviene invertir primero en el soporte (Shenhe) antes que en su vertical. Mistsplitter ya no es prioritario.",
    "Xingqiu como budget: la resonancia Hydro sube HP del equipo sin subir curación (menos fanfare); reducir el ER de Furina no ayuda mucho (ya es soporte en Fav Sword). Su daño personal no compensa (los equipos de Ayaka no pueden spamear rainswords). Queda neutral y escala mal a futuro.",
    "Rosaria como budget: es como una Shenhe barata con más daño personal y menos buffs; comparte CRIT Rate manteniendo el ER del equipo bajo. Su techo es bajo — Shenhe sigue fuerte para escalado vertical.",
    "Nota grande: el contenido de Freeze reciente parece favorecer más Cryos (romper escudos / aplicación)."
  ]
}

const mualani: InvestmentAnalysisDraft = {
  slug: "mualani" as Slug,
  character: "Mualani",
  element: "Hydro",
  source: {
    author: "jamie (kb9v)",
    url: "https://www.youtube.com/watch?v=HG_hWVPOCeg"
  },
  summary:
    "Orden de inversión costo-efectivo para Mualani (Hydro). Difícil de calcular al 100%: gana stacks más rápido en AoE que en single target y tiene setups flexibles.",
  scenarios: [
    {
      title: "Orden de inversión (aumento aprox. de daño de equipo)",
      items: [
        {
          rank: "1",
          what: "Xilonen",
          teamDmg: "+3.9%–19.9%",
          notes: "Rango amplio según situación (ver nota). Cura y da escudo de cristalizar."
        },
        {
          rank: "2",
          what: "Mualani C1",
          teamDmg: "+30.4%",
          notes: "Daño más frontloaded."
        },
        {
          rank: "3",
          what: "Mualani C2",
          teamDmg: "+27.6%",
          notes: "Daño más frontloaded."
        },
        {
          rank: "4",
          what: "Surf's Up (arma sig.)",
          teamDmg: "−11.9%–+33.3%",
          notes: "Rango enorme según comparación (ver tabla del arma sig.)."
        },
        {
          rank: "5",
          what: "Peak Patrol Song",
          teamDmg: "+9.0%",
          notes: "Reemplaza a Favonius Sword."
        }
      ]
    }
  ],
  optional: [
    { what: "Mavuika C0R1" },
    { what: "Mualani C3+" },
    { what: "Citlali" }
  ],
  tables: [
    {
      title: "Armas por modo de contenido",
      columns: ["Modo", "Prioridad de arma"],
      rows: [
        ["Abyss", "Surf's Up / Widsith > Sacrificial Jade > Ring of Yaxche"],
        ["Stygian Onslaught", "Surf's Up > Widsith / Sacrificial Jade > Ring of Yaxche"],
        ["Overworld", "Surf's Up > cualquier cosa"]
      ]
    },
    {
      title: "¿Qué tan grande es su arma sig.? Surf's Up vs Widsith (daño)",
      columns: ["Escenario", "Surf's Up", "Widsith DMG%", "Widsith EM", "Widsith sin buff"],
      rows: [
        ["3 Normal Atks", "1,975,037", "2,082,585", "1,997,162", "1,481,478"],
        ["NA + Burst + NA", "2,301,226", "2,612,885", "2,489,457", "1,858,715"]
      ],
      note: "Con el buff correcto, Widsith supera a Surf's Up en daño puro — pero tiene downtime y puede dar el buff equivocado. Surf's Up es lo más práctico."
    }
  ],
  notes: [
    "Artefactos: main stats HP / EM (arena), HP / Hydro DMG (cáliz), HP / CRIT DMG (tiara).",
    "Cuando el % entre armas es muy cercano, depende de tus builds (sin ganador real). El buff de Widsith (o Sac Jade) al Burst es significativo en gameplay.",
    "Los 4★ competitivos tienen scuff de gameplay: Widsith tiene downtime y puede dar el buff equivocado (peor en Stygian/Overworld); Sacrificial Jade requiere setups más largos. Por eso Surf's Up es lo más consistente.",
    "Candace como QoL: su buff mayor solo aplica a Normal Atk (no Burst), no funciona con Petra (fuerza Instructor en el Pyro) y requiere su Burst — setups más largos. Xilonen suele ser mejor pick."
  ]
}

const analyses: InvestmentAnalysisDraft[] = [nefer, skirk, ayaka, mualani]

const program = Effect.gen(function* () {
  const svc = yield* InvestmentService
  yield* Effect.forEach(analyses, (a) => svc.save(a), { discard: true })
  yield* Effect.log(
    `seed-investments: ${analyses.length} análisis guardados (${analyses
      .map((a) => a.slug)
      .join(", ")})`
  )
}).pipe(Effect.provide(ServicesLive), Effect.provide(PgLive))

BunRuntime.runMain(migrate.pipe(Effect.provide(PgLive), Effect.andThen(program)))
