import React, { useEffect, useState } from "react";
import { Monitor } from "lucide-react";
import { TabTheoryInfographic } from "./components/TabTheoryInfographic";
import { TabMatchingGame } from "./components/TabMatchingGame";
import { TabFlashcardStudio } from "./components/TabFlashcardStudio";
import { Tab3DSimulation } from "./components/Tab3DSimulation";

type ActiveTab = "infographic" | "practice" | "sim3d";
type PracticeSubTab = "matching" | "flashcard";

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("infographic");
  const [practiceSubTab, setPracticeSubTab] =
    useState<PracticeSubTab>("matching");
  const [projectorMode, setProjectorMode] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    if (projectorMode) {
      root.classList.add("projector-mode");
    } else {
      root.classList.remove("projector-mode");
    }
  }, [projectorMode]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* 3-Zone Top Bar Contract */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:gap-8 sm:px-6">
          {/* Zone 1: Single text element wordmark */}
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab("infographic");
            }}
            className="font-display text-sm font-extrabold tracking-tight text-slate-900 sm:text-base lg:text-lg whitespace-nowrap shrink-0"
          >
            TỔNG ÔN KIẾN THỨC CHƯƠNG
          </a>

          {/* Zone 2: Clean single-line 3-Tab navigation (desktop) */}
          <nav
            aria-label="Chuyển đổi hoạt động"
            className="hidden md:flex items-center gap-6 text-sm font-medium"
          >
            <button
              type="button"
              onClick={() => setActiveTab("infographic")}
              className={`border-b-2 py-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === "infographic"
                  ? "border-emerald-600 text-slate-900 font-semibold"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
            >
              1. Thảo luận &amp; Infographic
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("practice")}
              className={`border-b-2 py-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === "practice"
                  ? "border-emerald-600 text-slate-900 font-semibold"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
            >
              2. Ghép cặp &amp; Thẻ ghi nhớ
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("sim3d")}
              className={`border-b-2 py-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === "sim3d"
                  ? "border-emerald-600 text-slate-900 font-semibold"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
            >
              3. Mô phỏng 3D
            </button>
          </nav>

          {/* Zone 3: 1 primary action */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => setProjectorMode((v) => !v)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                projectorMode
                  ? "bg-emerald-700 text-white"
                  : "bg-slate-900 text-white hover:bg-slate-800"
              }`}
            >
              <Monitor className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">
                {projectorMode ? "Cỡ chữ: Máy chiếu" : "Chế độ máy chiếu"}
              </span>
              <span className="sm:hidden">Máy chiếu</span>
            </button>
          </div>
        </div>

        {/* Mobile Tab Strip (<= md screens) */}
        <nav
          aria-label="Chuyển đổi hoạt động di động"
          className="flex md:hidden items-center gap-2 overflow-x-auto border-t border-slate-100 px-4 py-2 text-xs font-semibold"
        >
          <button
            type="button"
            onClick={() => setActiveTab("infographic")}
            className={`rounded-lg px-3 py-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === "infographic"
                ? "bg-emerald-800 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            1. Thảo luận &amp; Prompt
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("practice")}
            className={`rounded-lg px-3 py-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === "practice"
                ? "bg-emerald-800 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            2. Ghép cặp &amp; Thẻ AI
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("sim3d")}
            className={`rounded-lg px-3 py-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === "sim3d"
                ? "bg-emerald-800 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            3. Mô phỏng 3D
          </button>
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {activeTab === "infographic" && <TabTheoryInfographic />}

        {activeTab === "practice" && (
          <div>
            <div className="mx-auto max-w-7xl px-4 pt-5 sm:px-6">
              <div className="inline-flex items-center gap-1 rounded-lg bg-slate-200/80 p-1">
                <button
                  type="button"
                  onClick={() => setPracticeSubTab("matching")}
                  className={`rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    practiceSubTab === "matching"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Ghép cặp song hành (Oxyz)
                </button>
                <button
                  type="button"
                  onClick={() => setPracticeSubTab("flashcard")}
                  className={`rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    practiceSubTab === "flashcard"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Xưởng Thẻ Ghi Nhớ KaTeX
                </button>
              </div>
            </div>
            {practiceSubTab === "matching" ? (
              <TabMatchingGame />
            ) : (
              <TabFlashcardStudio />
            )}
          </div>
        )}

        {activeTab === "sim3d" && <Tab3DSimulation />}
      </main>
    </div>
  );
}
