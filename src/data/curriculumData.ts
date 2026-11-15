export interface MatchingPair {
  id: string;
  title: string;
  vectorTitle: string;
  vectorTex: string;
  coordTitle: string;
  coordTex: string;
  trapTag?: string;
  explanation: string;
  trapWarning: string;
}

export const MATCHING_PAIRS: MatchingPair[] = [
  {
    id: "parallelepiped",
    title: "Quy tắc hình hộp",
    vectorTitle: "Tổng 3 vectơ chung đỉnh",
    vectorTex:
      "\\overrightarrow{AB} + \\overrightarrow{AD} + \\overrightarrow{AA'} = \\overrightarrow{AC'}",
    coordTitle: "Cộng tọa độ từng thành phần",
    coordTex:
      "\\vec{u}+\\vec{v}+\\vec{w} = (x_1+x_2+x_3;\\; y_1+y_2+y_3;\\; z_1+z_2+z_3)",
    explanation:
      "Với hình hộp ABCD.A'B'C'D', ba cạnh xuất phát từ đỉnh A xác định đường chéo không gian AC'. Trong hệ Oxyz, cộng các vectơ chính là cộng tương ứng hoành độ, tung độ và cao độ.",
    trapWarning:
      "Chú ý đúng thứ tự đỉnh đối diện trên đường chéo chính (A đến C'), tránh nhầm thành đường chéo mặt phẳng AC.",
  },
  {
    id: "centroid",
    title: "Trọng tâm tam giác ABC",
    vectorTitle: "Tổng vectơ tại trọng tâm G",
    vectorTex:
      "\\overrightarrow{GA} + \\overrightarrow{GB} + \\overrightarrow{GC} = \\vec{0}",
    coordTitle: "Trung bình cộng 3 đỉnh",
    coordTex:
      "G\\left(\\frac{x_A+x_B+x_C}{3};\\; \\frac{y_A+y_B+y_C}{3};\\; \\frac{z_A+z_B+z_C}{3}\\right)",
    explanation:
      "Từ đẳng thức vectơ tương đương 3·OG = OA + OB + OC, ta suy ra tọa độ trọng tâm G bằng trung bình cộng tọa độ ba đỉnh A, B, C.",
    trapWarning:
      "Học sinh hay nhầm chia 2 (như trung điểm) hoặc quên đổi dấu khi biến đổi từ MA + MB + MC = 3MG.",
  },
  {
    id: "orthogonal",
    title: "Hai vectơ vuông góc",
    vectorTitle: "Tích vô hướng bằng 0",
    vectorTex: "\\vec{u} \\perp \\vec{v} \\iff \\vec{u} \\cdot \\vec{v} = 0",
    coordTitle: "Tổng tích các tọa độ tương ứng",
    coordTex: "x_1x_2 + y_1y_2 + z_1z_2 = 0",
    explanation:
      "Vì góc giữa hai vectơ vuông góc là 90° (cos 90° = 0), tích vô hướng triệt tiêu và chuyển thành tổng tích các cặp hoành, tung, cao độ bằng 0.",
    trapWarning:
      "Tránh nhầm điều kiện vuông góc (x₁x₂ + y₁y₂ + z₁z₂ = 0) với điều kiện cùng phương (tỉ số x₁/x₂ = y₁/y₂ = z₁/z₂).",
  },
  {
    id: "length",
    title: "Độ dài vectơ AB",
    vectorTitle: "Khoảng cách hai điểm A, B",
    vectorTex: "|\\overrightarrow{AB}| = AB",
    coordTitle: "Căn bậc hai tổng bình phương hiệu",
    coordTex:
      "\\sqrt{(x_B-x_A)^2 + (y_B-y_A)^2 + (z_B-z_A)^2}",
    explanation:
      "Độ dài vectơ AB chính là độ dài đoạn thẳng AB, bất biến dù ta dời gốc tọa độ O hay đổi chiều các trục.",
    trapWarning:
      "Trong căn luôn là dấu (+) giữa các bình phương. Cẩn thận dấu trừ bên trong ngoặc khi x_A hoặc y_A âm!",
  },
  {
    id: "trap_225d",
    title: "Tọa độ vectơ & Bẫy 2.25D",
    vectorTitle: "Vectơ nối từ A đến B",
    vectorTex:
      "\\overrightarrow{AB} = \\overrightarrow{OB} - \\overrightarrow{OA}",
    coordTitle: "Lấy điểm ngọn trừ điểm gốc",
    coordTex: "(x_B - x_A;\\; y_B - y_A;\\; z_B - z_A)",
    trapTag: "Bẫy câu 2.25D SGK",
    explanation:
      "Khi biểu diễn vectơ AB qua hệ trục Oxyz hoặc tính từ hai điểm A, B, ta luôn lấy tọa độ điểm ngọn B trừ đi tọa độ điểm gốc A.",
    trapWarning:
      "Bẫy 2.25D SGK: Học sinh rất dễ bị lừa chọn (x_A - x_B) ngược dấu hoặc bỏ sót dấu trừ khi tọa độ điểm gốc mang giá trị âm, hoặc nhầm dấu hệ số k trong biểu diễn x·i + y·j + z·k!",
  },
  {
    id: "trap_229c",
    title: "Góc hai vectơ & Bẫy 2.29C",
    vectorTitle: "Côsin góc giữa hai vectơ",
    vectorTex:
      "\\cos(\\vec{u},\\vec{v}) = \\frac{\\vec{u}\\cdot\\vec{v}}{|\\vec{u}|\\cdot|\\vec{v}|}",
    coordTitle: "Tỉ số tích vô hướng trên tích độ dài",
    coordTex:
      "\\frac{x_1x_2+y_1y_2+z_1z_2}{\\sqrt{x_1^2+y_1^2+z_1^2}\\cdot\\sqrt{x_2^2+y_2^2+z_2^2}}",
    trapTag: "Bẫy câu 2.29C SGK",
    explanation:
      "Côsin góc giữa hai vectơ khác vectơ-không có tử số giữ nguyên dấu của tích vô hướng (âm nếu góc tù, dương nếu góc nhọn).",
    trapWarning:
      "Bẫy 2.29C SGK: Nhầm lấy giá trị tuyệt đối ở tử số (đó là góc giữa 2 đường thẳng, không phải 2 vectơ!) hoặc quên dấu căn ở mẫu, dẫn đến kết luận sai góc tù thành góc nhọn!",
  },
];

export interface BlankItem {
  id: string;
  label: string;
  questionTex: string;
  options: { id: string; tex: string; label: string }[];
  correctOptionId: string;
  completedTex: string;
  hint: string;
}

export interface GroupTopic {
  groupNumber: number;
  title: string;
  shortTitle: string;
  accentHex: string;
  badgeBgHex: string;
  blanks: BlankItem[];
  summaryFormulasTex: string[];
  keyTakeaway: string;
  promptVi: string;
  promptEn: string;
}

export const GROUP_TOPICS: GroupTopic[] = [
  {
    groupNumber: 1,
    title: "Phép toán vectơ & Quy tắc hình hộp",
    shortTitle: "Phép toán vectơ",
    accentHex: "#0284C7",
    badgeBgHex: "#E0F2FE",
    blanks: [
      {
        id: "g1_b1",
        label: "Quy tắc hình hộp ABCD.A'B'C'D'",
        questionTex:
          "\\overrightarrow{AB} + \\overrightarrow{AD} + \\overrightarrow{AA'} = \\;?",
        options: [
          { id: "a", tex: "\\overrightarrow{AC'}", label: "Vectơ AC'" },
          { id: "b", tex: "\\overrightarrow{AC}", label: "Vectơ AC" },
          { id: "c", tex: "\\overrightarrow{C'A}", label: "Vectơ C'A" },
          { id: "d", tex: "\\overrightarrow{BD'}", label: "Vectơ BD'" },
        ],
        correctOptionId: "a",
        completedTex:
          "\\overrightarrow{AB} + \\overrightarrow{AD} + \\overrightarrow{AA'} = \\overrightarrow{AC'}",
        hint: "Đường chéo xuất phát từ cùng đỉnh gốc A đi xuyên qua tâm hình hộp tới đỉnh đối diện C'.",
      },
      {
        id: "g1_b2",
        label: "Quy tắc hiệu hai vectơ chung gốc",
        questionTex: "\\overrightarrow{OB} - \\overrightarrow{OA} = \\;?",
        options: [
          { id: "a", tex: "\\overrightarrow{BA}", label: "Vectơ BA" },
          { id: "b", tex: "\\overrightarrow{AB}", label: "Vectơ AB" },
          { id: "c", tex: "\\overrightarrow{2AB}", label: "2 vectơ AB" },
        ],
        correctOptionId: "b",
        completedTex:
          "\\overrightarrow{OB} - \\overrightarrow{OA} = \\overrightarrow{AB}",
        hint: "Quy tắc hiệu: Điểm đầu là điểm sau (A), điểm cuối là điểm trước (B).",
      },
    ],
    summaryFormulasTex: [
      "\\overrightarrow{AB} + \\overrightarrow{AD} + \\overrightarrow{AA'} = \\overrightarrow{AC'}",
      "\\overrightarrow{OB} - \\overrightarrow{OA} = \\overrightarrow{AB}",
    ],
    keyTakeaway: "Cộng 3 cạnh chung đỉnh A tạo đường chéo không gian AC'.",
    promptVi:
      "Minh họa khoa học 3D một khối hình hộp thủy tinh trong suốt phát sáng trong không gian tối, từ một đỉnh góc có 3 mũi tên ánh sáng xanh dương, xanh ngọc và vàng đồng tụ lại tạo thành đường chéo lớn phát sáng rực rỡ xuyên tâm khối hộp, phong cách kiến trúc kỹ thuật tối giản, ánh sáng studio sắc nét.",
    promptEn:
      "Clean scientific 3D illustration of a translucent glass parallelepiped prism on a deep slate blueprint background, three luminous cyan, emerald, and amber force vectors originating from one corner converging into a bright glowing main space diagonal, minimalist architectural lighting, 8k crisp technical aesthetic, no text.",
  },
  {
    groupNumber: 2,
    title: "Hệ trục tọa độ Oxyz & Tọa độ điểm, vectơ",
    shortTitle: "Hệ trục Oxyz",
    accentHex: "#0D9488",
    badgeBgHex: "#CCFBF1",
    blanks: [
      {
        id: "g2_b1",
        label: "Phân tích theo 3 vectơ đơn vị",
        questionTex:
          "M(x;y;z) \\iff \\overrightarrow{OM} = x\\vec{i} + y\\vec{j} + \\;?",
        options: [
          { id: "a", tex: "z\\vec{k}", label: "z·k" },
          { id: "b", tex: "-z\\vec{k}", label: "-z·k" },
          { id: "c", tex: "z(\\vec{i}+\\vec{j})", label: "z(i+j)" },
        ],
        correctOptionId: "a",
        completedTex:
          "\\overrightarrow{OM} = x\\vec{i} + y\\vec{j} + z\\vec{k}",
        hint: "Ba vectơ đơn vị lần lượt theo Ox, Oy, Oz là i, j, k.",
      },
      {
        id: "g2_b2",
        label: "Tọa độ vectơ AB (Tránh bẫy 2.25D)",
        questionTex: "\\overrightarrow{AB} = (\\;?;\\; y_B-y_A;\\; z_B-z_A)",
        options: [
          { id: "a", tex: "x_A - x_B", label: "x_A - x_B" },
          { id: "b", tex: "x_B + x_A", label: "x_B + x_A" },
          { id: "c", tex: "x_B - x_A", label: "x_B - x_A" },
        ],
        correctOptionId: "c",
        completedTex:
          "\\overrightarrow{AB} = (x_B-x_A;\\; y_B-y_A;\\; z_B-z_A)",
        hint: "Luôn lấy tọa độ điểm NGỌN (B) trừ tọa độ điểm GỐC (A)!",
      },
    ],
    summaryFormulasTex: [
      "\\overrightarrow{OM} = x\\vec{i} + y\\vec{j} + z\\vec{k} \\iff M(x;y;z)",
      "\\overrightarrow{AB} = (x_B-x_A;\\; y_B-y_A;\\; z_B-z_A)",
    ],
    keyTakeaway: "Cảnh giác bẫy 2.25D: Luôn lấy NGỌN trừ GỐC, chú ý dấu âm!",
    promptVi:
      "Minh họa 3D hệ trục tọa độ không gian Oxyz với 3 tia vuông góc nhau màu đỏ, xanh lá, xanh dương giao nhau tại gốc O phát sáng trên lưới kiến trúc tối giản, một điểm M lơ lửng trong không gian có 3 đường gióng vuông góc chiếu xuống các mặt phẳng tọa độ, phong cách đồ họa khoa học hiện đại.",
    promptEn:
      "Clean isometric 3D scientific illustration of a Cartesian Oxyz coordinate space with glowing red, green, and blue orthogonal axes meeting at origin O on a dark architectural grid, a floating luminous sphere point M casting crisp dashed orthogonal projection lines to the three coordinate planes, precision studio lighting, no text.",
  },
  {
    groupNumber: 3,
    title: "Biểu thức tọa độ phép toán & Cùng phương",
    shortTitle: "Phép toán tọa độ",
    accentHex: "#2563EB",
    badgeBgHex: "#DBEAFE",
    blanks: [
      {
        id: "g3_b1",
        label: "Biểu thức tọa độ tổng hai vectơ",
        questionTex:
          "\\vec{u}=(x_1;y_1;z_1),\\; \\vec{v}=(x_2;y_2;z_2) \\implies \\vec{u}-\\vec{v} = \\;?",
        options: [
          {
            id: "a",
            tex: "(x_1-x_2;\\; y_1-y_2;\\; z_1-z_2)",
            label: "(x₁-x₂; y₁-y₂; z₁-z₂)",
          },
          {
            id: "b",
            tex: "(x_2-x_1;\\; y_2-y_1;\\; z_2-z_1)",
            label: "(x₂-x₁; y₂-y₁; z₂-z₁)",
          },
        ],
        correctOptionId: "a",
        completedTex:
          "\\vec{u} - \\vec{v} = (x_1-x_2;\\; y_1-y_2;\\; z_1-z_2)",
        hint: "Giữ đúng thứ tự vectơ đứng trước trừ vectơ đứng sau.",
      },
      {
        id: "g3_b2",
        label: "Điều kiện hai vectơ cùng phương",
        questionTex: "\\vec{u} \\text{ cùng phương } \\vec{v}\\; (\\vec{v}\\neq\\vec{0}) \\iff \\;?",
        options: [
          { id: "a", tex: "\\vec{u} \\cdot \\vec{v} = 0", label: "u · v = 0" },
          { id: "b", tex: "\\exists k\\in\\mathbb{R}:\\; \\vec{u} = k\\vec{v}", label: "u = k·v" },
          { id: "c", tex: "|\\vec{u}| = |\\vec{v}|", label: "|u| = |v|" },
        ],
        correctOptionId: "b",
        completedTex:
          "\\vec{u} = k\\vec{v} \\iff (x_1;y_1;z_1) = (kx_2; ky_2; kz_2)",
        hint: "Hai vectơ cùng phương khi tọa độ của chúng tỉ lệ theo cùng một hệ số k.",
      },
    ],
    summaryFormulasTex: [
      "\\vec{u} \\pm \\vec{v} = (x_1\\pm x_2;\\; y_1\\pm y_2;\\; z_1\\pm z_2)",
      "\\vec{u} \\parallel \\vec{v} \\iff \\exists k\\in\\mathbb{R}:\\; \\vec{u} = k\\vec{v}",
    ],
    keyTakeaway: "Kiểm tra cùng phương bằng cách lập tỉ số từng cặp tọa độ tương ứng.",
    promptVi:
      "Minh họa ẩn dụ toán học hai dải tia sáng song song chuyển động nhịp nhàng trong không gian vũ trụ hình học, một tia dài gấp đôi tia kia tượng trưng cho phép nhân vectơ với số thực k, phong cách nghệ thuật kỹ thuật hiện đại, nền xanh đậm sắc nét.",
    promptEn:
      "Sleek technical illustration of parallel luminous laser beams traveling along matching trajectories in a dark blue geometric grid space, one beam scaled twice the length of the other representing collinear vector scaling u = kv, clean precision aesthetic, no text.",
  },
  {
    groupNumber: 4,
    title: "Trung điểm đoạn thẳng & Trọng tâm tam giác",
    shortTitle: "Trung điểm & Trọng tâm",
    accentHex: "#D97706",
    badgeBgHex: "#FEF3C7",
    blanks: [
      {
        id: "g4_b1",
        label: "Tọa độ trung điểm I của đoạn AB",
        questionTex:
          "I = \\text{trung điểm } AB \\implies x_I = \\;?",
        options: [
          { id: "a", tex: "\\frac{x_A + x_B}{2}", label: "(x_A + x_B) / 2" },
          { id: "b", tex: "\\frac{x_B - x_A}{2}", label: "(x_B - x_A) / 2" },
          { id: "c", tex: "\\frac{x_A + x_B}{3}", label: "(x_A + x_B) / 3" },
        ],
        correctOptionId: "a",
        completedTex:
          "I\\left(\\frac{x_A+x_B}{2};\\; \\frac{y_A+y_B}{2};\\; \\frac{z_A+z_B}{2}\\right)",
        hint: "Trung điểm là điểm ở chính giữa: cộng hai đầu mút rồi chia đôi.",
      },
      {
        id: "g4_b2",
        label: "Tọa độ trọng tâm G của tam giác ABC",
        questionTex:
          "G \\text{ là trọng tâm } \\triangle ABC \\implies x_G = \\;?",
        options: [
          { id: "a", tex: "\\frac{x_A+x_B+x_C}{2}", label: "(x_A+x_B+x_C) / 2" },
          { id: "b", tex: "\\frac{x_A+x_B+x_C}{3}", label: "(x_A+x_B+x_C) / 3" },
          { id: "c", tex: "x_A+x_B+x_C", label: "x_A+x_B+x_C" },
        ],
        correctOptionId: "b",
        completedTex:
          "G\\left(\\frac{x_A+x_B+x_C}{3};\\; \\frac{y_A+y_B+y_C}{3};\\; \\frac{z_A+z_B+z_C}{3}\\right)",
        hint: "Tam giác có 3 đỉnh nên trung bình cộng phải chia cho 3!",
      },
    ],
    summaryFormulasTex: [
      "I\\left(\\frac{x_A+x_B}{2};\\; \\frac{y_A+y_B}{2};\\; \\frac{z_A+z_B}{2}\\right)",
      "G\\left(\\frac{x_A+x_B+x_C}{3};\\; \\frac{y_A+y_B+y_C}{3};\\; \\frac{z_A+z_B+z_C}{3}\\right)",
    ],
    keyTakeaway: "Trung điểm chia 2, Trọng tâm tam giác chia 3 (luôn là phép cộng!).",
    promptVi:
      "Minh họa 3D một tam giác thủy tinh ánh vàng hổ phách lơ lửng cân bằng hoàn hảo trên một mũi kim tại điểm trọng tâm ở chính giữa với ba đường trung tuyến phát sáng hội tụ về tâm cân bằng, nền xanh đen kiến trúc.",
    promptEn:
      "Editorial scientific 3D illustration of a glowing amber glass triangle balancing effortlessly on a precision needle point at its geometric centroid, three luminous golden median lines intersecting at the center of gravity on a dark architectural backdrop, studio rim light, no text.",
  },
  {
    groupNumber: 5,
    title: "Tích vô hướng & Điều kiện vuông góc",
    shortTitle: "Tích vô hướng",
    accentHex: "#059669",
    badgeBgHex: "#D1FAE5",
    blanks: [
      {
        id: "g5_b1",
        label: "Công thức tọa độ tích vô hướng",
        questionTex:
          "\\vec{u}\\cdot\\vec{v} = \\;?",
        options: [
          { id: "a", tex: "x_1x_2 + y_1y_2 + z_1z_2", label: "x₁x₂ + y₁y₂ + z₁z₂" },
          { id: "b", tex: "(x_1x_2;\\; y_1y_2;\\; z_1z_2)", label: "Vectơ (x₁x₂; y₁y₂; z₁z₂)" },
          { id: "c", tex: "\\sqrt{x_1x_2 + y_1y_2 + z_1z_2}", label: "Có dấu căn" },
        ],
        correctOptionId: "a",
        completedTex:
          "\\vec{u}\\cdot\\vec{v} = x_1x_2 + y_1y_2 + z_1z_2",
        hint: "Tích vô hướng cho kết quả là MỘT SỐ THỰC (vô hướng), không phải vectơ!",
      },
      {
        id: "g5_b2",
        label: "Điều kiện hai vectơ vuông góc",
        questionTex: "\\vec{u} \\perp \\vec{v} \\iff \\;?",
        options: [
          { id: "a", tex: "x_1x_2 + y_1y_2 + z_1z_2 = 1", label: "= 1" },
          { id: "b", tex: "x_1x_2 + y_1y_2 + z_1z_2 = 0", label: "= 0" },
          { id: "c", tex: "\\frac{x_1}{x_2}=\\frac{y_1}{y_2}=\\frac{z_1}{z_2}", label: "Tỉ lệ bằng nhau" },
        ],
        correctOptionId: "b",
        completedTex:
          "\\vec{u} \\perp \\vec{v} \\iff x_1x_2 + y_1y_2 + z_1z_2 = 0",
        hint: "Vì cos(90°) = 0 nên tích vô hướng bằng 0.",
      },
    ],
    summaryFormulasTex: [
      "\\vec{u}\\cdot\\vec{v} = x_1x_2 + y_1y_2 + z_1z_2 \\in \\mathbb{R}",
      "\\vec{u} \\perp \\vec{v} \\iff x_1x_2 + y_1y_2 + z_1z_2 = 0",
    ],
    keyTakeaway: "Tích vô hướng là một SỐ THỰC; bằng 0 khi hai vectơ vuông góc.",
    promptVi:
      "Minh họa 3D hai tia laser màu xanh ngọc lục bảo và cam cắt nhau tạo góc vuông 90 độ chuẩn xác với biểu tượng góc vuông phát sáng tại giao điểm trên mặt phẳng kỹ thuật tối giản, ánh sáng studio cao cấp.",
    promptEn:
      "Clean scientific 3D rendering of two crisp orthogonal emerald and amber laser vectors intersecting at an exact 90-degree angle with a glowing geometric right-angle square marker at their intersection on a dark technical grid, architectural lighting, no text.",
  },
  {
    groupNumber: 6,
    title: "Độ dài vectơ, Khoảng cách & Góc",
    shortTitle: "Độ dài & Góc",
    accentHex: "#E11D48",
    badgeBgHex: "#FFE4E6",
    blanks: [
      {
        id: "g6_b1",
        label: "Khoảng cách giữa hai điểm A và B",
        questionTex: "AB = |\\overrightarrow{AB}| = \\;?",
        options: [
          {
            id: "a",
            tex: "\\sqrt{(x_B-x_A)^2 + (y_B-y_A)^2 + (z_B-z_A)^2}",
            label: "Căn tổng bình phương hiệu",
          },
          {
            id: "b",
            tex: "(x_B-x_A)^2 + (y_B-y_A)^2 + (z_B-z_A)^2",
            label: "Không có dấu căn",
          },
        ],
        correctOptionId: "a",
        completedTex:
          "AB = \\sqrt{(x_B-x_A)^2 + (y_B-y_A)^2 + (z_B-z_A)^2}",
        hint: "Áp dụng định lý Pythagore trong không gian 3 chiều: nhớ lấy căn bậc hai!",
      },
      {
        id: "g6_b2",
        label: "Côsin góc giữa hai vectơ (Tránh bẫy 2.29C)",
        questionTex: "\\cos(\\vec{u},\\vec{v}) = \\;?",
        options: [
          {
            id: "a",
            tex: "\\frac{|\\vec{u}\\cdot\\vec{v}|}{|\\vec{u}|\\cdot|\\vec{v}|}",
            label: "Có trị tuyệt đối ở tử",
          },
          {
            id: "b",
            tex: "\\frac{\\vec{u}\\cdot\\vec{v}}{|\\vec{u}|\\cdot|\\vec{v}|}",
            label: "Giữ nguyên dấu ở tử",
          },
        ],
        correctOptionId: "b",
        completedTex:
          "\\cos(\\vec{u},\\vec{v}) = \\frac{x_1x_2+y_1y_2+z_1z_2}{\\sqrt{x_1^2+y_1^2+z_1^2}\\cdot\\sqrt{x_2^2+y_2^2+z_2^2}}",
        hint: "Góc giữa 2 VECTƠ có thể là góc tù (cos < 0) nên tử số KHÔNG có trị tuyệt đối!",
      },
    ],
    summaryFormulasTex: [
      "AB = \\sqrt{(x_B-x_A)^2 + (y_B-y_A)^2 + (z_B-z_A)^2}",
      "\\cos(\\vec{u},\\vec{v}) = \\frac{x_1x_2+y_1y_2+z_1z_2}{\\sqrt{x_1^2+y_1^2+z_1^2}\\cdot\\sqrt{x_2^2+y_2^2+z_2^2}}",
    ],
    keyTakeaway: "Cảnh giác bẫy 2.29C: cos(u, v) giữ nguyên dấu của tích vô hướng!",
    promptVi:
      "Minh họa khoa học thiết bị đo khoảng cách bằng tia laser đỏ rực nối giữa hai ngôi sao pha lê lơ lửng trong không gian hình học 3 chiều kèm vòng cung đo góc phát sáng, nền xanh đen sang trọng.",
    promptEn:
      "Precision scientific 3D illustration of a glowing ruby laser beam measuring exact spatial distance between two suspended crystal nodes in a dark blueprint 3D room with a luminous geometric angle arc, clean editorial technical render, no text.",
  },
];

export interface CoordinateSystemOption {
  id: 1 | 2 | 3;
  shortName: string;
  originDesc: string;
  ozDirDesc: string;
  pointA: [number, number, number];
  pointB: [number, number, number];
  vecAB: [number, number, number];
  coordATex: string;
  coordBTex: string;
  vecABTex: string;
  distTex: string;
}

export const LAMP_COORDINATE_SYSTEMS: CoordinateSystemOption[] = [
  {
    id: 1,
    shortName: "Hệ trục (1): O góc trần, Oz hướng xuống",
    originDesc: "Gốc O tại góc trần nhà",
    ozDirDesc: "Tia Oz hướng xuống dưới",
    pointA: [1.2, 1.6, 0.5],
    pointB: [1.5, 1.5, 0.4],
    vecAB: [0.3, -0.1, -0.1],
    coordATex: "A(1{,}2;\\; 1{,}6;\\; 0{,}5)",
    coordBTex: "B(1{,}5;\\; 1{,}5;\\; 0{,}4)",
    vecABTex: "\\overrightarrow{AB} = (0{,}3;\\; -0{,}1;\\; -0{,}1)",
    distTex:
      "AB = \\sqrt{0{,}3^2 + (-0{,}1)^2 + (-0{,}1)^2} = \\sqrt{0{,}11} \\approx 0{,}33\\text{ m}",
  },
  {
    id: 2,
    shortName: "Hệ trục (2): O góc trần, Oz hướng lên",
    originDesc: "Gốc O tại góc trần nhà",
    ozDirDesc: "Tia Oz hướng lên trên",
    pointA: [1.2, 1.6, -0.5],
    pointB: [1.5, 1.5, -0.4],
    vecAB: [0.3, -0.1, 0.1],
    coordATex: "A(1{,}2;\\; 1{,}6;\\; -0{,}5)",
    coordBTex: "B(1{,}5;\\; 1{,}5;\\; -0{,}4)",
    vecABTex: "\\overrightarrow{AB} = (0{,}3;\\; -0{,}1;\\; 0{,}1)",
    distTex:
      "AB = \\sqrt{0{,}3^2 + (-0{,}1)^2 + 0{,}1^2} = \\sqrt{0{,}11} \\approx 0{,}33\\text{ m}",
  },
  {
    id: 3,
    shortName: "Hệ trục (3): O góc sàn (cao 3m), Oz hướng lên",
    originDesc: "Gốc O tại góc sàn nhà (trần cao 3m)",
    ozDirDesc: "Tia Oz hướng lên trên",
    pointA: [1.2, 1.6, 2.5],
    pointB: [1.5, 1.5, 2.6],
    vecAB: [0.3, -0.1, 0.1],
    coordATex: "A(1{,}2;\\; 1{,}6;\\; 2{,}5)",
    coordBTex: "B(1{,}5;\\; 1{,}5;\\; 2{,}6)",
    vecABTex: "\\overrightarrow{AB} = (0{,}3;\\; -0{,}1;\\; 0{,}1)",
    distTex:
      "AB = \\sqrt{0{,}3^2 + (-0{,}1)^2 + 0{,}1^2} = \\sqrt{0{,}11} \\approx 0{,}33\\text{ m}",
  },
];
