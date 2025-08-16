import { NextResponse } from "next/server";
import { fmtMoney, fmtNum } from "@/app/lib/helpers";
import { routeText } from "@/app/lib/registry";
import { Estimate } from "@/app/lib/types";

function buildReply(title: string, est: Estimate) {
  const itemLines = est.items
    .filter((i) => !(i.label === "Disposal" && i.cost === 0))
    .map((i) => {
      const qty = i.qty !== undefined ? ` – ${fmtNum(i.qty, 2)} ${i.unit || ""}` : "";
      const unit = i.unitPrice ? ` @ ${fmtMoney(i.unitPrice)}` : "";
      return `• ${i.label}${qty}${unit}: ${fmtMoney(i.cost)}`;
    })
    .join("\n");

  const a = est.assumptions || {};
  const assumptionLines: string[] = [];
  if (a.areaSqFt) assumptionLines.push(`• Area: ${fmtNum(a.areaSqFt)} sq ft`);
  if (a.depthInches) assumptionLines.push(`• Depth: ${fmtNum(a.depthInches, 2)} in`);
  if (a.waste !== undefined) assumptionLines.push(`• Waste: ${Math.round(a.waste * 100)}%`);
  if (a.yards) assumptionLines.push(`• Base volume: ${fmtNum(a.yards, 2)} yd³`);
  if (a.yardsWithWaste) assumptionLines.push(`• Volume incl. waste: ${fmtNum(a.yardsWithWaste, 2)} yd³`);
  if (a.removeOldTurf !== undefined) assumptionLines.push(`• Remove old turf: ${a.removeOldTurf ? "Yes" : "No"}`);
  if (a.disposalYards !== undefined) assumptionLines.push(`• Disposal volume: ${fmtNum(a.disposalYards, 2)} yd³`);
  if (a.unitBlocks) assumptionLines.push(`• Blocks (1k sq ft): ${fmtNum(a.unitBlocks)}`);
  if (a.crewSize) assumptionLines.push(`• Crew: ${a.crewSize} people`);
  if (a.wallClockHours !== undefined) assumptionLines.push(`• Time on site (est): ${fmtNum(a.wallClockHours, 1)} hrs`);
  if (a.minApplied !== undefined) assumptionLines.push(`• Minimum charge applied: ${a.minApplied ? "Yes" : "No"}`);

  const assumptionsBlock = assumptionLines.length ? `Assumptions:\n${assumptionLines.join("\n")}` : "";

  return [
    title,
    itemLines,
    `Subtotal: ${fmtMoney(est.subtotal)}`,
    `Markup: ${fmtMoney(est.markup)}`,
    `Tax: ${fmtMoney(est.tax)}`,
    `Total: ${fmtMoney(est.total)}`,
    assumptionsBlock,
  ].filter(Boolean).join("\n");
}

export function GET() {
  return NextResponse.json({
    ok: true,
    hint: "Try: 'Mowing 6000 sq ft', 'Mulch 900 sq ft at 3 inches', 'Sod 1200 sq ft remove old turf', 'Gravel 800 sq ft 2 inches'.",
  });
}

export async function POST(req: Request) {
  try {
    const { text } = await req.json();
    const t = String(text || "");
    if (!t) return NextResponse.json({ reply: "Describe the job. Example: 'Mowing 6,000 sq ft (tight access)'." });

    const routed = routeText(t);
    if (typeof routed.result === "string") {
      return NextResponse.json({ reply: routed.result });
    }
    const reply = buildReply(routed.title, routed.result as Estimate);
    return NextResponse.json({ reply });
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
}
