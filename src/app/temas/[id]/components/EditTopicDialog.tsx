"use client";

import { useState, useEffect } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import CircularProgress from "@mui/material/CircularProgress";

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  topic: { id: string; title: string; description: string; status: string };
  isAdmin: boolean;
}

const STATUSES = [
  { value: "PENDING_APPROVAL", label: "Pendiente de aprobación" },
  { value: "DISCUSSING", label: "En discusión" },
];

export default function EditTopicDialog({ open, onClose, onSaved, topic, isAdmin }: Props) {
  const { t } = useI18n();
  const [title, setTitle] = useState(topic.title);
  const [description, setDescription] = useState(topic.description);
  const [status, setStatus] = useState(topic.status);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setTitle(topic.title);
    setDescription(topic.description);
    setStatus(topic.status);
  }, [topic]);

  const handleSave = async () => {
    setLoading(true);
    const body: any = {};
    if (title !== topic.title) body.title = title;
    if (description !== topic.description) body.description = description;
    if (status !== topic.status) body.status = status;

    if (Object.keys(body).length === 0) {
      setLoading(false);
      onClose();
      return;
    }

    const res = await fetch(`/api/topics/${topic.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setLoading(false);
    if (res.ok) onSaved();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{t("topics.editTopic")}</DialogTitle>
      <DialogContent>
        <TextField
          label={t("topics.topicTitle")}
          fullWidth
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          sx={{ mt: 1, mb: 2 }}
        />
        <TextField
          label={t("topics.description")}
          fullWidth
          multiline
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          sx={{ mb: 2 }}
        />
        {isAdmin && (
          <TextField
            label={t("topics.status")}
            select
            fullWidth
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            {STATUSES.map((s) => (
              <MenuItem key={s.value} value={s.value}>
                {s.label}
              </MenuItem>
            ))}
          </TextField>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>{t("common.cancel")}</Button>
        <Button variant="contained" onClick={handleSave} disabled={loading || !title.trim()}>
          {loading ? <CircularProgress size={20} /> : t("common.save")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
