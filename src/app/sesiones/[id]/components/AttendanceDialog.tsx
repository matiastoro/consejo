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

interface Candidate {
  id: string;
  name: string;
  role: string;
  abbrev: string;
  isGuest: boolean;
  attended: boolean;
}

interface Props {
  open: boolean;
  onClose: () => void;
  sessionId: string;
}

const ROLE_LABEL: Record<string, string> = {
  DIRECTOR: "Director",
  SUBDIRECTOR: "Subdirector",
  JEFE_DOCENTE: "Jefe Docente",
  CONSEJERO: "Consejero",
  INVITADO: "Invitado",
};

export default function AttendanceDialog({ open, onClose, sessionId }: Props) {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch(`/api/sessions/${sessionId}/attendees`)
      .then((r) => r.json())
      .then((data) => {
        const list: Candidate[] = data.candidates ?? [];
        setCandidates(list);
        setSelected(new Set(list.filter((c) => c.attended).map((c) => c.id)));
      })
      .finally(() => setLoading(false));
  }, [open, sessionId]);

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
    await fetch(`/api/sessions/${sessionId}/attendees`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attendeeIds: Array.from(selected) }),
    });
    setSaving(false);
    onClose();
  };

  const members = candidates.filter((c) => !c.isGuest);
  const guests = candidates.filter((c) => c.isGuest);

  const renderItem = (c: Candidate) => (
    <ListItem key={c.id} disablePadding>
      <ListItemButton onClick={() => toggle(c.id)} dense>
        <ListItemIcon sx={{ minWidth: 36 }}>
          <Checkbox edge="start" checked={selected.has(c.id)} tabIndex={-1} disableRipple />
        </ListItemIcon>
        <ListItemText
          primary={c.name}
          secondary={ROLE_LABEL[c.role] ?? c.role}
        />
      </ListItemButton>
    </ListItem>
  );

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Asistencia a la sesión</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Marca quién asistió, entre los miembros con cargo vigente a la fecha de la sesión.
        </Typography>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        ) : candidates.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
            No hay miembros con cargo vigente a la fecha de la sesión.
          </Typography>
        ) : (
          <>
            {members.length > 0 && (
              <>
                <Typography variant="overline" color="text.secondary">
                  Consejo
                </Typography>
                <List dense>{members.map(renderItem)}</List>
              </>
            )}
            {guests.length > 0 && (
              <>
                <Typography variant="overline" color="text.secondary">
                  Invitados
                </Typography>
                <List dense>{guests.map(renderItem)}</List>
              </>
            )}
          </>
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
