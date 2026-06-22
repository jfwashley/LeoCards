"use client";

import { forwardRef, useImperativeHandle, useRef, useState } from "react";

interface ImageDropZoneProps {
  onFileSelect: (file: File) => void; // called for click + drag (paste handled by parent)
  error: string | null;
}

export interface ImageDropZoneHandle {
  openPicker(): void;
  resetInput(): void;
}

// ACUpload glyph — amber upload arrow + tray (no emoji, L-01)
function ACUpload({
  c = "#F28A1F",
  ink = "#4A331C",
}: {
  c?: string;
  ink?: string;
}) {
  return (
    <div style={{ position: "relative", width: 56, height: 50 }}>
      {/* tray / base */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 3,
          right: 3,
          height: 22,
          border: `2.4px solid ${ink}`,
          borderTop: "none",
          borderRadius: "4px 4px 11px 11px",
        }}
      />
      {/* arrow triangle */}
      <div
        style={{
          position: "absolute",
          top: 2,
          left: "50%",
          transform: "translateX(-50%)",
          width: 0,
          height: 0,
          borderLeft: "10px solid transparent",
          borderRight: "10px solid transparent",
          borderBottom: `12px solid ${c}`,
        }}
      />
      {/* arrow stem */}
      <div
        style={{
          position: "absolute",
          top: 13,
          left: "50%",
          transform: "translateX(-50%)",
          width: 5,
          height: 22,
          background: c,
          borderRadius: 3,
        }}
      />
    </div>
  );
}

export const ImageDropZone = forwardRef<
  ImageDropZoneHandle,
  ImageDropZoneProps
>(function ImageDropZone({ onFileSelect, error }, ref) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function openPicker() {
    inputRef.current?.click();
  }

  function resetInput() {
    if (inputRef.current) inputRef.current.value = "";
  }

  useImperativeHandle(ref, () => ({ openPicker, resetInput }));

  const borderColor = error ? "#DE5F4A" : isDragOver ? "#F28A1F" : "#E4D2B2";
  const bgColor = isDragOver ? "#FFF1D9" : "#FFFDF9";

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        aria-label="Upload image"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFileSelect(f);
        }}
      />
      {/* biome-ignore lint/a11y/useSemanticElements: drop zone requires div with role=button for drag event handling; native button does not support drag events correctly */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Select image file — click, drag and drop, or paste from clipboard"
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") openPicker();
        }}
        onClick={openPicker}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOver(false);
          const file = e.dataTransfer.files[0];
          if (file) onFileSelect(file);
        }}
        style={{
          borderRadius: 22,
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 14,
          padding: 24,
          textAlign: "center",
          border: `2.5px dashed ${borderColor}`,
          background: bgColor,
          minHeight: 200,
          cursor: "pointer",
          transition: "border-color 0.15s, background 0.15s",
        }}
      >
        <ACUpload
          c={error ? "#DE5F4A" : "#F28A1F"}
          ink={isDragOver ? "#F28A1F" : "#4A331C"}
        />
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 20,
            fontWeight: 700,
            color: "#4A331C",
          }}
        >
          {isDragOver ? "Drop to upload" : "Upload a Photo"}
        </span>
        {!isDragOver && (
          <span style={{ fontSize: 14.5, color: "#9C8467", lineHeight: 1.5 }}>
            or{" "}
            <span style={{ color: "#C96F12", fontWeight: 700 }}>
              browse your files
            </span>
            <br />
            &middot; paste a screenshot (Ctrl+V)
          </span>
        )}
        <span
          style={{
            fontSize: 12.5,
            fontWeight: 600,
            color: "#9C8467",
            background: "#FFF1DC",
            padding: "4px 11px",
            borderRadius: 999,
          }}
        >
          JPG &middot; PNG &middot; WebP
        </span>
      </div>
      {error && (
        <p
          data-testid="file-error"
          style={{
            marginTop: 8,
            fontSize: 13,
            fontWeight: 600,
            color: "#DE5F4A",
          }}
        >
          {error}
        </p>
      )}
    </div>
  );
});
