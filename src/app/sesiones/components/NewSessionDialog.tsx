"use client";

import { useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export default function NewSessionDialog({ open, onClose, onCreated }: Props) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim() || !date) return;
    setLoading(true);

    const res = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim(), date }),
    });

    setLoading(false);
    if (res.ok) {
      setTitle("");
      setDate("");
      onCreated();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Nueva Sesión</DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "8px !important" }}>
        <TextField
          label="Título de la sesión"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          fullWidth
        />
        <TextField
          label="Fecha"
          type="datetime-local"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          fullWidth
          slotProps={{ inputLabel: { shrink: true } }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading || !title.trim() || !date}
        >
          Crear sesión
        </Button>
      </DialogActions>
    </Dialog>
  );
}
