"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Button from "@mui/material/Button";
import ButtonGroup from "@mui/material/ButtonGroup";
import Chip from "@mui/material/Chip";
import LinearProgress from "@mui/material/LinearProgress";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemAvatar from "@mui/material/ListItemAvatar";
import ListItemText from "@mui/material/ListItemText";
import Avatar from "@mui/material/Avatar";
import Collapse from "@mui/material/Collapse";
import IconButton from "@mui/material/IconButton";
import ThumbUpIcon from "@mui/icons-material/ThumbUp";
import ThumbDownIcon from "@mui/icons-material/ThumbDown";
import HelpIcon from "@mui/icons-material/Help";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";

interface Props {
  topicId: string;
  votes: {
    id: string;
    voteType: string;
    user: { id: string; name: string; roles: string[]; image?: string | null };
  }[];
  myVote: string | null;
  voteSummary: { A_FAVOR: number; EN_CONTRA: number; MAS_DATOS: number };
  canVote: boolean;
  onVoted: () => void;
}

export default function VotePanel({
  topicId,
  votes,
  myVote,
  voteSummary,
  canVote,
  onVoted,
}: Props) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [showVoters, setShowVoters] = useState(false);

  const total = voteSummary.A_FAVOR + voteSummary.EN_CONTRA + voteSummary.MAS_DATOS;

  const handleVote = async (voteType: string) => {
    setLoading(true);
    await fetch(`/api/topics/${topicId}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ voteType }),
    });
    setLoading(false);
    onVoted();
  };

  const voteColor = (type: string) => {
    switch (type) {
      case "A_FAVOR": return "#27ae60";
      case "EN_CONTRA": return "#e74c3c";
      case "MAS_DATOS": return "#f39c12";
      default: return "grey";
    }
  };

  const voteIcon = (type: string) => {
    switch (type) {
      case "A_FAVOR": return <ThumbUpIcon fontSize="small" />;
      case "EN_CONTRA": return <ThumbDownIcon fontSize="small" />;
      case "MAS_DATOS": return <HelpIcon fontSize="small" />;
      default: return null;
    }
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2 }}>
          {t("votes.results")}
        </Typography>

        {[
          { type: "A_FAVOR", label: t("votes.inFavor"), count: voteSummary.A_FAVOR },
          { type: "EN_CONTRA", label: t("votes.against"), count: voteSummary.EN_CONTRA },
          { type: "MAS_DATOS", label: t("votes.moreData"), count: voteSummary.MAS_DATOS },
        ].map((item) => (
          <Box key={item.type} sx={{ mb: 1.5 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <Box sx={{ color: voteColor(item.type) }}>{voteIcon(item.type)}</Box>
                <Typography variant="body2">{item.label}</Typography>
              </Box>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {item.count}
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={total > 0 ? (item.count / total) * 100 : 0}
              sx={{
                height: 8,
                borderRadius: 4,
                bgcolor: "action.hover",
                "& .MuiLinearProgress-bar": {
                  bgcolor: voteColor(item.type),
                  borderRadius: 4,
                },
              }}
            />
          </Box>
        ))}

        {canVote && (
          <Box sx={{ mt: 3, mb: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {myVote ? t("votes.changeVote") : t("votes.yourVote")}
            </Typography>
            <ButtonGroup fullWidth disabled={loading}>
              <Button
                variant={myVote === "A_FAVOR" ? "contained" : "outlined"}
                color="success"
                startIcon={<ThumbUpIcon />}
                onClick={() => handleVote("A_FAVOR")}
              >
                {t("votes.inFavor")}
              </Button>
              <Button
                variant={myVote === "EN_CONTRA" ? "contained" : "outlined"}
                color="error"
                startIcon={<ThumbDownIcon />}
                onClick={() => handleVote("EN_CONTRA")}
              >
                {t("votes.against")}
              </Button>
              <Button
                variant={myVote === "MAS_DATOS" ? "contained" : "outlined"}
                color="warning"
                startIcon={<HelpIcon />}
                onClick={() => handleVote("MAS_DATOS")}
              >
                {t("votes.moreData")}
              </Button>
            </ButtonGroup>
          </Box>
        )}

        <Box sx={{ mt: 2 }}>
          <Box
            sx={{ display: "flex", alignItems: "center", cursor: "pointer" }}
            onClick={() => setShowVoters(!showVoters)}
          >
            <Typography variant="body2" color="text.secondary">
              Ver votantes ({votes.length})
            </Typography>
            <IconButton size="small">
              {showVoters ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          </Box>
          <Collapse in={showVoters}>
            <List dense>
              {votes.map((vote) => (
                <ListItem key={vote.id} disableGutters>
                  <ListItemAvatar>
                    <Avatar
                      src={vote.user.image ?? undefined}
                      sx={{
                        width: 28,
                        height: 28,
                        fontSize: 13,
                        bgcolor: voteColor(vote.voteType),
                      }}
                    >
                      {vote.user.name[0]}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={vote.user.name}
                    secondary={t(
                      `votes.${
                        vote.voteType === "A_FAVOR"
                          ? "inFavor"
                          : vote.voteType === "EN_CONTRA"
                          ? "against"
                          : "moreData"
                      }`
                    )}
                    slotProps={{
                      secondary: {
                        sx: {
                          color: voteColor(vote.voteType),
                          fontWeight: 600,
                          fontSize: 12,
                        },
                      },
                    }}
                  />
                </ListItem>
              ))}
            </List>
          </Collapse>
        </Box>
      </CardContent>
    </Card>
  );
}
