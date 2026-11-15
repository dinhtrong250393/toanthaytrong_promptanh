import React, { useEffect, useMemo, useRef, useState } from "react";
import { toPng } from "html-to-image";
import {
  Check,
  Copy,
  Download,
  ImagePlus,
  Loader2,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Timer,
  AlertCircle,
  CheckCircle2,
  Lightbulb,
} from "lucide-react";
import { GROUP_TOPICS, GroupTopic } from "../data/curriculumData";
import { MathTex } from "./MathTex";

interface GroupState {
  answers: Record<string, string>;
  imageUrl: string | null;
  customNote: string;
  customPromptVi: string;
  customPromptEn: string;
}

function formatTimer(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export const TabFlashcardStudio: React.FC = () => {
  const [activeGroupNum, setActiveGroupNum] = useState<number>(1);
  const [promptLang, setPromptLang] = useState<"vi" | "en">("vi");
  const [copied, setCopied] = useState(false);

  // 5-minute discussion timer (default 5:00 = 300s)
  const [durationSec, setDurationSec] = useState(300);
  const [remainingSec, setRemainingSec] = useState(300);
  const [timerActive, setTimerActive] = useState(false);

  // Per-group interactive state
  const [groupStates, setGroupStates] = useState<Record<number, GroupState>>(() => {
    const initial: Record<number, GroupState> = {};
    GROUP_TOPICS.forEach((g) => {
      initial[g.groupNumber] = {
        answers: {},
        imageUrl: null,
        customNote: g.keyTakeaway,
        customPromptVi: g.promptVi,
        customPromptEn: g.promptEn,
      };
    });
    return initial;
  });

  const [generatingAi, setGeneratingAi] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [exportingPng, setExportingPng] = useState(false);
  const [showHintId, setShowHintId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const posterRef = useRef<HTMLDivElement | null>(null);

  const currentTopic: GroupTopic = useMemo(
    () =>
      GROUP_TOPICS.find((g) => g.groupNumber === activeGroupNum) ??
      GROUP_TOPICS[0],
    [activeGroupNum]
  );

  const currentState = groupStates[activeGroupNum];

  useEffect(() => {
    if (!timerActive) return;
    const id = window.setInterval(() => {
      setRemainingSec((prev) => {
        if (prev <= 1) {
          setTimerActive(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [timerActive]);

  const updateCurrentGroupState = (patch: Partial<GroupState>) => {
    setGroupStates((prev) => ({
      ...prev,
      [activeGroupNum]: {
        ...prev[activeGroupNum],
        ...patch,
      },
    }));
  };

  const handleSelectBlankOption = (blankId: string, optionId: string) => {
    updateCurrentGroupState({
      answers: {
        ...currentState.answers,
        [blankId]: optionId,
      },
    });
  };

  const correctCount = currentTopic.blanks.filter(
    (b) => currentState.answers[b.id] === b.correctOptionId
  ).length;
  const allBlanksSolved = correctCount === currentTopic.blanks.length;

  const activePrompt =
    promptLang === "vi"
      ? currentState.customPromptVi
      : currentState.customPromptEn;

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(activePrompt);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Fallback ignored if clipboard blocked
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAiError(null);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        updateCurrentGroupState({ imageUrl: reader.result });
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleGenerateAiImage = async () => {
    setGeneratingAi(true);
    setAiError(null);
    try {
      const promptToUse = currentState.customPromptEn || currentState.customPromptVi;
      const resp = await fetch("/api/generate-metaphor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: promptToUse,
          aspectRatio: "4:3",
        }),
      });
      const data = (await resp.json()) as { imageUrl?: string; error?: string };
      if (!resp.ok || !data.imageUrl) {
        throw new Error(data.error || "Không thể tạo ảnh từ AI.");
      }
      updateCurrentGroupState({ imageUrl: data.imageUrl });
    } catch (err: unknown) {
      setAiError(
        err instanceof Error
          ? err.message
          : "Lỗi kết nối máy chủ tạo ảnh AI."
      );
    } finally {
      setGeneratingAi(false);
    }
  };

  const handleExportPng = async () => {
    if (!posterRef.current) return;
    setExportingPng(true);
    try {
      const dataUrl = await toPng(posterRef.current, {
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: "#0F172A",
      });
      const link = document.createElement("a");
      link.download = `TheGhiNho_12A7_Nhom${activeGroupNum}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("PNG export error:", err);
      setAiError(
        "Không thể xuất ảnh PNG trực tiếp trên trình duyệt này. Vui lòng thử chụp màn hình hoặc kiểm tra ảnh tải lên."
      );
    } finally {
      setExportingPng(false);
    }
  };

  return (
    <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-7">
      {/* Header + Discussion Countdown */}
      <div className="mb-6 flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-medium tracking-wide text-sky-700">
            Thảo luận nhóm 4–5 phút · Lớp 12A7
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl text-balance">
            Xưởng Thẻ Ghi Nhớ AI: Tổng kết công thức Chương II
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-slate-600">
            Chọn nhóm của bạn, hoàn thành bài tập điền khuyết công thức KaTeX, tạo hoặc tải ảnh ẩn dụ toán học và xuất Thẻ Ghi Nhớ (PNG) gửi giáo viên trình chiếu.
          </p>
        </div>

        {/* Discussion Timer Widget */}
        <div className="flex flex-wrap items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5">
          <Timer className="h-4 w-4 text-sky-600 shrink-0" />
          <span className="text-xs font-medium text-slate-500">
            Thảo luận:
          </span>
          <span
            className={`font-mono text-lg font-bold tabular-nums ${
              remainingSec <= 30 ? "text-rose-600" : "text-slate-900"
            }`}
          >
            {formatTimer(remainingSec)}
          </span>
          <div className="ml-1 flex items-center gap-1">
            <button
              type="button"
              onClick={() => setTimerActive((v) => !v)}
              className="flex h-9 items-center gap-1 rounded-lg bg-slate-900 px-3 text-xs font-semibold text-white transition-colors hover:bg-slate-800 cursor-pointer"
            >
              {timerActive ? (
                <>
                  <Pause className="h-3.5 w-3.5" />
                  Tạm dừng
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5" />
                  Đếm giờ
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setTimerActive(false);
                setRemainingSec(durationSec);
              }}
              aria-label="Đặt lại đồng hồ"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                const next = durationSec === 300 ? 240 : 300;
                setDurationSec(next);
                setRemainingSec(next);
                setTimerActive(false);
              }}
              className="rounded-lg border border-slate-200 px-2.5 py-2 font-mono text-xs font-medium text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              {durationSec === 300 ? "5p" : "4p"}
            </button>
          </div>
        </div>
      </div>

      {/* Group 1-6 Selector */}
      <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {GROUP_TOPICS.map((g) => {
          const isActive = g.groupNumber === activeGroupNum;
          const st = groupStates[g.groupNumber];
          const solved = g.blanks.filter(
            (b) => st.answers[b.id] === b.correctOptionId
          ).length;

          return (
            <button
              key={g.groupNumber}
              type="button"
              onClick={() => {
                setActiveGroupNum(g.groupNumber);
                setAiError(null);
              }}
              className={`flex flex-col items-start rounded-xl border p-3 text-left transition-all cursor-pointer ${
                isActive
                  ? "border-slate-900 bg-slate-900 text-white shadow-xs"
                  : "border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <div className="flex w-full items-center justify-between text-xs">
                <span
                  className={`font-bold ${
                    isActive ? "text-sky-300" : "text-sky-700"
                  }`}
                >
                  Nhóm {g.groupNumber}
                </span>
                <span
                  className={`font-mono text-[11px] tabular-nums ${
                    isActive ? "text-slate-300" : "text-slate-500"
                  }`}
                >
                  {solved}/{g.blanks.length}
                </span>
              </div>
              <div className="mt-1 line-clamp-1 text-xs font-semibold">
                {g.shortTitle}
              </div>
            </button>
          );
        })}
      </div>

      {/* Main Two-Column Studio */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Worksheet + AI Prompt/Generation Controls */}
        <div className="lg:col-span-6 space-y-5">
          {/* Step 1: Fill-in-the-blank formulas */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-xs font-semibold text-sky-700">
                  Bước 1 · Hoàn thiện công thức
                </span>
                <h2 className="text-base font-bold text-slate-900">
                  Nhóm {currentTopic.groupNumber}: {currentTopic.title}
                </h2>
              </div>
              <span
                className={`text-xs font-semibold tabular-nums ${
                  allBlanksSolved ? "text-emerald-700" : "text-slate-500"
                }`}
              >
                {correctCount}/{currentTopic.blanks.length} chuẩn xác
              </span>
            </div>

            <div className="mt-4 space-y-4">
              {currentTopic.blanks.map((blank, idx) => {
                const chosen = currentState.answers[blank.id];
                const isCorrect = chosen === blank.correctOptionId;
                const isWrong = Boolean(chosen) && !isCorrect;

                return (
                  <div
                    key={blank.id}
                    className={`rounded-xl border p-4 transition-colors ${
                      isCorrect
                        ? "border-emerald-200 bg-emerald-50/40"
                        : isWrong
                        ? "border-rose-200 bg-rose-50/40"
                        : "border-slate-200 bg-slate-50/50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-600">
                        Câu {idx + 1}. {blank.label}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setShowHintId((prev) =>
                            prev === blank.id ? null : blank.id
                          )
                        }
                        className="flex items-center gap-1 text-xs font-medium text-amber-700 hover:text-amber-800 cursor-pointer"
                      >
                        <Lightbulb className="h-3.5 w-3.5" />
                        Gợi ý
                      </button>
                    </div>

                    <div className="mt-2 overflow-x-auto rounded-lg bg-white px-3 py-2.5 text-slate-900 border border-slate-200/80">
                      <MathTex tex={blank.questionTex} />
                    </div>

                    {showHintId === blank.id && (
                      <p className="mt-2 text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                        {blank.hint}
                      </p>
                    )}

                    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {blank.options.map((opt) => {
                        const selected = chosen === opt.id;
                        const optCorrect =
                          selected && opt.id === blank.correctOptionId;
                        const optWrong =
                          selected && opt.id !== blank.correctOptionId;

                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() =>
                              handleSelectBlankOption(blank.id, opt.id)
                            }
                            className={`flex min-h-[44px] items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition-all cursor-pointer ${
                              optCorrect
                                ? "border-emerald-500 bg-emerald-50 text-emerald-950 font-semibold"
                                : optWrong
                                ? "border-rose-400 bg-rose-50 text-rose-900"
                                : "border-slate-200 bg-white text-slate-800 hover:border-sky-300 hover:bg-sky-50/40"
                            }`}
                          >
                            <span className="overflow-x-auto">
                              <MathTex tex={opt.tex} />
                            </span>
                            {optCorrect && (
                              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 ml-2" />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {isCorrect && (
                      <div className="mt-2.5 flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                        <Check className="h-3.5 w-3.5" />
                        <span>Đã đồng bộ công thức chuẩn lên Thẻ Ghi Nhớ bên phải.</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Step 2: AI Metaphor Prompt & Generator */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <span className="text-xs font-semibold text-sky-700">
                  Bước 2 · Hình ảnh ẩn dụ Toán học (AI)
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  Tạo ảnh trực tiếp hoặc dùng Prompt Gemini
                </h3>
              </div>

              <div className="flex items-center rounded-lg bg-slate-100 p-0.5 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setPromptLang("vi")}
                  className={`rounded-md px-2.5 py-1.5 transition-colors cursor-pointer ${
                    promptLang === "vi"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-600"
                  }`}
                >
                  Tiếng Việt
                </button>
                <button
                  type="button"
                  onClick={() => setPromptLang("en")}
                  className={`rounded-md px-2.5 py-1.5 transition-colors cursor-pointer ${
                    promptLang === "en"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-600"
                  }`}
                >
                  English
                </button>
              </div>
            </div>

            <div className="mt-3">
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                Prompt gợi ý (có thể chỉnh sửa trước khi tạo ảnh):
              </label>
              <textarea
                rows={3}
                value={activePrompt}
                onChange={(e) => {
                  if (promptLang === "vi") {
                    updateCurrentGroupState({ customPromptVi: e.target.value });
                  } else {
                    updateCurrentGroupState({ customPromptEn: e.target.value });
                  }
                }}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-800 focus:border-sky-500 focus:bg-white focus:outline-none"
              />
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handleGenerateAiImage}
                disabled={generatingAi}
                className="flex min-h-[44px] items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-sky-700 disabled:opacity-60 whitespace-nowrap shrink-0 cursor-pointer"
              >
                {generatingAi ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Đang vẽ ảnh AI...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Tạo ảnh AI trực tiếp
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleCopyPrompt}
                className="flex min-h-[44px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0 cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 text-emerald-600" />
                    Đã sao chép
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copy Prompt
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex min-h-[44px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <ImagePlus className="h-4 w-4" />
                Tải ảnh lên
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            {aiError && (
              <div className="mt-3 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                <span>{aiError}</span>
              </div>
            )}

            <div className="mt-4">
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                Ghi chú trọng tâm in trên Thẻ Ghi Nhớ:
              </label>
              <input
                type="text"
                value={currentState.customNote}
                onChange={(e) =>
                  updateCurrentGroupState({ customNote: e.target.value })
                }
                placeholder="Nhập lưu ý bẫy sai dấu hoặc khẩu quyết nhóm..."
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-sky-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Right Column: Live Infographic Poster Preview & Export */}
        <div className="lg:col-span-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-sky-700">
                Bước 3 · Ghép &amp; Xuất Thẻ Ghi Nhớ
              </span>
              <h3 className="text-base font-bold text-slate-900">
                Xem trước Poster trình chiếu (PNG)
              </h3>
            </div>
            <button
              type="button"
              onClick={handleExportPng}
              disabled={exportingPng}
              className="flex min-h-[44px] items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-60 whitespace-nowrap shrink-0 cursor-pointer"
            >
              {exportingPng ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Đang xuất...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Xuất Thẻ Ghi Nhớ (PNG)
                </>
              )}
            </button>
          </div>

          {/*
            IMPORTANT: Use explicit hex/rgba colors inside posterRef so html-to-image
            exports cleanly across all browsers without Tailwind v4 oklch conversion issues.
          */}
          <div
            ref={posterRef}
            style={{
              backgroundColor: "#0F172A",
              color: "#F8FAFC",
              borderColor: "#1E293B",
            }}
            className="relative overflow-hidden rounded-2xl border shadow-lg"
          >
            {/* Top Visual Art Area */}
            <div
              className="relative h-64 w-full sm:h-72 overflow-hidden"
              style={{ backgroundColor: "#0B1120" }}
            >
              {currentState.imageUrl ? (
                <img
                  src={currentState.imageUrl}
                  alt={`Minh họa ẩn dụ Nhóm ${currentTopic.groupNumber}`}
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                />
              ) : (
                /* Procedural Architectural Geometric Blueprint Fallback */
                <svg
                  viewBox="0 0 800 480"
                  className="h-full w-full"
                  preserveAspectRatio="xMidYMid slice"
                >
                  <defs>
                    <linearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#0F172A" />
                      <stop offset="100%" stopColor="#1E293B" />
                    </linearGradient>
                    <pattern
                      id="grid"
                      width="40"
                      height="40"
                      patternUnits="userSpaceOnUse"
                    >
                      <path
                        d="M 40 0 L 0 0 0 40"
                        fill="none"
                        stroke="rgba(148,163,184,0.12)"
                        strokeWidth="1"
                      />
                    </pattern>
                  </defs>
                  <rect width="800" height="480" fill="url(#bgGrad)" />
                  <rect width="800" height="480" fill="url(#grid)" />
                  {/* 3D Isometric Oxyz Coordinate Visual */}
                  <g transform="translate(400, 250)">
                    <line
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="-150"
                      stroke="#38BDF8"
                      strokeWidth="3"
                    />
                    <line
                      x1="0"
                      y1="0"
                      x2="-145"
                      y2="85"
                      stroke="#F43F5E"
                      strokeWidth="3"
                    />
                    <line
                      x1="0"
                      y1="0"
                      x2="155"
                      y2="75"
                      stroke="#10B981"
                      strokeWidth="3"
                    />
                    <polygon
                      points="0,-110 120,-45 120,65 0,0"
                      fill="rgba(56,189,248,0.12)"
                      stroke={currentTopic.accentHex}
                      strokeWidth="2"
                    />
                    <polygon
                      points="0,-110 -110,-40 -110,70 0,0"
                      fill="rgba(16,185,129,0.08)"
                      stroke="rgba(248,250,252,0.35)"
                      strokeWidth="1.5"
                    />
                    <line
                      x1="0"
                      y1="0"
                      x2="10"
                      y2="-45"
                      stroke="#FBBF24"
                      strokeWidth="3.5"
                      strokeDasharray="6 4"
                    />
                    <circle cx="0" cy="0" r="6" fill="#F8FAFC" />
                    <circle
                      cx="120"
                      cy="-45"
                      r="7"
                      fill={currentTopic.accentHex}
                    />
                  </g>
                </svg>
              )}

              {/* Measured Scrim Overlay */}
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(to top, rgba(15,23,42,0.98) 0%, rgba(15,23,42,0.45) 55%, rgba(15,23,42,0.3) 100%)",
                }}
              />

              {/* Top Poster Identity Strip */}
              <div className="absolute top-4 left-5 right-5 flex items-center justify-between gap-3">
                <div
                  className="rounded-lg px-3 py-1.5 text-xs font-bold tracking-wide"
                  style={{
                    backgroundColor: currentTopic.accentHex,
                    color: "#FFFFFF",
                  }}
                >
                  LỚP 12A7 · NHÓM {currentTopic.groupNumber}
                </div>
                <span
                  className="text-xs font-medium"
                  style={{ color: "#CBD5E1" }}
                >
                  Toán 12 · Chương II Oxyz
                </span>
              </div>

              {/* Poster Headline over Scrim */}
              <div className="absolute bottom-4 left-5 right-5">
                <h4
                  className="text-xl font-bold tracking-tight sm:text-2xl"
                  style={{ color: "#FFFFFF" }}
                >
                  {currentTopic.title}
                </h4>
              </div>
            </div>

            {/* Bottom Formula Card Overlay Section */}
            <div className="p-5 sm:p-6 space-y-3.5">
              <div className="space-y-2.5">
                {currentTopic.summaryFormulasTex.map((tex, idx) => (
                  <div
                    key={idx}
                    style={{
                      backgroundColor: "rgba(30, 41, 59, 0.9)",
                      borderColor: "rgba(148, 163, 184, 0.25)",
                      color: "#F8FAFC",
                    }}
                    className="overflow-x-auto rounded-xl border px-4 py-3 text-center text-sm sm:text-base"
                  >
                    <MathTex tex={tex} />
                  </div>
                ))}
              </div>

              {/* Group Takeaway Note */}
              <div
                style={{
                  backgroundColor: "rgba(15, 23, 42, 0.95)",
                  borderColor: currentTopic.accentHex,
                }}
                className="rounded-xl border px-4 py-3"
              >
                <div
                  className="text-[11px] font-bold uppercase tracking-wider"
                  style={{ color: "#38BDF8" }}
                >
                  Chìa khóa ghi nhớ · Nhóm {currentTopic.groupNumber}
                </div>
                <p
                  className="mt-1 text-sm font-medium leading-relaxed"
                  style={{ color: "#E2E8F0" }}
                >
                  {currentState.customNote || currentTopic.keyTakeaway}
                </p>
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-500">
            Mẹo trình chiếu: Bấm nút <strong>Xuất Thẻ Ghi Nhớ (PNG)</strong> để tải ảnh độ phân giải cao (2x) gửi vào nhóm lớp cho giáo viên chiếu lên bảng.
          </p>
        </div>
      </div>
    </section>
  );
};
