"use client";

import { useState, useEffect } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import CircularProgress from "@mui/material/CircularProgress";
import SpellcheckIcon from "@mui/icons-material/Spellcheck";
import UndoIcon from "@mui/icons-material/Undo";

// Corrección ortográfica con el LLM de la institución para un cuadro de texto.
// Guarda el texto previo a la corrección para revertir si la IA lo empeora.
export function useSpellcheck(content: string, setContent: (text: string) => void) {
  const [enabled, setEnabled] = useState(false);
  const [correcting, setCorrecting] = useState(false);
  const [beforeCorrection, setBeforeCorrection] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/spellcheck")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setEnabled(Boolean(d?.enabled)))
      .catch(() => {});
  }, []);

  const correct = async () => {
    if (!content.trim()) return;
    setCorrecting(true);
    setError(false);
    const original = content;
    try {
      const res = await fetch("/api/spellcheck", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: original }),
      });
      const data = res.ok ? await res.json() : null;
      if (typeof data?.text === "string") {
        setContent(data.text);
        if (data.text !== original) setBeforeCorrection(original);
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    }
    setCorrecting(false);
  };

  const revert = () => {
    if (beforeCorrection === null) return;
    setContent(beforeCorrection);
    setBeforeCorrection(null);
  };

  return {
    enabled,
    correcting,
    error,
    canRevert: beforeCorrection !== null,
    correct,
    revert,
    clearError: () => setError(false),
    // Tras enviar: el texto original ya no aplica.
    reset: () => setBeforeCorrection(null),
  };
}

export function SpellcheckButtons({
  spellcheck,
  content,
  disabled,
  size,
}: {
  spellcheck: ReturnType<typeof useSpellcheck>;
  content: string;
  disabled?: boolean;
  size?: "small" | "medium";
}) {
  const { t } = useI18n();
  const { enabled, correcting, canRevert, correct, revert } = spellcheck;
  return (
    <>
      {enabled && (
        <Tooltip title={t("comments.spellcheck")}>
          <span>
            <IconButton
              size={size}
              onClick={correct}
              disabled={disabled || correcting || !content.trim()}
            >
              {correcting ? <CircularProgress size={20} /> : <SpellcheckIcon />}
            </IconButton>
          </span>
        </Tooltip>
      )}
      {canRevert && (
        <Tooltip title={t("comments.spellcheckRevert")}>
          <span>
            <IconButton size={size} onClick={revert} disabled={disabled || correcting}>
              <UndoIcon />
            </IconButton>
          </span>
        </Tooltip>
      )}
    </>
  );
}
