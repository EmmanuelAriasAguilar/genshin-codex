import type {
  CharacterDraft,
  InvestmentAnalysisDraft,
  InvestmentItem,
  InvestmentTable,
  Slug,
  StatTarget
} from "@genshin-codex/domain"
import { BunRuntime } from "@effect/platform-bun"
import { Effect } from "effect"
import { migrate } from "../db/migrate.js"
import { PgLive } from "../db/sql.js"
import { CharacterService } from "../modules/characters/application/character-service.js"
import { InvestmentService } from "../modules/investments/application/investment-service.js"
import { ServicesLive } from "../runtime/live.js"

/**
 * Integra data de KeqingMains (theorycrafting autoritativo) para un batch de personajes meta:
 *  1) Análisis de inversión por personaje — orden de valor de constelaciones + arma sig. con el
 *     aumento de daño PERSONAL exacto de las hojas de cálculo de KQM (no inventado por nosotros).
 *  2) Objetivos de stats REALES por build — sobreescribe el marco genérico con cifras precisas de
 *     KQM (requisito de ER real, main stats de artefactos, targets de substats) donde existen.
 *  3) Notas de stats/artefactos POR COMPOSICIÓN de equipo (KQM Teams) — dentro del análisis.
 *
 * Honesto: los % por constelación son "aumento de daño personal" de las calcs de KQM (por versión),
 * NO un orden de jale cruzado entre teammates (eso es el estilo kb9v). El ER exacto depende del equipo.
 *
 * Idempotente. Correr: `bun run src/worker/seed-kqm.ts`.
 */

// ── Forma de la data extraída de KQM (una por personaje). ────────────────────
type KqmTeam = { name: string; members: string[]; notes?: string }
type KqmChar = {
  slug: string
  character: string
  element?: string
  found: boolean
  kqmUrl: string
  kqmAuthor?: string
  version?: string
  constellations: Array<{ c: string; personalDmg?: string; note?: string }>
  signatureWeapon?: { name: string; note?: string }
  weaponRanking?: string[]
  erRequirement?: string
  artifactMainStats?: { sands?: string; goblet?: string; circlet?: string }
  substatPriority?: string
  statTargets?: Array<{ stat: string; target: string }>
  teams?: KqmTeam[]
  summary?: string
  caveats?: string
}

// ── DATA (extraída de KeqingMains por los agentes; cifras reales, no inventadas). ─
const KQM_DATA: KqmChar[] = [
  {
    slug: "furina",
    character: "Furina",
    element: "Hydro",
    found: true,
    kqmUrl: "https://keqingmains.com/furina/",
    kqmAuthor: "GenshinNoir",
    version: "5.3",
    constellations: [
      { c: "C1", personalDmg: "~12%", note: "desde C0" },
      { c: "C2", personalDmg: "~42%", note: "sobre la previa; ~59% desde C0" },
      { c: "C3", personalDmg: "~7%", note: "sobre la previa; ~71% desde C0" },
      { c: "C4", personalDmg: "~12%", note: "sobre la previa; ~91% desde C0" },
      { c: "C5", personalDmg: "~18%", note: "sobre la previa; ~125% desde C0" },
      { c: "C6", personalDmg: "~21-31%", note: "sobre la previa; ~172-196% desde C0" }
    ],
    signatureWeapon: { name: "Splendor of Tranquil Waters", note: "~125-136% DPS" },
    weaponRanking: [
      "Splendor of Tranquil Waters",
      "Uraku Misugiri (pasiva Geo)",
      "Primordial Jade Cutter",
      "Festering Desire R5",
      "Light of Foliar Incision"
    ],
    erRequirement:
      "Muy dependiente del equipo. C0: Solo Hydro ~200-260%, mucha generación de partículas ~160-180%, con Raiden ~135-160%, Double Hydro ~105-190%. C4: Solo Hydro ~145-190%, mucha gen. ~105-120%, con Raiden ~100%, Double Hydro ~100-135%.",
    artifactMainStats: { sands: "HP% / Recarga de Energía", goblet: "HP% / Bono Daño Hydro", circlet: "CRIT > HP%" },
    substatPriority: "ER% (hasta el requisito) > CRIT > HP%",
    statTargets: [
      { stat: "Crit", target: "Prioriza CRIT en la Corona; usa Arena HP% si ya cumples ER por arma/substats, si no Arena ER" },
      { stat: "Recarga de Energía (ER)", target: "Cumple el requisito del equipo (ver arriba) antes de apilar HP%" }
    ],
    teams: [
      { name: "Mono/Double Hydro", members: ["Neuvillette", "Furina", "Kazuha", "Xilonen/Ororon/Citlali"], notes: "También: Kokomi-Furina-Yelan/Xingqiu-Kazuha; Raiden-Furina-Yelan-Xilonen/Jean" },
      { name: "Reverse Vaporize", members: ["Hu Tao", "Furina", "Yelan/Xingqiu", "Xilonen/Bennett/Xianyun"], notes: "También: Diluc-Furina-Bennett-Xianyun; Gaming-Furina-Bennett-Xianyun" },
      { name: "Forward Vaporize", members: ["Lyney", "Furina", "Bennett", "Xiangling"], notes: "También: Klee-Furina-Bennett-Kazuha; Wriothesley-Furina-Bennett-Xiangling" },
      { name: "Quickbloom", members: ["Alhaitham/Tighnari/Cyno/Clorinde", "Furina", "variantes Raiden"], notes: "Sección parcialmente truncada en la guía" }
    ],
    summary:
      "Sub-DPS/habilitador Hydro universal; da un buff de daño masivo a todo el equipo vía Fanfare y auto-curación, escala con HP. Encaja en casi cualquier comp con Hydro.",
    caveats: "Los valores por constelación son aumento de daño personal de las calcs de KQM, v5.3. El ER varía mucho por equipo y entre C0 y C4."
  },
  {
    slug: "neuvillette",
    character: "Neuvillette",
    element: "Hydro",
    found: true,
    kqmUrl: "https://keqingmains.com/neuvillette/",
    kqmAuthor: "caramielle",
    version: "5.8",
    constellations: [
      { c: "C1", personalDmg: "0-24%", note: "desde C0" },
      { c: "C2", personalDmg: "~11%", note: "sobre la previa; ~38% desde C0" },
      { c: "C3", personalDmg: "~21%", note: "sobre la previa; ~66% desde C0" },
      { c: "C4", personalDmg: "0%", note: "sobre la previa; ~66% desde C0" },
      { c: "C5", personalDmg: "~1%", note: "sobre la previa; ~68% desde C0" },
      { c: "C6", personalDmg: "~29%", note: "sobre la previa; ~118% desde C0" }
    ],
    signatureWeapon: { name: "Tome of the Eternal Flow", note: "" },
    weaponRanking: [
      "Tome of the Eternal Flow",
      "Sacrificial Jade",
      "Surf's Up",
      "Cashflow Supervision",
      "A Thousand Floating Dreams (solo Vaporize)",
      "Jadefall's Splendor",
      "Ash-Graven Drinking Horn",
      "Lost Prayer to the Sacred Winds",
      "Prototype Amber",
      "Kagura's Verity",
      "The Widsith",
      "Everlasting Moonglow",
      "Ring of Yaxche",
      "Waveriding Whirl"
    ],
    erRequirement:
      "Debe usar Burst cada rotación. Double Hydro con Furina: 100% (todas las armas). Double/Solo Electro: 100-105% (Tome R1) o 100-135% (otras). Otras comps: 100-105% (Tome R1), 100-135% (otras). Asume 2 Skills por Burst; C6 suele usar 1 Skill por rotación.",
    artifactMainStats: { sands: "HP%", goblet: "Bono Daño Hydro % o HP%", circlet: "CRIT Rate, CRIT DMG o HP%" },
    substatPriority: "ER% (hasta cumplir el requisito) > CRIT = HP% > HP plano",
    statTargets: [
      { stat: "Crit", target: "4pc Marechaussee Hunter da bastante CRIT Rate; puedes sobrepasar con armas cargadas de CRIT" },
      { stat: "HP%", target: "Crucial para escalar daño (DPS que escala con HP)" },
      { stat: "Recarga de Energía (ER)", target: "Cumple el requisito (100-135% según equipo) antes que otras stats" }
    ],
    teams: [
      { name: "Hypercarry (Xilonen)", members: ["Neuvillette", "Xilonen", "Furina", "Kazuha/Mavuika/Lynette/Lisa"], notes: "La variante más fuerte; Xilonen da shred de RES + bono de daño 4pc Scroll. Neuvillette usa 4pc Marechaussee Hunter." },
      { name: "Hypercarry (Kazuha/Zhongli)", members: ["Neuvillette", "Kazuha", "Furina", "Zhongli/Fischl/Lisa/Baizhu"], notes: "Ligeramente debajo de Xilonen. Zhongli shred RES+escudo; Baizhu apila Fanfare; Lisa shred DEF." },
      { name: "Variante Ororon", members: ["Neuvillette", "Kazuha/Lynette/Lan Yan", "Furina", "Ororon"], notes: "Ororon da el bono de daño completo (40%) de 4pc Scroll; cambia daño personal por buffeo." }
    ],
    summary: "Hypercarry Hydro on-field de primer nivel; spam de Ataque Cargado que escala con HP y con auto-sustain, quiere shred de RES + buffs de Furina.",
    caveats: "Los valores por constelación son aumento de DPS personal (calc KQM, v5.8). El rango C1 0-24% depende del setup."
  },
  {
    slug: "nahida",
    character: "Nahida",
    element: "Dendro",
    found: true,
    kqmUrl: "https://keqingmains.com/nahida/",
    kqmAuthor: "kolvii, cegewinne, haafr, baloopy y KQM Staff",
    version: "3.8",
    constellations: [
      { c: "C1", personalDmg: "9%", note: "sobre la previa (equipo 2%)" },
      { c: "C2", personalDmg: "16%", note: "sobre la previa (equipo 18%)" },
      { c: "C3", personalDmg: "7%", note: "sobre la previa (equipo 1%)" },
      { c: "C4", personalDmg: "5%", note: "sobre la previa (equipo 1%)" },
      { c: "C5", personalDmg: "6%", note: "sobre la previa (equipo 1%)" },
      { c: "C6", personalDmg: "41%", note: "sobre la previa (equipo 10%); acumulado C0→C6 = 112% personal, 38% equipo" }
    ],
    signatureWeapon: { name: "A Thousand Floating Dreams", note: "TFD" },
    weaponRanking: [
      "A Thousand Floating Dreams",
      "Kagura's Verity",
      "Sacrificial Fragments",
      "Wandering Evenstar",
      "The Widsith / Lost Prayer / Solar Pearl",
      "Favonius Codex",
      "Magic Guide",
      "Mappa Mare",
      "Hakushin Ring",
      "Prototype Amber",
      "Thrilling Tales of Dragon Slayers"
    ],
    erRequirement:
      "Aggravate/Double Electro: ~100-120% (off y on-field). Double Dendro: ~120-140% off / ~110-130% on. Bloom (Solo Dendro): ~120-140% on-field. Hyperbloom/Quickbloom: ~130-140% off / ~100-120% on. Burgeon: ~140-160% off / ~130-140% on. Menos con baterías o un segundo Dendro.",
    artifactMainStats: { sands: "EM", goblet: "EM o Bono Daño Dendro", circlet: "EM o CRIT" },
    substatPriority:
      "Off-field: ER hasta el requisito > acercarse a 900-1000 EM total > Daño Dendro% > CRIT > EM. On-field: ER hasta requisito > Daño Dendro% >= CRIT >= EM > ATK%. Nilou Bloom: ER hasta requisito > EM >> Daño Dendro% > CRIT",
    statTargets: [
      { stat: "Maestría Elemental (EM)", target: "Off-field: apunta a ~900-1000 EM total (no estrictamente necesario para ser buena); Nilou Bloom: EM muy prioritaria" },
      { stat: "Recarga de Energía (ER)", target: "Cumple el requisito del equipo (~100-160% según comp) primero" }
    ],
    teams: [
      { name: "Quicken", members: ["Nahida", "Keqing", "Fischl", "Zhongli"], notes: "También: Nahida-Raiden-Fischl-Jean; Nahida-Tighnari-Fischl-Zhongli; Nahida-Alhaitham-Yae Miko-Kuki Shinobu" },
      { name: "Hyperbloom/Quickbloom", members: ["Nahida", "Kuki", "Xingqiu", "Yelan"], notes: "También: Nahida-Alhaitham-Kuki-Xingqiu; Nahida-Kuki-Beidou-Xingqiu; Nahida-Raiden-Kokomi-Dendro Traveler" },
      { name: "Nilou Bountiful Bloom", members: ["Nahida", "Nilou", "Kokomi", "Yelan"], notes: "También: Nahida-Nilou-Barbara-Dendro Traveler; Nahida-Nilou-Kokomi-Collei; Nahida-Nilou-Candace-Yaoyao. Build cargada de EM." }
    ],
    summary: "Mejor aplicadora Dendro y habilitadora off-field para todos los equipos de reacción Dendro (Quicken, Bloom, Hyperbloom, Nilou); baja inversión, alto valor.",
    caveats: "Guía más vieja (v3.8); sin byline único, créditos a KQM staff. Cifras por constelación son DPR de la calc de KQM."
  },
  {
    slug: "raiden-shogun",
    character: "Raiden Shogun",
    element: "Electro",
    found: true,
    kqmUrl: "https://keqingmains.com/raiden/",
    kqmAuthor: "Jamberry",
    version: "3.4",
    constellations: [
      { c: "C1", personalDmg: "5-12%", note: "desde C0 / total vs C0" },
      { c: "C2", personalDmg: "43%", note: "sobre la previa; 51-61% total vs C0" },
      { c: "C3", personalDmg: "16-18%", note: "sobre la previa; 76-88% total vs C0" },
      { c: "C4", personalDmg: "N/A (situacional)", note: "sin cambio al total vs C0 (76-88%)" },
      { c: "C5", personalDmg: "1%", note: "sobre la previa; 78-91% total vs C0" },
      { c: "C6", personalDmg: "N/A (incierto)", note: "78-91% total vs C0" }
    ],
    signatureWeapon: { name: "Engulfing Lightning R1", note: "114.2% de The Catch R5" },
    weaponRanking: [
      "Engulfing Lightning R1 (114.2%)",
      "Staff of Homa R1 (104.6%)",
      "Primordial Jade Winged-Spear R1 (103.1%)",
      "The Catch R5 (100.0% base)"
    ],
    erRequirement:
      "Sin requisito duro único; ~200%+ ER suele bastar para batteriarse a sí misma como solo Electro; equipos con Engulfing Lightning llegan a 250%+ ER",
    artifactMainStats: {
      sands: "ER% o ATK% (ATK% preferido para daño personal en casi todo)",
      goblet: "Bono Daño Electro % (ATK% en casos puntuales)",
      circlet: "CRIT Rate o CRIT DMG (el que acerque más al ratio 1:2)"
    },
    substatPriority: "CR = CD > ATK% ≥ ER > ATK plano",
    statTargets: [
      { stat: "Ratio de CRIT", target: "~1:2 CRIT Rate:DMG" },
      { stat: "Maestría Elemental", target: "Situacionalmente valiosa en Aggravate/Hyperbloom; build estándar en el resto" }
    ],
    teams: [
      { name: "Sara-Kazuha-Bennett", members: ["Raiden Shogun", "Sara", "Kazuha", "Bennett"], notes: "" },
      { name: "Yae-Sara-Jean", members: ["Raiden Shogun", "Yae Miko", "Sara", "Jean"], notes: "" },
      { name: "Xiangling-Xingqiu-Bennett", members: ["Raiden Shogun", "Xiangling", "Xingqiu", "Bennett"], notes: "" },
      { name: "Sucrose-Fischl-Bennett", members: ["Raiden Shogun", "Sucrose", "Fischl", "Bennett"], notes: "" },
      { name: "Lisa-Venti-Kokomi", members: ["Raiden Shogun", "Lisa", "Venti", "Kokomi"], notes: "" },
      { name: "Kokomi-Nahida-DMC (Raiden off-field)", members: ["Raiden Shogun", "Kokomi", "Nahida", "Dendro Traveler"], notes: "Variante Raiden off-field" }
    ],
    summary: "Carry Electro on/off-field; C2 es su mayor salto de poder personal (~43%). Engulfing Lightning R1 es BiS. Build ATK%/Daño Electro/crit con suficiente ER (~200%+) para battería propia.",
    caveats: "La tabla da rangos (el DPS personal depende del equipo/rotación). Lista de equipos ilustrativa, no exhaustiva; sin desviaciones de stats por equipo. v3.4 (2023)."
  },
  {
    slug: "kaedehara-kazuha",
    character: "Kaedehara Kazuha",
    element: "Anemo",
    found: true,
    kqmUrl: "https://keqingmains.com/kazuha/",
    kqmAuthor: "Ayzel, Cuzimori, Irokei, Reens & Vlad",
    version: "4.5",
    constellations: [
      { c: "C1", personalDmg: "", note: "Reduce el CD de Skill 10%; se resetea con Burst. Sin número de daño." },
      { c: "C2", personalDmg: "+200 EM", note: "Buff de EM a sí mismo y al personaje on-field (Yamaarashi Tailwind)" },
      { c: "C3", personalDmg: "", note: "Skill talent +3. Sin número de daño." },
      { c: "C4", personalDmg: "", note: "Regenera 3 o 4 de Energía según el tipo de Skill" },
      { c: "C5", personalDmg: "", note: "Burst talent +3. Sin número de daño." },
      { c: "C6", personalDmg: "+0.2% por punto de EM", note: "Convierte EM en bono de daño de Ataque Normal/Cargado/Descenso (Crimson Momiji)" }
    ],
    signatureWeapon: { name: "Freedom-Sworn", note: "" },
    weaponRanking: [
      "Freedom-Sworn",
      "Xiphos' Moonlight",
      "Favonius Sword",
      "Fleuve Cendre Ferryman",
      "Sacrificial Sword",
      "Iron Sting / Toukabou Shigure",
      "Dark Iron Sword",
      "Primordial Jade Cutter / Mistsplitter Reforged"
    ],
    erRequirement:
      "Varía por equipo/rotación. Solo Anemo (Tap + Hold): 190-200% sin Favonius; Triple Anemo: 145-155% sin Favonius. Rotación típica = 1 Tap Skill + 1 Hold Skill.",
    artifactMainStats: { sands: "EM / ER", goblet: "EM", circlet: "EM" },
    substatPriority: "ER (hasta el requisito) > EM >> ATK% = CRIT",
    statTargets: [
      { stat: "Maestría Elemental", target: "Apilada fuerte (sin target exacto indicado)" },
      { stat: "CRIT", target: "Se beneficia de CRIT Rate con Favonius Sword pero no necesita inversión significativa" }
    ],
    teams: [
      { name: "Aggravate/Quicken", members: ["Kazuha", "Kirara", "Keqing", "Fischl"], notes: "También: Kazuha-Nahida-Raiden-Sara" },
      { name: "Hyperbloom", members: ["Kazuha", "Dendro Traveler", "Kokomi", "Fischl"], notes: "" },
      { name: "Burgeon", members: ["Kazuha", "Nahida", "Kokomi", "Thoma"], notes: "También: Kazuha-Traveler(Dendro)-Xingqiu-Thoma" },
      { name: "Freeze", members: ["Kazuha", "Ayaka", "Shenhe", "Kokomi"], notes: "También: Kazuha-Ganyu-Diona-Mona; Kazuha-Rosaria-Kaeya-Ayato" },
      { name: "Reverse Vape", members: ["Kazuha", "Xiangling", "Tartaglia", "Bennett"], notes: "" }
    ],
    summary: "Soporte Anemo universal: shred VV + compartir EM (C2 da +200 EM). Freedom-Sworn es su firma; apila EM en todas las piezas con suficiente ER para la rotación. Encaja en Aggravate, Hyperbloom, Burgeon, Freeze y Vape.",
    caveats: "La guía no cuantifica DPR personal por constelación (Kazuha es soporte; los valores son utilidad/buff, no % de daño personal). El ER depende del equipo. v4.5."
  },
  {
    slug: "bennett",
    character: "Bennett",
    element: "Pyro",
    found: true,
    kqmUrl: "https://keqingmains.com/bennett/",
    kqmAuthor: "Prévisible",
    version: "2.6",
    constellations: [
      { c: "C1", personalDmg: "", note: "La curación suma +20% del ATK base de Bennett al buff. Sin DPR personal; descrita como su mejor constelación." },
      { c: "C2", personalDmg: "", note: "ER +30% cuando su HP está por debajo del 70%" },
      { c: "C3", personalDmg: "", note: "Passion Overload (Skill) +3. Sin número de daño." },
      { c: "C4", personalDmg: "", note: "Sin número indicado" },
      { c: "C5", personalDmg: "", note: "Fantastic Voyage (Burst) +3. Sin número de daño." },
      { c: "C6", personalDmg: "+15% Bono Daño Pyro", note: "Da +15% Bono Daño Pyro a los miembros con arma dentro del campo del Burst" }
    ],
    signatureWeapon: { name: "Mistsplitter Reforged", note: "BiS para Bennett on-field/DPS; mayor ATK base entre espadas" },
    weaponRanking: [
      "Mistsplitter Reforged",
      "Primordial Jade Cutter",
      "Freedom-Sworn",
      "Haran Geppaku Futsu",
      "Summit Shaper",
      "Aquila Favonia",
      "Alley Flash (mejor 4★, mayor ATK base 4*)"
    ],
    erRequirement:
      "Con DPS Pyro en el equipo: 180-200% (1 E por Q), 150-170% (2), 130-150% (3), 115-135% (4), 100-120% (5). Sin DPS Pyro: 275-350% (1 E por Q) bajando a 125-135% (5 E por Q).",
    artifactMainStats: { sands: "EM ~ ATK% > ER", goblet: "Bono Daño Pyro %", circlet: "CRIT Rate o CRIT DMG" },
    substatPriority: "CRIT Rate ~ CRIT DMG > ATK% = EM = ER > HP%",
    statTargets: [
      { stat: "Ratio de CRIT", target: "~1:2 / 1:1.5 (CRIT Rate:DMG)" },
      { stat: "ATK% / EM", target: "Busca equilibrio junto al ratio de crit" }
    ],
    teams: [
      { name: "Bennett-Xiangling-Xingqiu-Flex", members: ["Bennett", "Xiangling", "Xingqiu", "Flex"], notes: "" },
      { name: "Childe-Bennett-Xiangling-Flex", members: ["Childe", "Bennett", "Xiangling", "Flex"], notes: "Reverse Vape / core International" },
      { name: "Bennett-Xiangling-Cryo-Rosaria", members: ["Bennett", "Xiangling", "Cryo", "Rosaria"], notes: "" },
      { name: "Raiden-Electro-Bennett-Anemo", members: ["Raiden Shogun", "Electro", "Bennett", "Anemo"], notes: "" },
      { name: "Ganyu-Bennett-Pyro-Flex", members: ["Ganyu", "Bennett", "Aplicador Pyro", "Flex"], notes: "Melt" },
      { name: "Melt Carry Bennett", members: ["Bennett", "Anemo/Cryo"], notes: "Bennett DPS on-field melt" },
      { name: "Thundering Fury Bennett", members: ["Bennett"], notes: "Variante Electro on-field" }
    ],
    summary: "Soporte Pyro premier: buff de ATK + cura + resonancia Pyro. C1 es su mejor constelación (buff mayor); C6 da +15% Daño Pyro pero cambia su infusión (caveat). Build ATK/EM/crit con ER según usos de Skill por rotación.",
    caveats: "La guía (v2.6) no cuantifica DPR personal por constelación — Bennett es soporte/buffer, así que las entradas son utilidad. C6 infusiona sus ataques con Pyro, indeseable en algunos equipos. El ranking de armas es para el build on-field/DPS."
  },
  {
    slug: "xiangling",
    character: "Xiangling",
    element: "Pyro",
    found: true,
    kqmUrl: "https://keqingmains.com/xiangling/",
    kqmAuthor: "jamberry",
    version: "3.4",
    constellations: [
      { c: "C1", personalDmg: "9.3%", note: "aumento de DPS sobre la constelación previa" },
      { c: "C2", personalDmg: "", note: "No recomendada; sin ganancia de DPS" },
      { c: "C3", personalDmg: "12.3%", note: "sobre la previa; 22.8% acumulado desde C0" },
      { c: "C4", personalDmg: "33.8%", note: "sobre la previa; 64.3% acumulado desde C0" },
      { c: "C5", personalDmg: "2.3%", note: "sobre la previa; 68.1% acumulado desde C0" },
      { c: "C6", personalDmg: "1.5%", note: "sobre la previa; 70.6% acumulado desde C0" }
    ],
    signatureWeapon: { name: "The Catch (R5)", note: "arma de referencia base 100%" },
    weaponRanking: [
      "Staff of Scarlet Sands R1 (106.9%)",
      "Wavebreaker's Fin R5 (103.9%)",
      "Staff of Homa R1 (103.1%)",
      "Engulfing Lightning R1 (100.7%)",
      "The Catch R5 (100%)"
    ],
    erRequirement:
      "Dependiente del equipo (estándar / Favonius / Kitain R5). Kokomi Soup/Burgeon: 220+% / 170-190% / 150-170%. Hu Tao-Xingqiu-Yelan: 270+% / 220+% / 210+%. Ganyu Melt: 240+% / 210-230% / 200-220%. Quickswap Hydro: 180-200% / 160-180% / 140-160%. Raiden: 160-180% / 140-160% / 120-140%. Tartaglia: 160-180% / 120-140% / 100-120%",
    artifactMainStats: { sands: "ER / EM / ATK%", goblet: "Bono Daño Pyro %", circlet: "CRIT Rate / CRIT DMG" },
    substatPriority: "ER hasta el requisito > CRIT Rate/CRIT DMG > EM (para Reverse Vape) / ATK%",
    statTargets: [
      { stat: "CRIT", target: "CRIT es siempre la primera prioridad tras cumplir el requisito de ER" },
      { stat: "EM", target: "Beneficiosa en equipos con Sucrose; los targets exactos requieren optimizador" }
    ],
    teams: [
      { name: "Reverse Vape", members: ["Xiangling", "Tartaglia", "Kazuha", "Bennett"], notes: "Compite con los mejores equipos; escala a viabilidad de speedrun" },
      { name: "Reverse Vape (Alt)", members: ["Xiangling", "Xingqiu", "Sucrose", "Bennett"], notes: "Enfoque single-target" },
      { name: "Burgeon", members: ["Xiangling", "Tartaglia", "Dendro", "Bennett"], notes: "Requiere manejo de transfiguración Hydro" },
      { name: "Overload", members: ["Xiangling", "Electro", "Electro", "Bennett"], notes: "AoE viable sin setup de Vape" },
      { name: "Sukokomon", members: ["Xiangling", "Kokomi", "Fischl", "Sucrose"], notes: "De los pocos equipos sin slots flex" },
      { name: "Reverse Melt", members: ["Xiangling", "Cryo DPS", "Flex", "Bennett"], notes: "Habilita consistencia de Melt para DPS Cryo" },
      { name: "Pure Pyro", members: ["Xiangling", "Anemo", "Flex", "Bennett"], notes: "Daño consistente y fácil; pocos counters duros" }
    ],
    summary: "Sub-DPS Pyro off-field cuyo Pyronado da daño off-field consistente; el ER depende mucho del equipo, y CRIT es prioridad tras cumplir ER.",
    caveats: "Los rangos de ER varían mucho por equipo y arma (Favonius/Kitain lo bajan). Los % por constelación son aumentos de DPS sobre la previa, con acumulados indicados."
  },
  {
    slug: "xingqiu",
    character: "Xingqiu",
    element: "Hydro",
    found: true,
    kqmUrl: "https://keqingmains.com/xingqiu/",
    kqmAuthor: "chasing_haze, quinslay, .reimu.",
    version: "4.0",
    constellations: [
      { c: "C1", personalDmg: "0%", note: "0% desde C0 y sobre la previa" },
      { c: "C2", personalDmg: "28%", note: "28% desde C0; 28% sobre la previa" },
      { c: "C3", personalDmg: "48%", note: "desde C0; 15% sobre la previa" },
      { c: "C4", personalDmg: "48-57%", note: "desde C0; 0-6% sobre la previa" },
      { c: "C5", personalDmg: "51-61%", note: "desde C0; 2-3% sobre la previa" },
      { c: "C6", personalDmg: "121-132%", note: "desde C0; 44-46% sobre la previa" }
    ],
    signatureWeapon: { name: "Primordial Jade Cutter (R1)", note: "BiS; 119% DPS vs base Favonius (C0-5)" },
    weaponRanking: [
      "Primordial Jade Cutter (119%)",
      "Mistsplitter Reforged (112%)",
      "Haran Geppaku Futsu (109%)",
      "Light of Foliar Incision (107%)",
      "Skyward Blade (106%)"
    ],
    erRequirement:
      "Dependiente de equipo/arma (Otras / Favonius / Amenoma R3 / Sacrificial R3+). Solo Hydro: 285-290% / 235-240% / 250-255% / 185-190%. +1 usuario Favonius: 250-255% / 210-215% / 225-230% / 170-175%. +Raiden Shogun: 180-185% / 150-155% / 150-155% / 125-130% (valores C0-5)",
    artifactMainStats: { sands: "ER% o ATK%", goblet: "Bono Daño Hydro %", circlet: "CRIT Rate o CRIT DMG" },
    substatPriority: "ER% (hasta el requisito) > CRIT Rate = CRIT DMG > ATK%",
    statTargets: [
      { stat: "ER", target: "Sube hasta cumplir el requisito de la rotación" },
      { stat: "CRIT", target: "Prioriza CRIT Rate y CRIT DMG por igual tras cumplir ER" }
    ],
    teams: [
      { name: "Vaporize", members: ["Hu Tao/Yoimiya", "Xingqiu", "Bennett", "Zhongli"], notes: "Requiere Hydro consistente para uptime de Vaporize" },
      { name: "Freeze", members: ["Ayaka", "Xingqiu", "Kazuha", "Kokomi"], notes: "Alto uptime de Freeze puede permitir soltar healer/shielder" },
      { name: "Hyperbloom", members: ["Nahida", "Xingqiu", "Fischl", "Thoma"], notes: "Separar E y Q mejora el flujo de rotación" },
      { name: "Electro-Charged (Taser)", members: ["Sucrose", "Xingqiu", "Fischl", "Beidou"], notes: "Doble off-field DPS con agrupamiento" },
      { name: "Double Hydro", members: ["Xingqiu", "Yelan", "DPS Dendro/Cryo", "Flex"], notes: "Más aplicación y daño" }
    ],
    summary: "Sub-DPS Hydro off-field premier: aplicación Hydro consistente, reducción de daño y resistencia a interrupción; sus necesidades de ER escalan con arma y soporte de energía del equipo.",
    caveats: "Constelaciones y armas dadas para C0-5. El requisito de ER varía por arma (Favonius/Amenoma/Sacrificial) y soporte de energía del equipo."
  },
  {
    slug: "yelan",
    character: "Yelan",
    element: "Hydro",
    found: true,
    kqmUrl: "https://keqingmains.com/yelan/",
    kqmAuthor: "Vladone, Emiliabyss, KB",
    version: "3.4",
    constellations: [
      { c: "C1", personalDmg: "~20%", note: "desde C0" },
      { c: "C2", personalDmg: "~24%", note: "sobre C1; ~40-50% desde C0" },
      { c: "C3", personalDmg: "~13%", note: "sobre C2; ~60% desde C0" },
      { c: "C4", personalDmg: "~4-15%", note: "sobre C3; ~80-90% desde C0" },
      { c: "C5", personalDmg: "~2%", note: "sobre C4; ~92% desde C0" },
      { c: "C6", personalDmg: "~25%", note: "sobre C5; ~150% desde C0" }
    ],
    signatureWeapon: { name: "Aqua Simulacra", note: "Best-in-Slot" },
    weaponRanking: [
      "Aqua Simulacra",
      "Elegy for the End",
      "Favonius Warbow (mejor F2P)",
      "Mouun's Moon R3+",
      "The Stringless R5",
      "Slingshot",
      "Fading Twilight R5",
      "Sacrificial Bow R3+",
      "Recurve Bow R5"
    ],
    erRequirement:
      "Varía por usos de Skill y equipo: 164% (2 Skills + 2do Hydro + Sacrificial) hasta 324% (1 Skill, sin compañero Favonius). Necesidades de energía muy altas cuando no va con Hydro adicional.",
    artifactMainStats: { sands: "HP% / ER%", goblet: "Bono Daño Hydro % / HP%", circlet: "CRIT Rate / HP%" },
    substatPriority: "ER% (hasta el umbral) > CRIT (hasta ratio 1:2) / HP% > HP plano",
    statTargets: [
      { stat: "HP", target: "30k HP (C0, sin arma de CRIT)" },
      { stat: "CRIT Rate", target: "60% (sin arma CRIT); 70-75% con arma CRIT" },
      { stat: "CRIT DMG", target: "120% (sin arma CRIT); 140-150% con arma CRIT" },
      { stat: "Ratio de CRIT", target: "1:2 CRIT Rate : CRIT DMG" }
    ],
    teams: [
      { name: "Double Hydro + Flex", members: ["Yelan", "Xingqiu", "DPS on-field", "Soporte flex"], notes: "Paquete core double-Hydro" },
      { name: "Double Hydro Vaporize", members: ["Yelan", "Xingqiu", "Hu Tao", "Kazuha/Zhongli/Fischl"], notes: "Enfoque Vaporize" },
      { name: "Double Hydro Taser", members: ["Yelan", "Xingqiu", "Fischl/Raiden", "Kazuha"], notes: "Basado en Electro-Charged" },
      { name: "Yelan Solo Hydro Vaporize", members: ["Yelan", "Hu Tao", "Zhongli", "Kazuha"], notes: "Solo Hydro; requisito de ER más alto" },
      { name: "Hyperbloom", members: ["Yelan", "Alhaitham", "Nahida", "Kuki Shinobu"], notes: "Equipo de reacción Dendro" }
    ],
    summary: "Sub-DPS Hydro off-field que escala con HP; su Exquisite Throw da daño off-field fuerte y un buff de daño a todo el equipo; va mejor con un segundo Hydro para manejar sus altas necesidades de energía.",
    caveats: "Los valores por constelación son aproximados (~) como indica la guía. El requisito de ER oscila mucho (164%-324%) según usos de Skill por rotación y presencia de un segundo Hydro/Favonius."
  },
  {
    slug: "hu-tao",
    character: "Hu Tao",
    element: "Pyro",
    found: true,
    kqmUrl: "https://keqingmains.com/hu-tao/",
    kqmAuthor: "miannes, rare possum, cuzimori",
    version: "4.0",
    constellations: [
      { c: "C1", personalDmg: "~20%", note: "desde C0" },
      { c: "C2", personalDmg: "7%", note: "sobre C1; 28% acumulado desde C0" },
      { c: "C3", personalDmg: "9%", note: "sobre C2; 36% acumulado desde C0" },
      { c: "C4", personalDmg: "0%", note: "sobre C3; 36% acumulado desde C0" },
      { c: "C5", personalDmg: "1%", note: "sobre C4; 37% acumulado desde C0" },
      { c: "C6", personalDmg: "14-97%", note: "sobre C5, varía por setup; 56-170% acumulado desde C0" }
    ],
    signatureWeapon: { name: "Staff of Homa", note: "R1, #1 con Arena HP (evaluado <50% HP)" },
    weaponRanking: [
      "Staff of Homa R1 (<50% HP)",
      "Staff of the Scarlet Sands R5",
      "Ballad of the Fjords R5 (pasiva up)",
      "Dragon's Bane R5 (pasiva up)",
      "Deathmatch R5 (1 oponente)"
    ],
    erRequirement:
      "Normalmente no necesita ER para rotaciones estándar; hasta 10% ER en sets que no sean Shimenawa's ayuda a usar Burst en rotaciones alternas en escenarios de baja energía. Equipos Solo-Yelan requieren ER mucho más alto en Yelan.",
    artifactMainStats: { sands: "HP% (o EM)", goblet: "Bono Daño Pyro %", circlet: "CRIT Rate o CRIT DMG" },
    substatPriority: "EM hasta ~100-150 > CRIT > EM hasta 200-300 > HP% > ATK% > HP plano = ATK plano > ER%",
    statTargets: [
      { stat: "Ratio de CRIT", target: "1:2 CRIT Rate : CRIT DMG" },
      { stat: "Maestría Elemental", target: "Primer breakpoint ~100 EM (4pc Crimson Witch) o ~150 EM (otros sets); valor extra 200-300" },
      { stat: "Conversión HP→ATK", target: "Topa en 400% del ATK base; cuidado con capear usando Arena HP + buffs" }
    ],
    teams: [
      { name: "Double Hydro (Zhongli)", members: ["Hu Tao", "Xingqiu", "Yelan", "Zhongli"], notes: "El más confiable; Zhongli da shred de RES. Rotaciones 18-22s; Xingqiu prefiere Favonius Sword" },
      { name: "Double Hydro (Kazuha)", members: ["Hu Tao", "Xingqiu", "Yelan", "Kazuha"], notes: "Cambia escudo por agrupamiento y buffs" },
      { name: "VV Vape (Thoma-Sucrose)", members: ["Hu Tao", "Xingqiu", "Thoma", "Sucrose"], notes: "Setup complejo; requiere ejecución precisa" },
      { name: "VV Vape (Bennett-Kazuha)", members: ["Hu Tao", "Xingqiu", "Bennett", "Kazuha"], notes: "Gran buff de ATK pero retos de posicionamiento" },
      { name: "Overvape", members: ["Hu Tao", "Xingqiu/Yelan", "Fischl", "flex"], notes: "Protege el aura Hydro; malo vs enemigos ligeros" },
      { name: "Vapemelt", members: ["Hu Tao", "Xingqiu", "Rosaria/Kaeya", "Cryo"], notes: "Económico; evita bosses" },
      { name: "Double Geo", members: ["Hu Tao", "Xingqiu", "Albedo", "Zhongli"], notes: "Simple y seguro; menor consistencia de Vape" },
      { name: "Mono Pyro", members: ["Hu Tao", "Bennett", "Kazuha", "Xiangling"], notes: "Mayor daño Mono; sin setup de reacción" }
    ],
    summary: "DPS Pyro on-field HP/crit alrededor de Ataque Cargado + Skill Vaporize. Prioridad EM ~100-150 luego CRIT, Arena HP%, Cáliz Pyro, ratio 1:2, casi cero ER. Mejor en Double Hydro (Xingqiu + Yelan) con Zhongli o Kazuha.",
    caveats: "El rango C6 14-97% depende mucho del setup. La conversión HP→ATK topa en 400% del ATK base."
  },
  {
    slug: "sangonomiya-kokomi",
    character: "Sangonomiya Kokomi",
    element: "Hydro",
    found: true,
    kqmUrl: "https://keqingmains.com/kokomi/",
    kqmAuthor: "xf3",
    version: "2.5",
    constellations: [
      { c: "C1", personalDmg: "", note: "Añade daño de proyectil; sin porcentaje indicado" },
      { c: "C4", personalDmg: "", note: "Constelación de QoL; sin porcentaje indicado" },
      { c: "C6", personalDmg: "40% Bono Daño Hydro", note: "según la guía" }
    ],
    signatureWeapon: { name: "Everlasting Moonglow", note: "Mejor catalizador para daño personal" },
    weaponRanking: [
      "Daño personal: Everlasting Moonglow > Prototype Amber > Hakushin Ring",
      "Soporte: Thrilling Tales of Dragon Slayers R5 > Hakushin Ring > Prototype Amber"
    ],
    erRequirement: "Alrededor de 170-200%+ ER; varía con equipo y arma (la guía recomienda la calculadora de ER de Zakharov)",
    artifactMainStats: { sands: "HP% o ER%", goblet: "Bono Daño Hydro %", circlet: "Bono de Curación % o HP%" },
    substatPriority: "ER% (hasta el umbral) > HP% > HP plano = ATK% > EM > ATK plano",
    statTargets: [
      { stat: "HP", target: "Kokomi escala con HP; sin target numérico específico indicado" },
      { stat: "CRIT", target: "No se buildea a crit (su pasiva elimina CRIT Rate y lo convierte en Bono de Curación)" }
    ],
    teams: [
      { name: "Habilitadora/Driver Electro-Charged", members: ["Kokomi", "Electro", "Electro", "Anemo"], notes: "Aplicadora Hydro off/on-field para Electro-Charged" },
      { name: "Sukokomon", members: ["Kokomi", "Sucrose", "Xiangling", "Bennett"], notes: "" },
      { name: "Electro-Charged 2 (TF Kazuha)", members: ["Kokomi", "Kazuha", "Electro", "flex"], notes: "Variante Thundering Fury Kazuha" },
      { name: "Soporte Freeze", members: ["Kokomi", "Cryo", "Cryo", "Anemo"], notes: "" },
      { name: "Habilitadora Vape", members: ["Kokomi", "Xiangling", "Bennett", "flex"], notes: "Core Vaporize Xiangling + Bennett" }
    ],
    summary: "Healer/aplicadora Hydro que escala con HP. Build Arena HP% (o ER), Cáliz Hydro, Corona Bono Curación/HP; ~170-200%+ ER; substats ER > HP%. Habilita Electro-Charged, Freeze y Vape.",
    caveats: "La guía (v2.5) no da % de DPR por constelación salvo el 40% Bono Daño Hydro del C6, ni targets numéricos de substats."
  },
  {
    slug: "arlecchino",
    character: "Arlecchino",
    element: "Pyro",
    found: true,
    kqmUrl: "https://keqingmains.com/q/arlecchino-quickguide/",
    kqmAuthor: "KQM Quick Guide (varios)",
    version: "Luna VIII",
    constellations: [
      { c: "C1", personalDmg: "", note: "Descrita como 'muy útil'; sin porcentaje indicado" },
      { c: "C6", personalDmg: "", note: "Descrita como 'un aumento de daño enorme'; sin porcentaje indicado" }
    ],
    signatureWeapon: { name: "Crimson Moon's Semblance", note: "Arma firma 5★, #1" },
    weaponRanking: [
      "Crimson Moon's Semblance (5★)",
      "Primordial Jade Winged-Spear (5★)",
      "Staff of the Scarlet Sands (5★)",
      "Fractured Halo (5★)",
      "Staff of Homa (5★)",
      "Deathmatch (4★, Battle Pass)"
    ],
    erRequirement:
      "150%+ (Solo Pyro); 140-150% (Double Pyro); 120% (Triple Pyro). Asume Burst cada rotación; sin ER si usas Burst solo una vez cada 2+ rotaciones.",
    artifactMainStats: { sands: "ATK% o EM", goblet: "Bono Daño Pyro", circlet: "CRIT Rate o CRIT DMG" },
    substatPriority: "CRIT > ATK% ≥ EM (Vaporize)",
    statTargets: [{ stat: "ATK", target: "Arlecchino escala con ATK; sin target numérico específico indicado" }],
    teams: [
      { name: "Vape (Double Hydro / Anemo)", members: ["Arlecchino", "Yelan", "Bennett", "Xilonen (o Kazuha/Sucrose)"], notes: "Core Vaporize" },
      { name: "Melt", members: ["Arlecchino", "Citlali", "Bennett", "Xilonen"], notes: "Enfoque Melt" },
      { name: "Overloaded", members: ["Arlecchino", "Chevreuse", "Fischl", "Nicole"], notes: "Overload / buff de Chevreuse" },
      { name: "Mono Pyro", members: ["Arlecchino", "Bennett", "Xilonen", "Kazuha"], notes: "" }
    ],
    summary: "DPS Pyro on-field que escala con ATK, basado en Ataques Normales con Bond of Life. Arena ATK%/EM, Cáliz Pyro, Corona CRIT; substats CRIT > ATK% ≥ EM. ER 120-150%+ según cantidad de Pyro. Mejor en Vape (Yelan/Bennett), Melt, Overload o Mono Pyro.",
    caveats: "La guía extendida necesita autor; data tomada del Quick Guide. Sin DPR numérico por constelación ni targets de substats."
  },
  {
    slug: "xiao",
    character: "Xiao",
    element: "Anemo",
    found: true,
    kqmUrl: "https://keqingmains.com/xiao/",
    kqmAuthor: "Xiao Mains",
    version: "5.5",
    constellations: [],
    signatureWeapon: { name: "Primordial Jade Winged-Spear", note: "BiS" },
    weaponRanking: [
      "Primordial Jade Winged-Spear",
      "Staff of Homa",
      "Lumidouce Elegy",
      "Vortex Vanquisher",
      "Calamity Queller",
      "Staff of the Scarlet Sands",
      "Engulfing Lightning",
      "Skyward Spine"
    ],
    erRequirement:
      "General 120-140% (según batería/equipo). Faruzan pre-C6 140%, Faruzan C6 120-130%, Xianyun 115% (con C6 Faruzan) o 140% (otras baterías).",
    artifactMainStats: { sands: "ATK%", goblet: "Bono Daño Anemo % o ATK%", circlet: "CRIT Rate o CRIT DMG" },
    substatPriority: "20~40% ER > CRIT Rate = CRIT DMG > ATK% > ER extra",
    statTargets: [
      { stat: "CRIT Rate", target: "mínimo 70%+" },
      { stat: "Ratio de CRIT", target: "1:2 Rate:DMG" }
    ],
    teams: [
      { name: "Final Fantasy 20 (FFXX)", members: ["Xiao", "Xianyun", "Furina", "Faruzan C6"], notes: "Equipo premium de end-game" },
      { name: "Hypercarry", members: ["Xiao", "Faruzan", "Bennett/Iansan", "Flex"], notes: "Enfoque tradicional de buffer" },
      { name: "Xiaorina", members: ["Xiao", "Furina", "Healer (Jean/Xianyun/Bennett)", "Flex"], notes: "Daño off-field + buffs" },
      { name: "Triple Anemo", members: ["Xiao", "Faruzan", "Anemo (Jean/Xianyun)", "Flex"], notes: "Baja el requisito de ER" },
      { name: "Double Geo", members: ["Xiao", "Batería", "Zhongli", "Geo (Chiori/Albedo)"], notes: "Escudo + shred de RES" },
      { name: "Double Pyro", members: ["Xiao", "Batería", "Bennett", "Pyro"], notes: "+25% ATK" }
    ],
    summary: "Hypercarry Anemo 5★ que pasa casi todo el tiempo en Burst haciendo la mayoría del daño del equipo; wants alta uptime de plunge + baterías.",
    caveats: "v5.5. La guía NO cuantifica DPR por constelación (descripción cualitativa)."
  },
  {
    slug: "ganyu",
    character: "Ganyu",
    element: "Cryo",
    found: true,
    kqmUrl: "https://keqingmains.com/ganyu/",
    kqmAuthor: "Rare Possum & Prévisible",
    version: "4.0",
    constellations: [
      { c: "C1", personalDmg: "6%", note: "desde C0" },
      { c: "C3", personalDmg: "14%", note: "sobre la previa; ~21% acumulado" },
      { c: "C4", personalDmg: "17.4%", note: "sobre la previa; ~42% acumulado" },
      { c: "C5", personalDmg: "1.2%", note: "sobre la previa; ~44% acumulado" }
    ],
    signatureWeapon: { name: "The First Great Magic", note: "mejor arma en general" },
    weaponRanking: [
      "The First Great Magic",
      "Polar Star",
      "Aqua Simulacra",
      "Hunter's Path (BiS Melt)",
      "Prototype Crescent R5 (mejor F2P)",
      "Hamayumi R5 (mejor forjable Melt)",
      "Scion of the Blazing Sun R5"
    ],
    erRequirement: "Freeze 111% (on-field) / 107% (quickswap); Melt 100%; Mono Cryo 115%.",
    artifactMainStats: { sands: "ATK% (EM en Melt)", goblet: "Bono Daño Cryo %", circlet: "CRIT (o ATK% en Freeze según arma)" },
    substatPriority:
      "Freeze: ER > CRIT DMG ≥ ATK% > CRIT Rate. Melt: EM (a 200) > CRIT > EM > ATK%. Mono Cryo: ER > CRIT DMG > CRIT Rate ≥ ATK%",
    statTargets: [
      { stat: "Freeze", target: "35-45% CR, 1800-2000 ATK, 200% CD" },
      { stat: "Melt", target: "200 EM mínimo, ratio de CRIT 1:2" },
      { stat: "Mono Cryo", target: "1800-2000 ATK, 50-65% CR, 180% CD" }
    ],
    teams: [
      { name: "Freeze", members: ["Ganyu", "Venti", "Kokomi", "Kazuha/Rosaria"], notes: "Excelente en AoE; poca inversión en teammates" },
      { name: "Melt", members: ["Ganyu", "Bennett", "Xiangling", "Zhongli"], notes: "Single-target; ER alto en supports" },
      { name: "Mono Cryo", members: ["Ganyu", "Shenhe", "Kazuha", "Zhongli"], notes: "Bien en single-target y AoE; usa 4pc Blizzard Strayer" }
    ],
    summary: "DPS Cryo con Ataques Cargados especializados + daño off-field vía Burst; brilla en Freeze/Melt/Mono Cryo.",
    caveats: "v4.0. Los % por constelación varían por tipo de equipo (la tabla es de una comp)."
  },
  {
    slug: "yoimiya",
    character: "Yoimiya",
    element: "Pyro",
    found: true,
    kqmUrl: "https://keqingmains.com/yoimiya/",
    kqmAuthor: "mishkaxp & caxia5",
    version: "4.7",
    constellations: [
      { c: "C1", personalDmg: "1-2%", note: "desde C0" },
      { c: "C2", personalDmg: "8%", note: "sobre C1; 9-10% desde C0" },
      { c: "C3", personalDmg: "3-5%", note: "sobre C2; 12-16% desde C0" },
      { c: "C4", personalDmg: "0%", note: "sobre C3; 12-16% desde C0" },
      { c: "C5", personalDmg: "1%", note: "sobre C4; 13-17% desde C0" },
      { c: "C6", personalDmg: "12-15%", note: "sobre C5; 28-32% desde C0. En Vape ~8% por ICD" }
    ],
    signatureWeapon: { name: "Thundering Pulse", note: "R5 126% / R1 111% (vs Slingshot R5 con Bennett)" },
    weaponRanking: [
      "Thundering Pulse",
      "Aqua Simulacra",
      "Rust R5",
      "Slingshot R5",
      "Skyward Harp",
      "Hunter's Path",
      "The First Great Magic",
      "Polar Star",
      "Amos' Bow"
    ],
    erRequirement:
      "Sin requisito de ER — el Burst se usa solo cuando está disponible (cada 2-3 rotaciones) o se saltea. Con 4pc Shimenawa's recupera 15 de energía antes del siguiente Skill si usas Burst.",
    artifactMainStats: { sands: "ATK% / EM", goblet: "Bono Daño Pyro %", circlet: "CRIT Rate / CRIT DMG" },
    substatPriority: "CRIT > ATK% ≥ EM > ER%",
    statTargets: [
      { stat: "Ratio de CRIT", target: "~60/120 mínimo (hypercarry)" },
      { stat: "EM", target: "Valiosa en Vape/Overvape con Bennett/Yun Jin; menos en Pyro puro" }
    ],
    teams: [
      { name: "Vape (Xingqiu)", members: ["Yoimiya", "Xingqiu", "Zhongli", "Bennett"], notes: "Vape single-target cómodo" },
      { name: "Vape (Yelan)", members: ["Yoimiya", "Yelan", "Zhongli", "Bennett"], notes: "Más daño personal que la variante Xingqiu" },
      { name: "VV Vape", members: ["Yoimiya", "Yelan/Xingqiu", "Kazuha", "Bennett"], notes: "AoE con shred de RES" },
      { name: "Overvape", members: ["Yoimiya", "Xingqiu", "Fischl", "Bennett"], notes: "Vaporize + Overload" },
      { name: "Overloaded (Chevreuse)", members: ["Yoimiya", "Fischl", "Chevreuse", "Bennett"], notes: "Pyro/Electro con shred, fácil sin escudo" },
      { name: "Mono Pyro", members: ["Yoimiya", "Bennett", "Xiangling", "Kazuha"], notes: "Pyro puro flexible, buen AoE" }
    ],
    summary: "DPS Pyro a distancia on-field que depende de Ataques Normales; brilla con teammates off-field de daño/soporte.",
    caveats: "v4.7. El Burst normalmente se saltea; casi sin necesidad de ER."
  },
  {
    slug: "kamisato-ayato",
    character: "Kamisato Ayato",
    element: "Hydro",
    found: true,
    kqmUrl: "https://keqingmains.com/ayato/",
    kqmAuthor: "irokei & kolvii",
    version: "5.1",
    constellations: [
      { c: "C1", personalDmg: "6%", note: "desde C0" },
      { c: "C2", personalDmg: "12%", note: "sobre la previa; 20% desde C0" },
      { c: "C3", personalDmg: "19%", note: "sobre la previa; 42% desde C0" },
      { c: "C4", personalDmg: "14%", note: "sobre la previa; 62% desde C0" },
      { c: "C5", personalDmg: "2%", note: "sobre la previa; 66% desde C0" },
      { c: "C6", personalDmg: "18% (unvaped) / 36%+ (vaped)", note: "96% desde C0 unvaped; 126%+ vaped" }
    ],
    signatureWeapon: { name: "Haran Geppaku Futsu", note: "BiS, R1 125% DPS" },
    weaponRanking: [
      "Haran Geppaku Futsu (125%)",
      "Primordial Jade Cutter (124%)",
      "Mistsplitter Reforged (118%)",
      "Uraku Misugiri (108-115%)",
      "Light of Foliar Incision (107-114%)",
      "The Black Sword (100%)",
      "Skyward Blade (99%)"
    ],
    erRequirement:
      "On-field (2 Skills): Solo Hydro 130-160%, Double Electro 115-145%, Double Hydro 120-135%. Burst-oriented (1 Skill): Solo Hydro/Freeze 155-175%, Double Hydro/Nilou 135-170%.",
    artifactMainStats: { sands: "ATK% o ER%", goblet: "Bono Daño Hydro %", circlet: "CRIT DMG/Rate" },
    substatPriority: "ER% (hasta el requisito) > CRIT > ATK% > HP%",
    statTargets: [
      { stat: "ER", target: "Hasta el requisito del equipo/rotación" },
      { stat: "CRIT", target: "Prioriza CRIT tras cumplir ER (ratio ~1:2)" }
    ],
    teams: [
      { name: "Hyperbloom", members: ["Ayato", "Fischl", "Kuki Shinobu", "Nahida"], notes: "Fischl excelente a C6; Kuki cura" },
      { name: "Burgeon", members: ["Ayato", "Thoma", "Nahida", "Baizhu"], notes: "Buen uptime de Burning" },
      { name: "Nilou Bloom", members: ["Ayato", "Nilou", "Nahida", "Baizhu"], notes: "Build EM óptima; rotación de 1 Skill" },
      { name: "Anemo Overvape", members: ["Ayato", "Bennett", "Kazuha", "Fischl"], notes: "Venti alternativo para agrupar" },
      { name: "Vape", members: ["Ayato", "Bennett", "Xiangling", "Fischl"], notes: "Bennett batería; C6 habilita más Vapes" },
      { name: "Electro-Charged", members: ["Ayato", "Fischl", "Beidou", "Kazuha"], notes: "Opción 4pc Thundering Fury" },
      { name: "Freeze", members: ["Ayato", "Ayaka", "Kokomi", "Kazuha"], notes: "Rol secundario de Ayato" }
    ],
    summary: "DPS Hydro on-field flexible que habilita reacciones con aplicación Hydro consistente.",
    caveats: "v5.1."
  },
  {
    slug: "tighnari",
    character: "Tighnari",
    element: "Dendro",
    found: true,
    kqmUrl: "https://keqingmains.com/tighnari/",
    kqmAuthor: "kol & Cuzimori",
    version: "3.8",
    constellations: [
      { c: "C1", personalDmg: "6.5%", note: "desde C0" },
      { c: "C2", personalDmg: "8.7%", note: "sobre la previa; 15.7% desde C0" },
      { c: "C3", personalDmg: "1.7%", note: "sobre la previa; 17.6% desde C0" },
      { c: "C4", personalDmg: "16.5%", note: "sobre la previa; 37.0% desde C0 (solo personal)" },
      { c: "C5", personalDmg: "0.5%", note: "sobre la previa; 37.7% desde C0" },
      { c: "C6", personalDmg: "25.6%+ (mín)", note: "73%+ desde C0 (mín, solo personal)" }
    ],
    signatureWeapon: { name: "Hunter's Path", note: "R1 130.7% (vs Slingshot R5)" },
    weaponRanking: [
      "Hunter's Path (130.7%)",
      "Aqua Simulacra (118.6%)",
      "Polar Star (116.8%)",
      "Thundering Pulse (110.2%)",
      "Skyward Harp (110.1%)",
      "Elegy for the End (102.3-123.5%)",
      "Prototype Crescent R5 (104.9%, mejor F2P)",
      "Slingshot R5 (100%)"
    ],
    erRequirement:
      "2 Skills por Burst: 100-110%. 1 Burst por Skill sin Dendro: 150-160%. Con 1 Dendro: 130-140%.",
    artifactMainStats: { sands: "ATK% o EM", goblet: "Bono Daño Dendro %", circlet: "CRIT Rate o CRIT DMG" },
    substatPriority: "ER (hasta el requisito) > CRIT (ratio 1:2) > ATK% ≈ EM",
    statTargets: [{ stat: "Ratio de CRIT", target: "1:2 Rate:DMG" }],
    teams: [
      { name: "Quickswap (2+ objetivos)", members: ["Tighnari", "Fischl", "Kuki Shinobu", "Kazuha"], notes: "Mejor para 2+ enemigos" },
      { name: "Turret", members: ["Tighnari", "Fischl", "Yae Miko", "Zhongli"], notes: "Rotación simple" },
      { name: "Double Dendro", members: ["Tighnari", "Nahida", "Fischl", "Zhongli"], notes: "" },
      { name: "Double Dendro (corto)", members: ["Tighnari", "Fischl", "Collei", "Bennett"], notes: "Rotación más corta" }
    ],
    summary: "DPS quickswap que dispara Catalyze, aplica Dendro off-field y potencia al teammate Electro con mínimo tiempo en cancha.",
    caveats: "v3.8."
  },
  {
    slug: "alhaitham",
    character: "Alhaitham",
    element: "Dendro",
    found: true,
    kqmUrl: "https://keqingmains.com/q/alhaitham-quickguide/",
    kqmAuthor: "KQM (miannes, irokei, cuppacote…)",
    version: "4.7",
    constellations: [],
    signatureWeapon: { name: "Light of Foliar Incision", note: "BiS single-target" },
    weaponRanking: [
      "Light of Foliar Incision",
      "Primordial Jade Cutter",
      "Mistsplitter Reforged",
      "Haran Geppaku Futsu",
      "Uraku Misugiri (con teammate Geo)",
      "Wolf-Fang R5 (mejor 4★)",
      "Iron Sting",
      "Toukabou Shigure"
    ],
    erRequirement:
      "105-115% (Nahida+Fischl+Electro/Dendro); 120-130% (Nahida); 130-140% (Fischl+Electro o Yaoyao/Kirara/Baizhu); 175-220% (Solo Dendro).",
    artifactMainStats: { sands: "EM > ATK%", goblet: "Bono Daño Dendro %", circlet: "CRIT Rate o CRIT DMG" },
    substatPriority: "ER (hasta el requisito) > 200-300 EM > CRIT > EM > ATK%",
    statTargets: [
      { stat: "Maestría Elemental", target: "200-300 EM tras cumplir ER" },
      { stat: "Ratio de CRIT", target: "~1:2 Rate:DMG" }
    ],
    teams: [
      { name: "Quicken", members: ["Alhaitham", "Yae Miko", "Nahida", "Zhongli"], notes: "También con Fischl+Sara+Kirara" },
      { name: "Hyperbloom/Quickbloom", members: ["Alhaitham", "Kuki Shinobu", "Furina", "Nahida"], notes: "También Shinobu+Yelan+Xingqiu" },
      { name: "Burgeon", members: ["Alhaitham", "Thoma", "Xingqiu", "Baizhu"], notes: "" },
      { name: "Nilou Bloom", members: ["Alhaitham", "Nilou", "Xingqiu", "Baizhu/Kirara/Yaoyao"], notes: "" }
    ],
    summary: "DPS Dendro on-field flexible con daño personal fuerte vía Spread + Projection Attacks que escalan con Skill.",
    caveats: "v4.7 (data del Quick Guide; la guía extendida está en progreso). Sin % por constelación."
  },
  {
    slug: "wanderer",
    character: "Wanderer",
    element: "Anemo",
    found: true,
    kqmUrl: "https://keqingmains.com/wanderer/",
    kqmAuthor: "Emiliabyss",
    version: "3.6",
    constellations: [
      { c: "C1", personalDmg: "6-11%", note: "desde C0" },
      { c: "C2", personalDmg: "14-17%", note: "sobre C1; 25-27% desde C0 (habilita +200% Burst DMG)" },
      { c: "C3", personalDmg: "4-5%", note: "sobre C2; 32-34% desde C0" },
      { c: "C4", personalDmg: "inconsistente", note: "buff A1 aleatorio; sin piso de DPS garantizado" },
      { c: "C5", personalDmg: "3-4%", note: "37-39% desde C0" },
      { c: "C6", personalDmg: "24-27%", note: "sobre C5; 69-75% desde C0" }
    ],
    signatureWeapon: { name: "Tulaytullah's Remembrance", note: "BiS, 130% vanilla" },
    weaponRanking: [
      "Tulaytullah's Remembrance",
      "Memory of Dust (con escudo)",
      "Skyward Atlas",
      "Lost Prayer to the Sacred Winds",
      "The Widsith R5",
      "Dodoco Tales R5",
      "Kagura's Verity",
      "Solar Pearl R5",
      "Blackcliff Agate"
    ],
    erRequirement:
      "C0: 100% ok (Burst en rotaciones alternas). C0 + 4pc Shimenawa's: 130-140%. C2+: 160-170% (C6 Faruzan lo baja ~20-30%). Triple Anemo: mucho menor.",
    artifactMainStats: { sands: "ATK%", goblet: "Bono Daño Anemo % (o ATK% con muchos buffs de ATK%)", circlet: "CRIT" },
    substatPriority: "ATK% > Bono Daño Anemo % > CRIT Rate/DMG (ratio 1:2)",
    statTargets: [{ stat: "Ratio de CRIT", target: "1:2 Rate:DMG" }],
    teams: [
      { name: "Hypercarry", members: ["Wanderer", "Faruzan", "Flex (Zhongli/Yun Jin/Xingqiu)", "Bennett"], notes: "C6 Faruzan muy valiosa" },
      { name: "Sunfire", members: ["Wanderer", "Faruzan", "Jean C4", "Bennett"], notes: "Mejor single-target; caro" },
      { name: "Triple Anemo", members: ["Wanderer", "Faruzan", "Venti/Kazuha/Sucrose", "Bennett"], notes: "Bajo requisito de ER" },
      { name: "Double Hydro", members: ["Wanderer", "Faruzan", "Yelan", "Xingqiu"], notes: "Single-target; Yelan/Xingqiu se bajan el ER" },
      { name: "Double Geo", members: ["Wanderer", "Fischl/Bennett", "Albedo", "Zhongli"], notes: "Bajo ER, sirve multi-target" },
      { name: "Aggravate/Hyperbloom Driver", members: ["Wanderer", "Fischl/Dendro", "Electro", "Hydro"], notes: "Build 4pc VV EM; peor en AoE" }
    ],
    summary: "Hypercarry móvil (vuela) con Ataques Normales a distancia; excelente single-target, sufre en multi-target; depende de C6 Faruzan.",
    caveats: "v3.6."
  },
  {
    slug: "nilou",
    character: "Nilou",
    element: "Hydro",
    found: true,
    kqmUrl: "https://keqingmains.com/nilou/",
    kqmAuthor: ".jdha",
    version: "4.8",
    constellations: [
      { c: "C1", personalDmg: "", note: "Luminous Illusion DMG +65%; Tranquility Aura +6s" },
      { c: "C2", personalDmg: "", note: "Hydro RES y Dendro RES -35%" },
      { c: "C4", personalDmg: "", note: "Burst DMG +50% por 8s" },
      { c: "C6", personalDmg: "", note: "CRIT Rate +0.6% y CRIT DMG +1.2% por cada 1000 Max HP (máx 30%/60%)" }
    ],
    signatureWeapon: { name: "Key of Khaj-Nisut", note: "5★ HP%" },
    weaponRanking: [
      "Key of Khaj-Nisut",
      "Dockhand's Assistant (4★ HP%)",
      "Freedom-Sworn (5★ EM)",
      "Xiphos' Moonlight (4★ EM)",
      "Iron Sting / Toukabou Shigure (F2P EM)"
    ],
    erRequirement:
      "100% con 5-10 partículas Hydro del equipo; 100-110% (1 Skill Xingqiu); 110-120% (1 Skill Yelan); 150-160% (0 partículas, Barbara).",
    artifactMainStats: { sands: "HP%", goblet: "HP%", circlet: "HP%" },
    substatPriority: "HP% > EM > HP plano > ER% > CRIT",
    statTargets: [
      { stat: "HP", target: "objetivo 74,445 Max HP (cap del pasivo A4)" },
      { stat: "Maestría Elemental", target: "de substats, secundaria" }
    ],
    teams: [
      { name: "Double Dendro", members: ["Nilou", "Kokomi/Barbara", "Nahida", "Collei/Yaoyao/Kirara"], notes: "Bountiful Bloom" },
      { name: "Xingqiu/Yelan Double Dendro", members: ["Nilou", "Xingqiu/Yelan", "Nahida", "Alhaitham/Kaveh"], notes: "" },
      { name: "Triple Hydro", members: ["Nilou", "Kokomi/Sigewinne", "Xingqiu/Yelan", "Nahida/Alhaitham"], notes: "" },
      { name: "C6 Forward Vaporize", members: ["Nilou", "Yelan C6", "Kazuha", "Klee/Xiangling"], notes: "" }
    ],
    summary: "Aplicadora Hydro off-field obligatoria para equipos Bountiful Bloom; escala con Max HP y EM.",
    caveats: "v4.8. Sus constelaciones son utilidad (sin % de DPR personal limpio)."
  },
  {
    slug: "tartaglia",
    character: "Tartaglia",
    element: "Hydro",
    found: true,
    kqmUrl: "https://keqingmains.com/tartaglia/",
    kqmAuthor: "mystathi",
    version: "4.6",
    constellations: [
      { c: "C1", personalDmg: "", note: "Flexibilidad de rotación; varía por escenario" },
      { c: "C2", personalDmg: "0%", note: "sin ganancia de DPS" },
      { c: "C3", personalDmg: "10-12%", note: "" },
      { c: "C4", personalDmg: "0-7%", note: "" },
      { c: "C5", personalDmg: "5%", note: "" },
      { c: "C6", personalDmg: "incierto", note: "no resuelve problemas de sus equipos C0-C5" }
    ],
    signatureWeapon: { name: "Polar Star", note: "BiS (pre-stacked)" },
    weaponRanking: [
      "Polar Star",
      "Aqua Simulacra",
      "Hunter's Path",
      "Skyward Harp",
      "Thundering Pulse",
      "The First Great Magic",
      "Amos' Bow",
      "Viridescent Hunt",
      "Scion of the Blazing Sun",
      "Prototype Crescent (pre-stacked)"
    ],
    erRequirement:
      "Burst a distancia (recomendado): 125-145% (0 Charged Shots), 115-130% (1 CS), 110-120% (2 CS), 100-110% (3 CS). Melee (no recomendado): mucho más alto (155-225%).",
    artifactMainStats: { sands: "ATK%", goblet: "Bono Daño Hydro %", circlet: "CRIT Rate o CRIT DMG" },
    substatPriority: "ER% (hasta el requisito) > CRIT > ATK% > EM > ATK plano",
    statTargets: [
      { stat: "ER", target: "Hasta el requisito según Charged Shots por rotación" },
      { stat: "Ratio de CRIT", target: "~1:2 Rate:DMG" }
    ],
    teams: [
      { name: "International", members: ["Tartaglia", "Bennett", "Xiangling", "Kazuha"], notes: "Comp estándar (la página de equipos de KQM estaba desactualizada)" },
      { name: "Childe Vaporize", members: ["Tartaglia", "Xiangling", "Bennett", "Zhongli/Kazuha"], notes: "" },
      { name: "Taser", members: ["Tartaglia", "Fischl", "Beidou", "Sucrose/Kazuha"], notes: "Electro-Charged" }
    ],
    summary: "Habilitador/DPS Hydro on-field: aplicación Hydro rápida en Melee + Burst front-loaded fuerte.",
    caveats: "v4.6. La página de equipos de KQM estaba desactualizada; comps listadas son las estándar conocidas."
  },
  {
    slug: "yae-miko",
    character: "Yae Miko",
    element: "Electro",
    found: true,
    kqmUrl: "https://keqingmains.com/yae-miko/",
    kqmAuthor: "rarepossum",
    version: "4.5",
    constellations: [
      { c: "C1", personalDmg: "0-14%", note: "desde C0" },
      { c: "C2", personalDmg: "0-16%", note: "sobre C1; 14-30% desde C0" },
      { c: "C3", personalDmg: "10-16%", note: "sobre C2; 23-45% desde C0" },
      { c: "C4", personalDmg: "10-18%", note: "sobre C3; 40-60% desde C0" },
      { c: "C5", personalDmg: "2-6%", note: "sobre C4; 45-70% desde C0" },
      { c: "C6", personalDmg: "22-30%", note: "sobre C5; 75-110% desde C0" }
    ],
    signatureWeapon: { name: "Kagura's Verity", note: "127-143%" },
    weaponRanking: [
      "Kagura's Verity (127-143%)",
      "Solar Pearl (114-121%)",
      "Tome of the Eternal Flow (118%)",
      "Lost Prayer to the Sacred Winds (116-117%)",
      "Cashflow Supervision (115-122%)",
      "Oathsworn Eye R5 (110%)",
      "The Widsith (105-110%)",
      "Skyward Atlas (109-116%)"
    ],
    erRequirement:
      "Con Raiden: 140-150% (C0) / 100% (C1). Off-field con Fischl: 130% (C0)/100%. On-field con Fischl: 100-110%. Armas Favonius bajan ~10% por proc.",
    artifactMainStats: { sands: "ATK% / EM / ER%", goblet: "Bono Daño Electro %", circlet: "CRIT Rate o CRIT DMG" },
    substatPriority: "ER% (hasta el requisito) > CRIT > ATK% ≥ EM",
    statTargets: [
      { stat: "Maestría Elemental", target: "Solo valiosa en equipos Aggravate" },
      { stat: "Ratio de CRIT", target: "~1:2 Rate:DMG" }
    ],
    teams: [
      { name: "Raikou", members: ["Yae Miko", "Raiden", "Kazuha", "Bennett"], notes: "" },
      { name: "Aggravate", members: ["Yae Miko", "Raiden", "Dendro (Baizhu/Nahida)", "Flex"], notes: "" },
      { name: "Mono Electro", members: ["Yae Miko", "Raiden", "Sara C6", "Jean/Kazuha"], notes: "" },
      { name: "Fischl Aggravate", members: ["Yae Miko", "Fischl", "Dendro", "Anemo"], notes: "" },
      { name: "Electro-Charged", members: ["Yae Miko", "Fischl", "Hydro", "Anemo"], notes: "" }
    ],
    summary: "DPS Electro off-field versátil con buen daño personal y aplicación Electro consistente.",
    caveats: "v4.5."
  },
  {
    slug: "mona",
    character: "Mona",
    element: "Hydro",
    found: true,
    kqmUrl: "https://keqingmains.com/mona/",
    kqmAuthor: "KQM",
    version: "2.4",
    constellations: [
      { c: "C1", personalDmg: "+15%", note: "Vaporize/EC/Hydro Swirl DMG (condicional a Omen)" },
      { c: "C4", personalDmg: "", note: "+15% CRIT Rate al equipo (condicional a Omen)" },
      { c: "C6", personalDmg: "", note: "'demasiado gimmicky'; sin aumento de daño indicado" }
    ],
    signatureWeapon: { name: "The Widsith", note: "4★" },
    weaponRanking: [
      "Skyward Atlas",
      "Lost Prayer to the Sacred Winds",
      "The Widsith",
      "Mappa Mare",
      "Favonius Codex (soporte)",
      "Thrilling Tales of Dragon Slayers (soporte)"
    ],
    erRequirement: "Freeze: 200-300% (según rotación/partículas). Soporte: ~200% mínimo para uptime off-field.",
    artifactMainStats: { sands: "ATK% (DPS) / ER% (soporte)", goblet: "Bono Daño Hydro %", circlet: "CRIT Rate o CRIT DMG" },
    substatPriority: "DPS: CRIT (1:2) > ATK% > EM. Soporte: ER% (hasta off-cooldown) > CRIT > ATK%",
    statTargets: [
      { stat: "Ratio de CRIT", target: "1:2 (build DPS)" },
      { stat: "ER", target: "~200%+ para rol de soporte off-field" }
    ],
    teams: [
      { name: "Freeze", members: ["Ganyu/Ayaka", "Diona", "Venti/Kazuha", "Mona"], notes: "Extiende Omen; su especialidad" },
      { name: "Vaporize (sostenido)", members: ["Mona", "Bennett", "Xiangling", "Kazuha/Sucrose"], notes: "" },
      { name: "Vaporize (nuke)", members: ["Mona", "Bennett", "Sucrose", "Klee/Zhongli"], notes: "" },
      { name: "Electro-Charged", members: ["Mona", "Fischl", "Beidou", "healer/shielder"], notes: "" }
    ],
    summary: "Soporte Hydro flexible: buff de DMG% (Omen) + aplicación Hydro; brilla en Freeze.",
    caveats: "v2.4 (guía vieja)."
  },
  {
    slug: "zhongli",
    character: "Zhongli",
    element: "Geo",
    found: true,
    kqmUrl: "https://keqingmains.com/zhongli/",
    kqmAuthor: "KQM",
    version: "3.1",
    constellations: [
      { c: "C1", personalDmg: "", note: "Puede existir un segundo Stele a la vez" },
      { c: "C2", personalDmg: "", note: "El Burst da Jade Shield (la más valiosa)" },
      { c: "C6", personalDmg: "", note: "40% del daño entrante se convierte en HP (máx 8% Max HP por instancia)" }
    ],
    signatureWeapon: { name: "Staff of Homa", note: ">50% HP" },
    weaponRanking: [
      "Staff of Homa",
      "Black Tassel (HP%, Shield Bot)",
      "Favonius Lance",
      "Wavebreaker's Fin R5",
      "Calamity Queller",
      "Primordial Jade Winged-Spear"
    ],
    erRequirement:
      "Shield Bot: no requiere energía. Burst Support: 100-110% (solo Geo) o 120-140% (dual Geo) para Burst en rotaciones alternas; 175-220% (solo) para cada rotación.",
    artifactMainStats: { sands: "HP% (Shield Bot) / ATK% (Burst Support)", goblet: "HP% / Bono Daño Geo %", circlet: "HP% o CRIT Rate" },
    substatPriority: "Shield Bot: HP% / HP plano > CRIT Rate. Burst Support: ER% > CRIT / ATK% / HP%.",
    statTargets: [
      { stat: "HP", target: "Apila HP% (Shield Bot escala con HP)" },
      { stat: "ER", target: "Según build/rotación (Shield Bot no necesita)" }
    ],
    teams: [
      { name: "Shield Bot (flex universal)", members: ["Zhongli", "+ cualquier core (Hu Tao/Xiao/Yoimiya…)"], notes: "El escudo más fuerte del juego + shred de RES universal, mínima inversión" },
      { name: "Physical DPS (Pikeli)", members: ["Zhongli", "Beidou", "Fischl", "Xingqiu/Yelan"], notes: "Driver de Ataques Normales con Crescent Pike" },
      { name: "Hybrid DPS", members: ["Zhongli", "Geo (Albedo/Yun Jin/Ningguang)", "Flex", "Flex"], notes: "Daño Físico + Geo" },
      { name: "Microwave", members: ["Zhongli", "Geo Traveler", "Albedo/Itto", "Flex"], notes: "Resonancia de constructos Geo" }
    ],
    summary: "El mejor escudero del juego: escudo universal + shred de RES + resistencia a interrupción con mínima inversión (C2 lo hace óptimo).",
    caveats: "v3.1 (guía vieja). Sus constelaciones son utilidad (sin % de DPR personal)."
  },
  {
    slug: "xilonen",
    character: "Xilonen",
    element: "Geo",
    found: true,
    kqmUrl: "https://keqingmains.com/q/xilonen-quickguide/",
    kqmAuthor: "caramielle. (KQM)",
    version: "5.4",
    constellations: [
      { c: "C1", personalDmg: "", note: "Consumo de Nightsoul -30%, tiempo +45%, resistencia a interrupción" },
      { c: "C2", personalDmg: "", note: "Buffs por elemento (Geo +50% DMG, Pyro +45% ATK, Hydro +45% HP, Cryo +60% CD, Electro energía+CD)" },
      { c: "C4", personalDmg: "", note: "'Blooming Blessing' 15s: 65% DEF como bono de daño NA/CA/Plunge" },
      { c: "C6", personalDmg: "", note: "300% DEF como bono de daño NA/Plunge por 5s; cura 120% DEF cada 1.5s" }
    ],
    signatureWeapon: { name: "Peak Patrol Song", note: "5★ firma" },
    weaponRanking: ["Peak Patrol Song", "Favonius Sword", "Freedom-Sworn", "Xiphos' Moonlight"],
    erRequirement:
      "Solo Geo: 170-190% (1 Skill) / 115-125% (2 Skills). Double Geo: ~150% (1) / 100-105% (2). Favonius Sword baja ~30-40% en solo Geo.",
    artifactMainStats: { sands: "ER o DEF%", goblet: "DEF%", circlet: "DEF% / CRIT Rate (con Favonius) / Bono de Curación" },
    substatPriority: "ER (hasta el requisito) > CRIT Rate (si usas Favonius) > DEF% (hasta 3200 DEF con arma sig.) > DEF plano",
    statTargets: [
      { stat: "DEF", target: "hasta ~3200 DEF con arma sig. (nivel 80/90)" },
      { stat: "ER", target: "según Skills por rotación (ver requisito)" }
    ],
    teams: [
      { name: "Neuvillette (Mono Hydro)", members: ["Xilonen", "Neuvillette", "Furina", "Flex"], notes: "Hypercarry Hydro" },
      { name: "Arlecchino / Lyney (Mono Pyro)", members: ["Xilonen", "Arlecchino/Lyney", "Bennett", "Flex"], notes: "" },
      { name: "Mavuika (Pyro on-field)", members: ["Xilonen", "Mavuika", "Bennett", "Citlali/Furina"], notes: "" },
      { name: "Clorinde (Aggravate)", members: ["Xilonen", "Clorinde", "Fischl", "Kirara/Nahida"], notes: "" },
      { name: "Navia (Geo)", members: ["Xilonen", "Navia", "Fischl/Furina", "Bennett"], notes: "" }
    ],
    summary: "Soporte Geo generalista que escala con DEF: shred de RES, bono de daño (4pc Scroll) y curación single-target vía Burst.",
    caveats: "v5.4 (quick guide; la extendida no tiene autor). Constelaciones = buffs de equipo, no % de DPR personal."
  },
  {
    slug: "clorinde",
    character: "Clorinde",
    element: "Electro",
    found: true,
    kqmUrl: "https://keqingmains.com/q/clorinde-quickguide/",
    kqmAuthor: "euphorysm (KQM)",
    version: "5.7",
    constellations: [
      { c: "C1", personalDmg: "", note: "2 ataques coordinados (30% ATK c/u) cada 1.2s en Night Vigil" },
      { c: "C2", personalDmg: "", note: "Buff A1 de 20%→30% ATK; +0.3 resistencia a interrupción a max stacks" },
      { c: "C4", personalDmg: "", note: "Último Lightfall +2% de daño por cada 1% de Bond of Life (máx +200%)" },
      { c: "C6", personalDmg: "", note: "+10% CR, +70% CD 12s tras Skill; hasta 6 Glimbright Shades (200% ATK); 80% reducción de daño en Night Vigil" }
    ],
    signatureWeapon: { name: "Absolution", note: "5★ firma" },
    weaponRanking: [
      "Absolution",
      "Haran Geppaku Futsu",
      "Uraku Misugiri / Mistsplitter Reforged",
      "The Black Sword",
      "Finale of the Deep (forjable)",
      "Calamity of Eshu (con escudo)",
      "Harbinger of Dawn (pasiva activa)"
    ],
    erRequirement:
      "Solo Electro: 200%+ (Burst cada combo) o 110-130% (combos alternos). Double Electro: 120-140% (cada combo) o 100% (alternos). Favonius baja ~10% por proc.",
    artifactMainStats: { sands: "ATK% / (EM)", goblet: "Bono Daño Electro %", circlet: "CRIT Rate / CRIT DMG" },
    substatPriority: "ER (hasta el requisito) > CRIT >> ATK% >> (EM)",
    statTargets: [{ stat: "Ratio de CRIT", target: "CRIT = stat de mayor valor en todos los arquetipos (~1:2)" }],
    teams: [
      { name: "Aggravate", members: ["Clorinde", "Fischl", "Nahida", "Kazuha"], notes: "" },
      { name: "Quickbloom", members: ["Clorinde", "Fischl", "Nahida", "Furina/Yelan"], notes: "" },
      { name: "Quickburn", members: ["Clorinde", "Fischl", "Emilie", "Mavuika/Xiangling"], notes: "" },
      { name: "Overload", members: ["Clorinde", "Chevreuse", "Sara", "Mavuika/Pyro Traveler"], notes: "" },
      { name: "Electro-Charged", members: ["Clorinde", "Furina", "Kazuha", "Ororon/Fischl"], notes: "" }
    ],
    summary: "DPS Electro on-field flexible, gameplay rápido de disparo+embestida con Bond of Life.",
    caveats: "v5.7 (quick guide; la extendida no tiene autor)."
  },
  {
    slug: "navia",
    character: "Navia",
    element: "Geo",
    found: true,
    kqmUrl: "https://keqingmains.com/navia/",
    kqmAuthor: "Rezmir",
    version: "Luna VII",
    constellations: [
      { c: "C1", personalDmg: "0-12%", note: "reduce energía y CD del Burst" },
      { c: "C2", personalDmg: "16-30%", note: "+36% CRIT Rate al Skill, hit extra del Burst" },
      { c: "C3", personalDmg: "28-44%", note: "+3 niveles de Skill" },
      { c: "C4", personalDmg: "38-58%", note: "20% shred de RES Geo" },
      { c: "C5", personalDmg: "42-62%", note: "+3 niveles de Burst" },
      { c: "C6", personalDmg: "84-110%", note: "hasta +135% CRIT DMG al Skill, refund de stacks" }
    ],
    signatureWeapon: { name: "Verdict", note: "5★ firma" },
    weaponRanking: [
      "Verdict",
      "Gest of the Mighty Wolf (136%)",
      "A Thousand Blazing Suns (124%)",
      "Serpent Spine R5 (120%)",
      "Beacon of the Reed Sea (119%)",
      "Redhorn Stonethresher (116%)",
      "Fang of the Mountain King (111%)",
      "The Unforged (111%)",
      "Talking Stick R5 (110%)",
      "UOMMS R5 (100%, F2P forjable)"
    ],
    erRequirement:
      "Con Xilonen/Geo Traveler/Ningguang: 100-130% (C0) / 100-110% (C1). Chiori/Kachina/Albedo/Zhongli: 130-150% / 110-130%. Alto: 155-180% / 135-150%.",
    artifactMainStats: { sands: "ATK%", goblet: "Bono Daño Geo % (o ATK% con mucho DMG%)", circlet: "CRIT Rate o CRIT DMG (ratio 1:2)" },
    substatPriority: "ER (hasta el requisito) > CRIT > ATK%. Evita EM y DEF%.",
    statTargets: [{ stat: "Ratio de CRIT", target: "1:2 Rate:DMG" }],
    teams: [
      { name: "Navia-Xilonen-Furina-Bennett", members: ["Navia", "Xilonen", "Furina", "Bennett"], notes: "Maximiza daño personal" },
      { name: "Doble DPS (Ningguang)", members: ["Navia", "Xilonen", "Ningguang", "Furina/Bennett"], notes: "Ningguang como DPS secundario" },
      { name: "Navia-Chiori-Fischl-Bennett", members: ["Navia", "Chiori", "Fischl", "Bennett"], notes: "Sinergia de constructo Chiori" },
      { name: "F2P (Kachina)", members: ["Navia", "Kachina", "Xiangling", "Bennett"], notes: "Opción accesible" }
    ],
    summary: "DPS Geo con claymore cuyo Skill escala con las esquirlas de Crystallize.",
    caveats: "Actualizada para 'Luna VII' (nomenclatura nueva de versiones)."
  },
  {
    slug: "fischl",
    character: "Fischl",
    element: "Electro",
    found: true,
    kqmUrl: "https://keqingmains.com/fischl/",
    kqmAuthor: "KQM",
    version: "4.7",
    constellations: [
      { c: "C6", personalDmg: "", note: "Oz +2s de duración y hace ataques coordinados con el personaje activo (30% del ATK de Fischl como daño Electro). Mejora daño, aplicación, energía y QoL." }
    ],
    signatureWeapon: { name: "Polar Star", note: "BiS 5★" },
    weaponRanking: [
      "Polar Star",
      "Hunter's Path",
      "Aqua Simulacra",
      "The First Great Magic",
      "Thundering Pulse",
      "Skyward Harp",
      "The Stringless (Aggravate)",
      "Alley Hunter",
      "Prototype Crescent (F2P)",
      "Fading Twilight (F2P)"
    ],
    erRequirement:
      "Solo Electro (Skill+Burst ~40s): 120-140% (C0) / 110-125% (C6). Double Electro: 100%. Solo Electro (~25s): 130-170% (C0) / 120-155% (C6).",
    artifactMainStats: { sands: "ATK% o EM (Aggravate)", goblet: "Bono Daño Electro %", circlet: "CRIT Rate o CRIT DMG" },
    substatPriority: "Aggravate: ER% (hasta el requisito) > CRIT > ATK% = EM. No-Aggravate: ER% > CRIT > ATK%.",
    statTargets: [{ stat: "Ratio de CRIT", target: "1:2 Rate:DMG" }],
    teams: [
      { name: "Quicken", members: ["Fischl", "Dendro (Nahida/Alhaitham/Tighnari)", "Flex (Kazuha/Zhongli)", "Flex"], notes: "" },
      { name: "Hyperbloom", members: ["Fischl", "Electro/Anemo", "Nahida", "Xingqiu"], notes: "" },
      { name: "Electro-Charged", members: ["Fischl", "Xingqiu/Yelan", "Flex", "Flex"], notes: "" },
      { name: "Overvape", members: ["Fischl", "Hu Tao/Yoimiya", "Hydro", "Flex"], notes: "" },
      { name: "Aggravate/Spread", members: ["Fischl", "Keqing/Raiden", "Dendro", "Buffer"], notes: "" }
    ],
    summary: "El mejor DPS Electro off-field y batería: alta aplicación Electro + generación de partículas para equipos de reacción.",
    caveats: "v4.7. C6 es el gran salto (Oz coordinado)."
  },
  {
    slug: "sucrose",
    character: "Sucrose",
    element: "Anemo",
    found: true,
    kqmUrl: "https://keqingmains.com/sucrose/",
    kqmAuthor: "KQM",
    version: "3.4",
    constellations: [
      { c: "C1", personalDmg: "", note: "+1 carga de Skill" },
      { c: "C6", personalDmg: "", note: "La absorción elemental del Burst da +20% Bono de Daño del elemento absorbido" }
    ],
    signatureWeapon: { name: "Sacrificial Fragments", note: "sin arma firma; mejor 4★ EM (+carga extra)" },
    weaponRanking: [
      "Sacrificial Fragments",
      "A Thousand Floating Dreams",
      "Wandering Evenstar (equipos ATK%)",
      "Thrilling Tales of Dragon Slayers",
      "Magic Guide"
    ],
    erRequirement: "On-field: 120-140%. Off-field: 160-180% (sin procs de Favonius).",
    artifactMainStats: { sands: "EM", goblet: "EM", circlet: "EM" },
    substatPriority: "ER% (hasta el requisito) > EM",
    statTargets: [
      { stat: "Maestría Elemental", target: "Apila EM (comparte EM al equipo vía A1/A4)" },
      { stat: "ER", target: "120-180% según rol on/off-field" }
    ],
    teams: [
      { name: "Taser (driver)", members: ["Sucrose", "Xingqiu", "Fischl", "Beidou"], notes: "" },
      { name: "Sukokomon", members: ["Sucrose", "Kokomi", "Fischl", "Xiangling"], notes: "" },
      { name: "Overvape", members: ["Sucrose", "Hu Tao", "Xingqiu", "Fischl"], notes: "" },
      { name: "Aggravate", members: ["Sucrose", "Dendro (DMC/Nahida)", "Fischl", "Yae/Kuki"], notes: "" },
      { name: "Hyperbloom", members: ["Sucrose", "Nahida", "Fischl", "Kokomi"], notes: "" }
    ],
    summary: "Buffer/driver Anemo que escala con EM: dispara Swirl y agrupa; comparte EM al equipo.",
    caveats: "v3.4."
  },
  {
    slug: "xianyun",
    character: "Xianyun",
    element: "Anemo",
    found: true,
    kqmUrl: "https://keqingmains.com/q/xianyun-quickguide/",
    kqmAuthor: "irokei (KQM)",
    version: "4.7",
    constellations: [
      { c: "C1", personalDmg: "", note: "Carga adicional de Skill" },
      { c: "C2", personalDmg: "", note: "+20% ATK 15s tras Skill; duplica el bono del pasivo A4 (400% ATK, cap 18,000)" },
      { c: "C6", personalDmg: "", note: "+CRIT DMG al Plunge (15-70%); sin CD de Skill por 16s tras Burst (máx 8 usos)" }
    ],
    signatureWeapon: { name: "Crane's Echoing Call", note: "5★ firma" },
    weaponRanking: [
      "Crane's Echoing Call",
      "Favonius Codex",
      "Oathsworn Eye",
      "Thrilling Tales of Dragon Slayers",
      "Prototype Amber R5"
    ],
    erRequirement:
      "Solo Anemo: 190-260% (Crane's R1) / 220-300% (otras). Xiao: 140-150% (Crane's) / 200-210% (otras). Xiao + C6 Faruzan: 100% (Crane's) / 120-130%.",
    artifactMainStats: { sands: "ER% o ATK%", goblet: "ATK%", circlet: "ATK% (o CRIT Rate con Favonius)" },
    substatPriority: "ER% (hasta el requisito) > ATK% ≥ ATK plano (máx 4500 ATK) >> EM > CRIT",
    statTargets: [
      { stat: "ATK", target: "cap efectivo ~4500 ATK" },
      { stat: "ER", target: "según equipo (ver requisito)" }
    ],
    teams: [
      { name: "Xiao Hypercarry", members: ["Xianyun", "Xiao", "Faruzan", "Furina/Bennett"], notes: "" },
      { name: "Gaming", members: ["Xianyun", "Gaming", "Furina", "Bennett"], notes: "" },
      { name: "Hu Tao Plunge", members: ["Xianyun", "Hu Tao", "Furina", "Yelan"], notes: "" },
      { name: "Diluc", members: ["Xianyun", "Diluc", "Xingqiu", "Bennett"], notes: "" }
    ],
    summary: "Soporte Anemo off-field: curación de equipo + buff a Ataques de Descenso (Plunge) + daño Anemo coordinado.",
    caveats: "v4.7 (quick guide; la extendida no tiene autor). Escala con ATK (cap ~4500)."
  },
  {
    slug: "keqing",
    character: "Keqing",
    element: "Electro",
    found: true,
    kqmUrl: "https://keqingmains.com/keqing/",
    kqmAuthor: "dusted wind",
    version: "Luna VII",
    constellations: [
      { c: "C1", personalDmg: "+2%", note: "2% desde C0 (Aggravate)" },
      { c: "C2", personalDmg: "0%", note: "2% desde C0" },
      { c: "C3", personalDmg: "+3%", note: "5% desde C0" },
      { c: "C4", personalDmg: "+6%", note: "12% desde C0" },
      { c: "C5", personalDmg: "+3%", note: "15% desde C0" },
      { c: "C6", personalDmg: "+10%", note: "26% desde C0" }
    ],
    signatureWeapon: { name: "Mistsplitter Reforged", note: "120% de Lion's Roar R1" },
    weaponRanking: [
      "Mistsplitter Reforged (120%)",
      "Primordial Jade Cutter (118%)",
      "Haran Geppaku Futsu (115%)",
      "Uraku Misugiri (115-121%)",
      "Light of Foliar Incision (111%)",
      "Wolf-Fang R5 (110%, mejor 4★)",
      "Freedom-Sworn (108%)",
      "Lion's Roar R5 (109%)"
    ],
    erRequirement:
      "Prácticamente inexistente en la mayoría de sus equipos (su A4 cubre); 140-150% solo en casos raros (Solo Electro o mala generación de partículas).",
    artifactMainStats: { sands: "ATK% / EM", goblet: "Bono Daño Electro %", circlet: "CRIT" },
    substatPriority: "Aggravate: CRIT > ATK% = EM (EM supera ATK% sin buffs). Quickbloom: CRIT ≥ EM > ATK%.",
    statTargets: [
      { stat: "Ratio de CRIT", target: "CRIT muy valiosa (~1:2)" },
      { stat: "Maestría Elemental", target: "Compite con ATK% en Aggravate/Quickbloom" }
    ],
    teams: [
      { name: "Aggravate", members: ["Keqing", "Fischl", "Nahida", "Kazuha"], notes: "Premium; gran daño, sin sustain" },
      { name: "Aggravate + escudo", members: ["Keqing", "Fischl", "Nahida", "Xilonen"], notes: "Seguro y flexible" },
      { name: "4★", members: ["Keqing", "Fischl", "Kirara", "Sucrose"], notes: "Solo 4★, competitivo" },
      { name: "Quickbloom", members: ["Keqing", "Lauma", "Xingqiu", "Ineffa"], notes: "Alta contribución de Hyperbloom" }
    ],
    summary: "DPS Electro on-field de golpes rápidos; brilla en Quicken/Aggravate con rotaciones flexibles e iframes de Burst.",
    caveats: "v'Luna VII'. Limitada por powercreep y constelaciones débiles vs DPS 5★ nuevos."
  },
  {
    slug: "eula",
    character: "Eula",
    element: "Cryo",
    found: true,
    kqmUrl: "https://keqingmains.com/eula/",
    kqmAuthor: "Sitri",
    version: "2.7",
    constellations: [
      { c: "C1", personalDmg: "10.5%", note: "promedio desde C0" },
      { c: "C2", personalDmg: "<1%", note: "sobre C1; 10.5% desde C0" },
      { c: "C3", personalDmg: "17.8%", note: "sobre C2; 30.2% desde C0" },
      { c: "C4", personalDmg: "6%", note: "sobre C3; 38% desde C0" },
      { c: "C5", personalDmg: "1.8%", note: "sobre C4; 38% desde C0" },
      { c: "C6", personalDmg: "40.6%", note: "sobre C5; 97.7% desde C0" }
    ],
    signatureWeapon: { name: "Song of Broken Pines", note: "BiS" },
    weaponRanking: [
      "Song of Broken Pines",
      "Wolf's Gravestone",
      "The Unforged",
      "Skyward Pride",
      "Redhorn Stonethresher",
      "Serpent Spine (mejor 4★)",
      "Luxurious Sea-Lord (mejor F2P)"
    ],
    erRequirement:
      "Favonius Rosaria + Sac Diona: 120-130%. Favonius Rosaria sola: 145-155%. Sac Diona sola: 150-160%. Raiden+Rosaria+Sac Diona: 100%.",
    artifactMainStats: { sands: "ATK% (ER% solo si necesario)", goblet: "Bono Daño Físico %", circlet: "CRIT Rate o CRIT DMG" },
    substatPriority: "ER% (hasta uptime cómodo de Burst) > CRIT DMG/Rate > ATK%",
    statTargets: [
      { stat: "CRIT", target: "objetivos suaves: 70% CR, 150% CD (200% con arma CRIT)" },
      { stat: "ER", target: "130-140%" }
    ],
    teams: [
      { name: "Fischl Triple Cryo", members: ["Eula", "Fischl", "Rosaria", "Diona"], notes: "Principiante/F2P" },
      { name: "Raiden Triple Cryo", members: ["Eula", "Raiden", "Rosaria", "Diona"], notes: "0% ER posible con Sac Diona" },
      { name: "Raiden Zhongli", members: ["Eula", "Raiden", "Rosaria", "Zhongli"], notes: "Estándar, fácil" },
      { name: "Mono Cryo", members: ["Eula", "Shenhe", "Rosaria", "Zhongli"], notes: "100% Resonancia Cryo" }
    ],
    summary: "Hypercarry Físico de alta inversión con Burst backloaded; requiere posicionamiento y conocimiento del enemigo.",
    caveats: "v2.7 (guía vieja, 2022)."
  },
  {
    slug: "arataki-itto",
    character: "Arataki Itto",
    element: "Geo",
    found: true,
    kqmUrl: "https://keqingmains.com/itto/",
    kqmAuthor: "Merp, Prévisible, nxriaki",
    version: "3.1",
    constellations: [
      { c: "C1", personalDmg: "6.02%", note: "desde C0" },
      { c: "C2", personalDmg: "2.5%", note: "sobre C1; 8.66% desde C0" },
      { c: "C3", personalDmg: "3.76%", note: "sobre C2; 12.75% desde C0" },
      { c: "C4", personalDmg: "6.72%", note: "sobre C3; 20.33% desde C0" },
      { c: "C5", personalDmg: "11.42%", note: "sobre C4; 34.07% desde C0" },
      { c: "C6", personalDmg: "40.42%", note: "sobre C5; 88.25% desde C0" }
    ],
    signatureWeapon: { name: "Redhorn Stonethresher", note: "R1 136.5% / R5 159.3%" },
    weaponRanking: [
      "Redhorn Stonethresher (136.5%)",
      "Serpent Spine R1 (114.31%)",
      "Skyward Pride (102.3%)",
      "Blackcliff Slasher (104.67%)",
      "Whiteblind R5 (104.91%)"
    ],
    erRequirement: "Apunta a 130-140% con substats; no usar Arena de ER%.",
    artifactMainStats: { sands: "DEF%", goblet: "Bono Daño Geo %", circlet: "CRIT Rate/DMG" },
    substatPriority: "ER% (si no se cumple el requisito) > CRIT DMG/Rate > DEF%",
    statTargets: [
      { stat: "DEF", target: "Escala con DEF (Arena/Cáliz DEF%)" },
      { stat: "Ratio de CRIT", target: "~1:2 Rate:DMG" }
    ],
    teams: [
      { name: "Mono Geo", members: ["Itto", "Gorou", "Albedo", "Zhongli"], notes: "Cómodo, escudo fuerte" },
      { name: "Triple Geo + cura", members: ["Itto", "Gorou", "Albedo", "Diona"], notes: "" },
      { name: "Microwave", members: ["Itto", "Geo Traveler", "Zhongli", "Gorou"], notes: "Resonancia de constructos; C1 Zhongli" }
    ],
    summary: "El primer Main DPS Geo 5★; hypercarry rápido que escala con DEF.",
    caveats: "v3.1."
  },
  {
    slug: "klee",
    character: "Klee",
    element: "Pyro",
    found: true,
    kqmUrl: "https://keqingmains.com/klee/",
    kqmAuthor: "jamie9248",
    version: "4.5",
    constellations: [
      { c: "C1", personalDmg: "", note: "Mejora daño y aplicación elemental" },
      { c: "C2", personalDmg: "13-18% (equipo)", note: "shred de DEF" },
      { c: "C3", personalDmg: "~18-21%", note: "multiplicativo al daño del Skill" },
      { c: "C4", personalDmg: "", note: "555% ATK como AoE Pyro al salir del Burst" },
      { c: "C5", personalDmg: "~18-21%", note: "multiplicativo al daño del Burst" },
      { c: "C6", personalDmg: "", note: "Su constelación menos útil (+10% Bono Daño Pyro)" }
    ],
    signatureWeapon: { name: "The Widsith R5", note: "sin arma firma exclusiva; mejor catalizador (147.2%)" },
    weaponRanking: [
      "The Widsith R5 (147.2%)",
      "Polar Star (135.6%)",
      "Primordial Jade Cutter (135.5%)",
      "Kagura's Verity (130%)",
      "Tome of the Eternal Flow / Cashflow Supervision (equipos Furina)",
      "Lost Prayer / Skyward Atlas",
      "Solar Pearl R5"
    ],
    erRequirement:
      "Con Bennett: pocas tiradas de ER. Solo Pyro ~140%. Mono Pyro (Kazuha): 125% (peleas largas)/100% (<40s). Furina (Kazuha): 130%/105%. Reverse Vape (Xingqiu): 125%/100%.",
    artifactMainStats: { sands: "ATK%", goblet: "Bono Daño Pyro %", circlet: "CRIT Rate o CRIT DMG" },
    substatPriority: "ER (hasta el requisito) > CRIT > ATK% ≈ EM",
    statTargets: [{ stat: "Ratio de CRIT", target: "~1:2 Rate:DMG" }],
    teams: [
      { name: "Furina", members: ["Klee", "Bennett", "Furina", "Kazuha"], notes: "" },
      { name: "Reverse Vaporize", members: ["Klee", "Bennett", "Xingqiu", "Yelan"], notes: "" },
      { name: "Mono Pyro", members: ["Klee", "Bennett", "Xiangling", "Kazuha"], notes: "" },
      { name: "National", members: ["Klee", "Bennett", "Xiangling", "Xingqiu"], notes: "" }
    ],
    summary: "DPS Pyro on-field expresiva con alto AoE, buenos buffs/energía al equipo y viabilidad en reacción o mono-Pyro.",
    caveats: "v4.5."
  },
  {
    slug: "cyno",
    character: "Cyno",
    element: "Electro",
    found: true,
    kqmUrl: "https://keqingmains.com/q/cyno-quickguide/",
    kqmAuthor: "irokei (KQM)",
    version: "4.2",
    constellations: [
      { c: "C1", personalDmg: "", note: "+20% ATK SPD por 10s" },
      { c: "C2", personalDmg: "", note: "Hasta +50% Bono Daño Electro (5 stacks)" },
      { c: "C6", personalDmg: "", note: "Genera 12-16 Duststalker Bolts extra por rotación" }
    ],
    signatureWeapon: { name: "Staff of the Scarlet Sands", note: "BiS" },
    weaponRanking: [
      "Staff of the Scarlet Sands",
      "Ballad of the Fjords",
      "Primordial Jade Winged-Spear",
      "Kitain Cross Spear R5",
      "Deathmatch",
      "White Tassel R5"
    ],
    erRequirement:
      "4pc Thundering Fury solo Electro: 140-160%; con Fischl 100-110%. Otros sets: 180-200% (solo), 115-130% (con Fischl).",
    artifactMainStats: { sands: "EM > ATK% > ER%", goblet: "Bono Daño Electro % ≥ EM", circlet: "CRIT ≥ EM" },
    substatPriority: "ER (hasta el requisito) > CRIT > EM > ATK%",
    statTargets: [
      { stat: "Ratio de CRIT", target: "~1:2 Rate:DMG" },
      { stat: "Maestría Elemental", target: "Alta (Aggravate/Quicken)" }
    ],
    teams: [
      { name: "Quickbloom", members: ["Cyno", "Nahida", "Yelan", "Kuki Shinobu"], notes: "" },
      { name: "Aggravate", members: ["Cyno", "Baizhu", "Nahida", "Fischl"], notes: "" },
      { name: "Quickburn", members: ["Cyno", "Nahida", "Thoma", "Fischl"], notes: "" }
    ],
    summary: "DPS/driver Electro on-field que hace daño consistente vía combos en estado de Burst.",
    caveats: "v4.2 (quick guide; la extendida está en progreso)."
  },
  {
    slug: "wriothesley",
    character: "Wriothesley",
    element: "Cryo",
    found: true,
    kqmUrl: "https://keqingmains.com/q/wriothesley-quickguide/",
    kqmAuthor: "acerbus114 (KQM)",
    version: "7.0",
    constellations: [
      { c: "C1", personalDmg: "", note: "Skill +4s; Ataques Cargados a +200% de daño" },
      { c: "C2", personalDmg: "", note: "Burst +40% por stack de Prosecution Edict (máx 5 = +200%)" },
      { c: "C4", personalDmg: "", note: "Curación de Ataques Cargados sube a 50% Max HP" },
      { c: "C6", personalDmg: "", note: "+10% CR, +80% CD a Ataques Cargados especiales" }
    ],
    signatureWeapon: { name: "Cashflow Supervision", note: "5★ firma" },
    weaponRanking: [
      "Cashflow Supervision",
      "Clash of Kings R5 / Reliquary of Truth R1",
      "Kagura's Verity",
      "Clash of Kings R1",
      "The Widsith"
    ],
    erRequirement:
      "Equipos Stellar-Conduct: saltea el Burst. Sin Stellar-Conduct: 100-125% (solo Cryo), 100-115% (double Cryo), 100% (triple Cryo).",
    artifactMainStats: { sands: "ATK% ≥ EM", goblet: "ATK% ≥ EM", circlet: "CRIT Rate o CRIT DMG" },
    substatPriority: "CRIT > ATK% ≥ EM > ATK plano",
    statTargets: [{ stat: "Ratio de CRIT", target: "~1:2 Rate:DMG" }],
    teams: [
      { name: "Stellar-Conduct", members: ["Wriothesley", "Odette", "Yae Miko", "Escoffier/Sucrose"], notes: "Primario" },
      { name: "Reverse Melt", members: ["Wriothesley", "Durin", "Nicole", "Xilonen"], notes: "" },
      { name: "Freeze", members: ["Wriothesley", "Escoffier", "Furina", "Shenhe/Yelan"], notes: "" }
    ],
    summary: "DPS Cryo on-field que hace daño Stellar-Conduct con Ataques Normales y Cargados mejorados.",
    caveats: "v7.0 (quick guide; la extendida necesita autor)."
  },
  {
    slug: "diluc",
    character: "Diluc",
    element: "Pyro",
    found: true,
    kqmUrl: "https://keqingmains.com/diluc/",
    kqmAuthor: "Lucase2767",
    version: "2.8",
    constellations: [
      { c: "C1", personalDmg: "7%", note: "promedio desde C0" },
      { c: "C2", personalDmg: "12%", note: "desde C0 (4% por stack)" },
      { c: "C3", personalDmg: "4.5%", note: "desde C0" },
      { c: "C4", personalDmg: "2%", note: "en rotación (pérdida de ~4% DPS de equipo)" },
      { c: "C5", personalDmg: "11% / 3.7%", note: "vs enemigos chicos / grandes, desde C0" },
      { c: "C6", personalDmg: "15%", note: "promedio desde C0" }
    ],
    signatureWeapon: { name: "Redhorn Stonethresher", note: "sin arma firma; mejor opción" },
    weaponRanking: [
      "Redhorn Stonethresher",
      "Wolf's Gravestone",
      "The Unforged",
      "Serpent Spine",
      "Rainslasher",
      "Blackcliff Slasher",
      "Prototype Archaic / Luxurious Sea-Lord"
    ],
    erRequirement: "",
    artifactMainStats: { sands: "ATK% / EM", goblet: "Bono Daño Pyro %", circlet: "CRIT DMG / CRIT Rate" },
    substatPriority: "CRIT DMG/CRIT Rate > EM > ATK%",
    statTargets: [{ stat: "Ratio de CRIT", target: "~1:2 Rate:DMG" }],
    teams: [
      { name: "Vaporize", members: ["Diluc", "Xingqiu/Yelan", "Bennett", "Sucrose/Kazuha"], notes: "" },
      { name: "Vaporize (alt)", members: ["Diluc", "Xingqiu", "Zhongli", "Albedo"], notes: "" },
      { name: "Melt", members: ["Diluc", "Kaeya/Rosaria", "Bennett", "Sucrose/Kazuha"], notes: "" }
    ],
    summary: "El DPS Pyro más consistente, playstyle fácil y acceso a reacciones amplificantes.",
    caveats: "v2.8. ER no indicado en la guía (típicamente moderado con Bennett)."
  },
  {
    slug: "shenhe",
    character: "Shenhe",
    element: "Cryo",
    found: true,
    kqmUrl: "https://keqingmains.com/shenhe/",
    kqmAuthor: "Vladone & revy",
    version: "3.5",
    constellations: [
      { c: "C1", personalDmg: "+3.06%", note: "carga extra de Skill (rotación única)" },
      { c: "C2", personalDmg: "+6.4%", note: "Burst +6s, +15% Cryo CRIT DMG" },
      { c: "C3", personalDmg: "+9.88%", note: "acumulado (rotación única)" },
      { c: "C4", personalDmg: "+10.62%", note: "acumulado (stacks Skyfrost, máx 50)" },
      { c: "C6", personalDmg: "+22-23%", note: "NA/CA no consumen quota de Icy Quill" }
    ],
    signatureWeapon: { name: "Calamity Queller", note: "741 ATK base | 16.5% ATK" },
    weaponRanking: [
      "Calamity Queller",
      "Engulfing Lightning",
      "Skyward Spine",
      "Vortex Vanquisher",
      "Staff of Homa",
      "Wavebreaker's Fin",
      "Primordial Jade Winged-Spear",
      "Staff of the Scarlet Sands",
      "Favonius Lance (mejor 4★)"
    ],
    erRequirement:
      "Double Cryo: 193% (normal), 157% (Venti). Triple Cryo: 166% (normal), 126% (Venti). Favonius baja ~10-20%.",
    artifactMainStats: { sands: "ATK% o ER%", goblet: "ATK% > Bono Daño Cryo %", circlet: "ATK% > CRIT" },
    substatPriority: "ER (hasta el requisito) > ATK% > CRIT Rate (Favonius) ≥ CRIT DMG > ATK plano",
    statTargets: [
      { stat: "Ataque (ATK)", target: "base ~2000-2650 según Arena (ER% vs ATK%)" },
      { stat: "CRIT Rate", target: "~30-40% con Favonius" }
    ],
    teams: [
      { name: "Ayaka Freeze", members: ["Shenhe", "Ayaka", "Mona/Kokomi", "Kazuha/Venti"], notes: "El mejor equipo de Shenhe" },
      { name: "Ganyu Freeze", members: ["Shenhe", "Ganyu", "Mona/Kokomi", "Kazuha/Venti"], notes: "Kokomi > Mona por cura" },
      { name: "Mono Cryo", members: ["Shenhe", "Ayaka", "Ganyu", "Kazuha"], notes: "vs bosses no congelables" },
      { name: "Reverse Melt", members: ["Shenhe", "Ganyu", "Bennett", "Xiangling/Rosaria"], notes: "C6 Ganyu" }
    ],
    summary: "Soporte Cryo off-field: Icy Quill que escala con ATK, shred de RES y buff dinámico de DMG% a equipos Cryo.",
    caveats: "v3.5."
  },
  {
    slug: "faruzan",
    character: "Faruzan",
    element: "Anemo",
    found: true,
    kqmUrl: "https://keqingmains.com/faruzan/",
    kqmAuthor: ".athene., chasing_haze…",
    version: "4.6",
    constellations: [
      { c: "C6", personalDmg: "", note: "+40% CRIT DMG en daño Anemo + aplica Pressurized Collapse off-field cada 3s (baja ER ~40%)" }
    ],
    signatureWeapon: { name: "Favonius Warbow", note: "BiS (R3+)" },
    weaponRanking: [
      "Favonius Warbow (R3+)",
      "Elegy for the End (102.58% team DPR)",
      "Polar Star (97.42%)",
      "Skyward Harp / Thundering Pulse / Aqua Simulacra (96-97%)"
    ],
    erRequirement:
      "Pre-C6 Double Anemo: 220-260%. Pre-C6 Triple Anemo: 190-225%. C6: 175-200% (Double), 160-185% (Triple).",
    artifactMainStats: { sands: "ER (pre-C6) o ATK% (C6)", goblet: "Bono Daño Anemo % (C6) / lo que tenga ER", circlet: "CRIT Rate o CRIT DMG" },
    substatPriority: "ER > CRIT Rate > CRIT DMG = ATK%",
    statTargets: [{ stat: "ER", target: "muy alta pre-C6 (~220-260%); el C6 la baja ~40%" }],
    teams: [
      { name: "Wanderer Hypercarry", members: ["Faruzan", "Wanderer", "Bennett/Zhongli/Diona", "Venti/Kazuha/Furina"], notes: "" },
      { name: "Xiao Hypercarry", members: ["Faruzan", "Xiao", "Xianyun/Jean/Sucrose", "Bennett/Zhongli"], notes: "" },
      { name: "Anemo Quickswap", members: ["Faruzan", "Heizou/Kazuha/Venti", "Bennett", "Xiangling"], notes: "" }
    ],
    summary: "El único soporte dedicado a buffear daño Anemo y hacer shred de RES Anemo a la vez.",
    caveats: "v4.6. C6 es transformador (baja mucho el ER y da +40% CD)."
  },
  {
    slug: "lyney",
    character: "Lyney",
    element: "Pyro",
    found: true,
    kqmUrl: "https://keqingmains.com/q/lyney-quickguide/",
    kqmAuthor: "cuzimori (KQM)",
    version: "4.0",
    constellations: [
      { c: "C1", personalDmg: "", note: "2 Hats a la vez; Prop Arrows dan stacks de Prop Surplus" },
      { c: "C2", personalDmg: "", note: "+20% CRIT DMG por stack (máx 3, sube on-field)" },
      { c: "C4", personalDmg: "", note: "-20% RES Pyro al golpear (6s)" },
      { c: "C6", personalDmg: "", note: "Añade Pyrotechnic Strike: Reprised (80% daño) por Prop Arrow" }
    ],
    signatureWeapon: { name: "The First Great Magic", note: "5★ firma" },
    weaponRanking: [
      "The First Great Magic",
      "Aqua Simulacra",
      "Thundering Pulse",
      "Skyward Harp",
      "Amos' Bow",
      "Song of Stillness",
      "Prototype Crescent"
    ],
    erRequirement: "125-150% (Burst cada rotación); 100% (Burst en rotaciones alternas).",
    artifactMainStats: { sands: "ATK%", goblet: "Bono Daño Pyro %", circlet: "CRIT Rate o CRIT DMG (CD con 4pc Marechaussee Hunter)" },
    substatPriority: "CRIT > ATK% > ATK plano ≥ ER%",
    statTargets: [{ stat: "Ratio de CRIT", target: "~1:2 Rate:DMG" }],
    teams: [
      { name: "Lyney-Bennett-Kazuha-Zhongli", members: ["Lyney", "Bennett", "Kazuha", "Zhongli"], notes: "" },
      { name: "Lyney-Bennett-Xiangling-Zhongli", members: ["Lyney", "Bennett", "Xiangling", "Zhongli"], notes: "" },
      { name: "Lyney-Bennett-Sucrose-Dehya", members: ["Lyney", "Bennett", "Sucrose", "Dehya"], notes: "" },
      { name: "Lyney-Bennett-Venti-Yanfei", members: ["Lyney", "Bennett", "Venti", "Yanfei C4"], notes: "" }
    ],
    summary: "DPS Pyro on-field que hace la mayoría del daño con Ataques Cargados (Charged Shots).",
    caveats: "v4.0 (quick guide; la extendida está en progreso)."
  },
  {
    slug: "rosaria",
    character: "Rosaria",
    element: "Cryo",
    found: true,
    kqmUrl: "https://keqingmains.com/rosaria/",
    kqmAuthor: "Cuzimori & kol",
    version: "3.4",
    constellations: [
      { c: "C1", personalDmg: "", note: "+10% ATK SPD y +10% daño Normal 4s al hacer CRIT" },
      { c: "C2", personalDmg: "+23%", note: "para daño off-field (+4s Burst) — la más valiosa" },
      { c: "C4", personalDmg: "", note: "5 de energía al hacer CRIT con Skill (plano)" },
      { c: "C5", personalDmg: "~12%", note: "+3 niveles de Burst" },
      { c: "C6", personalDmg: "", note: "20% shred de RES Físico por 10s" }
    ],
    signatureWeapon: { name: "Favonius Lance", note: "BiS soporte; Wavebreaker's Fin para DPS" },
    weaponRanking: [
      "Favonius Lance (BiS soporte)",
      "Wavebreaker's Fin R5 (Freeze)",
      "Staff of Homa",
      "Staff of the Scarlet Sands (Reverse Melt)",
      "Primordial Jade Winged-Spear",
      "Deathmatch"
    ],
    erRequirement: "No fija; usa la calculadora de ER. Apunta ligeramente por encima del mínimo para rotaciones suaves.",
    artifactMainStats: { sands: "ATK% o ER (soporte)", goblet: "Bono Daño Cryo %", circlet: "CRIT DMG (Freeze) / CRIT Rate (soporte)" },
    substatPriority:
      "Freeze: CRIT DMG > CRIT Rate > ATK% (tras ER). Soporte: ER (hasta requisito) > CR >> CD > ATK%.",
    statTargets: [
      { stat: "CRIT (Freeze)", target: "4pc Blizzard Strayer + A1 + Resonancia ≈ 72% CR sin inversión → enfoca CRIT DMG" }
    ],
    teams: [
      { name: "Quickswap Freeze", members: ["Rosaria", "Kaeya", "Mona/Kokomi", "Kazuha"], notes: "" },
      { name: "Sub-DPS Freeze", members: ["Rosaria", "Ayaka/Ganyu", "Hydro", "Anemo"], notes: "" },
      { name: "Reverse Melt (Xiangling)", members: ["Rosaria", "Xiangling", "Bennett", "Kaeya/Shenhe"], notes: "" },
      { name: "Eula Core", members: ["Rosaria", "Eula", "Electro", "healer/shielder"], notes: "Superconduct" }
    ],
    summary: "Aplicadora Cryo off-field versátil y buffer de CRIT con snapshots de Burst; brilla en Freeze y Reverse Melt.",
    caveats: "v3.4."
  },
  {
    slug: "kujou-sara",
    character: "Kujou Sara",
    element: "Electro",
    found: true,
    kqmUrl: "https://keqingmains.com/sara/",
    kqmAuthor: "CQLQRS & redd",
    version: "3.3",
    constellations: [
      { c: "C6", personalDmg: "", note: "+60% CRIT DMG al daño Electro de aliados buffeados por Tengu Juurai (no se puede snapshot)" }
    ],
    signatureWeapon: { name: "Elegy for the End", note: "buff; Skyward Harp balanceado, Polar Star daño" },
    weaponRanking: [
      "Elegy for the End (buff)",
      "Skyward Harp (balanceado)",
      "Polar Star (daño)",
      "Mouun's Moon R5",
      "Fading Twilight R5 (F2P)",
      "Thundering Pulse",
      "Aqua Simulacra",
      "Sacrificial Bow"
    ],
    erRequirement:
      "Triple Electro: 130-160%. Double Electro: 170%+ (con Raiden/Fischl) / 230%+ (sin). Solo Electro: 300%+.",
    artifactMainStats: { sands: "ATK% o ER%", goblet: "Bono Daño Electro %", circlet: "CRIT Rate o CRIT DMG" },
    substatPriority: "ER (hasta el requisito) > CRIT (ratio 1:2)",
    statTargets: [{ stat: "Ratio de CRIT", target: "1:2 Rate:DMG" }],
    teams: [
      { name: "Hypercarry Raiden", members: ["Raiden", "Sara", "Kazuha", "Bennett"], notes: "" },
      { name: "Mono Electro", members: ["Raiden", "Sara", "Yae Miko", "Venti/Kazuha"], notes: "" },
      { name: "Beidou Taser", members: ["Beidou", "Sara", "Anemo", "Bennett"], notes: "" },
      { name: "Keqing Aggravate", members: ["Keqing", "Sara", "Dendro", "Flex"], notes: "" }
    ],
    summary: "Buffer Electro de alta inversión con daño AoE frontloaded; brilla en quickswap/snapshot y a C6 con Raiden.",
    caveats: "v3.3."
  },
  {
    slug: "gorou",
    character: "Gorou",
    element: "Geo",
    found: true,
    kqmUrl: "https://keqingmains.com/gorou/",
    kqmAuthor: "Cuzimori",
    version: "3.0",
    constellations: [
      { c: "C1", personalDmg: "", note: "Reduce CD de Skill 2s" },
      { c: "C2", personalDmg: "", note: "Extiende Burst hasta 3s vía esquirlas de Crystallize" },
      { c: "C4", personalDmg: "", note: "Cura 50% de la DEF de Gorou cada 1.5s" },
      { c: "C6", personalDmg: "", note: "Hasta +40% CRIT DMG al daño Geo según nivel de buff" }
    ],
    signatureWeapon: { name: "Favonius Warbow", note: "BiS indiscutible" },
    weaponRanking: ["Favonius Warbow", "Elegy for the End", "Sacrificial Bow", "End of the Line"],
    erRequirement: "Hasta 220% ER con Favonius Warbow, hasta 250% sin él.",
    artifactMainStats: { sands: "ER", goblet: "Bono Daño Geo % (o DEF% para C4)", circlet: "CRIT Rate" },
    substatPriority: "ER > CRIT Rate > DEF% > CRIT DMG",
    statTargets: [
      { stat: "ER", target: "220-250% según Favonius" },
      { stat: "Ratio de CRIT", target: "~1:2 Rate:DMG" }
    ],
    teams: [
      { name: "Itto Mono Geo", members: ["Gorou", "Itto", "Albedo", "Zhongli"], notes: "S-tier" },
      { name: "Noelle", members: ["Gorou", "Noelle", "Albedo", "Zhongli"], notes: "A-tier" },
      { name: "Ningguang", members: ["Gorou", "Ningguang", "Albedo", "Bennett"], notes: "Solo C6 Gorou" }
    ],
    summary: "El único buffer de DEF dedicado del juego: DEF/resistencia a interrupción/Bono Daño Geo a equipos Geo.",
    caveats: "v3.0."
  },
  {
    slug: "chevreuse",
    character: "Chevreuse",
    element: "Pyro",
    found: true,
    kqmUrl: "https://keqingmains.com/q/chevreuse-quickguide/",
    kqmAuthor: "caramielle. (KQM)",
    version: "5.6",
    constellations: [
      { c: "C1", personalDmg: "", note: "6 de energía al hacer Overloaded (CD 10s)" },
      { c: "C2", personalDmg: "", note: "2 explosiones en cadena (120% ATK c/u) tras Hold Skill" },
      { c: "C4", personalDmg: "", note: "Hold Skill sin CD tras Burst (2 usos o 6s)" },
      { c: "C6", personalDmg: "", note: "+20% Bono Daño Pyro/Electro por stack de curación (máx 3); heal de equipo a los 12s" }
    ],
    signatureWeapon: { name: "Symphonist of Scents", note: "sin arma firma; mejor 5★" },
    weaponRanking: ["Symphonist of Scents", "Favonius Lance", "Black Tassel"],
    erRequirement: "100% (Burst cuando esté disponible); 175-205% (Burst cada rotación); 105-135% (con Raiden on-field).",
    artifactMainStats: { sands: "HP% o ER", goblet: "HP%", circlet: "HP% o Bono de Curación" },
    substatPriority: "ER (hasta el requisito) > HP% (hasta 40,000) > HP plano > CRIT",
    statTargets: [{ stat: "HP", target: "cap 40,000 HP (buff A4)" }],
    teams: [
      { name: "Overload (Varesa/Mavuika)", members: ["Chevreuse", "Varesa", "Mavuika", "Iansan"], notes: "" },
      { name: "Overload (Raiden)", members: ["Chevreuse", "Raiden Shogun", "Xiangling", "Bennett"], notes: "" },
      { name: "Overload (Yoimiya)", members: ["Chevreuse", "Yoimiya", "Fischl", "Bennett"], notes: "" }
    ],
    summary: "Soporte de equipos Overload: buff de ATK% + shred de RES Pyro y Electro (escala con HP).",
    caveats: "v5.6 (quick guide; la extendida necesita autor)."
  },
  {
    slug: "mavuika",
    character: "Mavuika",
    element: "Pyro",
    found: true,
    kqmUrl: "https://keqingmains.com/q/mavuika-quickguide/",
    kqmAuthor: "caramielle. (KQM)",
    version: "5.7",
    constellations: [
      { c: "C1", personalDmg: "", note: "+40 Nightsoul, +25% ganancia FS, +40% ATK permanente" },
      { c: "C2", personalDmg: "", note: "+200 ATK base; Ring 20% shred DEF; Flamestrider +60/90/120% ATK a ataques" },
      { c: "C4", personalDmg: "", note: "El buff A4 se vuelve 50% permanente" },
      { c: "C6", personalDmg: "", note: "Ring/Flamestrider hacen crashes (200% ATK) + Scorching Ring (500% ATK, 20% shred DEF cada 3s)" }
    ],
    signatureWeapon: { name: "A Thousand Blazing Suns", note: "5★ firma" },
    weaponRanking: [
      "A Thousand Blazing Suns",
      "Verdict",
      "Beacon of the Reed Sea",
      "Redhorn Stonethresher",
      "Serpent Spine (con escudo)",
      "Mailed Flower",
      "Talking Stick",
      "Tidal Shadow (F2P)"
    ],
    erRequirement: "Sin requisito de ER — su Burst carga con Fighting Spirit, no con energía.",
    artifactMainStats: { sands: "ATK% o EM", goblet: "Bono Daño Pyro %", circlet: "CRIT Rate o CRIT DMG" },
    substatPriority: "CRIT > EM (Vaporize/Melt) > ATK% > ATK plano",
    statTargets: [{ stat: "Ratio de CRIT", target: "~1:2 Rate:DMG" }],
    teams: [
      { name: "On-field DPS", members: ["Mavuika", "Citlali", "Xilonen/Iansan/Sucrose", "Bennett"], notes: "" },
      { name: "On-field (Kachina)", members: ["Mavuika", "Kachina", "Rosaria C2+", "Bennett"], notes: "" },
      { name: "Off-field enabler (Mualani)", members: ["Mualani", "Mavuika", "Xilonen", "Kazuha/Sucrose"], notes: "" },
      { name: "Off-field enabler (Kinich)", members: ["Kinich", "Mavuika", "Iansan", "Bennett/Emilie"], notes: "" }
    ],
    summary: "Claymore Pyro 5★: nukes potentes y DPS sostenido; hypercarry on-field o habilitadora Pyro off-field.",
    caveats: "v5.7 (quick guide)."
  },
  {
    slug: "citlali",
    character: "Citlali",
    element: "Cryo",
    found: true,
    kqmUrl: "https://keqingmains.com/q/citlali-quickguide/",
    kqmAuthor: "baloopy (KQM)",
    version: "5.4",
    constellations: [
      { c: "C1", personalDmg: "", note: "Stellar Blades (200% EM por blade)" },
      { c: "C2", personalDmg: "", note: "+125 EM propia, +250 EM al activo; shred RES Pyro/Hydro 20%→40%" },
      { c: "C4", personalDmg: "", note: "Spiritvessel Skull extra (daño que escala 1800% EM)" },
      { c: "C6", personalDmg: "", note: "Itzpapa en Opal Fire permanente; hasta +60% Bono Daño Pyro/Hydro al equipo" }
    ],
    signatureWeapon: { name: "Starcaller's Watch", note: "5★ firma" },
    weaponRanking: [
      "Starcaller's Watch",
      "Thrilling Tales of Dragon Slayers",
      "Wandering Evenstar",
      "A Thousand Floating Dreams",
      "Favonius Codex"
    ],
    erRequirement:
      "C0-C3: Solo Cryo 170-195%, Double Cryo 170-185%, Neuvillette 125-150%, Xilonen+1 Natlan 145-150%. C4+: Solo Cryo 145-165%, Neuvillette 100-125%.",
    artifactMainStats: { sands: "EM o ER", goblet: "EM o Bono Daño Cryo %", circlet: "EM o CRIT" },
    substatPriority: "ER (hasta el requisito) > EM > CRIT > ATK%",
    statTargets: [{ stat: "Maestría Elemental", target: "Prioriza EM (buffea y hace daño con su Skull)" }],
    teams: [
      { name: "Melt", members: ["Citlali", "Mavuika/Arlecchino/Gaming", "Bennett", "Anemo/Geo/Hydro"], notes: "" },
      { name: "Vapemelt", members: ["Citlali", "Pyro DPS", "aplicador Hydro", "Bennett"], notes: "" },
      { name: "Freeze/Flex", members: ["Citlali", "Neuvillette/Ayato/Mualani", "Anemo", "Hydro off-field"], notes: "" }
    ],
    summary: "Soporte con escudo: aplicación Cryo off-field, shred de RES y habilitación de reacción para equipos Pyro/Hydro.",
    caveats: "v5.4 (quick guide)."
  },
  {
    slug: "kinich",
    character: "Kinich",
    element: "Dendro",
    found: true,
    kqmUrl: "https://keqingmains.com/q/kinich-quickguide/",
    kqmAuthor: "caramielle. (KQM)",
    version: "5.6",
    constellations: [
      { c: "C1", personalDmg: "", note: "+100% CRIT DMG al Scalespiker Cannon" },
      { c: "C2", personalDmg: "", note: "RES Dendro del enemigo -30% (6s); primer Cannon +100% daño" },
      { c: "C4", personalDmg: "", note: "Burst hace +70% más daño" },
      { c: "C6", personalDmg: "", note: "El Cannon rebota a un 2do objetivo (700% ATK como daño Dendro)" }
    ],
    signatureWeapon: { name: "Fang of the Mountain King", note: "5★ firma" },
    weaponRanking: [
      "Fang of the Mountain King",
      "A Thousand Blazing Suns",
      "Beacon of the Reed Sea",
      "Verdict / Redhorn Stonethresher / Wolf's Gravestone",
      "The Unforged",
      "Serpent Spine",
      "Earth Shaker",
      "Tidal Shadow"
    ],
    erRequirement:
      "Solo Dendro: 100-120% (alternas) / 200-245% (cada rotación). Double Dendro: 100-110% (alternas) / 175-220% (cada rotación).",
    artifactMainStats: { sands: "ATK%", goblet: "Bono Daño Dendro %", circlet: "CRIT Rate / CRIT DMG" },
    substatPriority: "CRIT > ATK% > ER%",
    statTargets: [{ stat: "Ratio de CRIT", target: "~1:2 Rate:DMG" }],
    teams: [
      { name: "Burning (Mavuika)", members: ["Kinich", "Mavuika/Pyro Traveler", "Emilie", "Bennett"], notes: "" },
      { name: "Burgeon (Xiangling)", members: ["Kinich", "Xiangling/Dehya/Thoma", "Emilie", "Bennett"], notes: "" },
      { name: "Hydro (Xingqiu)", members: ["Kinich", "Thoma", "Xingqiu", "Bennett"], notes: "" },
      { name: "Geo", members: ["Kinich", "Xiangling", "Chiori/Zhongli/Albedo", "Bennett"], notes: "" }
    ],
    summary: "DPS Dendro claymore on-field que maximiza el Scalespiker Cannon vía reacciones Burning/Burgeon.",
    caveats: "v5.6 (quick guide)."
  }
]

// ── Mapeo: KqmChar → InvestmentAnalysisDraft. ────────────────────────────────
const toAnalysis = (k: KqmChar): InvestmentAnalysisDraft => {
  const consItems: InvestmentItem[] = k.constellations.map((c) => ({
    what: c.c,
    charDmg: c.personalDmg,
    notes: c.note
  }))
  const scenarios =
    consItems.length > 0
      ? [{ title: "Constelaciones — aumento de daño personal (KQM)", items: consItems }]
      : []

  const optional: InvestmentItem[] = []
  if (k.signatureWeapon?.name) {
    optional.push({
      rank: "arma sig.",
      what: k.signatureWeapon.name,
      notes: k.signatureWeapon.note
    })
  }

  const tables: InvestmentTable[] = []
  if (k.weaponRanking && k.weaponRanking.length > 0) {
    tables.push({
      title: "Armas por prioridad (KQM)",
      columns: ["#", "Arma"],
      rows: k.weaponRanking.map((w, i) => [`${i + 1}`, w])
    })
  }
  if (k.teams && k.teams.length > 0) {
    tables.push({
      title: "Equipos recomendados — stats/artefactos por composición (KQM)",
      columns: ["Equipo", "Miembros", "Notas de stats/artefactos"],
      rows: k.teams.map((t) => [t.name, t.members.join(", "), t.notes ?? "—"]),
      note: "El ER y los targets exactos se ajustan según la composición."
    })
  }

  const notes: string[] = []
  if (k.erRequirement) notes.push(`Requisito de ER (KQM): ${k.erRequirement}`)
  if (k.substatPriority) notes.push(`Prioridad de substats (KQM): ${k.substatPriority}`)
  if (k.artifactMainStats) {
    const { sands, goblet, circlet } = k.artifactMainStats
    notes.push(`Main stats (KQM) — Arena: ${sands ?? "?"} · Cáliz: ${goblet ?? "?"} · Corona: ${circlet ?? "?"}`)
  }
  if (k.caveats) notes.push(k.caveats)
  notes.push(
    "Los % por constelación son aumento de daño PERSONAL de las hojas de cálculo de KQM (por versión), no un orden de jale cruzado entre teammates."
  )

  return {
    slug: k.slug as Slug,
    character: k.character,
    characterSlug: k.slug,
    element: k.element,
    source: {
      author: `${k.kqmAuthor ? `${k.kqmAuthor} · ` : ""}KeqingMains`,
      url: k.kqmUrl
    },
    summary: k.summary,
    scenarios,
    optional: optional.length > 0 ? optional : undefined,
    tables: tables.length > 0 ? tables : undefined,
    notes
  }
}

// ── Mapeo: KqmChar → statTargets reales aplicados a cada build del personaje. ─
const kqmStatTargets = (k: KqmChar): StatTarget[] => {
  const out: StatTarget[] = (k.statTargets ?? []).map((t) => ({ stat: t.stat, target: t.target }))
  // Asegura una línea de ER real si KQM la da y no vino ya en statTargets.
  if (k.erRequirement && !out.some((t) => /recarga|energy|\bER\b/i.test(t.stat))) {
    out.push({ stat: "Recarga de Energía (ER)", target: k.erRequirement })
  }
  return out
}

const program = Effect.gen(function* () {
  const data = KQM_DATA.filter((k) => k.found)
  if (data.length === 0) {
    yield* Effect.log("seed-kqm: KQM_DATA vacío — nada que sembrar.")
    return
  }

  // 1) Análisis de inversión.
  const invSvc = yield* InvestmentService
  yield* Effect.forEach(data, (k) => invSvc.save(toAnalysis(k)), { discard: true })

  // 2/3) Stats reales por build (sobreescribe el marco genérico en los personajes del batch).
  const charSvc = yield* CharacterService
  const bySlug = new Map(data.map((k) => [k.slug, k]))
  const chars = yield* charSvc.list
  let touched = 0
  const updated: CharacterDraft[] = chars.map((c) => {
    const k = bySlug.get(c.slug)
    if (!k) return c
    const targets = kqmStatTargets(k)
    if (targets.length === 0) return c
    touched++
    return { ...c, builds: c.builds.map((b) => ({ ...b, statTargets: targets })) }
  })
  yield* Effect.forEach(
    updated.filter((c) => bySlug.has(c.slug)),
    (c) => charSvc.save(c),
    { discard: true }
  )

  yield* Effect.log(
    `seed-kqm: ${data.length} análisis KQM · ${touched} personajes con statTargets reales (${data
      .map((k) => k.slug)
      .join(", ")})`
  )
}).pipe(Effect.provide(ServicesLive), Effect.provide(PgLive))

BunRuntime.runMain(migrate.pipe(Effect.provide(PgLive), Effect.andThen(program)))
