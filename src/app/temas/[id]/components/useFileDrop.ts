"use client";

import { useCallback, useRef, useState } from "react";

// Soporte de arrastrar-y-soltar archivos sobre una sección. Al soltar, los
// archivos se agregan al área de adjuntos pendientes (no se envían solos), para
// que el usuario pueda acompañarlos de texto antes de confirmar.
export function useFileDrop(onFiles: (files: File[]) => void) {
  const [dragging, setDragging] = useState(false);
  // Contador para manejar dragenter/dragleave anidados sin parpadeo.
  const depth = useRef(0);

  const onDragEnter = useCallback((e: React.DragEvent) => {
    if (!e.dataTransfer?.types?.includes("Files")) return;
    e.preventDefault();
    depth.current += 1;
    setDragging(true);
  }, []);

  const onDragOver = useCallback((e: React.DragEvent) => {
    if (!e.dataTransfer?.types?.includes("Files")) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    if (!e.dataTransfer?.types?.includes("Files")) return;
    e.preventDefault();
    depth.current = Math.max(0, depth.current - 1);
    if (depth.current === 0) setDragging(false);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      if (!e.dataTransfer?.types?.includes("Files")) return;
      e.preventDefault();
      depth.current = 0;
      setDragging(false);
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) onFiles(files);
    },
    [onFiles]
  );

  return {
    dragging,
    dropHandlers: { onDragEnter, onDragOver, onDragLeave, onDrop },
  };
}
