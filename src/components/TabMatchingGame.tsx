import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  Volume2,
  VolumeX,
  ArrowRightLeft,
  Layers,
  Clock,
  Sparkles,
} from "lucide-react";
import { MATCHING_PAIRS, MatchingPair } from "../data/curriculumData";
import { MathTex } from "./MathTex";
import { playErrorSound, playMatchSound, playVictorySound } from "../utils/sound";

type GameMode = "connect" | "flip";

interface FlipCard {
  uid: string;
  pairId: string;
  side: "vector" | "coord";
  title: string;
  tex: string;
  trapTag?: string;
}

interface LineCoord {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
}

const PAIR_ACCENTS = [
  "#0284C7",
  "#0D9488",
  "#2563EB",
  "#D97706",
  "#059669",
  "#E11D48",
];

function shuffleArray<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function formatSeconds(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export const TabMatchingGame: React.FC = () => {
  const [mode, setMode] = useState<GameMode>("connect");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [mistakes, setMistakes] = useState(0);

  // Connect mode state
  const [leftOrder, setLeftOrder] = useState<MatchingPair[]>(() =>
    shuffleArray(MATCHING_PAIRS)
  );
  const [rightOrder, setRightOrder] = useState<MatchingPair[]>(() =>
    shuffleArray(MATCHING_PAIRS)
  );
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [selectedRight, setSelectedRight] = useState<string | null>(null);
  const [matchedIds, setMatchedIds] = useState<string[]>([]);
  const [wrongFlash, setWrongFlash] = useState<{
    left?: string;
    right?: string;
  } | null>(null);

  // Flip mode state
  const [flipCards, setFlipCards] = useState<FlipCard[]>(() =>
    shuffleArray(
      MATCHING_PAIRS.flatMap((p) => [
        {
          uid: `${p.id}-v`,
          pairId: p.id,
          side: "vector" as const,
          title: p.vectorTitle,
          tex: p.vectorTex,
          trapTag: p.trapTag,
        },
        {
          uid: `${p.id}-c`,
          pairId: p.id,
          side: "coord" as const,
          title: p.coordTitle,
          tex: p.coordTex,
          trapTag: p.trapTag,
        },
      ])
    )
  );
  const [flippedUids, setFlippedUids] = useState<string[]>([]);
  const [flipLocked, setFlipLocked] = useState(false);

  // Active explanation card
  const [activePairId, setActivePairId] = useState<string | null>(null);

  // SVG lines for Connect mode
  const boardRef = useRef<HTMLDivElement | null>(null);
  const leftRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const rightRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [lines, setLines] = useState<LineCoord[]>([]);

  const isCompleted = matchedIds.length === MATCHING_PAIRS.length;

  useEffect(() => {
    if (!timerRunning || isCompleted) return;
    const id = window.setInterval(() => {
      setElapsedSec((prev) => prev + 1);
    }, 1000);
    return () => window.clearInterval(id);
  }, [timerRunning, isCompleted]);

  const computeLines = useCallback(() => {
    const board = boardRef.current;
    if (!board || mode !== "connect") {
      setLines([]);
      return;
    }
    const boardRect = board.getBoundingClientRect();
    const nextLines: LineCoord[] = [];
    matchedIds.forEach((pairId, idx) => {
      const leftEl = leftRefs.current[pairId];
      const rightEl = rightRefs.current[pairId];
      if (!leftEl || !rightEl) return;
      const lr = leftEl.getBoundingClientRect();
      const rr = rightEl.getBoundingClientRect();
      nextLines.push({
        id: pairId,
        x1: lr.right - boardRect.left,
        y1: lr.top + lr.height / 2 - boardRect.top,
        x2: rr.left - boardRect.left,
        y2: rr.top + rr.height / 2 - boardRect.top,
        color: PAIR_ACCENTS[idx % PAIR_ACCENTS.length],
      });
    });
    setLines(nextLines);
  }, [matchedIds, mode]);

  useEffect(() => {
    computeLines();
    const board = boardRef.current;
    if (!board) return;
    const ro = new ResizeObserver(() => computeLines());
    ro.observe(board);
    window.addEventListener("resize", computeLines);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", computeLines);
    };
  }, [computeLines, leftOrder, rightOrder]);

  const resetGame = (nextMode?: GameMode) => {
    if (nextMode) setMode(nextMode);
    setElapsedSec(0);
    setTimerRunning(false);
    setMistakes(0);
    setMatchedIds([]);
    setSelectedLeft(null);
    setSelectedRight(null);
    setWrongFlash(null);
    setActivePairId(null);
    setLeftOrder(shuffleArray(MATCHING_PAIRS));
    setRightOrder(shuffleArray(MATCHING_PAIRS));
    setFlippedUids([]);
    setFlipLocked(false);
    setFlipCards(
      shuffleArray(
        MATCHING_PAIRS.flatMap((p) => [
          {
            uid: `${p.id}-v`,
            pairId: p.id,
            side: "vector" as const,
            title: p.vectorTitle,
            tex: p.vectorTex,
            trapTag: p.trapTag,
          },
          {
            uid: `${p.id}-c`,
            pairId: p.id,
            side: "coord" as const,
            title: p.coordTitle,
            tex: p.coordTex,
            trapTag: p.trapTag,
          },
        ])
      )
    );
  };

  const evaluateConnectPair = (leftId: string, rightId: string) => {
    if (!timerRunning) setTimerRunning(true);
    if (leftId === rightId) {
      const nextMatched = [...matchedIds, leftId];
      setMatchedIds(nextMatched);
      setActivePairId(leftId);
      setSelectedLeft(null);
      setSelectedRight(null);
      if (nextMatched.length === MATCHING_PAIRS.length) {
        playVictorySound(soundEnabled);
      } else {
        playMatchSound(soundEnabled);
      }
    } else {
      setMistakes((m) => m + 1);
      playErrorSound(soundEnabled);
      setWrongFlash({ left: leftId, right: rightId });
      window.setTimeout(() => {
        setWrongFlash(null);
        setSelectedLeft(null);
        setSelectedRight(null);
      }, 460);
    }
  };

  const handleLeftClick = (id: string) => {
    if (matchedIds.includes(id)) {
      setActivePairId(id);
      return;
    }
    if (!timerRunning) setTimerRunning(true);
    if (selectedRight) {
      evaluateConnectPair(id, selectedRight);
    } else {
      setSelectedLeft((prev) => (prev === id ? null : id));
    }
  };

  const handleRightClick = (id: string) => {
    if (matchedIds.includes(id)) {
      setActivePairId(id);
      return;
    }
    if (!timerRunning) setTimerRunning(true);
    if (selectedLeft) {
      evaluateConnectPair(selectedLeft, id);
    } else {
      setSelectedRight((prev) => (prev === id ? null : id));
    }
  };

  const handleFlipClick = (card: FlipCard) => {
    if (flipLocked) return;
    if (matchedIds.includes(card.pairId)) {
      setActivePairId(card.pairId);
      return;
    }
    if (flippedUids.includes(card.uid)) return;
    if (!timerRunning) setTimerRunning(true);

    const nextFlipped = [...flippedUids, card.uid];
    setFlippedUids(nextFlipped);

    if (nextFlipped.length === 2) {
      setFlipLocked(true);
      const firstCard = flipCards.find((c) => c.uid === nextFlipped[0]);
      const secondCard = card;
      if (firstCard && firstCard.pairId === secondCard.pairId) {
        const nextMatched = [...matchedIds, card.pairId];
        window.setTimeout(() => {
          setMatchedIds(nextMatched);
          setActivePairId(card.pairId);
          setFlippedUids([]);
          setFlipLocked(false);
          if (nextMatched.length === MATCHING_PAIRS.length) {
            playVictorySound(soundEnabled);
          } else {
            playMatchSound(soundEnabled);
          }
        }, 320);
      } else {
        setMistakes((m) => m + 1);
        playErrorSound(soundEnabled);
        window.setTimeout(() => {
          setFlippedUids([]);
          setFlipLocked(false);
        }, 850);
      }
    }
  };

  const activePair = useMemo(
    () => MATCHING_PAIRS.find((p) => p.id === activePairId) ?? null,
    [activePairId]
  );

  return (
    <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-7">
      {/* Header & Controls Row */}
      <div className="mb-6 flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-medium tracking-wide text-sky-700">
            Khởi động 3–5 phút · Lớp 12A7
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl text-balance">
            Ghép cặp song hành: Ngôn ngữ Vectơ &amp; Tọa độ Oxyz
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-slate-600">
            Đối chiếu công thức hình học vectơ thuần túy với biểu thức tọa độ tương ứng và nhận diện các bẫy sai dấu thường gặp trong SGK.
          </p>
        </div>

        {/* Interactive Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center rounded-lg bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => resetGame("connect")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                mode === "connect"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <ArrowRightLeft className="h-3.5 w-3.5" />
              Nối cột
            </button>
            <button
              type="button"
              onClick={() => resetGame("flip")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                mode === "flip"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              Lật thẻ 3D
            </button>
          </div>

          <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700">
            <span className="flex items-center gap-1.5 font-mono tabular-nums text-slate-900">
              <Clock className="h-3.5 w-3.5 text-sky-600" />
              {formatSeconds(elapsedSec)}
            </span>
            <span className="text-slate-300" aria-hidden="true">|</span>
            <span className="tabular-nums">
              Đã ghép <strong className="text-slate-900">{matchedIds.length}/{MATCHING_PAIRS.length}</strong>
            </span>
            <span className="text-slate-300" aria-hidden="true">|</span>
            <span className="tabular-nums text-slate-600">
              Lỗi <strong className="text-rose-600">{mistakes}</strong>
            </span>
          </div>

          <button
            type="button"
            onClick={() => setSoundEnabled((s) => !s)}
            aria-label={soundEnabled ? "Tắt âm thanh" : "Bật âm thanh"}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition-colors hover:bg-slate-50 cursor-pointer"
          >
            {soundEnabled ? (
              <Volume2 className="h-4 w-4 text-sky-600" />
            ) : (
              <VolumeX className="h-4 w-4 text-slate-400" />
            )}
          </button>

          <button
            type="button"
            onClick={() => resetGame()}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Chơi lại
          </button>
        </div>
      </div>

      {/* Victory Banner */}
      {isCompleted && (
        <div className="mb-6 flex flex-col gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
            <div>
              <h2 className="text-base font-bold text-emerald-950">
                Hoàn thành xuất sắc 6/6 cặp song hành!
              </h2>
              <p className="text-sm text-emerald-800">
                Thời gian: <span className="font-mono font-semibold tabular-nums">{formatSeconds(elapsedSec)}</span> · Số lần nhầm: <span className="font-mono font-semibold tabular-nums">{mistakes}</span>. Bấm vào từng cặp bên dưới để ôn lại mẹo tránh bẫy SGK.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => resetGame()}
            className="rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-800 whitespace-nowrap shrink-0 cursor-pointer"
          >
            Trộn thẻ mới
          </button>
        </div>
      )}

      {/* Game Stage */}
      {mode === "connect" ? (
        <div ref={boardRef} className="relative">
          {/* SVG Connector Overlay on md+ screens */}
          <svg
            className="pointer-events-none absolute inset-0 hidden h-full w-full md:block"
            aria-hidden="true"
          >
            {lines.map((line) => {
              const dx = Math.abs(line.x2 - line.x1) * 0.45;
              const d = `M ${line.x1} ${line.y1} C ${line.x1 + dx} ${line.y1}, ${line.x2 - dx} ${line.y2}, ${line.x2} ${line.y2}`;
              return (
                <g key={line.id}>
                  <path
                    d={d}
                    fill="none"
                    stroke={line.color}
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    opacity={0.75}
                  />
                  <circle cx={line.x1} cy={line.y1} r={4} fill={line.color} />
                  <circle cx={line.x2} cy={line.y2} r={4} fill={line.color} />
                </g>
              );
            })}
          </svg>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-16">
            {/* Column A: Pure Vector Language */}
            <div>
              <div className="mb-3 flex items-center justify-between text-xs font-semibold text-slate-500">
                <span>Cột A · Hình học Vectơ thuần túy</span>
                <span>Chọn 1 thẻ bên trái</span>
              </div>
              <div className="space-y-3">
                {leftOrder.map((pair) => {
                  const matchIdx = matchedIds.indexOf(pair.id);
                  const isMatched = matchIdx !== -1;
                  const isSelected = selectedLeft === pair.id;
                  const isWrong = wrongFlash?.left === pair.id;
                  const accent = isMatched
                    ? PAIR_ACCENTS[matchIdx % PAIR_ACCENTS.length]
                    : undefined;

                  return (
                    <button
                      key={pair.id}
                      ref={(el) => {
                        leftRefs.current[pair.id] = el;
                      }}
                      type="button"
                      onClick={() => handleLeftClick(pair.id)}
                      style={
                        isMatched
                          ? { borderColor: accent, backgroundColor: "#FFFFFF" }
                          : undefined
                      }
                      className={`relative z-10 flex min-h-[76px] w-full flex-col justify-center rounded-xl border p-4 text-left transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 ${
                        isWrong
                          ? "border-rose-500 bg-rose-50"
                          : isSelected
                          ? "border-sky-600 bg-sky-50 ring-2 ring-sky-200"
                          : isMatched
                          ? "shadow-xs"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                        <span className="font-medium text-slate-700">
                          {pair.vectorTitle}
                        </span>
                        {isMatched ? (
                          <span
                            className="flex items-center gap-1 font-mono text-xs font-bold"
                            style={{ color: accent }}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            #{matchIdx + 1}
                          </span>
                        ) : pair.trapTag ? (
                          <span className="text-amber-700 font-medium">
                            {pair.trapTag}
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-1.5 overflow-x-auto text-slate-900">
                        <MathTex tex={pair.vectorTex} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Column B: Oxyz Coordinate Language */}
            <div>
              <div className="mb-3 flex items-center justify-between text-xs font-semibold text-slate-500">
                <span>Cột B · Biểu thức tọa độ Oxyz</span>
                <span>Ghép với cột A</span>
              </div>
              <div className="space-y-3">
                {rightOrder.map((pair) => {
                  const matchIdx = matchedIds.indexOf(pair.id);
                  const isMatched = matchIdx !== -1;
                  const isSelected = selectedRight === pair.id;
                  const isWrong = wrongFlash?.right === pair.id;
                  const accent = isMatched
                    ? PAIR_ACCENTS[matchIdx % PAIR_ACCENTS.length]
                    : undefined;

                  return (
                    <button
                      key={pair.id}
                      ref={(el) => {
                        rightRefs.current[pair.id] = el;
                      }}
                      type="button"
                      onClick={() => handleRightClick(pair.id)}
                      style={
                        isMatched
                          ? { borderColor: accent, backgroundColor: "#FFFFFF" }
                          : undefined
                      }
                      className={`relative z-10 flex min-h-[76px] w-full flex-col justify-center rounded-xl border p-4 text-left transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 ${
                        isWrong
                          ? "border-rose-500 bg-rose-50"
                          : isSelected
                          ? "border-sky-600 bg-sky-50 ring-2 ring-sky-200"
                          : isMatched
                          ? "shadow-xs"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                        <span className="font-medium text-slate-700">
                          {pair.coordTitle}
                        </span>
                        {isMatched && (
                          <span
                            className="flex items-center gap-1 font-mono text-xs font-bold"
                            style={{ color: accent }}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            #{matchIdx + 1}
                          </span>
                        )}
                      </div>
                      <div className="mt-1.5 overflow-x-auto text-slate-900">
                        <MathTex tex={pair.coordTex} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Flip Card 3D Mode */
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-4">
          {flipCards.map((card, index) => {
            const isMatched = matchedIds.includes(card.pairId);
            const isFlipped = isMatched || flippedUids.includes(card.uid);
            const matchIdx = matchedIds.indexOf(card.pairId);

            return (
              <div
                key={card.uid}
                className="perspective-1000 h-36 sm:h-40"
              >
                <button
                  type="button"
                  onClick={() => handleFlipClick(card)}
                  className={`transform-style-3d relative h-full w-full rounded-xl transition-transform duration-300 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 ${
                    isFlipped ? "rotate-y-180" : ""
                  }`}
                >
                  {/* Card Back (Unflipped) */}
                  <div className="backface-hidden absolute inset-0 flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-900 p-4 text-white">
                    <span className="font-mono text-xs text-slate-400">
                      Thẻ #{String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="mt-1 text-sm font-semibold">
                      Chạm để lật
                    </span>
                  </div>

                  {/* Card Front (Revealed) */}
                  <div
                    className={`backface-hidden rotate-y-180 absolute inset-0 flex flex-col justify-between rounded-xl border p-3.5 text-left ${
                      isMatched
                        ? "border-emerald-400 bg-emerald-50/70"
                        : "border-sky-300 bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 text-[11px] font-semibold">
                      <span
                        className={
                          card.side === "vector"
                            ? "text-sky-700"
                            : "text-teal-700"
                        }
                      >
                        {card.side === "vector" ? "Vectơ" : "Tọa độ Oxyz"}
                      </span>
                      {isMatched && (
                        <span className="font-mono text-emerald-700">
                          Cặp #{matchIdx + 1}
                        </span>
                      )}
                    </div>
                    <div className="my-auto overflow-x-auto text-center text-sm text-slate-900">
                      <MathTex tex={card.tex} />
                    </div>
                    <div className="truncate text-[11px] text-slate-500">
                      {card.title}
                    </div>
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Pedagogical Explanation & SGK Trap Inspector */}
      <div className="mt-8 rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-2 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-sky-600" />
            <h2 className="text-base font-bold text-slate-900">
              Giải thích song hành &amp; Góc soi bẫy SGK (Bài 2.25D, 2.29C)
            </h2>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {MATCHING_PAIRS.map((p) => {
              const unlocked = matchedIds.includes(p.id);
              const selected = activePair?.id === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setActivePairId(p.id)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    selected
                      ? "bg-slate-900 text-white"
                      : unlocked
                      ? "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {p.title}
                </button>
              );
            })}
          </div>
        </div>

        {activePair ? (
          <div className="mt-4 grid grid-cols-1 gap-5 lg:grid-cols-12">
            <div className="lg:col-span-7 space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="font-semibold text-slate-900">{activePair.title}</span>
                {activePair.trapTag && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="font-semibold text-amber-700">
                      {activePair.trapTag}
                    </span>
                  </>
                )}
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5">
                  <div className="text-xs font-medium text-slate-500">
                    Ngôn ngữ Vectơ
                  </div>
                  <div className="mt-1.5 overflow-x-auto text-slate-900">
                    <MathTex tex={activePair.vectorTex} />
                  </div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5">
                  <div className="text-xs font-medium text-slate-500">
                    Ngôn ngữ Tọa độ Oxyz
                  </div>
                  <div className="mt-1.5 overflow-x-auto text-slate-900">
                    <MathTex tex={activePair.coordTex} />
                  </div>
                </div>
              </div>
              <p className="text-sm leading-relaxed text-slate-700">
                {activePair.explanation}
              </p>
            </div>

            <div className="lg:col-span-5 rounded-xl border border-amber-200 bg-amber-50/70 p-4">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                <span>Cảnh báo bẫy sai dấu thường gặp</span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-amber-950">
                {activePair.trapWarning}
              </p>
            </div>
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-500">
            Hãy ghép đúng một cặp ở phía trên hoặc chọn trực tiếp một chủ đề ở thanh bên phải để xem giải thích chi tiết và cảnh báo bẫy SGK (như câu 2.25D, 2.29C).
          </p>
        )}
      </div>
    </section>
  );
};
