"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import DashboardLayout from "@/components/DashboardLayout";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardActionArea from "@mui/material/CardActionArea";
import Chip from "@mui/material/Chip";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Checkbox from "@mui/material/Checkbox";
import Skeleton from "@mui/material/Skeleton";
import Tooltip from "@mui/material/Tooltip";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PersonIcon from "@mui/icons-material/Person";
import BallotIcon from "@mui/icons-material/Ballot";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";

interface TopicInSession {
  topic: {
    id: string;
    title: string;
    status: string;
    inPersonOnly: boolean;
    requiresProvisionalVote: boolean;
    author: { id: string; name: string; roles: string[] };
    votes: { id: string; voteType: string }[];
    comments: { id: string }[];
    notes: { id: string; content: string; user: { name: string } }[];
    provisionalVotes: { id: string; voteType: string }[];
  };
  discussed: boolean;
  discussedAt: string | null;
  customOrder: number | null;
}

interface SessionDetail {
  id: string;
  title: string;
  date: string;
  status: string;
  createdBy: { id: string; name: string };
  topics: TopicInSession[];
}

export default function SessionDetailPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const params = useParams();
  const sessionId = params.id as string;
  const [councilSession, setCouncilSession] = useState<SessionDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const roles = (session?.user as any)?.roles as string[] | undefined;
  const isAdminUser = (session?.user as any)?.isAdmin as boolean | undefined;
  const isDir = roles?.includes("DIRECTOR") || isAdminUser;

  const fetchSession = useCallback(() => {
    fetch(`/api/sessions/${sessionId}`)
      .then((r) => r.json())
      .then((data) => {
        setCouncilSession(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [sessionId]);

  useEffect(() => {
    if (authStatus === "unauthenticated") router.replace("/auth/signin");
  }, [authStatus, router]);

  useEffect(() => {
    if (authStatus === "authenticated") fetchSession();
  }, [authStatus, fetchSession]);

  const handleToggleDiscussed = async (topicId: string, discussed: boolean) => {
    await fetch(`/api/sessions/${sessionId}/topics/${topicId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ discussed }),
    });
    fetchSession();
  };

  const handleStatusChange = async (status: string) => {
    await fetch(`/api/sessions/${sessionId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    fetchSession();
  };

  const handleOpenActa = () => {
    window.open(`/api/sessions/${sessionId}/acta`, "_blank");
  };

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination || !councilSession) return;
    const from = result.source.index;
    const to = result.destination.index;
    if (from === to) return;

    const reordered = [...councilSession.topics];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);

    // Optimistic update
    setCouncilSession({ ...councilSession, topics: reordered });

    // Persist custom order
    await fetch(`/api/sessions/${sessionId}/topics`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderedTopicIds: reordered.map((t) => t.topic.id),
      }),
    });
  };

  if (authStatus === "loading" || loading) {
    return (
      <DashboardLayout>
        <Skeleton variant="rounded" height={200} />
      </DashboardLayout>
    );
  }

  if (!councilSession) {
    return (
      <DashboardLayout>
        <Typography>Sesión no encontrada</Typography>
      </DashboardLayout>
    );
  }

  const discussedCount = councilSession.topics.filter((t) => t.discussed).length;

  return (
    <DashboardLayout>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 3 }}>
        <IconButton onClick={() => router.push("/sesiones")}>
          <ArrowBackIcon />
        </IconButton>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h5">{councilSession.title}</Typography>
          <Typography variant="body2" color="text.secondary">
            {new Date(councilSession.date).toLocaleDateString("es-CL", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Typography>
        </Box>
        <Chip
          label={
            councilSession.status === "SCHEDULED"
              ? "Programada"
              : councilSession.status === "IN_PROGRESS"
              ? "En curso"
              : "Completada"
          }
          color={
            councilSession.status === "SCHEDULED"
              ? "info"
              : councilSession.status === "IN_PROGRESS"
              ? "warning"
              : "success"
          }
        />
      </Box>

      {isDir && (
        <Box sx={{ display: "flex", gap: 1, mb: 3, flexWrap: "wrap" }}>
          {councilSession.status === "SCHEDULED" && (
            <Button
              variant="contained"
              startIcon={<PlayArrowIcon />}
              onClick={() => handleStatusChange("IN_PROGRESS")}
            >
              Iniciar sesión
            </Button>
          )}
          {councilSession.status === "IN_PROGRESS" && (
            <Button
              variant="contained"
              color="success"
              startIcon={<CheckCircleIcon />}
              onClick={() => handleStatusChange("COMPLETED")}
            >
              Completar sesión
            </Button>
          )}
          <Button
            variant="outlined"
            startIcon={<PictureAsPdfIcon />}
            onClick={handleOpenActa}
          >
            Generar acta
          </Button>
        </Box>
      )}

      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ pb: "16px !important" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Typography variant="h6">
              Temas ({councilSession.topics.length})
            </Typography>
            <Chip
              label={`${discussedCount}/${councilSession.topics.length} discutidos`}
              size="small"
              color={
                discussedCount === councilSession.topics.length && councilSession.topics.length > 0
                  ? "success"
                  : "default"
              }
            />
          </Box>
          {isDir && (
            <Typography variant="caption" color="text.secondary">
              Arrastra para reordenar los temas en esta sesión
            </Typography>
          )}
        </CardContent>
      </Card>

      {councilSession.topics.length === 0 ? (
        <Box sx={{ textAlign: "center", py: 6 }}>
          <Typography color="text.secondary">
            No hay temas en discusión
          </Typography>
        </Box>
      ) : isDir ? (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="session-topics">
            {(provided) => (
              <Box ref={provided.innerRef} {...provided.droppableProps}>
                {councilSession.topics.map((st, index) => (
                  <Draggable
                    key={st.topic.id}
                    draggableId={st.topic.id}
                    index={index}
                  >
                    {(provided, snapshot) => (
                      <Card
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        sx={{
                          mb: 2,
                          borderLeft: 4,
                          borderColor: st.discussed ? "success.main" : "grey.300",
                          opacity: snapshot.isDragging ? 0.85 : st.discussed ? 0.75 : 1,
                          boxShadow: snapshot.isDragging ? 8 : undefined,
                        }}
                      >
                        <Box sx={{ display: "flex", alignItems: "stretch" }}>
                          <Box
                            {...provided.dragHandleProps}
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              px: 0.5,
                              color: "text.secondary",
                              cursor: "grab",
                              "&:hover": { color: "primary.main" },
                            }}
                          >
                            <DragIndicatorIcon />
                          </Box>
                          <Box sx={{ display: "flex", alignItems: "center", px: 0.5 }}>
                            <Tooltip
                              title={st.discussed ? "Marcar como no discutido" : "Marcar como discutido"}
                            >
                              <Checkbox
                                checked={st.discussed}
                                onChange={(e) =>
                                  handleToggleDiscussed(st.topic.id, e.target.checked)
                                }
                                color="success"
                              />
                            </Tooltip>
                          </Box>
                          <CardActionArea
                            onClick={() => router.push(`/temas/${st.topic.id}?sessionId=${sessionId}`)}
                            sx={{ p: 2 }}
                          >
                            {renderTopicContent(st)}
                          </CardActionArea>
                        </Box>
                      </Card>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </Box>
            )}
          </Droppable>
        </DragDropContext>
      ) : (
        councilSession.topics.map((st) => (
          <Card
            key={st.topic.id}
            sx={{
              mb: 2,
              borderLeft: 4,
              borderColor: st.discussed ? "success.main" : "grey.300",
              opacity: st.discussed ? 0.75 : 1,
            }}
          >
            <CardActionArea
              onClick={() => router.push(`/temas/${st.topic.id}?sessionId=${sessionId}`)}
              sx={{ p: 2 }}
            >
              {renderTopicContent(st)}
            </CardActionArea>
          </Card>
        ))
      )}
    </DashboardLayout>
  );
}

function renderTopicContent(st: TopicInSession) {
  const topic = st.topic;
  const aFavor = topic.votes.filter((v) => v.voteType === "A_FAVOR").length;
  const enContra = topic.votes.filter((v) => v.voteType === "EN_CONTRA").length;
  const masDatos = topic.votes.filter((v) => v.voteType === "MAS_DATOS").length;

  return (
    <>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
        <Typography
          variant="subtitle1"
          sx={{
            flex: 1,
            fontWeight: 600,
            textDecoration: st.discussed ? "line-through" : "none",
          }}
        >
          {topic.title}
        </Typography>
        {topic.inPersonOnly && (
          <Tooltip title="Solo discusión presencial">
            <Chip
              icon={<PersonIcon />}
              label="Presencial"
              size="small"
              color="secondary"
              variant="outlined"
            />
          </Tooltip>
        )}
        {topic.requiresProvisionalVote && (
          <Tooltip title="Requiere voto provisorio">
            <Chip
              icon={<BallotIcon />}
              label="Provisorio"
              size="small"
              color="warning"
              variant="outlined"
            />
          </Tooltip>
        )}
      </Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        <Typography variant="caption" color="text.secondary">
          {topic.author.name}
        </Typography>
        {!topic.inPersonOnly && (
          <Typography variant="caption" color="text.secondary">
            Votos: {aFavor}✓ {enContra}✗ {masDatos}?
          </Typography>
        )}
        <Typography variant="caption" color="text.secondary">
          {topic.comments.length} comentarios
        </Typography>
        {topic.notes.length > 0 && (
          <Typography variant="caption" color="primary">
            {topic.notes.length} avances
          </Typography>
        )}
        {st.discussed && st.discussedAt && (
          <Typography variant="caption" color="success.main">
            Discutido {new Date(st.discussedAt).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}
          </Typography>
        )}
      </Box>
    </>
  );
}
