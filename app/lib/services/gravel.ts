import { Estimate } from "../types";
import { money } from "../helpers";
import { PRICING } from "../pricing";

/** Gravel tons = (area * depth_ft * density_lb_ft3) / 2000 */
export function gravelEstimate(areaSqFt: number, depthInches: number): Estimate {
  const depthFt = depthInches / 12;
  const lbs = areaSqFt * depthFt * PRICING.gravelDensityLbPerFt3;
  const tons = lbs / 2000;
  const tonsWithWaste = tons * (1 + PRICING.waste);

  const tonsPerHrPerPerson = 1.0; // rough wheelbarrow/tractor handling
  const crewHours = tonsWithWaste / tonsPerHrPerPerson;
  const wallClockHours = crewHours / PRICING.crewSize;

  const material = tonsWithWaste * PRICING.gravelPerTon;
  const delivery = PRICING.deliveryFee;
  const trip = PRICING.tripFee;
  const laborCost = crewHours * PRICING.laborHourly;

  const subtotal = material + delivery + trip + laborCost;
  const markup = subtotal * PRICING.markup;
  const withMarkup = subtotal + markup;
  const tax = withMarkup * PRICING.taxRate;
  const total = withMarkup + tax;

  return {
    items: [
      { label: "Gravel", qty: +tonsWithWaste.toFixed(2), unit: "tons", unitPrice: PRICING.gravelPerTon, cost: money(material) },
      { label: "Delivery", cost: money(delivery) },
      { label: "Trip / setup", cost: money(trip) },
      { label: "Labor", qty: +crewHours.toFixed(1), unit: "hr (crew total)", unitPrice: PRICING.laborHourly, cost: money(laborCost) },
    ],
    subtotal: money(subtotal),
    markup: money(markup),
    tax: money(tax),
    total: money(total),
    assumptions: {
      areaSqFt, depthInches,
      tons: +tons.toFixed(2), tonsWithWaste: +tonsWithWaste.toFixed(2),
      waste: PRICING.waste, crewSize: PRICING.crewSize, wallClockHours: +wallClockHours.toFixed(1)
    },
  };
}

export function parseGravel(text: string) {
  const nums = (text.match(/(\d[\d,\.]*)/g) || []).map(s => parseFloat(s.replace(/,/g,"")));
  return { areaSqFt: nums[0], depthInches: nums[1] };
}
