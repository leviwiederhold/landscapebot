import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { name, phone, email, note } = await req.json();

    if (!name || (!phone && !email)) {
      return NextResponse.json(
        { ok: false, error: "Name and phone or email required" },
        { status: 400 }
      );
    }

    // TEMP: print to server logs (see in Vercel → Deployments → Logs)
    console.log("New lead:", {
      name,
      phone,
      email,
      note,
      at: new Date().toISOString(),
      source: "landscapebot",
    });

    return NextResponse.json({ ok: true, message: "Thanks! We’ll reach out shortly." });
  } catch (e) {
    console.error("Lead API error:", e);
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
}
