"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import DashboardLayout from "@/components/DashboardLayout";
import VotePanel from "./components/VotePanel";
import CommentSection from "./components/CommentSection";
import EditTopicDialog from "./components/EditTopicDialog";
import CloseTopicDialog from "./components/CloseTopicDialog";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Divider from "@mui/material/Divider";
import Skeleton from "@mui/material/Skeleton";
import Collapse from "@mui/material/Collapse";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import EditIcon from "@mui/icons-material/Edit";
import GavelIcon from "@mui/icons-material/Gavel";
import HistoryIcon from "@mui/icons-material/History";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import AttachFileIcon from "@mui/icons-material/AttachFile";

interface HistoryEntry {
  id: string;
  field: string;
  oldValue: string | null;
  newValue: string | null;
  createdAt: string;
  user: { id: string; name: string };
}

interface TopicDetail {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: number;
  author: { id: string; name: string; roles: string[] };
  createdAt: string;
  resolution: string | null;
  closedAt: string | null;
  attachments: { id: string; fileName: string; fileUrl: string; fileSize: number; mimeType: string }[];
  votes: {
    id: string;
    voteType: string;
    user: { id: string; name: string; roles: string[] };
  }[];
  comments: {
    id: string;
    content: string;
    createdAt: string;
    user: { id: string; name: string; roles: string[] };
  }[];
  history: HistoryEntry[];
  myVote: string | null;
}

const fieldLabels: Record<string, string> = {
  title: "Título",
  description: "Descripción",
  status: "Estado",
  resolution: "Observaciones",
};

const statusLabels: Record<string, string> = {
  PENDING_APPROVAL: "Pendiente",
  DISCUSSING: "En discusión",
  APROBADO: "Aprobado",
  RECHAZADO: "Rechazado",
};

export default function TopicDetailPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const params = useParams();
  const topicId = params.id as string;
  const { t } = useI18n();
  const [topic, setTopic] = useState<TopicDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const roles = (session?.user as any)?.roles as string[] | undefined;
  const isAdminUser = (session?.user as any)?.isAdmin as boolean | undefined;
  const userId = (session?.user as any)?.id as string | undefined;
  const isDir = roles?.includes("DIRECTOR") || isAdminUser;
  const canEdit = isDir || topic?.author.id === userId;
  const canVoteUser = roles?.some((r: string) =>
    ["DIRECTOR", "JEFE_DOCENTE", "CONSEJERO"].includes(r)
  );

  const fetchTopic = useCallback(() => {
    fetch(`/api/topics/${topicId}`)
      .then((r) => r.json())
      .then((data) => {
        setTopic(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [topicId]);

  useEffect(() => {
    if (authStatus === "unauthenticated") router.replace("/auth/signin");
  }, [authStatus, router]);

  useEffect(() => {
    if (authStatus === "authenticated") fetchTopic();
  }, [authStatus, fetchTopic]);

  const handleApprove = async (approved: boolean) => {
    await fetch(`/api/topics/${topicId}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approved }),
    });
    if (approved) {
      fetchTopic();
    } else {
      router.push("/temas");
    }
  };

  if (authStatus === "loading" || loading) {
    return (
      <DashboardLayout>
        <Skeleton variant="rounded" height={200} />
      </DashboardLayout>
    );
  }

  if (!topic) {
    return (
      <DashboardLayout>
        <Typography>Topic not found</Typography>
      </DashboardLayout>
    );
  }

  const voteSummary = {
    A_FAVOR: topic.votes.filter((v) => v.voteType === "A_FAVOR").length,
    EN_CONTRA: topic.votes.filter((v) => v.voteType === "EN_CONTRA").length,
    MAS_DATOS: topic.votes.filter((v) => v.voteType === "MAS_DATOS").length,
  };

  return (
    <DashboardLayout>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 3 }}>
        <IconButton onClick={() => router.push("/temas")}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5" sx={{ flex: 1 }}>
          {topic.title}
        </Typography>
        {isDir && topic.status === "DISCUSSING" && (
          <Button
            variant="outlined"
            size="small"
            startIcon={<GavelIcon />}
            onClick={() => setCloseOpen(true)}
          >
            Resolver tema
          </Button>
        )}
        {canEdit && (
          <IconButton onClick={() => setEditOpen(true)}>
            <EditIcon />
          </IconButton>
        )}
        <Chip
          label={t(
            `topics.${
              topic.status === "PENDING_APPROVAL"
                ? "pendingApproval"
                : topic.status === "DISCUSSING"
                ? "discussing"
                : topic.status === "APROBADO"
                ? "aprobado"
                : "rechazado"
            }`
          )}
          color={
            topic.status === "PENDING_APPROVAL"
              ? "warning"
              : topic.status === "DISCUSSING"
              ? "success"
              : topic.status === "APROBADO"
              ? "info"
              : "error"
          }
        />
      </Box>

      {isDir && topic.status === "PENDING_APPROVAL" && (
        <Card sx={{ mb: 3, bgcolor: "warning.main", color: "warning.contrastText" }}>
          <CardContent
            sx={{ display: "flex", alignItems: "center", gap: 2, py: 1.5, "&:last-child": { pb: 1.5 } }}
          >
            <Typography sx={{ flex: 1, fontWeight: 600 }}>
              Este tema requiere tu aprobación
            </Typography>
            <Button
              variant="contained"
              color="success"
              size="small"
              startIcon={<CheckCircleIcon />}
              onClick={() => handleApprove(true)}
            >
              {t("topics.approve")}
            </Button>
            <Button
              variant="contained"
              color="error"
              size="small"
              startIcon={<CancelIcon />}
              onClick={() => handleApprove(false)}
            >
              {t("topics.reject")}
            </Button>
          </CardContent>
        </Card>
      )}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {t("topics.author")}: {topic.author.name} &bull;{" "}
            {new Date(topic.createdAt).toLocaleDateString()}
          </Typography>
          <Typography sx={{ whiteSpace: "pre-wrap" }}>
            {topic.description}
          </Typography>

          {topic.attachments.length > 0 && (
            <Box sx={{ mt: 2, display: "flex", flexWrap: "wrap", gap: 1 }}>
              {topic.attachments.map((att) => (
                <Chip
                  key={att.id}
                  icon={<AttachFileIcon />}
                  label={att.fileName}
                  component="a"
                  href={att.fileUrl}
                  target="_blank"
                  clickable
                  size="small"
                  variant="outlined"
                />
              ))}
            </Box>
          )}
        </CardContent>
      </Card>

      {(topic.status === "APROBADO" || topic.status === "RECHAZADO") && (
        <Card sx={{ mb: 3, borderLeft: 4, borderColor: topic.status === "APROBADO" ? "success.main" : "error.main" }}>
          <CardContent>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: topic.resolution ? 1 : 0 }}>
              <GavelIcon sx={{ color: topic.status === "APROBADO" ? "success.main" : "error.main" }} />
              <Typography sx={{ fontWeight: 600 }}>
                Tema {topic.status === "APROBADO" ? "aprobado" : "rechazado"}
              </Typography>
              {topic.closedAt && (
                <Typography variant="caption" color="text.secondary">
                  · {new Date(topic.closedAt).toLocaleDateString()}
                </Typography>
              )}
            </Box>
            {topic.resolution && (
              <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", ml: 4.5 }}>
                {topic.resolution}
              </Typography>
            )}
          </CardContent>
        </Card>
      )}

      {topic.status === "DISCUSSING" && (
        <>
          <VotePanel
            topicId={topicId}
            votes={topic.votes}
            myVote={topic.myVote}
            voteSummary={voteSummary}
            canVote={!!canVoteUser}
            onVoted={fetchTopic}
          />
          <Divider sx={{ my: 3 }} />
        </>
      )}

      <CommentSection
        topicId={topicId}
        comments={topic.comments}
        onCommentAdded={fetchTopic}
      />

      {topic.history.length > 0 && (
        <Card sx={{ mt: 3 }}>
          <CardContent sx={{ pb: 1 }}>
            <Box
              sx={{ display: "flex", alignItems: "center", cursor: "pointer" }}
              onClick={() => setShowHistory(!showHistory)}
            >
              <HistoryIcon sx={{ mr: 1, fontSize: 20, color: "text.secondary" }} />
              <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
                Historial de cambios ({topic.history.length})
              </Typography>
              <IconButton size="small">
                {showHistory ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
            </Box>
            <Collapse in={showHistory}>
              <List dense>
                {topic.history.map((entry) => (
                  <ListItem key={entry.id} disableGutters>
                    <ListItemText
                      primary={
                        <Typography variant="body2">
                          <strong>{entry.user.name}</strong> editó{" "}
                          <strong>{fieldLabels[entry.field] ?? entry.field}</strong>
                        </Typography>
                      }
                      secondary={
                        <Box component="span">
                          {entry.field === "status" ? (
                            <Typography variant="caption" component="span">
                              {statusLabels[entry.oldValue ?? ""] ?? entry.oldValue} →{" "}
                              {statusLabels[entry.newValue ?? ""] ?? entry.newValue}
                            </Typography>
                          ) : entry.field === "title" ? (
                            <Typography variant="caption" component="span">
                              &ldquo;{entry.oldValue}&rdquo; → &ldquo;{entry.newValue}&rdquo;
                            </Typography>
                          ) : (
                            <Typography variant="caption" component="span">
                              Contenido actualizado
                            </Typography>
                          )}
                          {" · "}
                          <Typography variant="caption" component="span" color="text.secondary">
                            {new Date(entry.createdAt).toLocaleString()}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </Collapse>
          </CardContent>
        </Card>
      )}

      <EditTopicDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSaved={() => {
          setEditOpen(false);
          fetchTopic();
        }}
        topic={topic}
        isAdmin={!!isDir}
      />

      <CloseTopicDialog
        open={closeOpen}
        onClose={() => setCloseOpen(false)}
        onClosed={() => {
          setCloseOpen(false);
          fetchTopic();
        }}
        topicId={topicId}
      />
    </DashboardLayout>
  );
}
