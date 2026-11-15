import React, { useEffect, useRef, useState } from "react";
import { toPng } from "html-to-image";
import {
  AlertCircle,
  Camera,
  Check,
  CheckCircle2,
  ClipboardPaste,
  Copy,
  Download,
  ExternalLink,
  FileText,
  ImagePlus,
  Loader2,
  RotateCcw,
  ScanText,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import { compressImageDataUrl } from "../utils/imageCompress";

const SAMPLE_THEORY_TEXT = `I. KHÁI NIỆM VECTƠ TRONG KHÔNG GIAN

1. Định nghĩa
   Vectơ trong không gian là một đoạn thẳng có hướng.
   Kí hiệu: vectơ a hoặc vectơ AB (với A là điểm đầu, B là điểm cuối).

2. Các khái niệm liên quan
   + Giá của vectơ: Đường thẳng đi qua điểm đầu và điểm cuối của vectơ.
   + Độ dài của vectơ: Khoảng cách giữa điểm đầu và điểm cuối, kí hiệu |vectơ a|.
   + Vectơ-không (vectơ 0): Điểm đầu và cuối trùng nhau, độ dài bằng 0.
   + Vectơ cùng phương, cùng hướng: Có giá song song hoặc trùng nhau.

II. CÁC PHÉP TOÁN VECTƠ

1. Phép cộng và phép trừ vectơ
   + Quy tắc ba điểm: vectơ AB + vectơ BC = vectơ AC.
   + Quy tắc hình bình hành: vectơ AB + vectơ AD = vectơ AC (với AC là đường chéo).
   + Quy tắc hình hộp: vectơ AB + vectơ AD + vectơ AA' = vectơ AC' (với AC' là đường chéo chính của hình hộp).
   + Quy tắc hiệu: vectơ OB - vectơ OA = vectơ AB.

2. Phép nhân vectơ với một số (k)
   + Kết quả là một vectơ cùng phương với vectơ ban đầu.
   + Cùng hướng nếu k > 0, ngược hướng nếu k < 0.
   + Độ dài mới bằng |k| lần độ dài cũ.

3. Tích vô hướng của hai vectơ
   + Công thức: vectơ a . vectơ b = |vectơ a| . |vectơ b| . cos(vectơ a, vectơ b).
   + Ứng dụng: Tính góc giữa hai vectơ hoặc chứng minh vuông góc (tích vô hướng = 0).

III. ĐIỀU KIỆN ĐỒNG PHẲNG CỦA BA VECTƠ

1. Định nghĩa: Ba vectơ đồng phẳng nếu giá của chúng cùng song song với một mặt phẳng.
2. Điều kiện cần và đủ: Với vectơ a, b không cùng phương, vectơ c đồng phẳng với a, b khi và chỉ khi tồn tại duy nhất cặp (m, n) sao cho vectơ c = m.vectơ a + n.vectơ b.

IV. CÁC ĐIỂM ĐẶC BIỆT

1. Trung điểm I của AB: vectơ IA + vectơ IB = vectơ 0; vectơ OI = 1/2 (vectơ OA + vectơ OB).
2. Trọng tâm G tam giác ABC: vectơ GA + vectơ GB + vectơ GC = vectơ 0; vectơ OG = 1/3 (vectơ OA + vectơ OB + vectơ OC).
3. Trọng tâm G tứ diện ABCD: vectơ GA + vectơ GB + vectơ GC + vectơ GD = vectơ 0; vectơ OG = 1/4 (vectơ OA + vectơ OB + vectơ OC + vectơ OD).`;

const DEFAULT_SPECS = {
  audience: "Học sinh trung học phổ thông",
  aspectRatio: "16:9",
  layout: "Dạng cột (chia 3 cột cân đối trên bảng xanh)",
  mood: "Truyền cảm hứng",
  illustrationStyle:
    "Bảng xanh viết phấn, các ý chính viết phấn màu, hình vẽ tay minh họa bằng phấn ngay bên cạnh từng quy tắc, viền gỗ nâu quanh bảng",
  palette: "Phấn trắng, bảng xanh",
  wordingStyle:
    "Chữ viết tay, ngắn gọn, chuyên ngành toán, mũi tên vectơ rõ nét ngay trên đầu chữ",
  extras: "Icon phấn nhỏ (bóng đèn, ngôi sao, nhóm học sinh), hình ảnh minh họa toán học",
};

interface GroupWorkshopState {
  uploadedImageUrl: string | null;
  uploadedFileName: string;
  theoryText: string;
  title: string;
  groupInput: string;
  customPrompt: string | null;
  generatedInfographicUrl: string | null;
}

function formatStandardPrompt(
  body: string,
  title: string,
  groupLabel: string
): string {
  const safeBody = body.trim() || "[Nội dung lý thuyết của nhóm sẽ tự động điền vào đây sau khi đọc ảnh...]";
  const safeTitle =
    title.trim() || "VECTƠ VÀ CÁC PHÉP TOÁN TRONG KHÔNG GIAN";
  const safeGroup = groupLabel.trim() || "1";

  return `Tạo hình ảnh infographic về nội dung sau:

${safeBody}

YÊU CẦU THIẾT KẾ:
• Đối tượng mục tiêu: ${DEFAULT_SPECS.audience}
• Kích thước/Tỉ lệ: ${DEFAULT_SPECS.aspectRatio}
• Bố cục (Layout): ${DEFAULT_SPECS.layout}
• Cảm xúc/Không khí: ${DEFAULT_SPECS.mood}
• Hình minh họa: ${DEFAULT_SPECS.illustrationStyle}
• Tông màu: ${DEFAULT_SPECS.palette}
• Từ ngữ: ${DEFAULT_SPECS.wordingStyle}
• Các yếu tố bổ sung: ${DEFAULT_SPECS.extras}
• Tiêu đề: ${safeTitle}
• Chân trang góc phải (đóng khung):
Trường THPT MỸ THỌ
Lớp: 12A7
NHÓM: ${safeGroup}
THẦY TRỌNG DẠY TOÁN`;
}

const THEORY_GROUPS = [1, 2, 4, 5] as const;

export const TabTheoryInfographic: React.FC = () => {
  const [activeGroup, setActiveGroup] = useState<number>(1);
  const [groups, setGroups] = useState<Record<number, GroupWorkshopState>>(
    () => {
      const init: Record<number, GroupWorkshopState> = {};
      for (const i of THEORY_GROUPS) {
        init[i] = {
          uploadedImageUrl: null,
          uploadedFileName: "",
          theoryText: "",
          title: "",
          groupInput: String(i),
          customPrompt: null,
          generatedInfographicUrl: null,
        };
      }
      return init;
    }
  );

  const [isRewriting, setIsRewriting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [showSharpFooterOverlay, setShowSharpFooterOverlay] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const resultUploadInputRef = useRef<HTMLInputElement | null>(null);
  const exportFrameRef = useRef<HTMLDivElement | null>(null);

  const current = groups[activeGroup];

  const displayedPrompt =
    current.customPrompt !== null
      ? current.customPrompt
      : formatStandardPrompt(
          current.theoryText,
          current.title,
          current.groupInput || String(activeGroup)
        );

  const updateCurrent = (patch: Partial<GroupWorkshopState>) => {
    setGroups((prev) => ({
      ...prev,
      [activeGroup]: {
        ...prev[activeGroup],
        ...patch,
      },
    }));
  };

  const handleImageFile = async (file: File) => {
    setErrorMsg(null);
    setStatusMsg(null);
    try {
      const compressed = await compressImageDataUrl(file, 1280, 0.84);
      updateCurrent({
        uploadedImageUrl: compressed,
        uploadedFileName: file.name,
      });
    } catch {
      setErrorMsg("Không thể đọc tệp ảnh đã chọn.");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void handleImageFile(file);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      void handleImageFile(file);
    }
  };

  const handleReadAndRewritePrompt = async (readImageFirst = true) => {
    if (readImageFirst && !current.uploadedImageUrl && !current.theoryText.trim()) {
      setErrorMsg(
        "Vui lòng tải lên hình ảnh ghi chép của nhóm (hoặc nhập/nạp nội dung lý thuyết) trước."
      );
      return;
    }
    if (!readImageFirst && !current.theoryText.trim()) {
      setErrorMsg("Chưa có nội dung lý thuyết để viết lại.");
      return;
    }

    setErrorMsg(null);
    setStatusMsg(null);
    setIsRewriting(true);

    try {
      const resp = await fetch("/api/rewrite-image-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageDataUrl: readImageFirst ? current.uploadedImageUrl : null,
          theoryText: readImageFirst ? "" : current.theoryText,
          title: current.title,
          groupLabel: current.groupInput || String(activeGroup),
          groupNumber: activeGroup,
          readImageFirst,
        }),
      });

      const data = (await resp.json()) as {
        extractedText?: string;
        suggestedTitle?: string;
        finalPrompt?: string;
        error?: string;
      };

      if (!resp.ok || !data.extractedText || !data.finalPrompt) {
        throw new Error(
          data.error || "Không thể đọc ảnh và viết lại Prompt lúc này."
        );
      }

      updateCurrent({
        theoryText: data.extractedText,
        title: current.title.trim() || data.suggestedTitle || "",
        customPrompt: null,
      });

      setStatusMsg(
        readImageFirst
          ? "Gemini đã đọc ảnh và viết lại xong Prompt chuẩn! Bấm 'Copy Prompt' hoặc 'Copy Prompt & Mở Gemini' để dán tạo ảnh ngay."
          : "Gemini đã biên tập lại nội dung gọn đẹp và cập nhật Prompt sẵn sàng Copy!"
      );
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : "Lỗi kết nối Gemini khi đọc ảnh."
      );
    } finally {
      setIsRewriting(false);
    }
  };

  const handleCopyPrompt = async (openedGemini = false) => {
    if (!current.theoryText.trim() && current.customPrompt === null) {
      setErrorMsg(
        "Chưa có nội dung lý thuyết trong Prompt. Hãy bấm 'Đọc ảnh & Viết lại Prompt' hoặc 'Nạp nội dung mẫu SGK' trước khi copy."
      );
      return;
    }
    try {
      await navigator.clipboard.writeText(displayedPrompt);
      setCopiedPrompt(true);
      setErrorMsg(null);
      setStatusMsg(
        openedGemini
          ? "Đã copy Prompt & mở Gemini! Trên tab Gemini hãy nhấn Ctrl+V để tạo ảnh → sao chép ảnh kết quả → quay lại đây nhấn Ctrl+V để chiếu lên khung 16:9."
          : "Đã copy toàn bộ Prompt vào Clipboard! Thầy/em chỉ cần mở Gemini và nhấn Ctrl+V để tạo ảnh."
      );
      window.setTimeout(() => setCopiedPrompt(false), 2500);
    } catch {
      setErrorMsg(
        "Trình duyệt không cho phép copy tự động. Hãy chọn toàn bộ văn bản trong khung Prompt và nhấn Ctrl+C."
      );
    }
  };

  const loadGeminiResultBlob = (blob: Blob) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setGroups((prev) => ({
          ...prev,
          [activeGroup]: {
            ...prev[activeGroup],
            generatedInfographicUrl: reader.result as string,
          },
        }));
        setShowSharpFooterOverlay(false);
        setErrorMsg(null);
        setStatusMsg(
          `Đã dán ảnh Infographic từ Gemini vào khung trình chiếu của Nhóm ${activeGroup}!`
        );
      }
    };
    reader.onerror = () => {
      setErrorMsg("Không thể đọc ảnh từ clipboard hoặc tệp vừa chọn.");
    };
    reader.readAsDataURL(blob);
  };

  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith("image/")) {
          const blob = item.getAsFile();
          if (blob) {
            e.preventDefault();
            loadGeminiResultBlob(blob);
            return;
          }
        }
      }
    };
    window.addEventListener("paste", handleGlobalPaste);
    return () => window.removeEventListener("paste", handleGlobalPaste);
  }, [activeGroup]);

  const handlePasteFromClipboardButton = async () => {
    setErrorMsg(null);
    if (!navigator.clipboard || !navigator.clipboard.read) {
      setErrorMsg(
        "Trình duyệt không hỗ trợ nút đọc ảnh Clipboard — thầy/em chỉ cần nhấn phím Ctrl+V (hoặc Cmd+V) ngay trên trang này!"
      );
      return;
    }
    try {
      const clipboardItems = await navigator.clipboard.read();
      for (const item of clipboardItems) {
        const imageType = item.types.find((t) => t.startsWith("image/"));
        if (imageType) {
          const blob = await item.getType(imageType);
          loadGeminiResultBlob(blob);
          return;
        }
      }
      setErrorMsg(
        "Trong Clipboard hiện chưa có ảnh. Hãy bấm biểu tượng Sao chép ảnh trên Gemini rồi quay lại nhấn Ctrl+V."
      );
    } catch {
      setErrorMsg(
        "Trình duyệt đang chặn quyền nút đọc Clipboard — hãy nhấn trực tiếp phím Ctrl+V (hoặc Cmd+V) trên trang này!"
      );
    }
  };

  const handleResultUploadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      loadGeminiResultBlob(file);
    }
    e.target.value = "";
  };

  const handleDownloadCompositePng = async () => {
    if (!current.generatedInfographicUrl) return;

    if (!showSharpFooterOverlay) {
      const link = document.createElement("a");
      link.download = `Infographic_12A7_Nhom${current.groupInput || activeGroup}.png`;
      link.href = current.generatedInfographicUrl;
      link.click();
      return;
    }

    if (!exportFrameRef.current) return;
    setIsExporting(true);
    try {
      const dataUrl = await toPng(exportFrameRef.current, {
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: "#0F291E",
      });
      const link = document.createElement("a");
      link.download = `Infographic_12A7_Nhom${current.groupInput || activeGroup}.png`;
      link.href = dataUrl;
      link.click();
    } catch {
      const link = document.createElement("a");
      link.download = `Infographic_12A7_Nhom${current.groupInput || activeGroup}.png`;
      link.href = current.generatedInfographicUrl;
      link.click();
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <section className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-8">
      {/* Page Intro */}
      <div className="mb-6 border-b border-slate-200 pb-5">
        <p className="text-xs font-semibold tracking-wide text-emerald-700">
          Nhóm 1, 2, 4, 5 tổng hợp nội dung &amp; xuất Prompt · Nhóm 3 &amp; 6 nhận Prompt để tạo ảnh Gemini
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl text-balance">
          Tổng ôn kiến thức chương: Đọc ảnh &amp; Viết Prompt chuẩn Gemini
        </h1>
        <p className="mt-1.5 max-w-3xl text-sm text-slate-600">
          Chọn tab nhỏ của nhóm (Nhóm 1, 2, 4, 5), tải ảnh bài ghi thảo luận để Gemini đọc và viết lại thành Prompt hoàn chỉnh, sau đó Copy chuyển sang Nhóm 3 &amp; 6 dán vào Gemini tạo ảnh.
        </p>
      </div>

      {/* 4 Sub-tabs for Groups 1, 2, 4, 5 */}
      <div
        role="tablist"
        aria-label="Chọn nhóm thảo luận"
        className="mb-6 grid grid-cols-2 gap-2.5 sm:grid-cols-4"
      >
        {THEORY_GROUPS.map((num) => {
          const st = groups[num];
          const isActive = activeGroup === num;
          const hasResult = Boolean(st.generatedInfographicUrl);
          const hasPromptReady = Boolean(st.theoryText.trim());
          const hasImage = Boolean(st.uploadedImageUrl);

          return (
            <button
              key={num}
              role="tab"
              aria-selected={isActive}
              type="button"
              onClick={() => {
                setActiveGroup(num);
                setErrorMsg(null);
                setStatusMsg(null);
              }}
              className={`flex flex-col items-start rounded-xl border p-3 text-left transition-all cursor-pointer ${
                isActive
                  ? "border-emerald-700 bg-emerald-900 text-white shadow-xs"
                  : "border-slate-200 bg-white text-slate-800 hover:border-emerald-300 hover:bg-emerald-50/40"
              }`}
            >
              <div className="flex w-full items-center justify-between text-xs font-bold">
                <span>Nhóm {num}</span>
                {hasResult ? (
                  <CheckCircle2
                    className={`h-3.5 w-3.5 ${
                      isActive ? "text-emerald-300" : "text-emerald-600"
                    }`}
                  />
                ) : hasPromptReady || hasImage ? (
                  <FileText
                    className={`h-3.5 w-3.5 ${
                      isActive ? "text-amber-300" : "text-sky-600"
                    }`}
                  />
                ) : null}
              </div>
              <span
                className={`mt-1 text-[11px] ${
                  isActive ? "text-emerald-200" : "text-slate-500"
                }`}
              >
                {hasResult
                  ? "Đã có ảnh KQ"
                  : hasPromptReady
                  ? "Sẵn sàng Copy"
                  : hasImage
                  ? "Đã tải ảnh"
                  : "Chưa tải ảnh"}
              </span>
            </button>
          );
        })}
      </div>

      {/* Main 2-Column Workspace */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Upload Discussion Image + Extracted/Editable Theory Text */}
        <div className="lg:col-span-6 space-y-5">
          {/* Step 1: Upload Frame */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <span className="text-xs font-semibold text-emerald-700">
                  Bước 1 · Nhóm {activeGroup}
                </span>
                <h2 className="text-base font-bold text-slate-900">
                  Khung upload hình ảnh lý thuyết thảo luận
                </h2>
              </div>
              {current.uploadedImageUrl && (
                <button
                  type="button"
                  onClick={() =>
                    updateCurrent({
                      uploadedImageUrl: null,
                      uploadedFileName: "",
                    })
                  }
                  className="flex items-center gap-1 text-xs font-medium text-rose-600 hover:text-rose-700 cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Xóa ảnh
                </button>
              )}
            </div>

            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className="mt-4"
            >
              {current.uploadedImageUrl ? (
                <div className="space-y-3">
                  <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-950">
                    <img
                      src={current.uploadedImageUrl}
                      alt={`Ảnh thảo luận Nhóm ${activeGroup}`}
                      referrerPolicy="no-referrer"
                      className="max-h-64 w-full object-contain mx-auto"
                    />
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="truncate text-xs text-slate-500 max-w-[180px]">
                      {current.uploadedFileName || "Ảnh bài ghi nhóm"}
                    </span>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                      >
                        Đổi ảnh khác
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleReadAndRewritePrompt(true)}
                        disabled={isRewriting}
                        className="flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-800 disabled:opacity-60 cursor-pointer"
                      >
                        {isRewriting ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Đang đọc ảnh &amp; viết Prompt...
                          </>
                        ) : (
                          <>
                            <ScanText className="h-3.5 w-3.5" />
                            Đọc ảnh &amp; Viết lại Prompt
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="flex min-h-[185px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-6 text-center transition-colors hover:border-emerald-500 hover:bg-emerald-50/30"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                    <Camera className="h-6 w-6" />
                  </div>
                  <p className="mt-3 text-sm font-semibold text-slate-800">
                    Chạm để chụp hoặc tải ảnh bài ghi của Nhóm {activeGroup}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Hỗ trợ ảnh chụp bảng nhóm, vở viết tay, sơ đồ tư duy (JPG, PNG, WEBP)
                  </p>
                  <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-emerald-700">
                    <ImagePlus className="h-4 w-4" />
                    <span>Chọn tệp hình ảnh</span>
                  </div>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>

          {/* Step 2: Extracted / Editable Theory Content */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <span className="text-xs font-semibold text-emerald-700">
                  Bước 2 · Nội dung lý thuyết đọc được
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  Kiểm tra &amp; biên tập nội dung Toán 12
                </h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {current.theoryText.trim() && (
                  <button
                    type="button"
                    onClick={() => void handleReadAndRewritePrompt(false)}
                    disabled={isRewriting}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 cursor-pointer"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                    AI viết gọn lại
                  </button>
                )}
                <button
                  type="button"
                  onClick={() =>
                    updateCurrent({
                      theoryText: SAMPLE_THEORY_TEXT,
                      title:
                        current.title ||
                        "VECTƠ VÀ CÁC PHÉP TOÁN TRONG KHÔNG GIAN",
                      customPrompt: null,
                    })
                  }
                  className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 cursor-pointer"
                >
                  Nạp nội dung mẫu SGK
                </button>
              </div>
            </div>

            <textarea
              rows={12}
              value={current.theoryText}
              onChange={(e) =>
                updateCurrent({ theoryText: e.target.value, customPrompt: null })
              }
              placeholder={`Sau khi tải ảnh và bấm "Đọc ảnh & Viết lại Prompt", toàn bộ mục I, II, III, IV... sẽ hiện tại đây. Nhóm có thể chỉnh sửa trực tiếp, Prompt bên phải sẽ tự động cập nhật theo.`}
              className="mt-3 w-full rounded-xl border border-slate-200 bg-slate-50 p-3.5 font-mono text-xs leading-relaxed text-slate-800 focus:border-emerald-600 focus:bg-white focus:outline-none"
            />
          </div>
        </div>

        {/* Right Column: Fillable ...... Metadata + Live Prompt Writer & Copy + Optional 16:9 Showcase */}
        <div className="lg:col-span-6 space-y-5">
          {/* Step 3: Fillable Title & Framed Footer */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="border-b border-slate-100 pb-3">
              <span className="text-xs font-semibold text-emerald-700">
                Bước 3 · Điền thông tin gắn vào Prompt
              </span>
              <h3 className="text-base font-bold text-slate-900">
                Tiêu đề &amp; Khung chân trang của Nhóm {activeGroup}
              </h3>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <label
                  htmlFor={`title-group-${activeGroup}`}
                  className="block text-xs font-bold text-slate-800 mb-1.5"
                >
                  Tiêu đề Infographic (điền vào chỗ ......):
                </label>
                <input
                  id={`title-group-${activeGroup}`}
                  type="text"
                  value={current.title}
                  onChange={(e) =>
                    updateCurrent({ title: e.target.value, customPrompt: null })
                  }
                  placeholder="Ví dụ: VECTƠ VÀ CÁC PHÉP TOÁN TRONG KHÔNG GIAN"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <span className="block text-xs font-bold text-slate-800 mb-1.5">
                  Chân trang góc phải (đóng khung · điền số/tên nhóm vào chỗ ....):
                </span>
                <div className="rounded-xl border-2 border-emerald-800 bg-[#123524] p-4 text-white">
                  <div className="text-xs font-bold tracking-wide text-amber-300">
                    Trường THPT MỸ THỌ
                  </div>
                  <div className="mt-1 text-xs font-semibold text-slate-100">
                    Lớp: 12A7
                  </div>
                  <div className="mt-1.5 flex items-center gap-2 text-xs font-semibold text-slate-100">
                    <label htmlFor={`footer-group-${activeGroup}`}>NHÓM:</label>
                    <input
                      id={`footer-group-${activeGroup}`}
                      type="text"
                      value={current.groupInput}
                      onChange={(e) =>
                        updateCurrent({
                          groupInput: e.target.value,
                          customPrompt: null,
                        })
                      }
                      placeholder="...."
                      className="w-36 rounded border border-emerald-400/70 bg-emerald-950/70 px-2.5 py-1 text-xs font-bold text-white placeholder-emerald-300/60 focus:border-amber-300 focus:outline-none"
                    />
                  </div>
                  <div className="mt-1.5 text-xs font-bold tracking-wide text-emerald-200">
                    THẦY TRỌNG DẠY TOÁN
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Step 4: Ready-to-Copy Rewritten Gemini Prompt Box */}
          <div className="rounded-xl border border-emerald-200 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <span className="text-xs font-semibold text-emerald-700">
                  Bước 4 · Prompt chuẩn để dán vào Gemini tạo ảnh
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  Prompt hoàn chỉnh cho Nhóm {current.groupInput || activeGroup}
                </h3>
              </div>
              {current.customPrompt !== null && (
                <button
                  type="button"
                  onClick={() => updateCurrent({ customPrompt: null })}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Đồng bộ lại từ Bước 2–3
                </button>
              )}
            </div>

            <textarea
              rows={11}
              value={displayedPrompt}
              onChange={(e) => updateCurrent({ customPrompt: e.target.value })}
              className="mt-3 w-full rounded-xl border border-slate-200 bg-slate-50 p-3.5 font-mono text-xs leading-relaxed text-slate-800 focus:border-emerald-600 focus:bg-white focus:outline-none"
            />

            <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => void handleCopyPrompt(false)}
                className="flex min-h-[46px] items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-emerald-800 cursor-pointer"
              >
                {copiedPrompt ? (
                  <>
                    <Check className="h-4 w-4 text-emerald-200 shrink-0" />
                    <span>Đã Copy Prompt!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 shrink-0" />
                    <span>Copy Prompt</span>
                  </>
                )}
              </button>

              <a
                href="https://gemini.google.com/app"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  void handleCopyPrompt(true);
                }}
                className="flex min-h-[46px] items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-slate-800 cursor-pointer"
              >
                <ExternalLink className="h-4 w-4 text-amber-300 shrink-0" />
                <span>Copy &amp; Mở Gemini tạo ảnh</span>
              </a>
            </div>

            {errorMsg && (
              <div className="mt-3 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {statusMsg && !errorMsg && (
              <div className="mt-3 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                <span>{statusMsg}</span>
              </div>
            )}
          </div>

          {/* Step 5: Optional 16:9 Result Collector for Projector Showcase */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div>
                <span className="text-xs font-semibold text-emerald-700">
                  Trình chiếu lớp 12A7 (16:9)
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  Dán / Lưu ảnh từ Gemini cho Nhóm {current.groupInput || activeGroup}
                </h3>
              </div>

              {current.generatedInfographicUrl && (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowSharpFooterOverlay((v) => !v)}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    {showSharpFooterOverlay
                      ? "Đang ghép khung chữ chuẩn dấu"
                      : "Ghép khung chữ chuẩn dấu"}
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadCompositePng}
                    disabled={isExporting}
                    className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 cursor-pointer"
                  >
                    {isExporting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Download className="h-3.5 w-3.5" />
                    )}
                    Tải PNG 16:9
                  </button>
                </div>
              )}
            </div>

            <div className="mt-4">
              {current.generatedInfographicUrl ? (
                <div
                  ref={exportFrameRef}
                  style={{ backgroundColor: "#123524" }}
                  className="relative aspect-video w-full overflow-hidden rounded-xl border border-emerald-900 shadow-md"
                >
                  <img
                    src={current.generatedInfographicUrl}
                    alt={`Infographic bảng xanh Nhóm ${activeGroup}`}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-contain"
                  />

                  {showSharpFooterOverlay && (
                    <>
                      {current.title.trim() && (
                        <div
                          style={{
                            backgroundColor: "rgba(18, 53, 36, 0.9)",
                            borderColor: "rgba(253, 224, 71, 0.55)",
                            color: "#FEF08A",
                          }}
                          className="absolute top-3 left-1/2 -translate-x-1/2 rounded-lg border px-4 py-1 text-center text-xs sm:text-sm font-extrabold tracking-wide shadow-sm max-w-[90%] truncate"
                        >
                          {current.title.trim()}
                        </div>
                      )}

                      <div
                        style={{
                          backgroundColor: "rgba(12, 38, 25, 0.94)",
                          borderColor: "#FDE047",
                          color: "#F8FAFC",
                        }}
                        className="absolute bottom-3 right-3 rounded-lg border-2 px-3 py-2 text-[10px] sm:text-xs leading-snug shadow-md"
                      >
                        <div className="font-bold" style={{ color: "#FDE047" }}>
                          Trường THPT MỸ THỌ
                        </div>
                        <div className="font-semibold">Lớp: 12A7</div>
                        <div className="font-semibold">
                          NHÓM: {current.groupInput || activeGroup}
                        </div>
                        <div className="font-bold" style={{ color: "#A7F3D0" }}>
                          THẦY TRỌNG DẠY TOÁN
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="flex aspect-video w-full flex-col items-center justify-center rounded-xl border border-emerald-900/30 bg-[#123524] p-6 text-center text-emerald-100">
                  <p className="text-sm font-semibold text-white">
                    Khung trình chiếu ảnh kết quả từ Gemini · Nhóm {activeGroup}
                  </p>
                  <p className="mt-1.5 max-w-md text-xs text-emerald-200/85">
                    Sau khi tạo ảnh bên Gemini xong, sao chép ảnh và nhấn{" "}
                    <strong className="text-amber-300">Ctrl+V</strong> ngay trên trang này (hoặc nạp từ máy) để chiếu lên bảng cho cả lớp.
                  </p>
                  <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={handlePasteFromClipboardButton}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-500 cursor-pointer"
                    >
                      <ClipboardPaste className="h-3.5 w-3.5" />
                      Dán ảnh từ Gemini (Ctrl+V)
                    </button>
                    <button
                      type="button"
                      onClick={() => resultUploadInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-400/50 bg-emerald-950/60 px-3.5 py-2 text-xs font-semibold text-emerald-100 hover:bg-emerald-900 cursor-pointer"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      Nạp ảnh từ máy
                    </button>
                  </div>
                </div>
              )}
              <input
                ref={resultUploadInputRef}
                type="file"
                accept="image/*"
                onChange={handleResultUploadChange}
                className="hidden"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
