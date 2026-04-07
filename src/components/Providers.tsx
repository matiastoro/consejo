"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { getTheme, ThemeMode } from "@/lib/theme";
import { createContext, useState, useMemo, useEffect, useContext } from "react";
import { I18nProvider } from "@/lib/i18n/I18nProvider";

interface ColorModeContextValue {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
}

export const ColorModeContext = createContext<ColorModeContextValue>({
  mode: "dark",
  setMode: () => {},
});

export function useColorMode() {
  return useContext(ColorModeContext);
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("dark");

  useEffect(() => {
    const saved = localStorage.getItem("themeMode") as ThemeMode;
    if (saved) setModeState(saved);
  }, []);

  const colorMode = useMemo(
    () => ({
      mode,
      setMode: (newMode: ThemeMode) => {
        localStorage.setItem("themeMode", newMode);
        setModeState(newMode);
      },
    }),
    [mode]
  );

  const theme = useMemo(() => getTheme(mode), [mode]);

  return (
    <SessionProvider>
      <I18nProvider>
        <ColorModeContext.Provider value={colorMode}>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            {children}
          </ThemeProvider>
        </ColorModeContext.Provider>
      </I18nProvider>
    </SessionProvider>
  );
}
