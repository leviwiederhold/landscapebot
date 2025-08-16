import { Estimate } from "../types";
import { money } from "../helpers";
import { PRICING } from "../pricing";

export function sodEstimate(areaSqFt: number, removeOldTurf: boolean): Estimate {
  const waste = PRICING.waste;
  const sodCost = areaSqFt * (1 + waste) * PRICING.sodPerSqFt;

  const installSqFtPerHr = 200;
  const removalSqFtPerHr = 180;

  const installCrewHours = areaSqFt / installSqFtPerHr;
  const removalCrewHours = removeOldTurf ? areaSqFt / removalSqFtPerHr : 0;
  const crewHours = installCrewHours + removalCrewHours;
  const wallClockHours = crewHours / PRICING.crewSize;
  const laborCost = crewHours * PRICING.laborHourly;

  const disposalYards = removeOldTurf ? (areaSqFt * (1/12)) / 27 : 0;
  const disposalCost = disposalYards * PRICING.disposalPerYd;

  const delivery = PRICING.deliveryFee;
  const trip = PRICING.tripFee;

  const subtotal = sodCost + delivery + trip + laborCost + disposalCost;
  const markup = subtotal * PRICING.markup;
  const withMarkup = subtotal + markup;
  const tax = withMarkup * PRICING.taxRate;
  const total = withMarkup + tax;

  return {
    items: [
      { label: "Sod", qty: areaSqFt, unit: "sq ft", unitPrice: PRICING.sodPerSqFt, cost: money(sodCost) },
      { label: "Delivery", cost: money(delivery) },
      removeOldTurf
        ? { label: "Disposal", qty: +disposalYards.toFixed(2), unit: "yd³", unitPrice: PRICING.disposalPerYd, cost: money(disposalCost) }
        : { label: "Disposal", cost: 0 },
      { label: "Trip / setup", cost: money(trip) },
      { label: "Labor", qty: +crewHours.toFixed(1), unit: "hr (crew total)", unitPrice: PRICING.laborHourly, cost: money(laborCost) },
    ],
    subtotal: money(subtotal),
    markup: money(markup),
    tax: money(tax),
    total: money(total),
    assumptions: {
      areaSqFt, removeOldTurf, waste,
      disposalYards: +disposalYards.toFixed(2),
      crewSize: PRICING.crewSize,
      wallClockHours: +wallClockHours.toFixed(1),
    },
  };
}

export function parseSod(text: string) {
  const nums = (text.match(/(\d[\d,\.]*)/g) || []).map(s => parseFloat(s.replace(/,/g,"")));
  const areaSqFt = nums[0];
  const removeOldTurf = /remove|tear ?out|rip ?out|haul|old\s*turf/i.test(text);
  return { areaSqFt, removeOldTurf };
}
