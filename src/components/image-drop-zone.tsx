"use client";

import { Upload } from "lucide-react";
import { forwardRef, useImperativeHandle, useRef, useState } from "react";

interface ImageDropZoneProps {
  onFileSelect: (file: File) => void; // called for click + drag (paste handled by parent)
  error: string | null;
}

export interface ImageDropZoneHandle {
  openPicker(): void;
  resetInput(): void;
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
        className={`border-2 border-dashed rounded-xl min-h-32 flex flex-col items-center justify-center gap-2 p-4 cursor-pointer transition-colors ${
          isDragOver ? "border-primary bg-muted" : "border-border bg-background"
        }`}
      >
        <Upload className="size-8 text-muted-foreground" />
        <p className="text-sm font-medium">
          {isDragOver ? "Drop it here!" : "Drop an image here"}
        </p>
        <p className="text-sm text-muted-foreground">
          or click to browse, or paste a screenshot (Ctrl+V)
        </p>
      </div>
      {error && <p className="text-sm text-destructive mt-2">{error}</p>}
    </div>
  );
});
