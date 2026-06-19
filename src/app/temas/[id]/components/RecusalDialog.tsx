"use client";

import { useState, useEffect, useCallback } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Checkbox from "@mui/material/Checkbox";
import CircularProgress from "@mui/material/CircularProgress";
import Box from "@mui/material/Box";

interface Member {
  id: string;
  name: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  topicId: string;
  onSaved: () => void;
}

export default function RecusalDialog({ open, onClose, topicId, onSaved }: Props) {
  const [members, setMembers] = useState<Member[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // El diálogo se monta al abrir (mount condicional en el padre), así arranca
  // cargando sin necesidad de un setState síncrono dentro del efecto.
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    fetch(`/api/topics/${topicId}/recusals`)
      .then((r) => r.json())
      .then((data) => {
        setMembers(data.members ?? []);
        setSelected(new Set<string>(data.recusedIds ?? []));
      })
      .finally(() => setLoading(false));
  }, [topicId]);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    const res = await fetch(`/api/topics/${topicId}/recusals`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userIds: Array.from(selected) }),
    });
    setSaving(false);
    if (res.ok) onSaved();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Conflicto de interés</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Los miembros marcados solo verán el título y la descripción del tema. No
          podrán ver ni participar en la discusión ni en la votación.
        </Typography>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
            <CircularProgress size={24} />
          </Box>
        ) : members.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
            No hay miembros para mostrar.
          </Typography>
        ) : (
          <List dense>
            {members.map((m) => (
              <ListItem key={m.id} disablePadding>
                <ListItemButton onClick={() => toggle(m.id)} dense>
                  <Checkbox edge="start" checked={selected.has(m.id)} tabIndex={-1} disableRipple />
                  <ListItemText primary={m.name} />
                </ListItemButton>
              </ListItem>
            ))}
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
