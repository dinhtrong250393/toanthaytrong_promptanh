// Client-side image compression before sending smartphone photos to Gemini Vision OCR

export async function compressImageDataUrl(
  file: File,
  maxDimension = 1280,
  quality = 0.84
): Promise<string> {
  const rawDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Không thể đọc tệp ảnh."));
    };
    reader.onerror = () => reject(new Error("Lỗi đọc tệp ảnh."));
    reader.readAsDataURL(file);
  });

  return new Promise<string>((resolve) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width <= maxDimension && height <= maxDimension && file.size < 450_000) {
        resolve(rawDataUrl);
        return;
      }

      if (width > height && width > maxDimension) {
        height = Math.round((height * maxDimension) / width);
        width = maxDimension;
      } else if (height > maxDimension) {
        width = Math.round((width * maxDimension) / height);
        height = maxDimension;
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(rawDataUrl);
        return;
      }
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => resolve(rawDataUrl);
    img.src = rawDataUrl;
  });
}

export async function compressDataUrlForFirestore(
  dataUrl: string,
  maxChars = 460_000
): Promise<string> {
  if (dataUrl.length <= maxChars && dataUrl.startsWith("data:image/")) {
    return dataUrl;
  }

  return new Promise<string>((resolve) => {
    const img = new Image();
    img.onload = () => {
      const steps: Array<{ maxDim: number; quality: number }> = [
        { maxDim: 1280, quality: 0.82 },
        { maxDim: 1280, quality: 0.72 },
        { maxDim: 1080, quality: 0.68 },
        { maxDim: 960, quality: 0.6 },
        { maxDim: 800, quality: 0.55 },
      ];

      for (const step of steps) {
        let { width, height } = img;
        if (width > height && width > step.maxDim) {
          height = Math.round((height * step.maxDim) / width);
          width = step.maxDim;
        } else if (height > step.maxDim) {
          width = Math.round((width * step.maxDim) / height);
          height = step.maxDim;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) break;
        ctx.fillStyle = "#0F291E";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        const out = canvas.toDataURL("image/jpeg", step.quality);
        if (out.length <= maxChars) {
          resolve(out);
          return;
        }
      }

      resolve(dataUrl.slice(0, maxChars));
    };
    img.onerror = () => resolve(dataUrl.slice(0, maxChars));
    img.src = dataUrl;
  });
}

