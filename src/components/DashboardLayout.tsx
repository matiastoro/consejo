"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { useColorMode } from "./Providers";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Avatar from "@mui/material/Avatar";
import Chip from "@mui/material/Chip";
import Tooltip from "@mui/material/Tooltip";
import Divider from "@mui/material/Divider";
import Badge from "@mui/material/Badge";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import MenuIcon from "@mui/icons-material/Menu";
import DashboardIcon from "@mui/icons-material/Dashboard";
import ForumIcon from "@mui/icons-material/Forum";
import EventNoteIcon from "@mui/icons-material/EventNote";
import LogoutIcon from "@mui/icons-material/Logout";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import LocalFireDepartmentIcon from "@mui/icons-material/LocalFireDepartment";
import TranslateIcon from "@mui/icons-material/Translate";
import NotificationsIcon from "@mui/icons-material/Notifications";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  topicId: string | null;
  sessionId: string | null;
  read: boolean;
  createdAt: string;
}

const DRAWER_WIDTH = 260;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const { t, toggleLocale, locale } = useI18n();
  const { mode, setMode } = useColorMode();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifAnchor, setNotifAnchor] = useState<null | HTMLElement>(null);

  const roles = (session?.user as any)?.roles as string[] | undefined;
  const primaryRole = roles?.[0];
  const isAdmin = (session?.user as any)?.isAdmin as boolean | undefined;

  const fetchNotifications = useCallback(() => {
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((data) => {
        setNotifications(data.notifications ?? []);
        setUnreadCount(data.unreadCount ?? 0);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (session) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [session, fetchNotifications]);

  const handleMarkAllRead = async () => {
    await fetch("/api/notifications", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllRead: true }),
    });
    setUnreadCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleNotificationClick = (notif: NotificationItem) => {
    setNotifAnchor(null);
    if (notif.topicId) {
      router.push(`/temas/${notif.topicId}`);
    } else if (notif.sessionId) {
      router.push(`/sesiones/${notif.sessionId}`);
    }
    if (!notif.read) {
      fetch("/api/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationIds: [notif.id] }),
      }).then(fetchNotifications);
    }
  };

  const navItems = [
    { label: t("nav.dashboard"), path: "/dashboard", icon: <DashboardIcon /> },
    { label: t("nav.topics"), path: "/temas", icon: <ForumIcon /> },
    { label: "Sesiones", path: "/sesiones", icon: <EventNoteIcon /> },
    ...(isAdmin
      ? [{ label: "Administración", path: "/admin", icon: <AdminPanelSettingsIcon /> }]
      : []),
  ];

  const drawer = (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Box sx={{ p: 2.5, display: "flex", alignItems: "center", gap: 1.5 }}>
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: 2,
            bgcolor: "primary.main",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontWeight: 800,
            fontSize: 18,
          }}
        >
          C
        </Box>
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
            Consejo DCC
          </Typography>
          <Typography variant="caption" color="text.secondary">
            U. de Chile
          </Typography>
        </Box>
      </Box>
      <Divider />
      <List sx={{ flex: 1, px: 1, pt: 1 }}>
        {navItems.map((item) => (
          <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              selected={pathname === item.path}
              onClick={() => {
                router.push(item.path);
                setMobileOpen(false);
              }}
              sx={{ borderRadius: 2 }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      <Divider />
      {session?.user && (
        <Box sx={{ p: 2, display: "flex", alignItems: "center", gap: 1.5 }}>
          <Avatar
            src={session.user.image ?? undefined}
            sx={{ width: 32, height: 32, bgcolor: "primary.main", fontSize: 14 }}
          >
            {session.user.name?.[0]?.toUpperCase() ?? "U"}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
              {session.user.name}
            </Typography>
            {primaryRole && (
              <Chip
                label={t(`roles.${primaryRole}`)}
                size="small"
                variant="outlined"
                sx={{ height: 20, fontSize: 11, mt: 0.25 }}
              />
            )}
          </Box>
          <Tooltip title={t("nav.logout")}>
            <IconButton size="small" onClick={() => signOut({ callbackUrl: "/auth/signin" })}>
              <LogoutIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      )}
    </Box>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { md: `${DRAWER_WIDTH}px` },
        }}
      >
        <Toolbar>
          <IconButton
            edge="start"
            onClick={() => setMobileOpen(!mobileOpen)}
            sx={{ mr: 2, display: { md: "none" } }}
          >
            <MenuIcon />
          </IconButton>
          <Box sx={{ flex: 1 }} />
          <Tooltip title="Notificaciones">
            <IconButton
              size="small"
              sx={{ mr: 1 }}
              onClick={(e) => setNotifAnchor(e.currentTarget)}
            >
              <Badge badgeContent={unreadCount} color="error" max={99}>
                <NotificationsIcon fontSize="small" />
              </Badge>
            </IconButton>
          </Tooltip>
          <Menu
            anchorEl={notifAnchor}
            open={Boolean(notifAnchor)}
            onClose={() => setNotifAnchor(null)}
            slotProps={{
              paper: {
                sx: { width: 360, maxHeight: 400 },
              },
            }}
          >
            <Box sx={{ px: 2, py: 1, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Typography variant="subtitle2">Notificaciones</Typography>
              {unreadCount > 0 && (
                <Typography
                  variant="caption"
                  color="primary"
                  sx={{ cursor: "pointer" }}
                  onClick={handleMarkAllRead}
                >
                  Marcar todas como leídas
                </Typography>
              )}
            </Box>
            <Divider />
            {notifications.length === 0 ? (
              <MenuItem disabled>
                <Typography variant="body2" color="text.secondary">
                  Sin notificaciones
                </Typography>
              </MenuItem>
            ) : (
              notifications.slice(0, 15).map((notif) => (
                <MenuItem
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  sx={{
                    whiteSpace: "normal",
                    bgcolor: notif.read ? "transparent" : "action.hover",
                    py: 1.5,
                  }}
                >
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: notif.read ? 400 : 600 }}>
                      {notif.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {notif.message}
                    </Typography>
                    <br />
                    <Typography variant="caption" color="text.disabled">
                      {new Date(notif.createdAt).toLocaleString()}
                    </Typography>
                  </Box>
                </MenuItem>
              ))
            )}
          </Menu>
          <Tooltip title={locale === "es" ? "English" : "Español"}>
            <IconButton onClick={toggleLocale} size="small" sx={{ mr: 1 }}>
              <TranslateIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title={mode === "light" ? "Dark" : mode === "dark" ? "Cozy" : "Light"}>
            <IconButton
              onClick={() =>
                setMode(mode === "light" ? "dark" : mode === "dark" ? "cozy" : "light")
              }
              size="small"
            >
              {mode === "light" ? (
                <DarkModeIcon fontSize="small" />
              ) : mode === "dark" ? (
                <LocalFireDepartmentIcon fontSize="small" />
              ) : (
                <LightModeIcon fontSize="small" />
              )}
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: "block", md: "none" },
            "& .MuiDrawer-paper": { width: DRAWER_WIDTH },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: "none", md: "block" },
            "& .MuiDrawer-paper": {
              width: DRAWER_WIDTH,
              borderRight: 1,
              borderColor: "divider",
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          mt: 8,
          p: { xs: 2, sm: 3 },
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
