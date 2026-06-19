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
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import CircularProgress from "@mui/material/CircularProgress";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import DescriptionIcon from "@mui/icons-material/Description";
import DownloadIcon from "@mui/icons-material/Download";
import AutorenewIcon from "@mui/icons-material/Autorenew";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import GroupIcon from "@mui/icons-material/Group";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import AttendanceDialog from "./components/AttendanceDialog";
import ActaAttachmentsDialog from "./components/ActaAttachmentsDialog";
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
  location?: string;
  llmAvailable?: boolean;
  topics: TopicInSession[];
}

interface ActaStatus {
  status: "NONE" | "PENDING" | "READY" | "ERROR";
  mode?: "RAW" | "LLM";
  generatedAt?: string | null;
  error?: string | null;
}

export default function SessionDetailPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const params = useParams();
  const sessionId = params.id as string;
  const [councilSession, setCouncilSession] = useState<SessionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [attendanceOpen, setAttendanceOpen] = useState(false);
  const [attachmentsOpen, setAttachmentsOpen] = useState(false);
  const [actaMenuAnchor, setActaMenuAnchor] = useState<null | HTMLElement>(null);
  const [acta, setActa] = useState<ActaStatus | null>(null);

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

  const fetchActaStatus = useCallback(() => {
    fetch(`/api/sessions/${sessionId}/acta/status`)
      .then((r) => r.json())
      .then((data: ActaStatus) => setActa(data))
      .catch(() => {});
  }, [sessionId]);

  useEffect(() => {
    if (authStatus === "authenticated") fetchActaStatus();
  }, [authStatus, fetchActaStatus]);

  // Mientras el acta se genera en el servidor, refresca el estado cada 3s. El
  // usuario puede navegar y volver: el estado vive en el servidor.
  useEffect(() => {
    if (acta?.status !== "PENDING") return;
    const t = setInterval(fetchActaStatus, 3000);
    return () => clearInterval(t);
  }, [acta?.status, fetchActaStatus]);

  // Lanza la generación en segundo plano (no bloquea la UI).
  const startActaGeneration = async (useLlm: boolean) => {
    setActaMenuAnchor(null);
    setActa({ status: "PENDING", mode: useLlm ? "LLM" : "RAW" });
    await fetch(`/api/sessions/${sessionId}/acta/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ llm: useLlm }),
    }).catch(() => {});
    fetchActaStatus();
  };

  const handleDownloadActa = () => {
    window.open(`/api/sessions/${sessionId}/acta`, "_blank");
  };

  // Genera directo (sin IA) o abre el menú con las dos variantes si hay IA.
  const handleActaButton = (e: React.MouseEvent<HTMLElement>) => {
    if (councilSession?.llmAvailable) setActaMenuAnchor(e.currentTarget);
    else startActaGeneration(false);
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
            startIcon={<GroupIcon />}
            onClick={() => setAttendanceOpen(true)}
          >
            Asistencia
          </Button>
          <Button
            variant="outlined"
            startIcon={<AttachFileIcon />}
            onClick={() => setAttachmentsOpen(true)}
          >
            Anexos del acta
          </Button>
          {acta?.status === "READY" ? (
            <>
              <Button
                variant="contained"
                startIcon={<DownloadIcon />}
                onClick={handleDownloadActa}
              >
                Descargar acta
              </Button>
              <Button
                variant="outlined"
                startIcon={<AutorenewIcon />}
                onClick={handleActaButton}
              >
                Regenerar
              </Button>
            </>
          ) : acta?.status === "PENDING" ? (
            <Button variant="outlined" disabled startIcon={<CircularProgress size={18} />}>
              Generando acta…
            </Button>
          ) : (
            <Button
              variant="outlined"
              startIcon={<PictureAsPdfIcon />}
              onClick={handleActaButton}
            >
              Generar acta
            </Button>
          )}
          <Menu
            anchorEl={actaMenuAnchor}
            open={Boolean(actaMenuAnchor)}
            onClose={() => setActaMenuAnchor(null)}
          >
            <MenuItem onClick={() => startActaGeneration(false)}>
              <ListItemIcon>
                <DescriptionIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary="Texto del consejo"
                secondary="Resoluciones tal cual se registraron"
              />
            </MenuItem>
            <MenuItem onClick={() => startActaGeneration(true)}>
              <ListItemIcon>
                <AutoAwesomeIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary="Con redacción IA"
                secondary="Pule la prosa con el modelo local (puede tardar)"
              />
            </MenuItem>
          </Menu>

          <Box sx={{ flexBasis: "100%", height: 0 }} />
          {acta?.status === "READY" && (
            <Typography variant="caption" color="text.secondary">
              Acta {acta.mode === "LLM" ? "con redacción IA" : "del consejo"} ·{" "}
              {acta.generatedAt
                ? `generada el ${new Date(acta.generatedAt).toLocaleString("es-CL")}`
                : ""}
            </Typography>
          )}
          {acta?.status === "PENDING" && (
            <Typography variant="caption" color="text.secondary">
              Generando en segundo plano. Puedes seguir trabajando; el acta queda lista aquí cuando termine.
            </Typography>
          )}
          {acta?.status === "ERROR" && (
            <Typography variant="caption" color="error">
              No se pudo generar el acta{acta.error ? `: ${acta.error}` : ""}. Intenta regenerar.
            </Typography>
          )}
        </Box>
      )}

      {isDir && (
        <>
          <AttendanceDialog
            open={attendanceOpen}
            onClose={() => setAttendanceOpen(false)}
            sessionId={sessionId}
          />
          <ActaAttachmentsDialog
            open={attachmentsOpen}
            onClose={() => setAttachmentsOpen(false)}
            sessionId={sessionId}
          />
        </>
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
                          borderLeftWidth: 4,
                          borderLeftStyle: "solid",
                          borderLeftColor: st.discussed ? "success.main" : "divider",
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
              borderLeftWidth: 4,
              borderLeftStyle: "solid",
              borderLeftColor: st.discussed ? "success.main" : "divider",
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
        <Chip
          label={
            topic.status === "APROBADO"
              ? "Aprobado"
              : topic.status === "RECHAZADO"
              ? "Rechazado"
              : topic.status === "CERRADO"
              ? "Cerrado"
              : "En discusión"
          }
          size="small"
          color={
            topic.status === "APROBADO"
              ? "success"
              : topic.status === "RECHAZADO"
              ? "error"
              : topic.status === "CERRADO"
              ? "default"
              : "info"
          }
        />
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
