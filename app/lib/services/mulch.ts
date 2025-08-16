import { Estimate } from "../types";
import { money } from "../helpers";
import { PRICING } from "../pricing";

export function mulchEstimate(areaSqFt: number, depthInches: number): Estimate {
  const yards = (areaSqFt * (depthInches / 12)) / 27;
  const yardsWithWaste = yards * (1 + PRICING.waste);

  const ydPerHrPerPerson = 1.2;
  const crewHours = yardsWithWaste / ydPerHrPerPerson;
  const wallClockHours = crewHours / PRICING.crewSize;

  const material = yardsWithWaste * PRICING.mulchPerYd;
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
      { label: "Mulch", qty: +yardsWithWaste.toFixed(2), unit: "yd³", unitPrice: PRICING.mulchPerYd, cost: money(material) },
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
      yards: +yards.toFixed(2),
      yardsWithWaste: +yardsWithWaste.toFixed(2),
      waste: PRICING.waste,
      crewSize: PRICING.crewSize,
      wallClockHours: +wallClockHours.toFixed(1),
    },
  };
}

export function parseMulch(text: string) {
  const nums = (text.match(/(\d[\d,\.]*)/g) || []).map(s => parseFloat(s.replace(/,/g,"")));
  return { areaSqFt: nums[0], depthInches: nums[1] };
}
