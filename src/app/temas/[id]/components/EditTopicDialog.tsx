"use client";

import { useState, useRef } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import CircularProgress from "@mui/material/CircularProgress";
import FormControlLabel from "@mui/material/FormControlLabel";
import Checkbox from "@mui/material/Checkbox";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import AttachFileIcon from "@mui/icons-material/AttachFile";

interface AttachmentItem {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  topic: {
    id: string;
    title: string;
    description: string;
    status: string;
    inPersonOnly: boolean;
    requiresProvisionalVote: boolean;
    attachments: AttachmentItem[];
  };
  isAdmin: boolean;
}

const STATUSES = [
  { value: "PENDING_APPROVAL", label: "Pendiente de aprobación" },
  { value: "DISCUSSING", label: "En discusión" },
];

export default function EditTopicDialog({ open, onClose, onSaved, topic, isAdmin }: Props) {
  // Mount the form only while open so its state is seeded fresh from `topic`
  // on each open, without resetting state inside an effect.
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      {open && (
        <EditTopicForm
          topic={topic}
          isAdmin={isAdmin}
          onClose={onClose}
          onSaved={onSaved}
        />
      )}
    </Dialog>
  );
}

function EditTopicForm({
  topic,
  isAdmin,
  onClose,
  onSaved,
}: {
  topic: Props["topic"];
  isAdmin: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useI18n();
  const [title, setTitle] = useState(topic.title);
  const [description, setDescription] = useState(topic.description);
  const [status, setStatus] = useState(topic.status);
  const [inPersonOnly, setInPersonOnly] = useState(topic.inPersonOnly);
  const [requiresProvisionalVote, setRequiresProvisionalVote] = useState(
    topic.requiresProvisionalVote
  );
  const [existing, setExisting] = useState<AttachmentItem[]>(topic.attachments);
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setNewFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeExisting = (id: string) => {
    setExisting((prev) => prev.filter((a) => a.id !== id));
    setRemovedIds((prev) => [...prev, id]);
  };

  const removeNewFile = (index: number) => {
    setNewFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setLoading(true);
    const body: {
      title?: string;
      description?: string;
      status?: string;
      inPersonOnly?: boolean;
      requiresProvisionalVote?: boolean;
    } = {};
    if (title !== topic.title) body.title = title;
    if (description !== topic.description) body.description = description;
    if (status !== topic.status) body.status = status;
    if (inPersonOnly !== topic.inPersonOnly) body.inPersonOnly = inPersonOnly;
    if (requiresProvisionalVote !== topic.requiresProvisionalVote)
      body.requiresProvisionalVote = requiresProvisionalVote;

    if (Object.keys(body).length > 0) {
      await fetch(`/api/topics/${topic.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    }

    for (const id of removedIds) {
      await fetch(`/api/topics/${topic.id}/attachments?attachmentId=${id}`, {
        method: "DELETE",
      });
    }

    for (const file of newFiles) {
      const formData = new FormData();
      formData.append("file", file);
      await fetch(`/api/topics/${topic.id}/attachments`, {
        method: "POST",
        body: formData,
      });
    }

    setLoading(false);
    onSaved();
  };

  return (
    <>
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
          helperText="Puedes pegar enlaces (https://...) y se mostrarán como vínculos."
          sx={{ mb: 2 }}
        />
        <Box sx={{ display: "flex", flexDirection: "column", mb: 2 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={inPersonOnly}
                onChange={(e) => setInPersonOnly(e.target.checked)}
              />
            }
            label="Solo discusión presencial (sin votación online)"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={requiresProvisionalVote}
                onChange={(e) => setRequiresProvisionalVote(e.target.checked)}
              />
            }
            label="Requiere voto provisorio"
          />
        </Box>
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

        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {t("topics.attachments")}
          </Typography>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            hidden
            onChange={handleFileSelect}
          />
          <Button
            variant="outlined"
            size="small"
            startIcon={<AttachFileIcon />}
            onClick={() => fileInputRef.current?.click()}
          >
            {t("topics.addAttachment")}
          </Button>

          {(existing.length > 0 || newFiles.length > 0) && (
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 1 }}>
              {existing.map((att) => (
                <Chip
                  key={att.id}
                  icon={<AttachFileIcon />}
                  label={att.fileName}
                  size="small"
                  variant="outlined"
                  onDelete={() => removeExisting(att.id)}
                />
              ))}
              {newFiles.map((file, i) => (
                <Chip
                  key={`new-${i}`}
                  label={file.name}
                  size="small"
                  color="primary"
                  onDelete={() => removeNewFile(i)}
                />
              ))}
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>{t("common.cancel")}</Button>
        <Button variant="contained" onClick={handleSave} disabled={loading || !title.trim()}>
          {loading ? <CircularProgress size={20} /> : t("common.save")}
        </Button>
      </DialogActions>
    </>
  );
}
