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
import ThumbUpIcon from "@mui/icons-material/ThumbUp";
import ThumbDownIcon from "@mui/icons-material/ThumbDown";
import HelpIcon from "@mui/icons-material/Help";
import BallotIcon from "@mui/icons-material/Ballot";

interface ProvisionalVoteItem {
  id: string;
  voteType: string;
  user: { id: string; name: string; roles: string[] };
}

interface Props {
  topicId: string;
  provisionalVotes: ProvisionalVoteItem[];
  myProvisionalVote: string | null;
  canVote: boolean;
  onVoted: () => void;
}

export default function ProvisionalVotePanel({
  topicId,
  provisionalVotes,
  myProvisionalVote,
  canVote,
  onVoted,
}: Props) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);

  const summary = {
    A_FAVOR: provisionalVotes.filter((v) => v.voteType === "A_FAVOR").length,
    EN_CONTRA: provisionalVotes.filter((v) => v.voteType === "EN_CONTRA").length,
    MAS_DATOS: provisionalVotes.filter((v) => v.voteType === "MAS_DATOS").length,
  };

  const total = summary.A_FAVOR + summary.EN_CONTRA + summary.MAS_DATOS;

  const handleVote = async (voteType: string) => {
    setLoading(true);
    await fetch(`/api/topics/${topicId}/provisional-vote`, {
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

  return (
    <Card sx={{ border: "2px dashed", borderColor: "warning.main" }}>
      <CardContent>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
          <BallotIcon sx={{ color: "warning.main" }} />
          <Typography variant="h6">Voto Provisorio</Typography>
          <Chip label="Preliminar" size="small" color="warning" />
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Este voto es informativo para evaluar si se continúa la discusión o se procede a votación final.
        </Typography>

        {[
          { type: "A_FAVOR", label: t("votes.inFavor"), count: summary.A_FAVOR },
          { type: "EN_CONTRA", label: t("votes.against"), count: summary.EN_CONTRA },
          { type: "MAS_DATOS", label: t("votes.moreData"), count: summary.MAS_DATOS },
        ].map((item) => (
          <Box key={item.type} sx={{ mb: 1 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
              <Typography variant="body2">{item.label}</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {item.count}
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={total > 0 ? (item.count / total) * 100 : 0}
              sx={{
                height: 6,
                borderRadius: 3,
                bgcolor: "action.hover",
                "& .MuiLinearProgress-bar": {
                  bgcolor: voteColor(item.type),
                  borderRadius: 3,
                },
              }}
            />
          </Box>
        ))}

        {canVote && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {myProvisionalVote ? "Cambiar voto provisorio" : "Emitir voto provisorio"}
            </Typography>
            <ButtonGroup fullWidth disabled={loading} size="small">
              <Button
                variant={myProvisionalVote === "A_FAVOR" ? "contained" : "outlined"}
                color="success"
                startIcon={<ThumbUpIcon />}
                onClick={() => handleVote("A_FAVOR")}
              >
                {t("votes.inFavor")}
              </Button>
              <Button
                variant={myProvisionalVote === "EN_CONTRA" ? "contained" : "outlined"}
                color="error"
                startIcon={<ThumbDownIcon />}
                onClick={() => handleVote("EN_CONTRA")}
              >
                {t("votes.against")}
              </Button>
              <Button
                variant={myProvisionalVote === "MAS_DATOS" ? "contained" : "outlined"}
                color="warning"
                startIcon={<HelpIcon />}
                onClick={() => handleVote("MAS_DATOS")}
              >
                {t("votes.moreData")}
              </Button>
            </ButtonGroup>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
