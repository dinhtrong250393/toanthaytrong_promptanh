import { GoogleGenAI, ThinkingLevel, Type } from "@google/genai";
import type { IncomingMessage, ServerResponse } from "http";

interface VercelReq extends IncomingMessage {
  body?: unknown;
}

interface VercelRes extends ServerResponse {
  status: (code: number) => VercelRes;
  json: (data: unknown) => void;
}

function sendJson(res: ServerResponse, statusCode: number, payload: unknown) {
  const anyRes = res as Partial<VercelRes>;
  if (typeof anyRes.status === "function" && typeof anyRes.json === "function") {
    anyRes.status(statusCode).json(payload);
    return;
  }
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

async function readRequestBody(req: VercelReq): Promise<Record<string, unknown>> {
  if (req.body && typeof req.body === "object") {
    return req.body as Record<string, unknown>;
  }
  if (typeof req.body === "string" && req.body.trim()) {
    return JSON.parse(req.body) as Record<string, unknown>;
  }
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw) return {};
  return JSON.parse(raw) as Record<string, unknown>;
}

function parseDataUrl(dataUrl: string): { mimeType: string; data: string } | null {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl.trim());
  if (!match) return null;
  return { mimeType: match[1], data: match[2] };
}

export default async function handler(req: VercelReq, res: VercelRes) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Phương thức không hợp lệ (chỉ hỗ trợ POST)." });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    sendJson(res, 500, {
      error:
        "Chưa cấu hình biến môi trường GEMINI_API_KEY trên Vercel. Vui lòng vào Vercel Dashboard → Settings → Environment Variables, thêm GEMINI_API_KEY rồi Redeploy.",
    });
    return;
  }

  try {
    const body = await readRequestBody(req);
    const imageDataUrl =
      typeof body.imageDataUrl === "string" ? body.imageDataUrl : null;
    const theoryText =
      typeof body.theoryText === "string" ? body.theoryText : "";
    const title = typeof body.title === "string" ? body.title : "";
    const groupLabel =
      typeof body.groupLabel === "string" ? body.groupLabel : "";
    const groupNumber =
      typeof body.groupNumber === "number" ? body.groupNumber : 1;
    const readImageFirst =
      typeof body.readImageFirst === "boolean" ? body.readImageFirst : true;

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    const parts: Array<
      { inlineData: { mimeType: string; data: string } } | { text: string }
    > = [];

    const parsedImg =
      readImageFirst && imageDataUrl ? parseDataUrl(imageDataUrl) : null;
    if (parsedImg) {
      parts.push({
        inlineData: {
          mimeType: parsedImg.mimeType,
          data: parsedImg.data,
        },
      });
    }

    const cleanInputText = theoryText.trim();
    if (!parsedImg && !cleanInputText) {
      sendJson(res, 400, {
        error:
          "Vui lòng tải ảnh ghi chép của nhóm hoặc nhập/nạp nội dung lý thuyết trước khi viết lại Prompt.",
      });
      return;
    }

    const safeGroup = groupLabel.trim() || String(groupNumber);
    const userTitle = title.trim();

    parts.push({
      text: `Bạn là giáo viên Toán 12 THPT và chuyên gia thiết kế Prompt Infographic.
${
  parsedImg
    ? "Hãy đọc thật kỹ toàn bộ chữ viết tay, công thức, sơ đồ trong hình ảnh thảo luận nhóm đính kèm."
    : ""
}
${cleanInputText ? `Nội dung văn bản hiện có của nhóm:\n${cleanInputText}\n` : ""}
Nhiệm vụ của bạn:
1. Trích xuất và viết lại toàn bộ nội dung kiến thức Toán học thành các mục I, II, III, IV... cô đọng, súc tích, chính xác tuyệt đối về mặt Toán học để trình bày đẹp thành 3 cột trên bảng xanh 16:9.
2. Quy chuẩn ký hiệu: Viết rõ "vectơ AB", "vectơ a", "vectơ 0" (tuyệt đối KHÔNG dùng dấu **, ## hay ký hiệu LaTeX $).
3. Đề xuất 1 tiêu đề ngắn gọn in hoa phù hợp nhất (nếu người dùng đã điền tiêu đề "${userTitle}", hãy giữ nguyên tiêu đề đó).`,
    });

    const response = await ai.models.generateContent({
      model: "gemini-4-hydrogen",
      contents: { parts },
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            extractedText: {
              type: Type.STRING,
              description:
                "Cleaned structured theory notes (I, II, III...) extracted and rewritten cleanly from the image/text, plain text without ** or $.",
            },
            suggestedTitle: {
              type: Type.STRING,
              description: "Short uppercase Vietnamese title for the infographic.",
            },
          },
          required: ["extractedText", "suggestedTitle"],
        },
      },
    });

    const parsedJson = JSON.parse((response.text ?? "{}").trim()) as {
      extractedText?: string;
      suggestedTitle?: string;
    };

    const cleanedBody = parsedJson.extractedText?.trim();
    if (!cleanedBody) {
      sendJson(res, 502, {
        error: "Gemini chưa đọc/viết lại được nội dung. Vui lòng thử lại.",
      });
      return;
    }

    const finalTitle =
      userTitle ||
      parsedJson.suggestedTitle?.trim() ||
      "VECTƠ VÀ CÁC PHÉP TOÁN TRONG KHÔNG GIAN";

    const finalPrompt = `Tạo hình ảnh infographic về nội dung sau:

${cleanedBody}

YÊU CẦU THIẾT KẾ:
• Đối tượng mục tiêu: Học sinh trung học phổ thông
• Kích thước/Tỉ lệ: 16:9
• Bố cục (Layout): Dạng cột (chia 3 cột cân đối trên bảng xanh)
• Cảm xúc/Không khí: Truyền cảm hứng
• Hình minh họa: Bảng xanh viết phấn, các ý chính viết phấn màu, hình vẽ tay minh họa bằng phấn ngay bên cạnh từng quy tắc, viền gỗ nâu quanh bảng
• Tông màu: Phấn trắng, bảng xanh
• Từ ngữ: Chữ viết tay, ngắn gọn, chuyên ngành toán, mũi tên vectơ rõ nét ngay trên đầu chữ
• Các yếu tố bổ sung: Icon phấn nhỏ (bóng đèn, ngôi sao, nhóm học sinh), hình ảnh minh họa toán học
• Tiêu đề: ${finalTitle}
• Chân trang góc phải (đóng khung):
Trường THPT MỸ THỌ
Lớp: 12A7
NHÓM: ${safeGroup}
THẦY TRỌNG DẠY TOÁN`;

    sendJson(res, 200, {
      extractedText: cleanedBody,
      suggestedTitle: finalTitle,
      finalPrompt,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Lỗi máy chủ khi gọi Gemini API.";
    console.error("Vercel rewrite-image-prompt error:", err);

    if (
      message.includes("403") ||
      message.includes("PERMISSION_DENIED") ||
      message.includes("API_KEY")
    ) {
      sendJson(res, 403, {
        error:
          "API key trên Vercel chưa hợp lệ hoặc bị từ chối quyền. Vui lòng kiểm tra GEMINI_API_KEY trong Vercel Environment Variables.",
      });
      return;
    }
    if (message.includes("429") || message.includes("RESOURCE_EXHAUSTED")) {
      sendJson(res, 429, {
        error:
          "Đã chạm giới hạn lượt gọi tạm thời của Gemini API. Vui lòng đợi vài chục giây rồi bấm thử lại.",
      });
      return;
    }
    sendJson(res, 500, {
      error: `Không thể đọc ảnh lúc này: ${message}`,
    });
  }
}
