import React, { useEffect, useRef, useState } from "react";
import { toPng } from "html-to-image";
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import {
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import {
  AlertCircle,
  Camera,
  Check,
  CheckCircle2,
  ClipboardPaste,
  CloudUpload,
  Copy,
  Download,
  ExternalLink,
  FileText,
  ImagePlus,
  Loader2,
  LogIn,
  LogOut,
  Maximize2,
  RotateCcw,
  ScanText,
  Sparkles,
  Trash2,
  Upload,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
} from "../firebase";
import {
  compressDataUrlForFirestore,
  compressImageDataUrl,
} from "../utils/imageCompress";

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
  lastEditorName?: string;
  isDirty?: boolean;
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
          lastEditorName: "",
          isDirty: false,
        };
      }
      return init;
    }
  );

  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSavingCloud, setIsSavingCloud] = useState(false);
  const [isRewriting, setIsRewriting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [showSharpFooterOverlay, setShowSharpFooterOverlay] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<{
    src: string;
    title: string;
  } | null>(null);
  const [zoomIndex, setZoomIndex] = useState<number>(1);
  const [isDraggingPan, setIsDraggingPan] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const resultUploadInputRef = useRef<HTMLInputElement | null>(null);
  const exportFrameRef = useRef<HTMLDivElement | null>(null);
  const lightboxScrollRef = useRef<HTMLDivElement | null>(null);
  const panOriginRef = useRef<{
    startX: number;
    startY: number;
    scrollLeft: number;
    scrollTop: number;
    moved: boolean;
  } | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsubs = THEORY_GROUPS.map((num) => {
      const docPath = `classroomGroups/group_${num}`;
      const docRef = doc(db, "classroomGroups", `group_${num}`);
      return onSnapshot(
        docRef,
        (snap) => {
          if (!snap.exists()) return;
          const d = snap.data() as {
            title?: string;
            groupInput?: string;
            theoryText?: string;
            resultImageUrl?: string;
            lastEditorName?: string;
          };
          setGroups((prev) => {
            const existing = prev[num];
            return {
              ...prev,
              [num]: {
                ...existing,
                title: d.title ?? existing.title,
                groupInput: d.groupInput ?? existing.groupInput,
                theoryText: d.theoryText ?? existing.theoryText,
                generatedInfographicUrl: d.resultImageUrl
                  ? d.resultImageUrl
                  : null,
                lastEditorName: d.lastEditorName ?? existing.lastEditorName,
                customPrompt: null,
                isDirty: false,
              },
            };
          });
        },
        (err) => {
          // Log silently on background snapshot read without crashing UI
          console.warn(`Firestore snapshot (${docPath}):`, err.message);
        }
      );
    });

    return () => {
      unsubs.forEach((u) => u());
    };
  }, []);

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

  const ZOOM_STEPS = [0.75, 1, 1.5, 2, 2.5, 3, 4] as const;
  const ZOOM_WIDTH_CLASSES: Record<number, string> = {
    0: "w-[75vw] sm:w-[75%] max-w-none h-auto",
    1: "max-h-full max-w-full object-contain",
    2: "w-[150vw] sm:w-[150%] max-w-none h-auto",
    3: "w-[200vw] sm:w-[200%] max-w-none h-auto",
    4: "w-[250vw] sm:w-[250%] max-w-none h-auto",
    5: "w-[300vw] sm:w-[300%] max-w-none h-auto",
    6: "w-[400vw] sm:w-[400%] max-w-none h-auto",
  };

  const openLightbox = (src: string, title: string) => {
    setZoomIndex(1);
    setLightboxImage({ src, title });
  };

  useEffect(() => {
    if (!lightboxImage) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setLightboxImage(null);
      } else if (e.key === "+" || e.key === "=") {
        setZoomIndex((idx) => Math.min(idx + 1, ZOOM_STEPS.length - 1));
      } else if (e.key === "-" || e.key === "_") {
        setZoomIndex((idx) => Math.max(idx - 1, 0));
      } else if (e.key === "0") {
        setZoomIndex(1);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [lightboxImage]);

  const handleGoogleSignIn = async (): Promise<User | null> => {
    setErrorMsg(null);
    setIsSigningIn(true);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      setUser(cred.user);
      setStatusMsg(
        `Đã đăng nhập (${cred.user.displayName || "Thành viên 12A7"}) — ảnh và nội dung giờ tự động đồng bộ cho cả lớp!`
      );
      return cred.user;
    } catch (err: unknown) {
      const code =
        typeof err === "object" && err !== null && "code" in err
          ? String((err as { code?: string }).code)
          : "";
      if (code === "auth/unauthorized-domain") {
        setErrorMsg(
          `Tên miền "${window.location.hostname}" chưa được cấp phép trong Firebase Auth. Thầy vào Firebase Console → Authentication → Settings → Authorized domains để thêm "${window.location.hostname}".`
        );
      } else if (code !== "auth/popup-closed-by-user") {
        setErrorMsg(
          err instanceof Error
            ? `Không thể đăng nhập Google: ${err.message}`
            : "Lỗi đăng nhập Google."
        );
      }
      return null;
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleGoogleSignOut = async () => {
    await signOut(auth);
    setStatusMsg("Đã đăng xuất khỏi tài khoản đồng bộ.");
  };

  const saveGroupToFirestore = async (
    groupNum: number,
    stateToSave: GroupWorkshopState,
    activeUser?: User | null
  ): Promise<boolean> => {
    const editor = activeUser ?? auth.currentUser;
    if (!editor) return false;

    const docId = `group_${groupNum}`;
    const docPath = `classroomGroups/${docId}`;
    const docRef = doc(db, "classroomGroups", docId);

    setIsSavingCloud(true);
    try {
      const safeImage = stateToSave.generatedInfographicUrl
        ? await compressDataUrlForFirestore(
            stateToSave.generatedInfographicUrl,
            460_000
          )
        : "";

      const payloadCommon = {
        title: (stateToSave.title || "").trim().slice(0, 200),
        groupInput:
          (stateToSave.groupInput || String(groupNum)).trim().slice(0, 50) ||
          String(groupNum),
        theoryText: (stateToSave.theoryText || "").slice(0, 15000),
        resultImageUrl: safeImage,
        lastEditorUid: editor.uid,
        lastEditorName:
          (editor.displayName || "Thành viên 12A7").trim().slice(0, 80) ||
          "Thành viên 12A7",
        updatedAt: serverTimestamp(),
      };

      const existingSnap = await getDoc(docRef);
      if (existingSnap.exists()) {
        await updateDoc(docRef, payloadCommon);
      } else {
        await setDoc(docRef, {
          groupNumber: groupNum,
          ...payloadCommon,
          authorUid: editor.uid,
          createdAt: serverTimestamp(),
        });
      }

      setGroups((prev) => ({
        ...prev,
        [groupNum]: {
          ...prev[groupNum],
          generatedInfographicUrl: safeImage || null,
          isDirty: false,
        },
      }));
      return true;
    } catch (err: unknown) {
      try {
        handleFirestoreError(err, OperationType.WRITE, docPath);
      } catch (wrappedErr: unknown) {
        setErrorMsg(
          "Không thể lưu lên Bảng chung Firebase. Vui lòng kiểm tra kết nối mạng hoặc quyền đăng nhập Google."
        );
        console.error(wrappedErr);
      }
      return false;
    } finally {
      setIsSavingCloud(false);
    }
  };

  const handleImageFile = async (file: File) => {
    setErrorMsg(null);
    setStatusMsg(null);
    try {
      const compressed = await compressImageDataUrl(file, 1152, 0.8);
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

      const rawText = await resp.text();
      let data: {
        extractedText?: string;
        suggestedTitle?: string;
        finalPrompt?: string;
        error?: string;
      } = {};

      if (rawText) {
        try {
          data = JSON.parse(rawText);
        } catch {
          if (resp.status === 404) {
            throw new Error(
              "Không tìm thấy API /api/rewrite-image-prompt (404). Hãy đảm bảo đã push thư mục api/ và vercel.json lên Vercel."
            );
          }
          if (resp.status === 413) {
            throw new Error(
              "Dung lượng ảnh vượt quá giới hạn 4.5MB của Vercel. Vui lòng chọn ảnh nhẹ hơn hoặc chụp lại."
            );
          }
          if (resp.status === 504) {
            throw new Error(
              "Máy chủ xử lý quá thời gian chờ (504). Vui lòng bấm thử lại lần nữa."
            );
          }
          throw new Error(
            `Lỗi máy chủ (${resp.status}). Vui lòng kiểm tra biến GEMINI_API_KEY trên Vercel.`
          );
        }
      }

      if (!resp.ok || !data.extractedText || !data.finalPrompt) {
        throw new Error(
          data.error || "Không thể đọc ảnh và viết lại Prompt lúc này."
        );
      }

      const nextState: GroupWorkshopState = {
        ...current,
        theoryText: data.extractedText,
        title: current.title.trim() || data.suggestedTitle || "",
        customPrompt: null,
      };
      updateCurrent(nextState);

      if (auth.currentUser) {
        await saveGroupToFirestore(activeGroup, nextState);
      }

      setStatusMsg(
        readImageFirst
          ? "Gemini đã đọc ảnh và viết lại xong Prompt chuẩn! Bấm 'Copy Prompt' hoặc 'Đồng bộ Prompt' để Nhóm 3, 6 tạo ảnh."
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
    reader.onload = async () => {
      if (typeof reader.result === "string") {
        const compressed = await compressDataUrlForFirestore(
          reader.result,
          460_000
        );
        const updatedState: GroupWorkshopState = {
          ...groups[activeGroup],
          generatedInfographicUrl: compressed,
          isDirty: !auth.currentUser,
        };

        setGroups((prev) => ({
          ...prev,
          [activeGroup]: updatedState,
        }));
        setShowSharpFooterOverlay(false);
        setErrorMsg(null);

        if (auth.currentUser) {
          const ok = await saveGroupToFirestore(activeGroup, updatedState);
          if (ok) {
            setStatusMsg(
              `Đã lưu và đồng bộ ảnh của Nhóm ${activeGroup} lên Bảng chung! Mọi thiết bị khác đều có thể xem ngay.`
            );
          }
        } else {
          setStatusMsg(
            `Ảnh đã hiện trên máy bạn. Bấm nút "Đăng nhập Google & Lưu lên Bảng chung" bên dưới để cả lớp cùng xem!`
          );
        }
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
      {/* Page Intro + Classroom Sync Auth Bar */}
      <div className="mb-6 flex flex-col gap-4 border-b border-slate-200 pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-wide text-emerald-700">
            Nhóm 1, 2, 4, 5 tổng hợp nội dung &amp; xuất Prompt · Nhóm 3 &amp; 6 tạo ảnh &amp; đồng bộ lên bảng chung
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl text-balance">
            Tổng ôn kiến thức chương: Đọc ảnh &amp; Viết Prompt chuẩn Gemini
          </h1>
          <p className="mt-1.5 max-w-3xl text-sm text-slate-600">
            Chọn tab nhỏ của nhóm, tải ảnh bài ghi để Gemini đọc và viết lại Prompt. Ảnh kết quả khi dán vào và đăng nhập Google sẽ tự động đồng bộ tức thì cho giáo viên và cả lớp.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {authReady && user ? (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs">
              <span className="font-semibold text-emerald-900 max-w-[160px] truncate">
                {user.displayName || "Thành viên 12A7"}
              </span>
              <button
                type="button"
                onClick={() => void handleGoogleSignOut()}
                className="inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-white px-2 py-1 font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                <LogOut className="h-3 w-3" />
                Đăng xuất
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => void handleGoogleSignIn()}
              disabled={!authReady || isSigningIn}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2.5 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-60 cursor-pointer"
            >
              {isSigningIn ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <LogIn className="h-3.5 w-3.5 text-amber-300" />
              )}
              <span>Đăng nhập Google để đồng bộ lớp</span>
            </button>
          )}
        </div>
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
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() =>
                      openLightbox(
                        current.uploadedImageUrl!,
                        `Ảnh thảo luận · Nhóm ${activeGroup}`
                      )
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        openLightbox(
                          current.uploadedImageUrl!,
                          `Ảnh thảo luận · Nhóm ${activeGroup}`
                        );
                      }
                    }}
                    title="Nhấn để phóng to & zoom lớn"
                    className="group relative cursor-zoom-in overflow-hidden rounded-xl border border-slate-200 bg-slate-950"
                  >
                    <img
                      src={current.uploadedImageUrl}
                      alt={`Ảnh thảo luận Nhóm ${activeGroup}`}
                      referrerPolicy="no-referrer"
                      className="max-h-64 w-full object-contain mx-auto transition-transform duration-200 group-hover:scale-[1.01]"
                    />
                    <span className="pointer-events-none absolute bottom-2.5 right-2.5 inline-flex items-center gap-1.5 rounded-lg bg-slate-900/85 px-2.5 py-1 text-[11px] font-semibold text-white shadow-md">
                      <ZoomIn className="h-3.5 w-3.5 text-amber-300" />
                      Nhấn để phóng to
                    </span>
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

            <button
              type="button"
              onClick={async () => {
                const authed = user ?? (await handleGoogleSignIn());
                if (authed) {
                  const ok = await saveGroupToFirestore(
                    activeGroup,
                    current,
                    authed
                  );
                  if (ok) {
                    setStatusMsg(
                      `Đã đồng bộ nội dung & Prompt của Nhóm ${activeGroup} lên Bảng chung để Nhóm 3, 6 copy tạo ảnh!`
                    );
                  }
                }
              }}
              disabled={isSavingCloud || isSigningIn}
              className="mt-2.5 flex min-h-[40px] w-full items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50/70 px-4 py-2 text-xs font-bold text-emerald-900 transition-colors hover:bg-emerald-100 disabled:opacity-60 cursor-pointer"
            >
              {isSavingCloud ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CloudUpload className="h-3.5 w-3.5 text-emerald-700" />
              )}
              <span>
                {user
                  ? "Đồng bộ Prompt & Nội dung lên Bảng chung cho Nhóm 3, 6"
                  : "Đăng nhập Google & Đồng bộ Prompt cho Nhóm 3, 6"}
              </span>
            </button>

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
                  Trình chiếu lớp 12A7 (16:9 · Đồng bộ thời gian thực)
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  Ảnh kết quả Nhóm {current.groupInput || activeGroup}
                  {current.lastEditorName ? (
                    <span className="ml-2 text-xs font-normal text-slate-500">
                      (Cập nhật bởi {current.lastEditorName})
                    </span>
                  ) : null}
                </h3>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {current.generatedInfographicUrl && (
                  <>
                    <button
                      type="button"
                      onClick={async () => {
                        const authed = user ?? (await handleGoogleSignIn());
                        if (authed) {
                          const ok = await saveGroupToFirestore(
                            activeGroup,
                            current,
                            authed
                          );
                          if (ok) {
                            setStatusMsg(
                              `Đã đồng bộ ảnh & nội dung Nhóm ${activeGroup} lên Bảng chung cho cả lớp!`
                            );
                          }
                        }
                      }}
                      disabled={isSavingCloud || isSigningIn}
                      className="flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-800 disabled:opacity-60 cursor-pointer"
                    >
                      {isSavingCloud ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <CloudUpload className="h-3.5 w-3.5" />
                      )}
                      {user
                        ? "Lưu lên Bảng chung"
                        : "Đăng nhập & Lưu cho cả lớp"}
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowSharpFooterOverlay((v) => !v)}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                    >
                      {showSharpFooterOverlay
                        ? "Tắt khung chữ phủ"
                        : "Ghép khung chữ"}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        openLightbox(
                          current.generatedInfographicUrl!,
                          `Infographic kết quả · Nhóm ${current.groupInput || activeGroup}`
                        )
                      }
                      className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 cursor-pointer"
                    >
                      <Maximize2 className="h-3.5 w-3.5" />
                      Phóng to
                    </button>

                    <button
                      type="button"
                      onClick={handleDownloadCompositePng}
                      disabled={isExporting}
                      className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 cursor-pointer"
                    >
                      {isExporting ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Download className="h-3.5 w-3.5" />
                      )}
                      Tải PNG
                    </button>

                    {user && (
                      <button
                        type="button"
                        onClick={async () => {
                          const cleared: GroupWorkshopState = {
                            ...current,
                            generatedInfographicUrl: null,
                          };
                          updateCurrent({ generatedInfographicUrl: null });
                          await saveGroupToFirestore(activeGroup, cleared);
                          setStatusMsg(
                            `Đã xóa ảnh kết quả của Nhóm ${activeGroup} trên Bảng chung.`
                          );
                        }}
                        className="rounded-lg border border-rose-200 px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 cursor-pointer"
                      >
                        Xóa ảnh
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="mt-4">
              {current.generatedInfographicUrl ? (
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() =>
                    openLightbox(
                      current.generatedInfographicUrl!,
                      `Infographic kết quả · Nhóm ${current.groupInput || activeGroup}`
                    )
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      openLightbox(
                        current.generatedInfographicUrl!,
                        `Infographic kết quả · Nhóm ${current.groupInput || activeGroup}`
                      );
                    }
                  }}
                  title="Nhấn để phóng to toàn màn hình & zoom lớn"
                  className="group relative cursor-zoom-in"
                >
                  <div
                    ref={exportFrameRef}
                    style={{ backgroundColor: "#123524" }}
                    className="relative aspect-video w-full overflow-hidden rounded-xl border border-emerald-900 shadow-md"
                  >
                    <img
                      src={current.generatedInfographicUrl}
                      alt={`Infographic bảng xanh Nhóm ${activeGroup}`}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-contain transition-transform duration-200 group-hover:scale-[1.01]"
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
                  <span className="pointer-events-none absolute top-3 right-3 inline-flex items-center gap-1.5 rounded-lg bg-slate-900/85 px-2.5 py-1 text-[11px] font-semibold text-white shadow-md">
                    <ZoomIn className="h-3.5 w-3.5 text-amber-300" />
                    Nhấn để phóng to
                  </span>
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

      {/* Fullscreen Image Zoom Lightbox */}
      {lightboxImage && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={lightboxImage.title}
          className="fixed inset-0 z-50 flex flex-col bg-slate-950/95 backdrop-blur-xs"
        >
          {/* Top Zoom Control Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-slate-900/90 px-4 py-3 text-white">
            <div className="min-w-0">
              <h4 className="truncate text-sm font-bold text-white">
                {lightboxImage.title}
              </h4>
              <p className="text-[11px] text-slate-400">
                Nhấn đúp vào ảnh để phóng to nhanh · Giữ chuột kéo để di chuyển vùng xem · Esc để đóng
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setZoomIndex((idx) => Math.max(idx - 1, 0))}
                disabled={zoomIndex === 0}
                title="Thu nhỏ (-)"
                className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs font-semibold text-slate-100 hover:bg-slate-700 disabled:opacity-40 cursor-pointer"
              >
                <ZoomOut className="h-3.5 w-3.5" />
                Thu nhỏ
              </button>

              <span className="min-w-[54px] text-center text-xs font-bold text-amber-300">
                {Math.round(ZOOM_STEPS[zoomIndex] * 100)}%
              </span>

              <button
                type="button"
                onClick={() =>
                  setZoomIndex((idx) => Math.min(idx + 1, ZOOM_STEPS.length - 1))
                }
                disabled={zoomIndex === ZOOM_STEPS.length - 1}
                title="Phóng lớn (+)"
                className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs font-semibold text-slate-100 hover:bg-slate-700 disabled:opacity-40 cursor-pointer"
              >
                <ZoomIn className="h-3.5 w-3.5" />
                Phóng lớn
              </button>

              <div className="hidden sm:flex items-center gap-1 ml-1">
                {[
                  { label: "Vừa màn hình", idx: 1 },
                  { label: "200%", idx: 3 },
                  { label: "300%", idx: 5 },
                  { label: "400%", idx: 6 },
                ].map((preset) => (
                  <button
                    key={preset.idx}
                    type="button"
                    onClick={() => setZoomIndex(preset.idx)}
                    className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold cursor-pointer ${
                      zoomIndex === preset.idx
                        ? "bg-emerald-600 text-white"
                        : "border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setLightboxImage(null)}
                className="ml-2 inline-flex items-center gap-1 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-500 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
                Đóng
              </button>
            </div>
          </div>

          {/* Scrollable & Drag-to-Pan Canvas */}
          <div
            ref={lightboxScrollRef}
            onClick={(e) => {
              if (e.target === e.currentTarget && !panOriginRef.current?.moved) {
                setLightboxImage(null);
              }
            }}
            onMouseDown={(e) => {
              if (zoomIndex <= 1 || !lightboxScrollRef.current) return;
              panOriginRef.current = {
                startX: e.clientX,
                startY: e.clientY,
                scrollLeft: lightboxScrollRef.current.scrollLeft,
                scrollTop: lightboxScrollRef.current.scrollTop,
                moved: false,
              };
              setIsDraggingPan(true);
            }}
            onMouseMove={(e) => {
              if (!panOriginRef.current || !lightboxScrollRef.current) return;
              const dx = e.clientX - panOriginRef.current.startX;
              const dy = e.clientY - panOriginRef.current.startY;
              if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
                panOriginRef.current.moved = true;
              }
              lightboxScrollRef.current.scrollLeft =
                panOriginRef.current.scrollLeft - dx;
              lightboxScrollRef.current.scrollTop =
                panOriginRef.current.scrollTop - dy;
            }}
            onMouseUp={() => {
              setIsDraggingPan(false);
              window.setTimeout(() => {
                panOriginRef.current = null;
              }, 0);
            }}
            onMouseLeave={() => {
              setIsDraggingPan(false);
              panOriginRef.current = null;
            }}
            className={`flex-1 overflow-auto p-4 sm:p-8 ${
              zoomIndex === 1 ? "flex items-center justify-center" : ""
            } ${
              zoomIndex > 1
                ? isDraggingPan
                  ? "cursor-grabbing select-none"
                  : "cursor-grab"
                : ""
            }`}
          >
            <img
              src={lightboxImage.src}
              alt={lightboxImage.title}
              referrerPolicy="no-referrer"
              draggable={false}
              onDoubleClick={() =>
                setZoomIndex((idx) => (idx === 1 ? 4 : 1))
              }
              className={`mx-auto rounded-lg shadow-2xl transition-all duration-150 ${
                ZOOM_WIDTH_CLASSES[zoomIndex] || ZOOM_WIDTH_CLASSES[1]
              }`}
            />
          </div>
        </div>
      )}
    </section>
  );
};
