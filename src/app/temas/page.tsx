"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import DashboardLayout from "@/components/DashboardLayout";
import NewTopicDialog from "./components/NewTopicDialog";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import Chip from "@mui/material/Chip";
import Fab from "@mui/material/Fab";
import Badge from "@mui/material/Badge";
import Skeleton from "@mui/material/Skeleton";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import AddIcon from "@mui/icons-material/Add";
import HowToVoteIcon from "@mui/icons-material/HowToVote";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PendingIcon from "@mui/icons-material/Pending";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";

interface TopicItem {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: number;
  author: { id: string; name: string; roles: string[] };
  createdAt: string;
  totalVotes: number;
  totalComments: number;
  unreadComments: number;
  myVote: string | null;
  voteSummary: { A_FAVOR: number; EN_CONTRA: number; MAS_DATOS: number };
}

const statusColor: Record<string, "warning" | "success" | "default" | "error"> = {
  PENDING_APPROVAL: "warning",
  DISCUSSING: "success",
  APROBADO: "default",
  RECHAZADO: "error",
};

export default function TemasPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const { t } = useI18n();
  const [topics, setTopics] = useState<TopicItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [tab, setTab] = useState(0);

  const roles = (session?.user as any)?.roles as string[] | undefined;
  const isAdminUser = (session?.user as any)?.isAdmin as boolean | undefined;
  const isDir = roles?.includes("DIRECTOR") || isAdminUser;
  const canCreate = roles?.some((r: string) =>
    ["DIRECTOR", "JEFE_DOCENTE", "CONSEJERO"].includes(r)
  );

  const fetchTopics = useCallback(() => {
    fetch("/api/topics")
      .then((r) => r.json())
      .then((data) => {
        setTopics(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (authStatus === "unauthenticated") router.replace("/auth/signin");
  }, [authStatus, router]);

  useEffect(() => {
    if (authStatus === "authenticated") fetchTopics();
  }, [authStatus, fetchTopics]);

  const discussingCount = topics.filter((t) => t.status === "DISCUSSING").length;
  const pendingCount = topics.filter((t) => t.status === "PENDING_APPROVAL").length;
  const resolvedCount = topics.filter((t) => t.status === "APROBADO" || t.status === "RECHAZADO").length;

  const filtered = topics.filter((topic) => {
    if (tab === 0) return topic.status === "DISCUSSING";
    if (tab === 1) return topic.status === "PENDING_APPROVAL";
    if (tab === 2) return topic.status === "APROBADO" || topic.status === "RECHAZADO";
    return true;
  });

  const canReorder = isDir && tab === 0;

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    const from = result.source.index;
    const to = result.destination.index;
    if (from === to) return;

    const reordered = [...filtered];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);

    // Optimistic update
    const newTopics = topics.map((t) => {
      const idx = reordered.findIndex((r) => r.id === t.id);
      if (idx !== -1) return { ...t, priority: reordered.length - idx };
      return t;
    });
    newTopics.sort((a, b) => b.priority - a.priority || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    setTopics(newTopics);

    await fetch("/api/topics/reorder", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedIds: reordered.map((t) => t.id) }),
    });
  };

  const renderTopicCard = (topic: TopicItem) => (
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
        <Typography variant="h6" noWrap sx={{ flex: 1 }}>
          {topic.title}
        </Typography>
        <Chip
          label={t(`topics.${topic.status === "PENDING_APPROVAL" ? "pendingApproval" : topic.status === "DISCUSSING" ? "discussing" : topic.status === "APROBADO" ? "aprobado" : "rechazado"}`)}
          color={statusColor[topic.status] ?? "default"}
          size="small"
        />
      </Box>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{
          overflow: "hidden",
          textOverflow: "ellipsis",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          mb: 1.5,
        }}
      >
        {topic.description}
      </Typography>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        <Typography variant="caption" color="text.secondary">
          {topic.author.name}
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <HowToVoteIcon sx={{ fontSize: 16, color: "text.secondary" }} />
          <Typography variant="caption" color="text.secondary">
            {topic.totalVotes}
          </Typography>
        </Box>
        <Badge badgeContent={topic.unreadComments} color="error" max={99}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <ChatBubbleOutlineIcon sx={{ fontSize: 16, color: "text.secondary" }} />
            <Typography variant="caption" color="text.secondary">
              {topic.totalComments}
            </Typography>
          </Box>
        </Badge>
        {topic.myVote ? (
          <Chip
            icon={<CheckCircleIcon />}
            label={t("topics.voted")}
            size="small"
            color="success"
            variant="outlined"
            sx={{ height: 24 }}
          />
        ) : (
          topic.status === "DISCUSSING" && (
            <Chip
              icon={<PendingIcon />}
              label={t("topics.pendingVote")}
              size="small"
              color="warning"
              variant="outlined"
              sx={{ height: 24 }}
            />
          )
        )}
      </Box>
    </Box>
  );

  if (authStatus === "loading") return null;

  return (
    <DashboardLayout>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 3,
        }}
      >
        <Typography variant="h4">{t("topics.title")}</Typography>
      </Box>

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{ mb: 3, borderBottom: 1, borderColor: "divider" }}
      >
        <Tab label={`En discusión (${discussingCount})`} />
        {(isDir || pendingCount > 0) && <Tab label={`Pendientes (${pendingCount})`} />}
        <Tab label={`Resueltos (${resolvedCount})`} />
      </Tabs>

      {loading ? (
        Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} variant="rounded" height={100} sx={{ mb: 2 }} />
        ))
      ) : filtered.length === 0 ? (
        <Box sx={{ textAlign: "center", py: 8 }}>
          <Typography color="text.secondary">{t("topics.noTopics")}</Typography>
        </Box>
      ) : canReorder ? (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="topics">
            {(provided) => (
              <Box ref={provided.innerRef} {...provided.droppableProps}>
                {filtered.map((topic, index) => (
                  <Draggable key={topic.id} draggableId={topic.id} index={index}>
                    {(provided, snapshot) => (
                      <Card
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        sx={{
                          mb: 2,
                          opacity: snapshot.isDragging ? 0.85 : 1,
                          boxShadow: snapshot.isDragging ? 8 : undefined,
                        }}
                      >
                        <Box sx={{ display: "flex", alignItems: "stretch" }}>
                          <Box
                            {...provided.dragHandleProps}
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              px: 1,
                              color: "text.secondary",
                              cursor: "grab",
                              "&:hover": { color: "primary.main" },
                            }}
                          >
                            <DragIndicatorIcon />
                          </Box>
                          <CardActionArea
                            onClick={() => router.push(`/temas/${topic.id}`)}
                            sx={{ p: 2.5 }}
                          >
                            {renderTopicCard(topic)}
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
        filtered.map((topic) => (
          <Card key={topic.id} sx={{ mb: 2 }}>
            <CardActionArea
              onClick={() => router.push(`/temas/${topic.id}`)}
              sx={{ p: 2.5 }}
            >
              {renderTopicCard(topic)}
            </CardActionArea>
          </Card>
        ))
      )}

      {canCreate && (
        <Fab
          color="primary"
          onClick={() => setDialogOpen(true)}
          sx={{ position: "fixed", bottom: 24, right: 24 }}
        >
          <AddIcon />
        </Fab>
      )}

      <NewTopicDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreated={() => {
          setDialogOpen(false);
          fetchTopics();
        }}
      />
    </DashboardLayout>
  );
}
