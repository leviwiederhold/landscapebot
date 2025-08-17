import { NextResponse } from "next/server";

/** Default pricing (overridden by req.body.pricing) */
const PRICING_DEFAULT = {
  deliveryFee: 75,
  tripFee: 35,
  laborHourly: 55,
  crewSize: 2,
  taxRate: 0.0825,
  markup: 0.18,
  waste: 0.08,

  mulchPerYd: 45,
  sodPerSqFt: 0.65,
  disposalPerYd: 25,

  gravelPerTon: 38,
  gravelDensityLbPerFt3: 100,

  mowingPerKSqFt: 7.5,
  mowingMin: 45,
} as const;

type Pricing = typeof PRICING_DEFAULT;

const money = (n: number) => Math.round(n * 100) / 100;
const fmtMoney = (n: number) =>
  `$${(Math.round(n * 100) / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
const fmtNum = (n: number, d = 0) =>
  Number.isFinite(n) ? n.toLocaleString(undefined, { maximumFractionDigits: d }) : String(n);

/* -------------------- Parsers -------------------- */
function firstTwoNumbers(text: string) {
  return (text.match(/(\d[\d,\.]*)/g) || [])
    .map((s) => parseFloat(s.replace(/,/g, "")))
    .slice(0, 2);
}

function parseMulch(text: string) {
  const t = text.toLowerCase();
  // area
  let areaSqFt = (t.match(/(\d[\d,\.]*)\s*(sq\s?ft|sf|ft²)/) || [])[1];
  let area = areaSqFt ? parseFloat(areaSqFt.replace(/,/g, "")) : NaN;
  if (!area || !isFinite(area)) {
    const lxw = t.match(/(\d[\d,\.]*)\s*[x×]\s*(\d[\d,\.]*)/);
    if (lxw) {
      const a = parseFloat(lxw[1].replace(/,/g, ""));
      const b = parseFloat(lxw[2].replace(/,/g, ""));
      area = a * b;
    }
  }
  if (!area) {
    const [a] = firstTwoNumbers(t);
    area = a || NaN;
  }
  // depth inches
  let depth = (t.match(/(\d[\d,\.]*)\s*(in|inch|inches)/) || [])[1];
  const depthInches = depth ? parseFloat(depth.replace(/,/g, "")) : NaN;

  return { areaSqFt: area, depthInches: depthInches };
}

function parseSod(text: string) {
  const nums = (text.match(/(\d[\d,\.]*)/g) || []).map((s) => parseFloat(s.replace(/,/g, "")));
  const areaSqFt = nums[0];
  const removeOldTurf = /remove|tear ?out|rip ?out|haul|old\s*turf/i.test(text);
  return { areaSqFt, removeOldTurf };
}

function parseMowing(text: string) {
  const nums = (text.match(/(\d[\d,\.]*)/g) || []).map((s) => parseFloat(s.replace(/,/g, "")));
  const areaSqFt = nums[0];
  let access: "easy" | "normal" | "tight" = "normal";
  if (/easy/i.test(text)) access = "easy";
  if (/tight|gate|obstacle/i.test(text)) access = "tight";
  return { areaSqFt, access };
}

function parseGravel(text: string) {
  const nums = (text.match(/(\d[\d,\.]*)/g) || []).map((s) => parseFloat(s.replace(/,/g, "")));
  const areaSqFt = nums[0];
  const depthInches = nums[1];
  return { areaSqFt, depthInches };
}

/* -------------------- Estimators -------------------- */
function estimateMulch(text: string, p: Pricing) {
  const { areaSqFt, depthInches } = parseMulch(text);
  if (!areaSqFt || !depthInches) return null;

  const yards = (areaSqFt * (depthInches / 12)) / 27;
  const withWaste = yards * (1 + p.waste);

  const mulch = withWaste * p.mulchPerYd;
  const laborHours = (withWaste * 60) / (p.crewSize * 60); // ~1 yd³/hr per crew
  const labor = laborHours * p.laborHourly * p.crewSize;

  const subtotal = mulch + p.deliveryFee + p.tripFee + labor;
  const markup = subtotal * p.markup;
  const tax = subtotal * p.taxRate;
  const total = subtotal + markup + tax;

  return (
    `Ballpark mulch estimate:\n` +
    `• Mulch – ${fmtNum(withWaste, 2)} yd³ @ ${fmtMoney(p.mulchPerYd)}: ${fmtMoney(mulch)}\n` +
    `• Delivery: ${fmtMoney(p.deliveryFee)}\n` +
    `• Trip / setup: ${fmtMoney(p.tripFee)}\n` +
    `• Labor – ${fmtNum(laborHours * p.crewSize, 1)} hr (crew total) @ ${fmtMoney(p.laborHourly)}: ${fmtMoney(labor)}\n` +
    `Subtotal: ${fmtMoney(subtotal)}\n` +
    `Markup: ${fmtMoney(markup)}\n` +
    `Tax: ${fmtMoney(tax)}\n` +
    `Total: ${fmtMoney(total)}`
  );
}

function estimateSod(text: string, p: Pricing) {
  const { areaSqFt, removeOldTurf } = parseSod(text);
  if (!areaSqFt) return null;

  const sod = areaSqFt * p.sodPerSqFt * (1 + p.waste);
  const disposalYards = removeOldTurf ? areaSqFt / 500 : 0;
  const disposal = disposalYards * p.disposalPerYd;
  const laborHours = areaSqFt / 400; // 400 sq ft/hr per crew
  const labor = laborHours * p.laborHourly * p.crewSize;

  const subtotal = sod + p.deliveryFee + p.tripFee + disposal + labor;
  const markup = subtotal * p.markup;
  const tax = subtotal * p.taxRate;
  const total = subtotal + markup + tax;

  return (
    `Ballpark sod estimate:\n` +
    `• Sod – ${fmtNum(areaSqFt)} sq ft @ ${fmtMoney(p.sodPerSqFt)}: ${fmtMoney(sod)}\n` +
    `• Delivery: ${fmtMoney(p.deliveryFee)}\n` +
    `• Disposal: ${fmtMoney(disposal)}\n` +
    `• Trip / setup: ${fmtMoney(p.tripFee)}\n` +
    `• Labor – ${fmtNum(laborHours * p.crewSize, 1)} hr (crew total) @ ${fmtMoney(p.laborHourly)}: ${fmtMoney(labor)}\n` +
    `Subtotal: ${fmtMoney(subtotal)}\n` +
    `Markup: ${fmtMoney(markup)}\n` +
    `Tax: ${fmtMoney(tax)}\n` +
    `Total: ${fmtMoney(total)}`
  );
}

function estimateMowing(text: string, p: Pricing) {
  const { areaSqFt, access } = parseMowing(text);
  if (!areaSqFt) return null;

  let base = (areaSqFt / 1000) * p.mowingPerKSqFt;
  if (access === "tight") base *= 1.25;
  if (access === "easy") base *= 0.9;
  if (base < p.mowingMin) base = p.mowingMin;

  return (
    `Ballpark mowing estimate:\n` +
    `• Lawn area – ${fmtNum(areaSqFt)} sq ft\n` +
    `• Access: ${access}\n` +
    `• Price per visit: ${fmtMoney(base)}`
  );
}

function estimateGravel(text: string, p: Pricing) {
  const { areaSqFt, depthInches } = parseGravel(text);
  if (!areaSqFt || !depthInches) return null;

  const cubicFt = areaSqFt * (depthInches / 12);
  const tons = (cubicFt * p.gravelDensityLbPerFt3) / 2000;
  const withWaste = tons * (1 + p.waste);

  const gravel = withWaste * p.gravelPerTon;
  const laborHours = (withWaste * 1.5) / p.crewSize; // ~1.5 hr/ton
  const labor = laborHours * p.laborHourly * p.crewSize;

  const subtotal = gravel + p.deliveryFee + p.tripFee + labor;
  const markup = subtotal * p.markup;
  const tax = subtotal * p.taxRate;
  const total = subtotal + markup + tax;

  return (
    `Ballpark gravel estimate:\n` +
    `• Gravel – ${fmtNum(withWaste, 2)} tons @ ${fmtMoney(p.gravelPerTon)}: ${fmtMoney(gravel)}\n` +
    `• Delivery: ${fmtMoney(p.deliveryFee)}\n` +
    `• Trip / setup: ${fmtMoney(p.tripFee)}\n` +
    `• Labor – ${fmtNum(laborHours * p.crewSize, 1)} hr (crew total) @ ${fmtMoney(p.laborHourly)}: ${fmtMoney(labor)}\n` +
    `Subtotal: ${fmtMoney(subtotal)}\n` +
    `Markup: ${fmtMoney(markup)}\n` +
    `Tax: ${fmtMoney(tax)}\n` +
    `Total: ${fmtMoney(total)}`
  );
}

/* -------------------- Route -------------------- */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const text: string = (body.text || "").toString();
    const pricing: Pricing = { ...PRICING_DEFAULT, ...(body.pricing || {}) };

    let reply: string | null = null;

    if (/mulch/i.test(text)) reply = estimateMulch(text, pricing);
    if (/sod/i.test(text)) reply = estimateSod(text, pricing);
    if (/mow|mowing|grass/i.test(text)) reply = estimateMowing(text, pricing);
    if (/gravel|stone/i.test(text)) reply = estimateGravel(text, pricing);

    if (!reply) {
      reply =
        "Sorry, I didn’t understand. Try examples: “Mulch 900 sq ft at 3 inches”, “Sod 1,200 sq ft remove old turf”, “Mowing 6,000 sq ft (tight access)”, “Gravel 800 sq ft 2 inches”.";
    }

    return NextResponse.json({ reply });
  } catch (err) {
    console.error("Estimate error:", err);
    return NextResponse.json({ error: "Failed to process estimate." }, { status: 500 });
  }
}
