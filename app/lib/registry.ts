import { Estimate } from "./types";
import { mulchEstimate, parseMulch } from "./services/mulch";
import { sodEstimate, parseSod } from "./services/sod";
import { mowingEstimate, parseMowing } from "./services/mowing";
import { gravelEstimate, parseGravel } from "./services/gravel";

export type Service =
  | { key: "mulch"; title: string; match: RegExp; run: (t: string) => Estimate | string }
  | { key: "sod"; title: string; match: RegExp; run: (t: string) => Estimate | string }
  | { key: "mowing"; title: string; match: RegExp; run: (t: string) => Estimate | string }
  | { key: "gravel"; title: string; match: RegExp; run: (t: string) => Estimate | string };

export const SERVICES: Service[] = [
  {
    key: "mowing",
    title: "Ballpark mowing estimate:",
    match: /mow|mowing|grass|lawn/i,
    run: (text: string) => {
      const { areaSqFt, access } = parseMowing(text);
      if (!areaSqFt) return "For mowing, tell me the lawn area in sq ft. Example: 'Mowing 6,000 sq ft (tight access)'.";
      return mowingEstimate(areaSqFt, access);
    },
  },
  {
    key: "mulch",
    title: "Ballpark mulch estimate:",
    match: /mulch/i,
    run: (text: string) => {
      const { areaSqFt, depthInches } = parseMulch(text);
      if (!areaSqFt || !depthInches) return "For mulch, send area (sq ft) and depth (inches). Example: 'Mulch 900 sq ft at 3 inches'.";
      return mulchEstimate(areaSqFt, depthInches);
    },
  },
  {
    key: "sod",
    title: "Ballpark sod estimate:",
    match: /sod/i,
    run: (text: string) => {
      const { areaSqFt, removeOldTurf } = parseSod(text);
      if (!areaSqFt) return "For sod, tell me the area in sq ft. Example: 'Sod 1,200 sq ft remove old turf'.";
      return sodEstimate(areaSqFt, removeOldTurf);
    },
  },
  {
    key: "gravel",
    title: "Ballpark gravel estimate:",
    match: /gravel|rock|stone/i,
    run: (text: string) => {
      const { areaSqFt, depthInches } = parseGravel(text);
      if (!areaSqFt || !depthInches) return "For gravel, send area (sq ft) and depth (in). Example: 'Gravel 800 sq ft at 3 inches'.";
      return gravelEstimate(areaSqFt, depthInches);
    },
  },
];

// Fallback: if no keyword, try to guess by needing 2 numbers (mulch/gravel) vs 1 number (mowing/sod)
export function routeText(text: string): { title: string; result: Estimate | string } {
  const svc = SERVICES.find(s => s.match.test(text));
  if (svc) return { title: svc.title, result: svc.run(text) };

  const nums = (text.match(/(\d[\d,\.]*)/g) || []).length;
  if (nums >= 2) return { title: "Ballpark mulch estimate:", result: SERVICES.find(s=>s.key==="mulch")!.run(text) };
  if (nums === 1) return { title: "Ballpark mowing estimate:", result: SERVICES.find(s=>s.key==="mowing")!.run(text) };

  return { title: "Help", result: "Tell me what to estimate (e.g., 'Mowing 6,000 sq ft', 'Mulch 900 sq ft at 3 inches', 'Sod 1,200 sq ft remove old turf', 'Gravel 800 sq ft 2 inches')." };
}
