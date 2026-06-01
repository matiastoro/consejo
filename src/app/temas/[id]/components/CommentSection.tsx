"use client";

import { useState, useRef, useEffect } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import TextField from "@mui/material/TextField";
import IconButton from "@mui/material/IconButton";
import Avatar from "@mui/material/Avatar";
import Chip from "@mui/material/Chip";
import SendIcon from "@mui/icons-material/Send";

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  user: { id: string; name: string; roles: string[]; image?: string | null };
}

interface Props {
  topicId: string;
  comments: Comment[];
  onCommentAdded: () => void;
}

export default function CommentSection({
  topicId,
  comments,
  onCommentAdded,
}: Props) {
  const { t } = useI18n();
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments.length]);

  const handleSend = async () => {
    if (!content.trim()) return;
    setLoading(true);

    const res = await fetch(`/api/topics/${topicId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: content.trim() }),
    });

    setLoading(false);
    if (res.ok) {
      setContent("");
      onCommentAdded();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const roleColor = (roles: string[]) => {
    if (roles.includes("DIRECTOR")) return "#1a5276";
    if (roles.includes("SUBDIRECTOR")) return "#2874a6";
    if (roles.includes("JEFE_DOCENTE")) return "#7d3c98";
    if (roles.includes("CONSEJERO")) return "#27ae60";
    return "#95a5a6";
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2 }}>
          {t("comments.title")} ({comments.length})
        </Typography>

        <Box
          sx={{
            maxHeight: 500,
            overflowY: "auto",
            mb: 2,
            display: "flex",
            flexDirection: "column",
            gap: 1.5,
          }}
        >
          {comments.length === 0 ? (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ textAlign: "center", py: 4 }}
            >
              {t("comments.noComments")}
            </Typography>
          ) : (
            comments.map((comment) => (
              <Box
                key={comment.id}
                sx={{ display: "flex", gap: 1.5, alignItems: "flex-start" }}
              >
                <Avatar
                  src={comment.user.image ?? undefined}
                  sx={{
                    width: 32,
                    height: 32,
                    fontSize: 14,
                    bgcolor: roleColor(comment.user.roles),
                  }}
                >
                  {comment.user.name[0]?.toUpperCase()}
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.25 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {comment.user.name}
                    </Typography>
                    <Chip
                      label={t(`roles.${comment.user.roles[0]}`)}
                      size="small"
                      sx={{
                        height: 18,
                        fontSize: 10,
                        bgcolor: roleColor(comment.user.roles),
                        color: "white",
                      }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      {new Date(comment.createdAt).toLocaleString()}
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                    {comment.content}
                  </Typography>
                </Box>
              </Box>
            ))
          )}
          <div ref={endRef} />
        </Box>

        <Box sx={{ display: "flex", gap: 1, alignItems: "flex-end" }}>
          <TextField
            fullWidth
            multiline
            maxRows={4}
            placeholder={t("comments.placeholder")}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
          />
          <IconButton
            color="primary"
            onClick={handleSend}
            disabled={loading || !content.trim()}
          >
            <SendIcon />
          </IconButton>
        </Box>
      </CardContent>
    </Card>
  );
}
