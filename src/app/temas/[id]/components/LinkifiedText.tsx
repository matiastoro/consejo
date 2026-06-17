"use client";

import { Fragment } from "react";
import Typography from "@mui/material/Typography";
import Link from "@mui/material/Link";

const URL_REGEX = /(https?:\/\/[^\s]+)/g;

// Renderiza texto plano preservando saltos de linea y convirtiendo
// las URL http(s) en enlaces clickeables (abren en nueva pestana).
export default function LinkifiedText({ text }: { text: string }) {
  const parts = text.split(URL_REGEX);

  return (
    <Typography sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
      {parts.map((part, i) => {
        if (!/^https?:\/\//.test(part)) return <Fragment key={i}>{part}</Fragment>;

        // Mover puntuacion final fuera del enlace (ej: "(http://...)." ).
        const match = part.match(/[.,;:!?)\]]+$/);
        const trailing = match ? match[0] : "";
        const url = trailing ? part.slice(0, -trailing.length) : part;

        return (
          <Fragment key={i}>
            <Link href={url} target="_blank" rel="noopener noreferrer">
              {url}
            </Link>
            {trailing}
          </Fragment>
        );
      })}
    </Typography>
  );
}
