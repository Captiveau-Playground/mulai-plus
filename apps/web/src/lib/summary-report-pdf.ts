import * as QRCode from "qrcode";

// Menggunakan Helvetica (built-in jsPDF)

interface ReportItem {
  title: string;
  description: string;
}

interface SignatureSigner {
  name: string;
  role: string;
  verificationUrl: string;
}

interface ReportData {
  studentName: string;
  mentorName: string;
  batchName: string;
  programName: string;
  items: ReportItem[];
  mentorNotes?: string | null;
  date: string;
  signers?: SignatureSigner[];
}

// Scale: SVG 1240px → A4 210mm
const S = 210 / 1240;

// ── Cache loaded images ──
const imageCache = new Map<string, string>();

async function loadImageAsBase64(url: string): Promise<string> {
  if (imageCache.has(url)) return imageCache.get(url)!;
  const resp = await fetch(url);
  const blob = await resp.blob();
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result); // full data:image/png;base64,...
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
  imageCache.set(url, base64);
  return base64;
}

export async function generateSummaryReportPdf(report: ReportData): Promise<Blob> {
  const { default: JsPDF } = await import("jspdf");
  const pdf = new JsPDF("p", "mm", "a4");

  // ── Load images ──
  const [leftHdr, rightHdr, vectorLogo] = await Promise.all([
    loadImageAsBase64("/images/left-headers.png"),
    loadImageAsBase64("/images/right-headers.png"),
    loadImageAsBase64("/images/vector.png"),
  ]);

  const pageW = 210;
  const pageH = 297;
  const mx = 72 * S;
  const cw = 1096 * S;

  const fillWhite = () => {
    pdf.setFillColor(255, 255, 255);
    pdf.rect(0, 0, pageW, pageH, "F");
  };

  const wrap = (text: string, size: number, maxW: number): string[] => {
    pdf.setFontSize(size);
    return pdf.splitTextToSize(text, maxW);
  };

  // ── Layout constants ──
  const L = {
    // Corner decorations: 480x160px → mm
    cornerW: 480 * S,
    cornerH: 160 * S,
    // Vector logo (MULAI+): 134x34px
    logoW: 134 * S,
    logoH: 34 * S,
    logoTop: 64 * S,
    // Title ~134px SVG → baseline ~30.7mm (26pt font)
    titleTop: 30.5,
    // Subtitle ~205px SVG → baseline ~38.2mm (11pt font)
    subtitleTop: 38,
    // Profile header ~306px SVG
    profileTop: 306 * S,
    // Separator line ~368px SVG
    lineTop: 368 * S,
    itemsTop: 416 * S,
    itemH: 148 * S,
    itemGap: 24 * S,
    circleSize: 36 * S,
    circleGap: 8 * S,
    textAreaGap: 16 * S,
    textAreaH: 96 * S,
    cityTop: 1370 * S,
    sigTop: 1420 * S,
  };

  // ── Draw a single assessment item ──
  function drawItem(index: number, title: string, description: string, originY: number): number {
    const circleR = L.circleSize / 2;
    const circleX = mx + circleR;
    const titleX = mx + L.circleSize + L.circleGap;
    const titleW = cw - L.circleSize - L.circleGap;

    // Circle
    pdf.setFillColor(26, 31, 109);
    pdf.circle(circleX, originY + circleR, circleR, "F");

    // Number
    pdf.setFont("Helvetica", "bold");
    pdf.setFontSize(7);
    pdf.setTextColor(255, 255, 255);
    pdf.text(`${index + 1}`, circleX, originY + circleR + 1.3, { align: "center" });

    // Title
    pdf.setFont("Helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(51, 51, 51);
    const titleLines = wrap(title, 8, titleW);
    pdf.text(titleLines, titleX, originY + circleR + 1.5);

    // Text area box
    const taY = originY + L.circleSize + L.textAreaGap;
    const taH = L.textAreaH;

    pdf.setDrawColor(209, 209, 209);
    pdf.setLineWidth(0.4);
    pdf.setFillColor(255, 255, 255);
    pdf.roundedRect(mx, taY, cw, taH, 1.4, 1.4, "FD");

    // Description
    const padX = 4 * S;
    const descW = cw - padX * 2;
    pdf.setFont("Helvetica", "normal");
    pdf.setFontSize(7);
    pdf.setTextColor(109, 109, 109);
    const descLines = wrap(description, 7, descW);
    pdf.text(descLines, mx + padX, taY + 3 * S + 3);

    return originY + L.itemH;
  }

  // ═══════════════════ PAGE 1 ═══════════════════

  // ── PDF Metadata ──
  pdf.setProperties({
    title: `Summary Report - ${report.studentName}`,
    subject: `Program ${report.programName} - ${report.batchName}`,
    author: "MULAI+",
    creator: "MULAI+ - Bimbingan Universitas, Jurusan & Beasiswa",
    keywords: `summary report, mentoring, ${report.programName}, ${report.studentName}, ${report.mentorName}`,
  });

  fillWhite();

  // ── Corner decorations (PNG images) ──
  // left-headers.png mepet pojok kiri atas
  pdf.addImage(leftHdr, "PNG", 0, 0, L.cornerW, L.cornerH);
  // right-headers.png mepet pojok kanan atas
  pdf.addImage(rightHdr, "PNG", pageW - L.cornerW, 0, L.cornerW, L.cornerH);

  // ── Vector logo (MULAI+) — centered above title ──
  const logoX = (pageW - L.logoW) / 2;
  pdf.addImage(vectorLogo, "PNG", logoX, L.logoTop, L.logoW, L.logoH);

  // ── "Student Summary Report" title ──
  pdf.setFont("Helvetica", "bold");
  pdf.setFontSize(26);
  pdf.setTextColor(26, 31, 109);
  pdf.text("Student Summary Report", pageW / 2, L.titleTop, { align: "center" });

  // ── Subtitle ──
  pdf.setFont("Helvetica", "normal");
  pdf.setFontSize(11);
  pdf.setTextColor(109, 109, 109);
  pdf.text("PROGRAM BEASISWA MENTORING", pageW / 2, L.subtitleTop, { align: "center" });

  // ── Profile header (4 kolom rata) ──
  const colW = cw / 4;
  const colX = [mx, mx + colW, mx + colW * 2, mx + colW * 3];
  const colPad = 2; // padding kiri tiap kolom (mm)

  const profileFields = [
    { label: "STUDENT", value: report.studentName },
    { label: "MENTOR", value: report.mentorName },
    { label: "PROGRAM", value: report.programName },
    { label: "PERIOD", value: report.batchName },
  ];

  pdf.setFont("Helvetica", "bold");
  pdf.setFontSize(6.5);
  pdf.setTextColor(26, 31, 109);
  for (let i = 0; i < 4; i++) pdf.text(profileFields[i].label, colX[i] + colPad, L.profileTop);

  pdf.setFont("Helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(109, 109, 109);
  for (let i = 0; i < 4; i++) pdf.text(profileFields[i].value, colX[i] + colPad, L.profileTop + 4 + 9 * S);

  // ── Separator line ──
  pdf.setDrawColor(176, 176, 176);
  pdf.setLineWidth(0.4);
  pdf.line(mx, L.lineTop, mx + cw, L.lineTop);

  // ── Assessment items ──
  const itemsPerPage = Math.floor((pageH - L.itemsTop - 20) / (L.itemH + L.itemGap));
  let currentY = L.itemsTop;
  let pageNum = 1;

  for (let i = 0; i < report.items.length; i++) {
    if (i > 0 && i % itemsPerPage === 0) {
      pdf.addPage();
      pageNum++;
      fillWhite();
      currentY = mx;
    } else if (i > 0) {
      currentY += L.itemGap;
    }
    currentY = drawItem(i, report.items[i].title, report.items[i].description, currentY);
  }

  // ── City/Date & Signatures ──
  let cityDateY: number;
  let sigY: number;

  if (pageNum === 1 && report.items.length <= itemsPerPage) {
    cityDateY = L.cityTop;
    sigY = L.sigTop;
  } else {
    cityDateY = currentY + 12;
    sigY = cityDateY + 16;
    if (cityDateY + 30 > pageH) {
      pdf.addPage();
      fillWhite();
      cityDateY = 20;
      sigY = cityDateY + 16;
    }
  }

  pdf.setFont("Helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(51, 51, 51);
  pdf.text(`Surabaya, ${report.date}`, pageW / 2, cityDateY, { align: "center" });

  // ── Helper: QR dengan logo besar di tengah ──
  async function qrWithLogo(url: string): Promise<string> {
    const qrDataUrl = await QRCode.toDataURL(url, {
      width: 400,
      margin: 2,
      color: { dark: "#000000", light: "#FFFFFF" },
      errorCorrectionLevel: "H", // High: bisa tahan 30% noise/overlay
    });

    const canvas = document.createElement("canvas");
    canvas.width = 400;
    canvas.height = 400;
    const ctx = canvas.getContext("2d")!;

    const qrImg = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = qrDataUrl;
    });
    ctx.drawImage(qrImg, 0, 0, 400, 400);

    // Logo lebih besar tapi masih bisa di-scan (error correction H = 30%)
    if (vectorLogo) {
      const logoImg = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = vectorLogo;
      });
      const logoW = 120; // 30% dari 400px
      const logoH = 30;
      const lx = (400 - logoW) / 2;
      const ly = (400 - logoH) / 2;

      // White background behind logo
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(lx - 6, ly - 6, logoW + 12, logoH + 12);
      ctx.drawImage(logoImg, lx, ly, logoW, logoH);
    }

    return canvas.toDataURL("image/png");
  }

  // ── QR Code Signatures ──
  const pageCx = pageW / 2;
  const halfGap = ((908 * S - mx) / 2) * 0.75;
  const sigLeftCx = pageCx - halfGap;
  const sigRightCx = pageCx + halfGap;
  const qrSize = 26;
  let hasQR = false;

  if (report.signers && report.signers.length > 0) {
    try {
      for (const signer of report.signers) {
        const isLeft = signer.role === "program_manager";
        const cx = isLeft ? sigLeftCx : sigRightCx;
        const qrX = cx - qrSize / 2;

        const qrFinal = await qrWithLogo(signer.verificationUrl);
        pdf.addImage(qrFinal, "PNG", qrX, sigY, qrSize, qrSize);

        pdf.setFont("Helvetica", "bold");
        pdf.setFontSize(6.5);
        pdf.setTextColor(51, 51, 51);
        pdf.text(signer.name, cx, sigY + qrSize + 3.5, { align: "center" });

        pdf.setFont("Helvetica", "normal");
        pdf.setFontSize(6);
        pdf.setTextColor(109, 109, 109);
        const roleLabel =
          signer.role === "program_manager" ? "Program Manager" : signer.role === "founder" ? "Founder" : signer.role;
        pdf.text(roleLabel, cx, sigY + qrSize + 6.5, { align: "center" });
      }

      hasQR = true;
      sigY = sigY + qrSize + 12;
    } catch (e) {
      console.warn("QR Code generation failed, falling back to text", e);
    }
  }

  // ── Fallback: text-only signatures ──
  if (!hasQR) {
    pdf.setFont("Helvetica", "bold");
    pdf.setFontSize(8);
    pdf.setTextColor(51, 51, 51);
    pdf.text("Nama Program Manager", sigLeftCx, sigY + 2, { align: "center" });
    pdf.text("Nama Founder", sigRightCx, sigY + 2, { align: "center" });

    pdf.setFont("Helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(109, 109, 109);
    pdf.text("Program Manager", sigLeftCx, sigY + 7, { align: "center" });
    pdf.text("Founder", sigRightCx, sigY + 7, { align: "center" });
  }

  return pdf.output("blob");
}
