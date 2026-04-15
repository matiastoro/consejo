"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import NewSessionDialog from "./components/NewSessionDialog";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import Chip from "@mui/material/Chip";
import Fab from "@mui/material/Fab";
import Skeleton from "@mui/material/Skeleton";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import AddIcon from "@mui/icons-material/Add";
import EventIcon from "@mui/icons-material/Event";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";

interface SessionItem {
  id: string;
  title: string;
  date: string;
  status: string;
  createdBy: { id: string; name: string };
  totalTopics: number;
  discussedCount: number;
}

const statusColor: Record<string, "info" | "warning" | "success"> = {
  SCHEDULED: "info",
  IN_PROGRESS: "warning",
  COMPLETED: "success",
};

const statusLabel: Record<string, string> = {
  SCHEDULED: "Programada",
  IN_PROGRESS: "En curso",
  COMPLETED: "Completada",
};

const statusIcon: Record<string, React.ReactElement> = {
  SCHEDULED: <EventIcon sx={{ fontSize: 16 }} />,
  IN_PROGRESS: <PlayArrowIcon sx={{ fontSize: 16 }} />,
  COMPLETED: <CheckCircleIcon sx={{ fontSize: 16 }} />,
};

export default function SesionesPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [tab, setTab] = useState(0);

  const roles = (session?.user as any)?.roles as string[] | undefined;
  const isAdminUser = (session?.user as any)?.isAdmin as boolean | undefined;
  const isDir = roles?.includes("DIRECTOR") || isAdminUser;

  const fetchSessions = useCallback(() => {
    fetch("/api/sessions")
      .then((r) => r.json())
      .then((data) => {
        setSessions(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (authStatus === "unauthenticated") router.replace("/auth/signin");
  }, [authStatus, router]);

  useEffect(() => {
    if (authStatus === "authenticated") fetchSessions();
  }, [authStatus, fetchSessions]);

  const filtered = sessions.filter((s) => {
    if (tab === 0) return s.status === "SCHEDULED" || s.status === "IN_PROGRESS";
    return s.status === "COMPLETED";
  });

  const activeCount = sessions.filter(
    (s) => s.status === "SCHEDULED" || s.status === "IN_PROGRESS"
  ).length;
  const completedCount = sessions.filter((s) => s.status === "COMPLETED").length;

  if (authStatus === "loading") return null;

  return (
    <DashboardLayout>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3 }}>
        <Typography variant="h4">Sesiones del Consejo</Typography>
      </Box>

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{ mb: 3, borderBottom: 1, borderColor: "divider" }}
      >
        <Tab label={`Activas (${activeCount})`} />
        <Tab label={`Completadas (${completedCount})`} />
      </Tabs>

      {loading ? (
        Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} variant="rounded" height={100} sx={{ mb: 2 }} />
        ))
      ) : filtered.length === 0 ? (
        <Box sx={{ textAlign: "center", py: 8 }}>
          <Typography color="text.secondary">No hay sesiones</Typography>
        </Box>
      ) : (
        filtered.map((s) => (
          <Card key={s.id} sx={{ mb: 2 }}>
            <CardActionArea
              onClick={() => router.push(`/sesiones/${s.id}`)}
              sx={{ p: 2.5 }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                <Typography variant="h6" noWrap sx={{ flex: 1 }}>
                  {s.title}
                </Typography>
                <Chip
                  icon={statusIcon[s.status]}
                  label={statusLabel[s.status]}
                  color={statusColor[s.status]}
                  size="small"
                />
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2, mt: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  {new Date(s.date).toLocaleDateString("es-CL", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Typography>
                <Chip
                  label={`${s.discussedCount}/${s.totalTopics} temas discutidos`}
                  size="small"
                  variant="outlined"
                />
                <Typography variant="caption" color="text.secondary">
                  Creada por {s.createdBy.name}
                </Typography>
              </Box>
            </CardActionArea>
          </Card>
        ))
      )}

      {isDir && (
        <Fab
          color="primary"
          onClick={() => setDialogOpen(true)}
          sx={{ position: "fixed", bottom: 24, right: 24 }}
        >
          <AddIcon />
        </Fab>
      )}

      <NewSessionDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreated={() => {
          setDialogOpen(false);
          fetchSessions();
        }}
      />
    </DashboardLayout>
  );
}
