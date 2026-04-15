"use client";

import { useRef, useState } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import CircularProgress from "@mui/material/CircularProgress";
import FormControlLabel from "@mui/material/FormControlLabel";
import Checkbox from "@mui/material/Checkbox";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import AttachFileIcon from "@mui/icons-material/AttachFile";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export default function NewTopicDialog({ open, onClose, onCreated }: Props) {
  const { t } = useI18n();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [inPersonOnly, setInPersonOnly] = useState(false);
  const [requiresProvisionalVote, setRequiresProvisionalVote] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim()) return;
    setLoading(true);

    const res = await fetch("/api/topics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        description: description.trim(),
        inPersonOnly,
        requiresProvisionalVote,
      }),
    });

    if (res.ok) {
      const topic = await res.json();

      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        await fetch(`/api/topics/${topic.id}/attachments`, {
          method: "POST",
          body: formData,
        });
      }

      setTitle("");
      setDescription("");
      setFiles([]);
      setInPersonOnly(false);
      setRequiresProvisionalVote(false);
      onCreated();
    }
    setLoading(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{t("topics.newTopic")}</DialogTitle>
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

        {files.length > 0 && (
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 1 }}>
            {files.map((file, i) => (
              <Chip
                key={i}
                label={file.name}
                size="small"
                onDelete={() => removeFile(i)}
              />
            ))}
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>{t("common.cancel")}</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading || !title.trim() || !description.trim()}
        >
          {loading ? <CircularProgress size={20} /> : t("common.create")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
