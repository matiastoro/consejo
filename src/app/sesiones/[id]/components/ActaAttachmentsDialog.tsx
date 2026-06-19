"use client";

import { useEffect, useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Checkbox from "@mui/material/Checkbox";
import CircularProgress from "@mui/material/CircularProgress";
import Box from "@mui/material/Box";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";

interface ActaAttachment {
  id: string;
  fileName: string;
  fileSize: number;
  topicTitle: string;
  selected: boolean;
}

interface Props {
  open: boolean;
  onClose: () => void;
  sessionId: string;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ActaAttachmentsDialog({ open, onClose, sessionId }: Props) {
  const [items, setItems] = useState<ActaAttachment[]>([]);
  // Orden de selección: el índice define el orden en que se anexan al acta.
  const [order, setOrder] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch(`/api/sessions/${sessionId}/acta-attachments`)
      .then((r) => r.json())
      .then((data) => {
        const list: ActaAttachment[] = data.items ?? [];
        setItems(list);
        setOrder(list.filter((i) => i.selected).map((i) => i.id));
      })
      .finally(() => setLoading(false));
  }, [open, sessionId]);

  const toggle = (id: string) => {
    setOrder((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    await fetch(`/api/sessions/${sessionId}/acta-attachments`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attachmentIds: order }),
    });
    setSaving(false);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Anexos del acta</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Elige qué documentos PDF de los temas resueltos se anexan al final del acta.
        </Typography>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        ) : items.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
            No hay adjuntos PDF en los temas resueltos de esta sesión.
          </Typography>
        ) : (
          <List dense>
            {items.map((it) => {
              const idx = order.indexOf(it.id);
              return (
                <ListItem key={it.id} disablePadding>
                  <ListItemButton onClick={() => toggle(it.id)} dense>
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <Checkbox edge="start" checked={idx !== -1} tabIndex={-1} disableRipple />
                    </ListItemIcon>
                    <PictureAsPdfIcon sx={{ mr: 1, color: "error.main" }} fontSize="small" />
                    <ListItemText
                      primary={`${idx !== -1 ? `${idx + 1}. ` : ""}${it.fileName}`}
                      secondary={`${it.topicTitle} · ${formatSize(it.fileSize)}`}
                    />
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving || loading}>
          {saving ? <CircularProgress size={20} /> : "Guardar"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
