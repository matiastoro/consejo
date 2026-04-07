"use client";

import { useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import ToggleButton from "@mui/material/ToggleButton";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import ThumbUpIcon from "@mui/icons-material/ThumbUp";
import ThumbDownIcon from "@mui/icons-material/ThumbDown";

interface Props {
  open: boolean;
  onClose: () => void;
  onClosed: () => void;
  topicId: string;
}

export default function CloseTopicDialog({ open, onClose, onClosed, topicId }: Props) {
  const [status, setStatus] = useState<"APROBADO" | "RECHAZADO" | null>(null);
  const [resolution, setResolution] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!status) return;
    setLoading(true);

    const res = await fetch(`/api/topics/${topicId}/close`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, resolution: resolution.trim() || undefined }),
    });

    setLoading(false);
    if (res.ok) {
      setStatus(null);
      setResolution("");
      onClosed();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Resolver tema</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Selecciona la resolución y opcionalmente deja observaciones.
        </Typography>

        <ToggleButtonGroup
          value={status}
          exclusive
          onChange={(_, val) => val && setStatus(val)}
          fullWidth
          sx={{ mb: 3 }}
        >
          <ToggleButton value="APROBADO" color="success">
            <ThumbUpIcon sx={{ mr: 1 }} />
            Aprobado
          </ToggleButton>
          <ToggleButton value="RECHAZADO" color="error">
            <ThumbDownIcon sx={{ mr: 1 }} />
            Rechazado
          </ToggleButton>
        </ToggleButtonGroup>

        <TextField
          label="Observaciones (opcional)"
          fullWidth
          multiline
          rows={3}
          value={resolution}
          onChange={(e) => setResolution(e.target.value)}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancelar</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading || !status}
          color={status === "APROBADO" ? "success" : status === "RECHAZADO" ? "error" : "primary"}
        >
          {loading ? <CircularProgress size={20} /> : "Confirmar"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
