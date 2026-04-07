"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import DashboardLayout from "@/components/DashboardLayout";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardActionArea from "@mui/material/CardActionArea";
import Grid from "@mui/material/Grid";
import Skeleton from "@mui/material/Skeleton";
import HowToVoteIcon from "@mui/icons-material/HowToVote";
import ForumIcon from "@mui/icons-material/Forum";
import PendingActionsIcon from "@mui/icons-material/PendingActions";
import AssignmentIcon from "@mui/icons-material/Assignment";

interface TopicSummary {
  id: string;
  title: string;
  status: string;
  myVote: string | null;
  totalVotes: number;
  totalComments: number;
  unreadComments: number;
}

export default function DashboardPage() {
  const { status } = useSession();
  const router = useRouter();
  const { t } = useI18n();
  const [topics, setTopics] = useState<TopicSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/auth/signin");
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/topics")
        .then((r) => r.json())
        .then((data) => {
          setTopics(data);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [status]);

  const pendingApproval = topics.filter((t) => t.status === "PENDING_APPROVAL");
  const activeDiscussions = topics.filter(
    (t) => t.status === "DISCUSSING"
  );
  const myPendingVotes = activeDiscussions.filter((t) => !t.myVote);

  const stats = [
    {
      label: t("dashboard.pendingTopics"),
      value: pendingApproval.length,
      icon: <PendingActionsIcon sx={{ fontSize: 36 }} />,
      color: "#f39c12",
    },
    {
      label: t("dashboard.activeDiscussions"),
      value: activeDiscussions.length,
      icon: <ForumIcon sx={{ fontSize: 36 }} />,
      color: "#3498db",
    },
    {
      label: t("dashboard.myPendingVotes"),
      value: myPendingVotes.length,
      icon: <HowToVoteIcon sx={{ fontSize: 36 }} />,
      color: "#e74c3c",
    },
    {
      label: t("nav.topics"),
      value: topics.length,
      icon: <AssignmentIcon sx={{ fontSize: 36 }} />,
      color: "#2ecc71",
    },
  ];

  if (status === "loading") return null;

  return (
    <DashboardLayout>
      <Typography variant="h4" sx={{ mb: 4 }}>
        {t("dashboard.welcome")}
      </Typography>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        {stats.map((stat) => (
          <Grid key={stat.label} size={{ xs: 6, md: 3 }}>
            {loading ? (
              <Skeleton variant="rounded" height={120} />
            ) : (
              <Card>
                <CardActionArea
                  onClick={() => router.push("/temas")}
                  sx={{ p: 2.5 }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 2,
                    }}
                  >
                    <Box sx={{ color: stat.color }}>{stat.icon}</Box>
                    <Box>
                      <Typography variant="h4">{stat.value}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {stat.label}
                      </Typography>
                    </Box>
                  </Box>
                </CardActionArea>
              </Card>
            )}
          </Grid>
        ))}
      </Grid>

      {myPendingVotes.length > 0 && (
        <Box>
          <Typography variant="h6" sx={{ mb: 2 }}>
            {t("dashboard.myPendingVotes")}
          </Typography>
          <Grid container spacing={2}>
            {myPendingVotes.slice(0, 6).map((topic) => (
              <Grid key={topic.id} size={{ xs: 12, sm: 6, md: 4 }}>
                <Card>
                  <CardActionArea
                    onClick={() => router.push(`/temas/${topic.id}`)}
                    sx={{ p: 2 }}
                  >
                    <Typography variant="subtitle1" noWrap sx={{ fontWeight: 600 }}>
                      {topic.title}
                    </Typography>
                    <Box
                      sx={{
                        display: "flex",
                        gap: 2,
                        mt: 1,
                        color: "text.secondary",
                      }}
                    >
                      <Typography variant="caption">
                        {topic.totalVotes} {t("topics.totalVotes")}
                      </Typography>
                      <Typography variant="caption">
                        {topic.totalComments} comentarios
                      </Typography>
                    </Box>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
    </DashboardLayout>
  );
}
