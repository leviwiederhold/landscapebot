import { Estimate } from "../types";
import { money } from "../helpers";
import { PRICING } from "../pricing";

/**
 * Mowing pricing: min charge, then $ per 1,000 sq ft.
 * Access factor + trimming/blowing included in baseline.
 */
export function mowingEstimate(areaSqFt: number, access: "easy"|"normal"|"tight" = "normal"): Estimate {
  const accessFactor = access === "easy" ? 0.9 : access === "tight" ? 1.25 : 1.0;
  const perK = PRICING.mowingPerKSqFt * accessFactor;
  const unitBlocks = Math.ceil(areaSqFt / 1000);
  const visitPrice = Math.max(PRICING.mowingMin, unitBlocks * perK);

  // assume 2 techs; productivity ~ 4,000–6,000 sq ft/hr/team (rough)
  const crewSqFtPerHr = access === "tight" ? 3500 : access === "easy" ? 6000 : 5000;
  const crewHours = areaSqFt / crewSqFtPerHr; // crew-hours total
  const wallClockHours = crewHours / PRICING.crewSize;
  const laborCost = crewHours * PRICING.laborHourly;

  const subtotal = visitPrice; // flat service price (you could break into line items if you prefer)
  const markup = subtotal * PRICING.markup;
  const withMarkup = subtotal + markup;
  const tax = withMarkup * PRICING.taxRate;
  const total = withMarkup + tax;

  return {
    items: [
      { label: "Mowing visit", qty: unitBlocks, unit: "× (per 1,000 sq ft)", unitPrice: perK, cost: money(unitBlocks * perK) },
    ],
    subtotal: money(subtotal),
    markup: money(markup),
    tax: money(tax),
    total: money(total),
    assumptions: {
      areaSqFt, access, unitBlocks, perK: perK,
      crewSize: PRICING.crewSize,
      wallClockHours: +wallClockHours.toFixed(1),
      minApplied: subtotal === PRICING.mowingMin,
    }
  };
}

export function parseMowing(text: string) {
  const areaSqFt = (text.match(/(\d[\d,\.]*)/g) || []).map(s => parseFloat(s.replace(/,/g,"")))[0];
  let access: "easy"|"normal"|"tight" = "normal";
  if (/easy/i.test(text)) access = "easy";
  if (/tight|gate|stairs|steep/i.test(text)) access = "tight";
  return { areaSqFt, access };
}
