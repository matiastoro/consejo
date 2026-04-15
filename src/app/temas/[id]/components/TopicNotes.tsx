"use client";

import { useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import TextField from "@mui/material/TextField";
import IconButton from "@mui/material/IconButton";
import Avatar from "@mui/material/Avatar";
import Chip from "@mui/material/Chip";
import Collapse from "@mui/material/Collapse";
import SendIcon from "@mui/icons-material/Send";
import NoteAddIcon from "@mui/icons-material/NoteAdd";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";

interface Note {
  id: string;
  content: string;
  createdAt: string;
  user: { id: string; name: string; roles: string[]; image?: string | null };
}

interface Props {
  topicId: string;
  notes: Note[];
  onNoteAdded: () => void;
}

export default function TopicNotes({ topicId, notes, onNoteAdded }: Props) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const handleSend = async () => {
    if (!content.trim()) return;
    setLoading(true);

    const res = await fetch(`/api/topics/${topicId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: content.trim() }),
    });

    setLoading(false);
    if (res.ok) {
      setContent("");
      onNoteAdded();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Card>
      <CardContent>
        <Box
          sx={{ display: "flex", alignItems: "center", cursor: "pointer", mb: expanded ? 2 : 0 }}
          onClick={() => setExpanded(!expanded)}
        >
          <NoteAddIcon sx={{ mr: 1, fontSize: 20, color: "primary.main" }} />
          <Typography variant="h6" sx={{ flex: 1 }}>
            Avances / Apuntes ({notes.length})
          </Typography>
          <IconButton size="small">
            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </Box>

        <Collapse in={expanded}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, mb: 2 }}>
            {notes.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", py: 2 }}>
                No hay avances registrados
              </Typography>
            ) : (
              notes.map((note) => (
                <Box key={note.id} sx={{ display: "flex", gap: 1.5, alignItems: "flex-start" }}>
                  <Avatar
                    src={note.user.image ?? undefined}
                    sx={{ width: 28, height: 28, fontSize: 13, bgcolor: "primary.main" }}
                  >
                    {note.user.name[0]?.toUpperCase()}
                  </Avatar>
                  <Box sx={{ flex: 1, bgcolor: "action.hover", borderRadius: 1, p: 1.5 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {note.user.name}
                      </Typography>
                      <Chip
                        label="Avance"
                        size="small"
                        color="primary"
                        variant="outlined"
                        sx={{ height: 18, fontSize: 10 }}
                      />
                      <Typography variant="caption" color="text.secondary">
                        {new Date(note.createdAt).toLocaleString()}
                      </Typography>
                    </Box>
                    <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                      {note.content}
                    </Typography>
                  </Box>
                </Box>
              ))
            )}
          </Box>

          <Box sx={{ display: "flex", gap: 1, alignItems: "flex-end" }}>
            <TextField
              fullWidth
              multiline
              maxRows={4}
              placeholder="Agregar un avance o apunte..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              size="small"
            />
            <IconButton
              color="primary"
              onClick={handleSend}
              disabled={loading || !content.trim()}
            >
              <SendIcon />
            </IconButton>
          </Box>
        </Collapse>
      </CardContent>
    </Card>
  );
}
