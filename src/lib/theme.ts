import { createTheme, Theme } from "@mui/material/styles";

export type ThemeMode = "light" | "dark" | "cozy";

const sharedComponents = {
  MuiAppBar: {
    defaultProps: { elevation: 0 } as const,
    styleOverrides: {
      root: ({ theme }: { theme: Theme }) => ({
        backgroundColor: theme.palette.background.paper,
        color: theme.palette.text.primary,
        borderBottom: `1px solid ${theme.palette.divider}`,
      }),
    },
  },
  MuiButton: {
    defaultProps: { disableElevation: true } as const,
    styleOverrides: {
      root: { textTransform: "none" as const, fontWeight: 600, borderRadius: 8 },
    },
  },
  MuiCard: {
    defaultProps: { elevation: 0 } as const,
    styleOverrides: {
      root: ({ theme }: { theme: Theme }) => ({
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 12,
      }),
    },
  },
  MuiChip: {
    styleOverrides: {
      root: { fontWeight: 500 },
    },
  },
  MuiTextField: {
    defaultProps: { variant: "outlined" as const, size: "small" as const },
  },
  MuiFab: {
    styleOverrides: {
      root: { borderRadius: 16 },
    },
  },
};

const sharedTypography = {
  fontFamily: "'Inter', 'Roboto', 'Helvetica Neue', sans-serif",
  h4: { fontWeight: 700, letterSpacing: "-0.02em" },
  h5: { fontWeight: 600, letterSpacing: "-0.01em" },
  h6: { fontWeight: 600 },
};

export function getTheme(mode: ThemeMode) {
  if (mode === "cozy") {
    return createTheme({
      palette: {
        mode: "dark",
        primary: {
          main: "#c05640",
          light: "#e07a5f",
          dark: "#a04535",
          contrastText: "#fff",
        },
        secondary: {
          main: "#d4a373",
          light: "#e6c9a8",
          dark: "#b08050",
        },
        background: {
          default: "#0f0b08",
          paper: "#1a1410",
        },
        divider: "rgba(192, 86, 64, 0.15)",
      },
      typography: sharedTypography,
      shape: { borderRadius: 12 },
      components: {
        ...sharedComponents,
        MuiPaper: {
          styleOverrides: {
            root: {
              backgroundImage: "none",
              border: "1px solid rgba(255,255,255,0.06)",
            },
          },
        },
        MuiDialog: {
          styleOverrides: {
            paper: {
              backgroundImage: "none",
              backgroundColor: "#1c1510",
              border: "1px solid rgba(192, 86, 64, 0.18)",
              borderRadius: 16,
              boxShadow: "0 24px 60px rgba(0,0,0,0.75)",
            },
          },
        },
        MuiCard: {
          defaultProps: { elevation: 0 },
          styleOverrides: {
            root: {
              backgroundImage: "none",
              border: "1px solid rgba(192, 86, 64, 0.15)",
              borderRadius: 12,
            },
          },
        },
      },
    });
  }

  return createTheme({
    palette: {
      mode,
      ...(mode === "light"
        ? {
            primary: { main: "#1a5276", light: "#2980b9", dark: "#0e2f44" },
            secondary: { main: "#7d3c98", light: "#a569bd", dark: "#5b2c6f" },
            background: { default: "#f4f6f8", paper: "#ffffff" },
          }
        : {
            primary: { main: "#5dade2", light: "#85c1e9", dark: "#2e86c1" },
            secondary: { main: "#bb8fce", light: "#d2b4de", dark: "#7d3c98" },
            background: { default: "#0d1117", paper: "#161b22" },
            // El divider por defecto de MUI en dark (rgba(255,255,255,0.12))
            // hace un borde demasiado contrastado en las tarjetas. Se suaviza.
            divider: "rgba(255,255,255,0.06)",
          }),
    },
    typography: sharedTypography,
    shape: { borderRadius: 12 },
    components: {
      ...sharedComponents,
      MuiDialog: {
        styleOverrides: {
          paper: { borderRadius: 16 },
        },
      },
    },
  });
}
