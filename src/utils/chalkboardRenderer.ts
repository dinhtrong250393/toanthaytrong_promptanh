// High-Resolution 1920x1080 (16:9) Chalkboard Infographic Engine
// Matches classroom chalkboard aesthetic: 3 balanced auto-flowing columns,
// hand-drawn chalk vector arrows directly above symbols, inline chalk geometry diagrams,
// and exact bottom-right framed footer box.

export type DiagramKind =
  | "vec_def"
  | "triangle_rule"
  | "parallelogram_rule"
  | "box_rule"
  | "scalar_mul"
  | "dot_product"
  | "coplanar"
  | "midpoint"
  | "centroid"
  | "oxyz_axes";

export type ChalkIconKind = "lightbulb" | "group" | "sparkles" | "star";

export interface AiColumnItem {
  kind: "roman" | "sub" | "bullet";
  text: string;
  accent?: "yellow" | "mint" | "sky" | "pink" | "orange";
  diagram?: DiagramKind | "none";
  icon?: ChalkIconKind | "none";
}

export interface AiChalkboardPlan {
  title?: string;
  columns: [AiColumnItem[], AiColumnItem[], AiColumnItem[]];
}

export interface ChalkboardOptions {
  title: string;
  groupLabel: string;
  theoryText: string;
  aiLayout?: AiChalkboardPlan;
}

type Token =
  | { kind: "text"; value: string }
  | { kind: "vec"; value: string };

interface FlowItem {
  type: "roman" | "sub" | "line";
  text: string;
  romanOwner: string;
  accentColor: string;
  diagram?: DiagramKind;
  icon?: ChalkIconKind;
}

const SECTION_ACCENTS = [
  "#FDE047", // warm yellow
  "#7DD3FC", // sky blue
  "#6EE7B7", // mint green
  "#F9A8D4", // pastel pink
  "#FDBA74", // soft orange
];

const ACCENT_MAP: Record<string, string> = {
  yellow: "#FDE047",
  mint: "#6EE7B7",
  sky: "#7DD3FC",
  pink: "#F9A8D4",
  orange: "#FDBA74",
};

function stripMarkdownNoise(raw: string): string {
  return raw
    .replace(/\*\*/g, "")
    .replace(/__/g, "")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/`/g, "")
    .replace(/\r/g, "");
}

function normalizeMathTokens(text: string): Token[] {
  const cleaned = text
    .replace(/([A-Za-z0-9']+)\u20d7/g, "vectơ $1")
    .replace(/\\overrightarrow\{([^}]+)\}/g, "vectơ $1")
    .replace(/\\vec\{([^}]+)\}/g, "vectơ $1")
    .replace(/\s*\*\s*/g, " · ");

  const regex = /vectơ\s+([A-Z]'?[A-Z]'?|[a-z]|0)/gi;
  const tokens: Token[] = [];
  let lastIdx = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(cleaned)) !== null) {
    if (match.index > lastIdx) {
      tokens.push({ kind: "text", value: cleaned.slice(lastIdx, match.index) });
    }
    tokens.push({ kind: "vec", value: match[1] });
    lastIdx = match.index + match[0].length;
  }
  if (lastIdx < cleaned.length) {
    tokens.push({ kind: "text", value: cleaned.slice(lastIdx) });
  }
  return tokens;
}

function detectDiagram(line: string, used: Set<DiagramKind>): DiagramKind | undefined {
  const lower = line.toLowerCase();
  const tryPick = (kind: DiagramKind): DiagramKind | undefined => {
    if (used.has(kind)) return undefined;
    used.add(kind);
    return kind;
  };

  if (lower.includes("quy tắc ba điểm")) return tryPick("triangle_rule");
  if (lower.includes("hình bình hành")) return tryPick("parallelogram_rule");
  if (lower.includes("quy tắc hình hộp")) return tryPick("box_rule");
  if (lower.includes("phép nhân vectơ") || (lower.includes("cùng hướng nếu") && lower.includes("k > 0")))
    return tryPick("scalar_mul");
  if (lower.includes("tích vô hướng") || lower.includes("vuông góc"))
    return tryPick("dot_product");
  if (lower.includes("đồng phẳng")) return tryPick("coplanar");
  if (lower.includes("trung điểm")) return tryPick("midpoint");
  if (lower.includes("trọng tâm tam giác") || lower.includes("trọng tâm tứ diện"))
    return tryPick("centroid");
  if (lower.includes("hệ trục") || lower.includes("oxyz"))
    return tryPick("oxyz_axes");
  if (lower.includes("định nghĩa") && lower.includes("đoạn thẳng có hướng"))
    return tryPick("vec_def");
  return undefined;
}

function parseFlowItems(rawText: string): FlowItem[] {
  const clean = stripMarkdownNoise(rawText);
  const rawLines = clean
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const items: FlowItem[] = [];
  const usedDiagrams = new Set<DiagramKind>();

  let currentRoman = "I. KIẾN THỨC TRỌNG TÂM";
  let romanCount = 0;
  let currentAccent = SECTION_ACCENTS[0];

  const romanRegex = /^(I|II|III|IV|V|VI|VII|VIII)\.\s+(.+)$/i;
  const subRegex = /^(\d+)\.\s+(.+)$/;

  for (let rawLine of rawLines) {
    // Strip leading decorative bullets like "• ", "- ", "* " before checking Roman/Sub headings
    const strippedBullet = rawLine.replace(/^[•\-*+]\s*/, "").trim();

    const rMatch = romanRegex.exec(strippedBullet);
    if (rMatch) {
      currentRoman = `${rMatch[1].toUpperCase()}. ${rMatch[2].toUpperCase()}`;
      currentAccent = SECTION_ACCENTS[romanCount % SECTION_ACCENTS.length];
      romanCount++;
      items.push({
        type: "roman",
        text: currentRoman,
        romanOwner: currentRoman,
        accentColor: currentAccent,
      });
      continue;
    }

    const sMatch = subRegex.exec(strippedBullet);
    if (sMatch) {
      const subText = `${sMatch[1]}. ${sMatch[2]}`;
      items.push({
        type: "sub",
        text: subText,
        romanOwner: currentRoman,
        accentColor: currentAccent,
        diagram: detectDiagram(subText, usedDiagrams),
      });
      continue;
    }

    // Regular bullet / line
    const lineText = rawLine.startsWith("+") || rawLine.startsWith("*")
      ? rawLine
      : `+ ${strippedBullet}`;

    items.push({
      type: "line",
      text: lineText,
      romanOwner: currentRoman,
      accentColor: currentAccent,
      diagram: detectDiagram(lineText, usedDiagrams),
    });
  }

  return items;
}

function wrapTokens(
  ctx: CanvasRenderingContext2D,
  tokens: Token[],
  maxWidth: number
): Token[][] {
  // Split text tokens into words while keeping vector tokens atomic
  const atoms: Token[] = [];
  for (const t of tokens) {
    if (t.kind === "vec") {
      atoms.push(t);
    } else {
      const parts = t.value.split(/(\s+)/);
      for (const p of parts) {
        if (p.length > 0) atoms.push({ kind: "text", value: p });
      }
    }
  }

  const lines: Token[][] = [];
  let curLine: Token[] = [];
  let curW = 0;

  for (const atom of atoms) {
    const atomW = ctx.measureText(atom.value).width;
    if (curLine.length > 0 && curW + atomW > maxWidth && atom.value.trim() !== "") {
      lines.push(curLine);
      curLine = [];
      curW = 0;
      if (atom.kind === "text" && atom.value.trim() === "") continue;
    }
    curLine.push(atom);
    curW += atomW;
  }
  if (curLine.length > 0) lines.push(curLine);
  return lines;
}

function drawTokenLine(
  ctx: CanvasRenderingContext2D,
  line: Token[],
  x: number,
  y: number,
  fontSize: number,
  color: string
) {
  let cursorX = x;
  ctx.save();
  ctx.fillStyle = color;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";

  for (const token of line) {
    const w = ctx.measureText(token.value).width;
    if (token.kind === "vec") {
      ctx.fillStyle = "#FEF08A"; // bright chalk highlight for vector symbol
      ctx.fillText(token.value, cursorX, y);

      // Draw crisp chalk vector arrow directly above the symbol
      const arrowY = y - fontSize * 0.86;
      const startX = cursorX + 1;
      const endX = cursorX + Math.max(w - 1, 12);
      ctx.save();
      ctx.strokeStyle = "#FEF08A";
      ctx.lineWidth = Math.max(1.8, fontSize * 0.08);
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(startX, arrowY);
      ctx.lineTo(endX, arrowY);
      ctx.moveTo(endX - 4.5, arrowY - 3);
      ctx.lineTo(endX, arrowY);
      ctx.lineTo(endX - 4.5, arrowY + 3);
      ctx.stroke();
      ctx.restore();

      ctx.fillStyle = color;
    } else {
      ctx.fillText(token.value, cursorX, y);
    }
    cursorX += w;
  }
  ctx.restore();
}

function drawMiniArrow(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  lw = 2.4
) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const head = 9;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = lw;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - head * Math.cos(angle - 0.45), y2 - head * Math.sin(angle - 0.45));
  ctx.lineTo(x2 - head * Math.cos(angle + 0.45), y2 - head * Math.sin(angle + 0.45));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawInlineDiagram(
  ctx: CanvasRenderingContext2D,
  kind: DiagramKind,
  x: number,
  y: number
) {
  ctx.save();
  ctx.font = '700 17px "Patrick Hand", cursive';
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";

  if (kind === "vec_def") {
    drawMiniArrow(ctx, x + 12, y + 24, x + 115, y + 6, "#FEF08A", 2.6);
    ctx.fillStyle = "#F8FAFC";
    ctx.fillText("A", x + 8, y + 36);
    ctx.fillText("B", x + 118, y + 20);
    // Lightbulb chalk icon
    ctx.strokeStyle = "#7DD3FC";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x + 145, y + 26, 11, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 140, y + 38);
    ctx.lineTo(x + 150, y + 38);
    ctx.stroke();
  } else if (kind === "triangle_rule") {
    const A = { x: x + 65, y: y + 4 };
    const B = { x: x + 14, y: y + 72 };
    const C = { x: x + 122, y: y + 72 };
    drawMiniArrow(ctx, A.x, A.y, B.x, B.y, "#FDE047", 2.4);
    drawMiniArrow(ctx, B.x, B.y, C.x, C.y, "#7DD3FC", 2.4);
    drawMiniArrow(ctx, A.x, A.y, C.x, C.y, "#6EE7B7", 2.6);
    ctx.fillStyle = "#F8FAFC";
    ctx.fillText("A", A.x + 12, A.y);
    ctx.fillText("B", B.x - 10, B.y + 8);
    ctx.fillText("C", C.x + 12, C.y + 8);
  } else if (kind === "parallelogram_rule") {
    const A = { x: x + 14, y: y + 70 };
    const B = { x: x + 38, y: y + 12 };
    const D = { x: x + 110, y: y + 70 };
    const C = { x: x + 134, y: y + 12 };
    drawMiniArrow(ctx, A.x, A.y, B.x, B.y, "#7DD3FC", 2.4);
    drawMiniArrow(ctx, A.x, A.y, D.x, D.y, "#6EE7B7", 2.4);
    drawMiniArrow(ctx, A.x, A.y, C.x, C.y, "#FEF08A", 2.6);
    ctx.strokeStyle = "rgba(248,250,252,0.65)";
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(B.x, B.y);
    ctx.lineTo(C.x, C.y);
    ctx.lineTo(D.x, D.y);
    ctx.stroke();
    ctx.fillStyle = "#F8FAFC";
    ctx.fillText("A", A.x - 10, A.y + 6);
    ctx.fillText("B", B.x - 8, B.y - 6);
    ctx.fillText("C", C.x + 10, C.y - 6);
    ctx.fillText("D", D.x + 10, D.y + 6);
  } else if (kind === "box_rule") {
    const A = { x: x + 14, y: y + 76 };
    const B = { x: x + 86, y: y + 76 };
    const Bp = { x: x + 98, y: y + 20 };
    const Ap = { x: x + 26, y: y + 20 };
    const dx = 32;
    const dy = -20;
    const D = { x: A.x + dx, y: A.y + dy };
    const C = { x: B.x + dx, y: B.y + dy };
    const Dp = { x: Ap.x + dx, y: Ap.y + dy };
    const Cp = { x: Bp.x + dx, y: Bp.y + dy };

    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = "rgba(248,250,252,0.45)";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(A.x, A.y);
    ctx.lineTo(D.x, D.y);
    ctx.lineTo(C.x, C.y);
    ctx.moveTo(D.x, D.y);
    ctx.lineTo(Dp.x, Dp.y);
    ctx.stroke();

    ctx.setLineDash([]);
    ctx.strokeStyle = "rgba(248,250,252,0.85)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(A.x, A.y);
    ctx.lineTo(B.x, B.y);
    ctx.lineTo(Bp.x, Bp.y);
    ctx.lineTo(Ap.x, Ap.y);
    ctx.closePath();
    ctx.moveTo(B.x, B.y);
    ctx.lineTo(C.x, C.y);
    ctx.lineTo(Cp.x, Cp.y);
    ctx.lineTo(Bp.x, Bp.y);
    ctx.moveTo(Ap.x, Ap.y);
    ctx.lineTo(Dp.x, Dp.y);
    ctx.lineTo(Cp.x, Cp.y);
    ctx.stroke();

    drawMiniArrow(ctx, A.x, A.y, B.x, B.y, "#7DD3FC", 2.2);
    drawMiniArrow(ctx, A.x, A.y, Ap.x, Ap.y, "#6EE7B7", 2.2);
    drawMiniArrow(ctx, A.x, A.y, Cp.x, Cp.y, "#FDE047", 2.8);
    ctx.fillStyle = "#FDE047";
    ctx.fillText("AC'", Cp.x + 16, Cp.y);
  } else if (kind === "scalar_mul") {
    drawMiniArrow(ctx, x + 12, y + 18, x + 70, y + 8, "#F8FAFC", 2.4);
    drawMiniArrow(ctx, x + 16, y + 48, x + 125, y + 28, "#FDE047", 2.6);
    drawMiniArrow(ctx, x + 125, y + 58, x + 22, y + 76, "#F9A8D4", 2.4);
    ctx.fillStyle = "#FEF08A";
    ctx.fillText("2a", x + 75, y + 24);
    ctx.fillStyle = "#F9A8D4";
    ctx.fillText("-2a", x + 78, y + 82);
  } else if (kind === "dot_product") {
    const ox = x + 36;
    const oy = y + 66;
    drawMiniArrow(ctx, ox, oy, ox + 78, oy, "#6EE7B7", 2.5);
    drawMiniArrow(ctx, ox, oy, ox, oy - 54, "#7DD3FC", 2.5);
    ctx.strokeStyle = "#FDE047";
    ctx.lineWidth = 2;
    ctx.strokeRect(ox, oy - 14, 14, 14);
    ctx.fillStyle = "#FDE047";
    ctx.fillText("90°", ox + 30, oy - 22);
  } else if (kind === "coplanar") {
    ctx.strokeStyle = "#7DD3FC";
    ctx.fillStyle = "rgba(125,211,252,0.1)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 12, y + 64);
    ctx.lineTo(x + 112, y + 64);
    ctx.lineTo(x + 140, y + 16);
    ctx.lineTo(x + 40, y + 16);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    drawMiniArrow(ctx, x + 46, y + 50, x + 98, y + 50, "#FDE047", 2.2);
    drawMiniArrow(ctx, x + 46, y + 50, x + 76, y + 24, "#6EE7B7", 2.2);
    drawMiniArrow(ctx, x + 46, y + 50, x + 112, y + 30, "#F9A8D4", 2.2);
  } else if (kind === "midpoint") {
    const pA = { x: x + 16, y: y + 48 };
    const pB = { x: x + 132, y: y + 48 };
    const pI = { x: (pA.x + pB.x) / 2, y: 48 + y };
    ctx.strokeStyle = "#F8FAFC";
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(pA.x, pA.y);
    ctx.lineTo(pB.x, pB.y);
    ctx.stroke();
    drawMiniArrow(ctx, pI.x, pI.y, pA.x + 8, pA.y, "#7DD3FC", 2.4);
    drawMiniArrow(ctx, pI.x, pI.y, pB.x - 8, pB.y, "#6EE7B7", 2.4);
    ctx.fillStyle = "#FDE047";
    ctx.beginPath();
    ctx.arc(pI.x, pI.y, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillText("A", pA.x, pA.y + 16);
    ctx.fillText("I", pI.x, pI.y - 16);
    ctx.fillText("B", pB.x, pB.y + 16);
  } else if (kind === "centroid") {
    const pA = { x: x + 68, y: y + 6 };
    const pB = { x: x + 14, y: y + 74 };
    const pC = { x: x + 128, y: y + 74 };
    const G = { x: (pA.x + pB.x + pC.x) / 3, y: (pA.y + pB.y + pC.y) / 3 };
    ctx.strokeStyle = "#F8FAFC";
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(pA.x, pA.y);
    ctx.lineTo(pB.x, pB.y);
    ctx.lineTo(pC.x, pC.y);
    ctx.closePath();
    ctx.stroke();

    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = "#FDBA74";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(pA.x, pA.y);
    ctx.lineTo((pB.x + pC.x) / 2, (pB.y + pC.y) / 2);
    ctx.moveTo(pB.x, pB.y);
    ctx.lineTo((pA.x + pC.x) / 2, (pA.y + pC.y) / 2);
    ctx.stroke();

    ctx.setLineDash([]);
    ctx.fillStyle = "#FDE047";
    ctx.beginPath();
    ctx.arc(G.x, G.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillText("G", G.x + 12, G.y - 6);
  } else if (kind === "oxyz_axes") {
    const O = { x: x + 46, y: y + 54 };
    drawMiniArrow(ctx, O.x, O.y, O.x - 28, O.y + 24, "#F9A8D4", 2.3);
    drawMiniArrow(ctx, O.x, O.y, O.x + 76, O.y, "#6EE7B7", 2.3);
    drawMiniArrow(ctx, O.x, O.y, O.x, O.y - 48, "#7DD3FC", 2.3);
    ctx.fillStyle = "#FDE047";
    ctx.fillText("O", O.x - 10, O.y - 10);
    ctx.fillStyle = "#F9A8D4";
    ctx.fillText("x", O.x - 36, O.y + 28);
    ctx.fillStyle = "#6EE7B7";
    ctx.fillText("y", O.x + 86, O.y + 2);
    ctx.fillStyle = "#7DD3FC";
    ctx.fillText("z", O.x + 12, O.y - 48);
  }

  ctx.restore();
}

function drawChalkIcon(
  ctx: CanvasRenderingContext2D,
  icon: ChalkIconKind,
  x: number,
  y: number
) {
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (icon === "lightbulb") {
    ctx.strokeStyle = "#FDE047";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x + 14, y + 14, 9, Math.PI * 0.75, Math.PI * 2.25);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 10, y + 23);
    ctx.lineTo(x + 18, y + 23);
    ctx.moveTo(x + 11, y + 27);
    ctx.lineTo(x + 17, y + 27);
    // Glow rays
    ctx.moveTo(x + 14, y);
    ctx.lineTo(x + 14, y + 3);
    ctx.moveTo(x + 2, y + 12);
    ctx.lineTo(x + 5, y + 12);
    ctx.moveTo(x + 23, y + 12);
    ctx.lineTo(x + 26, y + 12);
    ctx.stroke();
  } else if (icon === "sparkles" || icon === "star") {
    ctx.strokeStyle = "#7DD3FC";
    ctx.lineWidth = 2;
    const cx = x + 14;
    const cy = y + 14;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 11);
    ctx.quadraticCurveTo(cx, cy, cx + 11, cy);
    ctx.quadraticCurveTo(cx, cy, cx, cy + 11);
    ctx.quadraticCurveTo(cx, cy, cx - 11, cy);
    ctx.quadraticCurveTo(cx, cy, cx, cy - 11);
    ctx.stroke();
  } else if (icon === "group") {
    ctx.strokeStyle = "#6EE7B7";
    ctx.lineWidth = 1.9;
    [x + 6, x + 16, x + 26].forEach((cx, idx) => {
      const cy = idx === 1 ? y + 8 : y + 10;
      ctx.beginPath();
      ctx.arc(cx, cy, 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy + 12, 6, Math.PI, 0);
      ctx.stroke();
    });
  }
  ctx.restore();
}

export async function renderChalkboardInfographic(
  options: ChalkboardOptions
): Promise<string> {
  if (typeof document !== "undefined" && document.fonts) {
    try {
      await document.fonts.load('28px "Patrick Hand"');
    } catch {
      // ignore if offline
    }
  }

  const W = 1920;
  const H = 1080;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // 1. Warm Wooden Classroom Frame
  ctx.fillStyle = "#5B371E";
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "#7D4E2D";
  ctx.lineWidth = 10;
  ctx.strokeRect(10, 10, W - 20, H - 20);

  // 2. Deep Green Chalkboard Surface + Subtle Dust
  const pad = 26;
  const boardGrad = ctx.createRadialGradient(
    W * 0.5,
    H * 0.45,
    120,
    W * 0.5,
    H * 0.5,
    W * 0.72
  );
  boardGrad.addColorStop(0, "#15422B");
  boardGrad.addColorStop(0.65, "#103522");
  boardGrad.addColorStop(1, "#092114");
  ctx.fillStyle = boardGrad;
  ctx.fillRect(pad, pad, W - pad * 2, H - pad * 2);

  ctx.save();
  for (let i = 0; i < 150; i++) {
    const x = pad + Math.random() * (W - pad * 2);
    const y = pad + Math.random() * (H - pad * 2);
    const r = 20 + Math.random() * 65;
    const dustGrad = ctx.createRadialGradient(x, y, 0, x, y, r);
    dustGrad.addColorStop(0, "rgba(255, 255, 255, 0.016)");
    dustGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = dustGrad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // 3. Chalk Title Header with Radiating Chalk Marks (Image 1 Style!)
  const titleText =
    options.title.trim().toUpperCase() || "VECTƠ VÀ CÁC PHÉP TOÁN TRONG KHÔNG GIAN";
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = '700 54px "Patrick Hand", "Plus Jakarta Sans", cursive';
  ctx.fillStyle = "#FEF08A";
  ctx.shadowColor = "rgba(0, 0, 0, 0.35)";
  ctx.shadowBlur = 4;
  ctx.fillText(titleText, W / 2, 84, W - 300);

  const measuredTitleW = Math.min(W - 360, ctx.measureText(titleText).width);
  const leftMarkX = W / 2 - measuredTitleW / 2 - 22;
  const rightMarkX = W / 2 + measuredTitleW / 2 + 22;

  ctx.shadowBlur = 0;
  ctx.strokeStyle = "#E2E8F0";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  // Left radiating dashes
  ctx.beginPath();
  ctx.moveTo(leftMarkX, 72);
  ctx.lineTo(leftMarkX - 18, 62);
  ctx.moveTo(leftMarkX - 2, 84);
  ctx.lineTo(leftMarkX - 24, 84);
  ctx.moveTo(leftMarkX, 96);
  ctx.lineTo(leftMarkX - 18, 106);
  // Right radiating dashes
  ctx.moveTo(rightMarkX, 72);
  ctx.lineTo(rightMarkX + 18, 62);
  ctx.moveTo(rightMarkX + 2, 84);
  ctx.lineTo(rightMarkX + 24, 84);
  ctx.moveTo(rightMarkX, 96);
  ctx.lineTo(rightMarkX + 18, 106);
  ctx.stroke();
  ctx.restore();

  // 4. 3-Column Layout Engine (AI Art-Directed Columns OR Auto-Flow Fallback)
  const marginX = 64;
  const colGap = 44;
  const usableW = W - marginX * 2;
  const colW = (usableW - colGap * 2) / 3;
  const colX = [marginX, marginX + colW + colGap, marginX + (colW + colGap) * 2];

  const colTop = 144;
  const colMaxY = [H - 52, H - 52, H - 216];
  const fontFamily = '"Patrick Hand", "DM Sans", cursive';

  type PlacedBlock = {
    col: number;
    y: number;
    type: "roman" | "sub" | "line";
    color: string;
    fontSize: number;
    bold: boolean;
    wrappedLines: Token[][];
    diagram?: DiagramKind;
    diagramX?: number;
    diagramY?: number;
    icon?: ChalkIconKind;
    iconX?: number;
    iconY?: number;
  };

  const tryAiColumnLayout = (
    plan: AiChalkboardPlan,
    bodySize: number
  ): { placed: PlacedBlock[]; overflowed: boolean } => {
    const romanSize = bodySize + 7;
    const subSize = bodySize + 2;
    const lineH = bodySize + 9;
    const placed: PlacedBlock[] = [];
    let overflowed = false;

    for (let c = 0; c < 3; c++) {
      const colItems = plan.columns[c] ?? [];
      let y = colTop;

      for (const item of colItems) {
        const cleanText = stripMarkdownNoise(item.text).trim();
        if (!cleanText) continue;

        const type: "roman" | "sub" | "line" =
          item.kind === "roman" ? "roman" : item.kind === "sub" ? "sub" : "line";
        const fSize =
          type === "roman" ? romanSize : type === "sub" ? subSize : bodySize;
        const bold = type !== "line";
        ctx.font = `${bold ? "700" : "400"} ${fSize}px ${fontFamily}`;

        const validDiagram =
          item.diagram && item.diagram !== "none" ? item.diagram : undefined;
        const validIcon =
          !validDiagram && item.icon && item.icon !== "none" ? item.icon : undefined;

        const rightReserve = validDiagram ? 156 : validIcon ? 42 : 8;
        const wrapped = wrapTokens(
          ctx,
          normalizeMathTokens(cleanText),
          colW - rightReserve
        );
        const textH = wrapped.length * (type === "roman" ? romanSize + 8 : lineH);
        const blockH =
          Math.max(textH, validDiagram ? 86 : 0) +
          (type === "roman" ? 12 : type === "sub" ? 6 : 4);

        const defaultColor =
          type === "roman"
            ? ACCENT_MAP[item.accent || "yellow"] || "#FDE047"
            : type === "sub"
            ? "#6EE7B7"
            : "#F8FAFC";

        placed.push({
          col: c,
          y,
          type,
          color: defaultColor,
          fontSize: fSize,
          bold,
          wrappedLines: wrapped,
          diagram: validDiagram,
          diagramX: colX[c] + colW - 148,
          diagramY: y - 10,
          icon: validIcon,
          iconX: colX[c] + colW - 36,
          iconY: y - 2,
        });
        y += blockH;
      }

      if (y > colMaxY[c]) {
        overflowed = true;
      }
    }

    return { placed, overflowed };
  };

  const tryAutoFlowLayout = (bodySize: number) => {
    const items = parseFlowItems(options.theoryText);
    const romanSize = bodySize + 7;
    const subSize = bodySize + 2;
    const lineH = bodySize + 10;

    const placed: PlacedBlock[] = [];
    let col = 0;
    let y = colTop;

    const advanceColumn = (romanOwner: string, accentColor: string) => {
      if (col < 2) {
        col++;
        y = colTop;
        if (romanOwner) {
          ctx.font = `700 ${romanSize}px ${fontFamily}`;
          const contText = `${romanOwner} (tiếp)`;
          const wrapped = wrapTokens(ctx, normalizeMathTokens(contText), colW);
          placed.push({
            col,
            y,
            type: "roman",
            color: accentColor,
            fontSize: romanSize,
            bold: true,
            wrappedLines: wrapped,
          });
          y += wrapped.length * (romanSize + 8) + 12;
        }
      }
    };

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const fSize =
        item.type === "roman"
          ? romanSize
          : item.type === "sub"
          ? subSize
          : bodySize;
      const bold = item.type !== "line";
      ctx.font = `${bold ? "700" : "400"} ${fSize}px ${fontFamily}`;

      const hasDiagram = Boolean(item.diagram);
      const textMaxW = hasDiagram ? colW - 156 : colW - 8;
      const wrapped = wrapTokens(ctx, normalizeMathTokens(item.text), textMaxW);
      const textH = wrapped.length * (item.type === "roman" ? romanSize + 8 : lineH);
      const blockH =
        Math.max(textH, hasDiagram ? 88 : 0) +
        (item.type === "roman" ? 14 : item.type === "sub" ? 6 : 4);

      if (y + blockH > colMaxY[col] && col < 2) {
        advanceColumn(
          item.type === "roman" ? "" : item.romanOwner,
          item.accentColor
        );
      }

      if (y + textH <= colMaxY[col] + 10) {
        placed.push({
          col,
          y,
          type: item.type,
          color:
            item.type === "roman"
              ? item.accentColor
              : item.type === "sub"
              ? "#6EE7B7"
              : "#F8FAFC",
          fontSize: fSize,
          bold,
          wrappedLines: wrapped,
          diagram: item.diagram,
          diagramX: colX[col] + colW - 148,
          diagramY: y - 14,
        });
        y += blockH;
      }
    }

    const overflowed = y > colMaxY[2] && col === 2;
    return { placed, overflowed };
  };

  let layout: { placed: PlacedBlock[]; overflowed: boolean };
  if (options.aiLayout && options.aiLayout.columns?.length === 3) {
    layout = tryAiColumnLayout(options.aiLayout, 24);
    if (layout.overflowed) layout = tryAiColumnLayout(options.aiLayout, 21.5);
    if (layout.overflowed) layout = tryAiColumnLayout(options.aiLayout, 19);
    if (layout.overflowed) layout = tryAiColumnLayout(options.aiLayout, 17);
  } else {
    layout = tryAutoFlowLayout(25);
    if (layout.overflowed) layout = tryAutoFlowLayout(22);
    if (layout.overflowed) layout = tryAutoFlowLayout(19.5);
  }

  // Vertical dashed chalk dividers between the 3 columns
  ctx.save();
  ctx.strokeStyle = "rgba(248, 250, 252, 0.32)";
  ctx.lineWidth = 2.5;
  ctx.setLineDash([10, 10]);
  for (let c = 1; c <= 2; c++) {
    const divX = colX[c] - colGap / 2;
    ctx.beginPath();
    ctx.moveTo(divX, colTop - 16);
    ctx.lineTo(divX, c === 2 ? H - 220 : H - 48);
    ctx.stroke();
  }
  ctx.restore();

  // Draw all placed text blocks, chalk icons, and inline chalk diagrams
  for (const blk of layout.placed) {
    if (blk.y > colMaxY[blk.col] + 6) continue;
    ctx.font = `${blk.bold ? "700" : "400"} ${blk.fontSize}px ${fontFamily}`;
    const stepY = blk.type === "roman" ? blk.fontSize + 8 : blk.fontSize + 10;

    blk.wrappedLines.forEach((lineTokens, lIdx) => {
      const lineY = blk.y + blk.fontSize + lIdx * stepY;
      drawTokenLine(
        ctx,
        lineTokens,
        colX[blk.col] + (blk.type === "line" ? 6 : 0),
        lineY,
        blk.fontSize,
        blk.color
      );
    });

    if (blk.diagram && blk.diagramX !== undefined && blk.diagramY !== undefined) {
      drawInlineDiagram(ctx, blk.diagram, blk.diagramX, blk.diagramY);
    } else if (blk.icon && blk.iconX !== undefined && blk.iconY !== undefined) {
      drawChalkIcon(ctx, blk.icon, blk.iconX, blk.iconY);
    }
  }

  // 5. Exact Bottom-Right Framed Footer Box
  const boxW = 395;
  const boxH = 152;
  const boxX = W - pad - 26 - boxW;
  const boxY = H - pad - 22 - boxH;

  ctx.save();
  ctx.fillStyle = "rgba(9, 28, 19, 0.94)";
  ctx.fillRect(boxX, boxY, boxW, boxH);

  ctx.strokeStyle = "#FDE047";
  ctx.lineWidth = 3.5;
  ctx.strokeRect(boxX, boxY, boxW, boxH);
  ctx.strokeStyle = "rgba(248, 250, 252, 0.5)";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(boxX + 6, boxY + 6, boxW - 12, boxH - 12);

  const safeGroup = options.groupLabel.trim() || "1";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.font = `700 26px ${fontFamily}`;
  ctx.fillStyle = "#FDE047";
  ctx.fillText("Trường THPT MỸ THỌ", boxX + 22, boxY + 18);

  ctx.fillStyle = "#F8FAFC";
  ctx.fillText("Lớp: 12A7", boxX + 22, boxY + 50);

  ctx.fillStyle = "#7DD3FC";
  ctx.fillText(`NHÓM: ${safeGroup}`, boxX + 22, boxY + 82);

  ctx.fillStyle = "#6EE7B7";
  ctx.fillText("THẦY TRỌNG DẠY TOÁN", boxX + 22, boxY + 114);
  ctx.restore();

  return canvas.toDataURL("image/png");
}
