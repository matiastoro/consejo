"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useI18n } from "@/lib/i18n/I18nProvider";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import LoginIcon from "@mui/icons-material/Login";

function SignInForm() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const authError =
    error === "no_autorizado"
      ? "No tienes acceso a esta plataforma. Contacta a un administrador."
      : error;

  const vtiLoginUrl = process.env.NEXT_PUBLIC_VTI_LOGIN_URL;

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "background.default",
        p: 2,
      }}
    >
      <Card sx={{ maxWidth: 440, width: "100%" }}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ textAlign: "center", mb: 4 }}>
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: 3,
                bgcolor: "primary.main",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                mb: 2,
              }}
            >
              <AccountBalanceIcon sx={{ fontSize: 30 }} />
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              {t("auth.title")}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {t("auth.subtitle")}
            </Typography>
          </Box>

          {authError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {authError}
            </Alert>
          )}

          <Button
            variant="contained"
            fullWidth
            size="large"
            href={vtiLoginUrl}
            disabled={!vtiLoginUrl}
            startIcon={<LoginIcon />}
            sx={{ py: 1.5, fontSize: "0.95rem" }}
          >
            {t("auth.signInWith")}
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
}

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <Box
          sx={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <CircularProgress />
        </Box>
      }
    >
      <SignInForm />
    </Suspense>
  );
}
