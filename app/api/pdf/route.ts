import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

function dataUrlToBytes(dataUrl?: string): Uint8Array | null {
  if (!dataUrl) return null;
  const m = dataUrl.match(/^data:(image\/(png|jpeg));base64,(.+)$/i);
  if (!m) return null;
  const b64 = m[3];
  const bin = Buffer.from(b64, "base64");
  return new Uint8Array(bin);
}

// naive word wrap for monospaced text
function wrapText(text: string, maxChars: number): string[] {
  const lines: string[] = [];
  const rawLines = text.split(/\r?\n/);
  for (const raw of rawLines) {
    if (raw.length <= maxChars) { lines.push(raw); continue; }
    const words = raw.split(/\s+/);
    let cur = "";
    for (const w of words) {
      if ((cur + (cur ? " " : "") + w).length <= maxChars) {
        cur = cur ? cur + " " + w : w;
      } else {
        if (cur) lines.push(cur);
        if (w.length > maxChars) {
          // hard-split very long tokens
          for (let i = 0; i < w.length; i += maxChars) {
            lines.push(w.slice(i, i + maxChars));
          }
          cur = "";
        } else {
          cur = w;
        }
      }
    }
    if (cur) lines.push(cur);
  }
  return lines;
}

export async function POST(req: Request) {
  try {
    const { estimate, business } = await req.json();
    const safeEstimate: string = String(estimate || "");
    const biz = {
      name: String(business?.name || "Your Landscaping Co."),
      phone: String(business?.phone || ""),
      email: String(business?.email || ""),
      logoDataUrl: String(business?.logoDataUrl || ""),
    };

    // Create PDF
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([612, 792]); // Letter portrait
    const { width, height } = page.getSize();

    const fontTitle = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontBody = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontMono = await pdfDoc.embedFont(StandardFonts.Courier);

    // Header
    const margin = 50;
    let y = height - margin;

    // Logo (optional)
    const logoBytes = dataUrlToBytes(biz.logoDataUrl);
    if (logoBytes) {
      try {
        let img;
        if (biz.logoDataUrl.includes("image/png")) {
          img = await pdfDoc.embedPng(logoBytes);
        } else {
          img = await pdfDoc.embedJpg(logoBytes);
        }
        const logoW = 120;
        const scale = logoW / img.width;
        const logoH = img.height * scale;
        page.drawImage(img, { x: margin, y: y - logoH, width: logoW, height: logoH });
      } catch {}
    }

    // Business info
    const rightX = width - margin;
    const infoX = margin + 140; // shift right to leave space for logo
    page.drawText(biz.name, { x: infoX, y: y - 10, size: 18, font: fontTitle, color: rgb(0.1, 0.6, 0.4) });
    y -= 24;
    if (biz.phone) {
      page.drawText(`Phone: ${biz.phone}`, { x: infoX, y: y - 10, size: 11, font: fontBody, color: rgb(0.2, 0.2, 0.2) });
      y -= 14;
    }
    if (biz.email) {
      page.drawText(`Email: ${biz.email}`, { x: infoX, y: y - 10, size: 11, font: fontBody, color: rgb(0.2, 0.2, 0.2) });
      y -= 14;
    }
    const dateStr = new Date().toLocaleString();
    page.drawText(`Date: ${dateStr}`, { x: infoX, y: y - 10, size: 11, font: fontBody, color: rgb(0.2, 0.2, 0.2) });
    y -= 24;

    // Title
    page.drawText("Estimate", { x: margin, y: y - 10, size: 20, font: fontTitle, color: rgb(0,0,0) });
    y -= 26;

    // Body (monospaced for your itemized lines)
    const maxChars = 86; // rough width for Courier 10pt @ letter width with margins
    const wrapped = wrapText(safeEstimate, maxChars);
    const lineHeight = 14;
    let curY = y;

    for (const line of wrapped) {
      if (curY < margin + 40) {
        // new page
        const p = pdfDoc.addPage([612, 792]);
        curY = 792 - margin;
        // re-draw a small header line
        p.drawText(biz.name, { x: margin, y: curY, size: 12, font: fontBody, color: rgb(0.2,0.2,0.2) });
        curY -= 22;
        // switch ref
        (page as any) = p; // TS ignore; for clarity this is fine in JS runtime
      }
      page.drawText(line, { x: margin, y: curY, size: 10, font: fontMono, color: rgb(0,0,0) });
      curY -= lineHeight;
    }

    // Footer
    const footer = "This is a ballpark estimate. A site visit is required for a firm quote.";
    page.drawText(footer, { x: margin, y: margin - 5, size: 9, font: fontBody, color: rgb(0.35,0.35,0.35) });

    const bytes = await pdfDoc.save();
    return new NextResponse(Buffer.from(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="estimate.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("PDF error", e);
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
  }
}
