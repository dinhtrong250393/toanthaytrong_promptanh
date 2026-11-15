import "dotenv/config";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI, ThinkingLevel, Type } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === "production";

function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured on the server.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

function parseDataUrl(dataUrl: string): { mimeType: string; data: string } | null {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl.trim());
  if (!match) return null;
  return { mimeType: match[1], data: match[2] };
}

function handleGeminiError(err: unknown, res: express.Response) {
  const message =
    err instanceof Error ? err.message : "Lỗi máy chủ khi gọi Gemini API.";
  console.error("Gemini API error:", err);

  if (
    message.includes("403") ||
    message.includes("PERMISSION_DENIED") ||
    message.includes("API_KEY")
  ) {
    return res.status(403).json({
      error:
        "API key hiện tại chưa hợp lệ hoặc chưa hỗ trợ mô hình trả phí. Vui lòng kiểm tra Settings > Secrets.",
    });
  }
  if (message.includes("429") || message.includes("RESOURCE_EXHAUSTED")) {
    const isZeroLimit =
      message.includes("limit: 0") || message.includes("exceeded your current quota");
    return res.status(429).json({
      error: isZeroLimit
        ? "API Key hiện tại có hạn mức tạo ảnh = 0 (cần bật Cloud Billing trên Google Cloud Project của key). Thầy/cô hãy dùng chế độ 'Tạo Infographic Bảng xanh Tức thì 16:9' ở ngay bên cạnh để xuất ảnh không giới hạn!"
        : "Đã vượt giới hạn lượt gọi/phút (RPM) của Gemini Image AI. Vui lòng đợi 30–60 giây hoặc dùng chế độ 'Bảng xanh Tức thì 16:9'.",
    });
  }
  return res.status(500).json({
    error: `Không thể xử lý yêu cầu AI lúc này: ${message}`,
  });
}

async function createServer() {
  const app = express();
  app.use(express.json({ limit: "15mb" }));

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  // OCR & structure student group notes from uploaded image
  app.post("/api/ocr-theory", async (req, res) => {
    try {
      const { imageDataUrl, groupNumber } = req.body as {
        imageDataUrl?: string;
        groupNumber?: number;
      };

      if (!imageDataUrl || typeof imageDataUrl !== "string") {
        return res.status(400).json({
          error: "Vui lòng tải lên hình ảnh ghi chép thảo luận nhóm.",
        });
      }

      const parsed = parseDataUrl(imageDataUrl);
      if (!parsed) {
        return res.status(400).json({
          error: "Định dạng ảnh không hợp lệ (cần Data URL base64).",
        });
      }

      const ai = getAiClient();
      const response = await ai.models.generateContent({
        model: "gemini-4-hydrogen",
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: parsed.mimeType,
                data: parsed.data,
              },
            },
            {
              text: `Bạn là giáo viên Toán THPT chuyên nghiệp. Hãy đọc kỹ hình ảnh ghi chép/sơ đồ thảo luận của Nhóm ${
                groupNumber ?? ""
              } (môn Toán 12 - Chương Vectơ và Hệ trục tọa độ trong không gian).
Trích xuất đầy đủ, chính xác toàn bộ nội dung lý thuyết, định nghĩa, công thức và mẹo ghi nhớ trong ảnh thành văn bản thuần (KHÔNG dùng ký tự Markdown như **, ##, * hay dấu gạch đầu dòng thừa ở tiêu đề).
Định dạng chuẩn từng dòng như ví dụ sau:
I. KHÁI NIỆM VECTƠ TRONG KHÔNG GIAN
1. Định nghĩa
   Vectơ trong không gian là đoạn thẳng có hướng.
   Kí hiệu: vectơ AB (A là điểm đầu, B là điểm cuối) hoặc vectơ a.
2. Các khái niệm liên quan
   + Giá của vectơ: đường thẳng đi qua điểm đầu và điểm cuối.
   + Độ dài của vectơ: |vectơ AB|.
II. CÁC PHÉP TOÁN VECTƠ
1. Phép cộng và phép trừ
   + Quy tắc ba điểm: vectơ AB + vectơ BC = vectơ AC.

Lưu ý: Viết rõ "vectơ AB", "vectơ a", "vectơ 0" (không dùng ký hiệu LaTeX $ hay dấu **). Chỉ trả về nội dung đã trích xuất sạch sẽ.`,
            },
          ],
        },
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      });

      const extractedText = response.text?.trim();
      if (!extractedText) {
        return res.status(502).json({
          error:
            "Không đọc được nội dung từ ảnh. Vui lòng chụp ảnh rõ nét hơn hoặc nhập trực tiếp nội dung.",
        });
      }

      return res.json({ extractedText });
    } catch (err: unknown) {
      return handleGeminiError(err, res);
    }
  });

  // Read uploaded discussion photo (if present) and rewrite content into an optimal prompt for Gemini Pro image creation
  app.post("/api/rewrite-image-prompt", async (req, res) => {
    try {
      const {
        imageDataUrl,
        theoryText,
        title,
        groupLabel,
        groupNumber,
        readImageFirst = true,
      } = req.body as {
        imageDataUrl?: string | null;
        theoryText?: string;
        title?: string;
        groupLabel?: string;
        groupNumber?: number;
        readImageFirst?: boolean;
      };

      const ai = getAiClient();
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

      const cleanInputText = (theoryText ?? "").trim();
      if (!parsedImg && !cleanInputText) {
        return res.status(400).json({
          error:
            "Vui lòng tải ảnh ghi chép của nhóm hoặc nhập/nạp nội dung lý thuyết trước khi viết lại Prompt.",
        });
      }

      const safeGroup = (groupLabel ?? "").trim() || String(groupNumber ?? 1);
      const userTitle = (title ?? "").trim();

      parts.push({
        text: `Bạn là giáo viên Toán 12 THPT và chuyên gia thiết kế Prompt Infographic.
${
  parsedImg
    ? "Hãy đọc thật kỹ toàn bộ chữ viết tay, công thức, sơ đồ trong hình ảnh thảo luận nhóm đính kèm."
    : ""
}
${
  cleanInputText
    ? `Nội dung văn bản hiện có của nhóm:\n${cleanInputText}\n`
    : ""
}
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
        return res.status(502).json({
          error: "Gemini chưa đọc/viết lại được nội dung. Vui lòng thử lại.",
        });
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

      return res.json({
        extractedText: cleanedBody,
        suggestedTitle: finalTitle,
        finalPrompt,
      });
    } catch (err: unknown) {
      return handleGeminiError(err, res);
    }
  });

  // Generate 16:9 Chalkboard Infographic from uploaded photo + structured theory + form metadata
  app.post("/api/generate-chalkboard-infographic", async (req, res) => {
    try {
      const {
        imageDataUrl,
        theoryText,
        title,
        groupLabel,
        specs,
        useProModel = true,
      } = req.body as {
        imageDataUrl?: string | null;
        theoryText?: string;
        title?: string;
        groupLabel?: string;
        useProModel?: boolean;
        specs?: {
          audience?: string;
          aspectRatio?: string;
          layout?: string;
          mood?: string;
          illustrationStyle?: string;
          palette?: string;
          wordingStyle?: string;
          extras?: string;
        };
      };

      const ai = getAiClient();
      let finalTheory = (theoryText ?? "").trim();

      // If no text yet but an image was uploaded, extract full structured text via Gemini Vision first
      if (!finalTheory && imageDataUrl) {
        const parsed = parseDataUrl(imageDataUrl);
        if (parsed) {
          const ocrResp = await ai.models.generateContent({
            model: "gemini-4-hydrogen",
            contents: {
              parts: [
                {
                  inlineData: {
                    mimeType: parsed.mimeType,
                    data: parsed.data,
                  },
                },
                {
                  text: "Đọc kỹ và trích xuất đầy đủ các mục lý thuyết, định nghĩa, quy tắc, công thức toán học và mẹo ghi nhớ trong ảnh thành các mục I, II, III, IV rõ ràng bằng văn bản thuần (không dùng dấu ** hay LaTeX $). Viết rõ vectơ AB, vectơ a, vectơ 0.",
                },
              ],
            },
            config: {
              thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            },
          });
          finalTheory = ocrResp.text?.trim() ?? "";
        }
      }

      if (!finalTheory) {
        return res.status(400).json({
          error:
            "Vui lòng tải ảnh nội dung thảo luận hoặc nạp/nhập nội dung lý thuyết trước khi tạo ảnh.",
        });
      }

      const safeTitle = (title ?? "").trim() || "VECTƠ VÀ CÁC PHÉP TOÁN TRONG KHÔNG GIAN";
      const safeGroup = (groupLabel ?? "").trim() || "1";

      const prompt = `Tạo hình ảnh infographic bảng xanh lớp học viết phấn về nội dung sau:

${finalTheory}

YÊU CẦU THIẾT KẾ CHI TIẾT (CHUẨN BẢNG XANH TOÁN HỌC 16:9):
• Đối tượng mục tiêu: ${specs?.audience || "Học sinh trung học phổ thông"}
• Kích thước/Tỉ lệ: 16:9 toàn màn hình, viền bảng gỗ nâu ấm bao quanh.
• Bố cục (Layout): Chia đều làm 3 cột thẳng đứng bằng 2 đường phấn trắng nét đứt dọc; nếu một mục dài hãy viết tiếp sang cột kế bên kèm chữ "(tiếp)".
• Tiêu đề chính giữa phía trên: "${safeTitle}" viết chữ phấn vàng cỡ lớn nổi bật, có vài nét gạch phấn tỏa sáng nhẹ hai bên.
• Hình minh hoạ & Phong cách: ${specs?.illustrationStyle || "Bảng xanh đậm viết phấn tay sạch đẹp, các tiêu đề mục I, II, III viết phấn vàng/xanh ngọc/hồng nhạt, chữ nội dung phấn trắng rõ nét; ngay bên cạnh mỗi quy tắc (quy tắc 3 điểm, hình bình hành, hình hộp, nhân vectơ với số k, hai vectơ vuông góc) đều có hình vẽ hình học minh họa bằng phấn màu trực quan, kèm icon phấn nhỏ xinh như bóng đèn, ngôi sao, nhóm học sinh."}
• Kí hiệu toán học chuẩn: Mọi vectơ (như AB, BC, AC, AD, AA', AC', a, b, 0) phải vẽ mũi tên vectơ rõ nét ngay phía trên đầu chữ, tuyệt đối đúng chính tả và dấu tiếng Việt.
• Tông màu: ${specs?.palette || "Nền bảng xanh rêu đậm, phấn trắng, phấn vàng, phấn xanh lam nhạt, phấn hồng phấn"}.
• Từ ngữ: ${specs?.wordingStyle || "Chữ viết tay dễ đọc, ngắn gọn, súc tích chuyên ngành Toán 12"}.
• Chân trang góc dưới bên phải (đóng khung chữ nhật viền phấn vàng):
Trường THPT MỸ THỌ
Lớp: 12A7
NHÓM: ${safeGroup}
THẦY TRỌNG DẠY TOÁN`;

      const modelName = useProModel
        ? "gemini-nano-banana-2.1"
        : "gemini-3.1-flash-lite-image";

      const callGenerate = () =>
        ai.models.generateContent({
          model: modelName,
          contents: { parts: [{ text: prompt }] },
          config: {
            imageConfig: {
              aspectRatio: "16:9",
              ...(useProModel ? { imageSize: "2K" } : {}),
            },
          },
        });

      let response;
      try {
        response = await callGenerate();
        const parts = response.candidates?.[0]?.content?.parts ?? [];
        for (const part of parts) {
          if (part.inlineData?.data) {
            const mime = part.inlineData.mimeType ?? "image/png";
            return res.json({
              mode: "image",
              imageUrl: `data:${mime};base64,${part.inlineData.data}`,
              extractedText: finalTheory,
            });
          }
        }
      } catch (imgErr: unknown) {
        const msg = imgErr instanceof Error ? imgErr.message : "";
        const isTransient =
          (msg.includes("503") || msg.includes("UNAVAILABLE")) &&
          !msg.includes("limit: 0");
        if (isTransient) {
          await new Promise((r) => setTimeout(r, 1800));
          try {
            const retryResp = await callGenerate();
            const retryParts = retryResp.candidates?.[0]?.content?.parts ?? [];
            for (const part of retryParts) {
              if (part.inlineData?.data) {
                const mime = part.inlineData.mimeType ?? "image/png";
                return res.json({
                  mode: "image",
                  imageUrl: `data:${mime};base64,${part.inlineData.data}`,
                  extractedText: finalTheory,
                });
              }
            }
          } catch {
            // Fall through to free-tier Gemini 4 Hydrogen AI Art-Director below
          }
        }
        // Any 429 / limit: 0 / 403 / billing issue automatically falls through to free-tier Gemini 4 Hydrogen AI Art-Director
      }

      // Free-Tier Gemini 4 Hydrogen AI Art-Director: designs a balanced 3-column chalkboard layout + inline chalk diagrams
      const columnItemSchema = {
        type: Type.OBJECT,
        properties: {
          kind: {
            type: Type.STRING,
            description: "One of: roman, sub, bullet",
          },
          text: {
            type: Type.STRING,
            description:
              "Clean Vietnamese math line (no markdown ** or LaTeX $). Write vectors as 'vectơ AB', 'vectơ a', 'vectơ 0'.",
          },
          accent: {
            type: Type.STRING,
            description: "One of: yellow, mint, sky, pink, orange",
          },
          diagram: {
            type: Type.STRING,
            description:
              "Optional chalk geometry diagram placed beside this item: none, vec_def, triangle_rule, parallelogram_rule, box_rule, scalar_mul, dot_product, coplanar, midpoint, centroid, oxyz_axes",
          },
          icon: {
            type: Type.STRING,
            description:
              "Optional chalk doodle icon if diagram is none: none, lightbulb, group, sparkles, star",
          },
        },
        required: ["kind", "text"],
      };

      const layoutResp = await ai.models.generateContent({
        model: "gemini-4-hydrogen",
        contents: `Bạn là Giám đốc Mỹ thuật & Giáo viên Toán 12 xuất sắc. Hãy biên tập và dàn trang nội dung sau thành đúng 3 cột cân đối trên bảng xanh 16:9 (cột 3 ngắn hơn 1 chút ở đáy để chừa chỗ cho khung chân trang).
Tiêu đề: ${safeTitle}

Nội dung lý thuyết:
${finalTheory}

Yêu cầu trình bày:
- Chia đều hợp lý vào 3 cột (columns[0], columns[1], columns[2]) sao cho không cột nào bị trống hay quá dài. Nếu một mục La Mã kéo sang cột sau, đặt tiêu đề đầu cột sau dạng "II. TÊN MỤC (tiếp)".
- Gắn diagram minh họa phù hợp ngay tại dòng định nghĩa/quy tắc tương ứng (mỗi diagram tối đa 1 lần, chọn trong: vec_def, triangle_rule, parallelogram_rule, box_rule, scalar_mul, dot_product, coplanar, midpoint, centroid, oxyz_axes).
- Gắn thêm icon phấn nhỏ (lightbulb, group, sparkles, star) ở 2-3 ý quan trọng không có diagram.
- Giữ nguyên chuẩn "vectơ AB", "vectơ a", "vectơ 0" (không dùng ** hay $).`,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              columns: {
                type: Type.ARRAY,
                items: {
                  type: Type.ARRAY,
                  items: columnItemSchema,
                },
              },
            },
            required: ["columns"],
          },
        },
      });

      const parsedPlan = JSON.parse((layoutResp.text ?? "{}").trim()) as {
        title?: string;
        columns?: unknown[][];
      };

      if (
        Array.isArray(parsedPlan.columns) &&
        parsedPlan.columns.length >= 3
      ) {
        return res.json({
          mode: "ai-layout",
          aiLayout: {
            title: parsedPlan.title || safeTitle,
            columns: [
              parsedPlan.columns[0] ?? [],
              parsedPlan.columns[1] ?? [],
              parsedPlan.columns[2] ?? [],
            ],
          },
          extractedText: finalTheory,
        });
      }

      return res.status(502).json({
        error:
          "Mô hình AI chưa trả về bố cục Infographic. Vui lòng thử bấm Tạo ảnh lại.",
      });
    } catch (err: unknown) {
      return handleGeminiError(err, res);
    }
  });

  // Existing Tab 2 metaphor endpoint
  app.post("/api/generate-metaphor", async (req, res) => {
    try {
      const { prompt, aspectRatio = "4:3" } = req.body as {
        prompt?: string;
        aspectRatio?: string;
      };

      if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
        return res.status(400).json({
          error: "Vui lòng cung cấp nội dung mô tả (prompt) hợp lệ.",
        });
      }

      const ai = getAiClient();
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite-image",
        contents: {
          parts: [
            {
              text: `${prompt.trim()}. Clean editorial scientific illustration, crisp geometry, high contrast for educational math flashcard background, no garbled text or random letters.`,
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
          return res.json({
            imageUrl: `data:${mime};base64,${part.inlineData.data}`,
          });
        }
      }

      return res.status(502).json({
        error:
          "Mô hình AI không trả về dữ liệu hình ảnh. Hãy thử mô tả khác hoặc tải ảnh lên thủ công.",
      });
    } catch (err: unknown) {
      return handleGeminiError(err, res);
    }
  });

  if (!isProduction) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== "true",
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

createServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
