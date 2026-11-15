import { GoogleGenAI } from "@google/genai";
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

export default async function handler(req: VercelReq, res: VercelRes) {
  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Phương thức không hợp lệ (chỉ hỗ trợ POST)." });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    sendJson(res, 500, {
      error:
        "Chưa cấu hình biến môi trường GEMINI_API_KEY trên Vercel Environment Variables.",
    });
    return;
  }

  try {
    const body = await readRequestBody(req);
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    const aspectRatio =
      typeof body.aspectRatio === "string" ? body.aspectRatio : "4:3";

    if (!prompt) {
      sendJson(res, 400, {
        error: "Vui lòng cung cấp nội dung mô tả (prompt) hợp lệ.",
      });
      return;
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite-image",
      contents: {
        parts: [
          {
            text: `${prompt}. Clean editorial scientific illustration, crisp geometry, high contrast for educational math flashcard background, no garbled text or random letters.`,
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: ["1:1", "3:4", "4:3", "9:16", "16:9"].includes(aspectRatio)
            ? aspectRatio
            : "4:3",
        },
      },
    });

    const parts = response.candidates?.[0]?.content?.parts ?? [];
    for (const part of parts) {
      if (part.inlineData?.data) {
        const mime = part.inlineData.mimeType ?? "image/png";
        sendJson(res, 200, {
          imageUrl: `data:${mime};base64,${part.inlineData.data}`,
        });
        return;
      }
    }

    sendJson(res, 502, {
      error:
        "Mô hình AI không trả về dữ liệu hình ảnh. Hãy thử mô tả khác hoặc tải ảnh lên thủ công.",
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Lỗi máy chủ khi gọi Gemini API.";
    sendJson(res, 500, {
      error: `Không thể tạo ảnh minh họa lúc này: ${message}`,
    });
  }
}
