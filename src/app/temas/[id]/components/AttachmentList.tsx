"use client";

import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import AttachFileIcon from "@mui/icons-material/AttachFile";

export interface AttachmentItem {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
}

interface Props {
  attachments: AttachmentItem[];
  size?: "small" | "medium";
  sx?: object;
}

export default function AttachmentList({ attachments, size = "small", sx }: Props) {
  if (attachments.length === 0) return null;

  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, ...sx }}>
      {attachments.map((att) => (
        <Chip
          key={att.id}
          icon={<AttachFileIcon />}
          label={att.fileName}
          component="a"
          href={`/api/attachments/${att.id}`}
          target="_blank"
          rel="noopener noreferrer"
          clickable
          size={size}
          variant="outlined"
        />
      ))}
    </Box>
  );
}
