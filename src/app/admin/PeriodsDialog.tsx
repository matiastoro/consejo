"use client";

import { useState, useEffect, useCallback } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Chip from "@mui/material/Chip";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";

interface Period {
  id: string;
  role: string;
  startDate: string;
  endDate: string | null;
}

interface Props {
  onClose: () => void;
  userId: string;
  userName: string;
}

const PERIOD_ROLES = ["DIRECTOR", "SUBDIRECTOR", "JEFE_DOCENTE", "CONSEJERO", "INVITADO"];

export default function PeriodsDialog({ onClose, userId, userName }: Props) {
  const { t } = useI18n();
  const [periods, setPeriods] = useState<Period[]>([]);
  // Se monta al abrir (mount condicional en el padre), así arranca cargando sin
  // un setState síncrono dentro del efecto.
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [role, setRole] = useState("CONSEJERO");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchPeriods = useCallback(() => {
    fetch(`/api/admin/users/${userId}/periods`)
      .then((r) => r.json())
      .then((data) => setPeriods(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, [userId]);

  useEffect(() => {
    fetchPeriods();
  }, [fetchPeriods]);

  const resetForm = () => {
    setEditingId(null);
    setRole("CONSEJERO");
    setStartDate("");
    setEndDate("");
  };

  const startEdit = (p: Period) => {
    setEditingId(p.id);
    setRole(p.role);
    setStartDate(p.startDate.slice(0, 10));
    setEndDate(p.endDate ? p.endDate.slice(0, 10) : "");
    setError(null);
  };

  const save = async () => {
    setError(null);
    if (!startDate) {
      setError("La fecha de inicio es obligatoria");
      return;
    }
    setSaving(true);
    const res = await fetch(`/api/admin/users/${userId}/periods`, {
      method: editingId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...(editingId ? { periodId: editingId } : {}),
        role,
        startDate,
        endDate: endDate || null,
      }),
    });
    setSaving(false);
    if (res.ok) {
      resetForm();
      fetchPeriods();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "No se pudo guardar el periodo");
    }
  };

  const remove = async (periodId: string) => {
    if (editingId === periodId) resetForm();
    await fetch(`/api/admin/users/${userId}/periods?periodId=${periodId}`, {
      method: "DELETE",
    });
    fetchPeriods();
  };

  const fmt = (d: string) => new Date(d).toLocaleDateString("es-CL");

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Membresía · {userName}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Los periodos definen cuándo la persona es consejero o invitado. Solo verá
          y participará en los temas creados dentro de sus periodos.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
            <CircularProgress size={24} />
          </Box>
        ) : periods.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
            Sin periodos registrados.
          </Typography>
        ) : (
          <List dense>
            {periods.map((p) => (
              <ListItem
                key={p.id}
                sx={{ bgcolor: editingId === p.id ? "action.selected" : undefined, borderRadius: 1 }}
                secondaryAction={
                  <>
                    <IconButton edge="end" onClick={() => startEdit(p)} sx={{ mr: 0.5 }}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton edge="end" color="error" onClick={() => remove(p.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </>
                }
              >
                <Chip
                  label={t(`roles.${p.role}`)}
                  size="small"
                  color={p.role === "CONSEJERO" ? "primary" : "info"}
                  sx={{ mr: 1.5 }}
                />
                <ListItemText
                  primary={`${fmt(p.startDate)} → ${p.endDate ? fmt(p.endDate) : "vigente"}`}
                />
              </ListItem>
            ))}
          </List>
        )}

        <Box sx={{ mt: 2, p: 2, bgcolor: "action.hover", borderRadius: 1 }}>
          <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
            {editingId ? "Editar periodo" : "Agregar periodo"}
          </Typography>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ alignItems: { sm: "center" } }}>
            <TextField
              select
              size="small"
              label="Rol"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              sx={{ minWidth: 140 }}
            >
              {PERIOD_ROLES.map((r) => (
                <MenuItem key={r} value={r}>
                  {t(`roles.${r}`)}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              type="date"
              size="small"
              label="Inicio"
              slotProps={{ inputLabel: { shrink: true } }}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <TextField
              type="date"
              size="small"
              label="Término (opcional)"
              slotProps={{ inputLabel: { shrink: true } }}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
            <Button variant="contained" onClick={save} disabled={saving}>
              {saving ? <CircularProgress size={20} /> : editingId ? "Guardar" : "Agregar"}
            </Button>
            {editingId && (
              <Button onClick={resetForm} disabled={saving}>
                Cancelar
              </Button>
            )}
          </Stack>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
}
