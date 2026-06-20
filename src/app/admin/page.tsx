"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import DashboardLayout from "@/components/DashboardLayout";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Card from "@mui/material/Card";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Chip from "@mui/material/Chip";
import Switch from "@mui/material/Switch";
import Skeleton from "@mui/material/Skeleton";
import Alert from "@mui/material/Alert";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import FormControlLabel from "@mui/material/FormControlLabel";
import CardContent from "@mui/material/CardContent";
import Avatar from "@mui/material/Avatar";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import CircularProgress from "@mui/material/CircularProgress";
import AddAPhotoIcon from "@mui/icons-material/AddAPhoto";
import EventIcon from "@mui/icons-material/Event";
import PeriodsDialog from "./PeriodsDialog";

interface UserItem {
  id: string;
  name: string;
  fullName: string | null;
  email: string;
  rut: string | null;
  image: string | null;
  roles: string[];
  currentRoles: string[];
  isAdmin: boolean;
  createdAt: string;
}

interface DeniedLoginItem {
  id: string;
  rut: string | null;
  email: string | null;
  name: string | null;
  identification: string | null;
  reason: string;
  createdAt: string;
}

const roleColor: Record<string, "error" | "secondary" | "primary" | "default" | "info" | "warning"> = {
  DIRECTOR: "error",
  SUBDIRECTOR: "warning",
  JEFE_DOCENTE: "secondary",
  CONSEJERO: "primary",
  INVITADO: "info",
  PROFESOR: "default",
};

export default function AdminPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const { t } = useI18n();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [deniedLogins, setDeniedLogins] = useState<DeniedLoginItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [periodsUser, setPeriodsUser] = useState<{ id: string; name: string } | null>(null);

  // Formulario de pre-carga de usuarios.
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRut, setNewRut] = useState("");
  const [newIsAdmin, setNewIsAdmin] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const isAdmin = (session?.user as any)?.isAdmin as boolean | undefined;

  const fetchUsers = useCallback(() => {
    fetch("/api/admin/users")
      .then((r) => r.json())
      .then((data) => {
        setUsers(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const fetchDeniedLogins = useCallback(() => {
    fetch("/api/admin/denied-logins")
      .then((r) => r.json())
      .then((data) => setDeniedLogins(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (authStatus === "unauthenticated") router.replace("/auth/signin");
    if (authStatus === "authenticated" && !isAdmin) router.replace("/dashboard");
  }, [authStatus, isAdmin, router]);

  useEffect(() => {
    if (authStatus === "authenticated" && isAdmin) {
      fetchUsers();
      fetchDeniedLogins();
    }
  }, [authStatus, isAdmin, fetchUsers, fetchDeniedLogins]);

  const updateUser = async (userId: string, body: any) => {
    setSaving(userId);
    setSuccess(null);

    const res = await fetch(`/api/admin/users/${userId}/roles`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setSaving(null);
    if (res.ok) {
      const updated = await res.json();
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, roles: updated.roles, isAdmin: updated.isAdmin } : u
        )
      );
      setSuccess(`Usuario actualizado: ${users.find((u) => u.id === userId)?.name}`);
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  const syncPhoto = async (userId: string) => {
    setSyncing(userId);
    setSuccess(null);
    setError(null);

    const res = await fetch(`/api/admin/users/${userId}/sync-photo`, {
      method: "POST",
    });
    const data = await res.json().catch(() => ({}));
    setSyncing(null);

    const name = users.find((u) => u.id === userId)?.name;
    if (res.ok) {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? { ...u, image: data.image, name: data.name ?? u.name, fullName: data.fullName ?? u.fullName }
            : u
        )
      );
      setSuccess(`Datos actualizados desde Ucampus: ${data.name ?? name}`);
      setTimeout(() => setSuccess(null), 3000);
    } else {
      setError(`${name}: ${data.error ?? "No se pudo traer los datos"}`);
      setTimeout(() => setError(null), 5000);
    }
  };

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    if (!newEmail.trim() && !newRut.trim()) {
      setCreateError("Debes indicar al menos un RUT o un correo");
      return;
    }

    setCreating(true);
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newName,
        email: newEmail,
        rut: newRut,
        roles: ["PROFESOR"],
        isAdmin: newIsAdmin,
      }),
    });
    setCreating(false);

    if (res.ok) {
      const created = await res.json();
      setUsers((prev) =>
        [...prev, created].sort((a, b) => a.name.localeCompare(b.name))
      );
      setNewName("");
      setNewEmail("");
      setNewRut("");
      setNewIsAdmin(false);
      setSuccess(`Usuario pre-cargado: ${created.name}`);
      setTimeout(() => setSuccess(null), 3000);
    } else {
      const data = await res.json().catch(() => ({}));
      setCreateError(data.error ?? "No se pudo crear el usuario");
    }
  };

  if (authStatus === "loading" || !isAdmin) return null;

  return (
    <DashboardLayout>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Administración de Usuarios
      </Typography>

      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 0.5 }}>
            Agregar usuario
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Pre-carga a una persona. Entrará por SSO y se completarán sus datos en
            el primer acceso. Indica al menos RUT o correo. Sus cargos (director,
            consejero, etc.) se asignan después en &ldquo;Membresía&rdquo;.
          </Typography>

          {createError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {createError}
            </Alert>
          )}

          <Box component="form" onSubmit={createUser}>
            <Stack spacing={2}>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <TextField
                  label="Nombre"
                  size="small"
                  fullWidth
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
                <TextField
                  label="Correo"
                  type="email"
                  size="small"
                  fullWidth
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                />
                <TextField
                  label="RUT (sin dígito verificador)"
                  size="small"
                  fullWidth
                  value={newRut}
                  onChange={(e) => setNewRut(e.target.value)}
                />
              </Stack>

              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={2}
                sx={{ alignItems: { sm: "center" } }}
              >
                <FormControlLabel
                  control={
                    <Switch
                      checked={newIsAdmin}
                      onChange={(e) => setNewIsAdmin(e.target.checked)}
                      size="small"
                    />
                  }
                  label="Admin"
                />

                <Box sx={{ flexGrow: 1 }} />

                <Button
                  type="submit"
                  variant="contained"
                  disabled={creating}
                >
                  {creating ? "Agregando..." : "Agregar"}
                </Button>
              </Stack>
            </Stack>
          </Box>
        </CardContent>
      </Card>

      {loading ? (
        <Skeleton variant="rounded" height={300} />
      ) : (
        <Card>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Nombre</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>RUT</TableCell>
                  <TableCell>Cargo actual</TableCell>
                  <TableCell>Admin</TableCell>
                  <TableCell align="center">Membresía</TableCell>
                  <TableCell align="center">Ucampus</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                        <Avatar
                          src={user.image ?? undefined}
                          sx={{ width: 32, height: 32, fontSize: 14 }}
                        >
                          {(user.name || user.fullName || "?")[0]?.toUpperCase()}
                        </Avatar>
                        {user.name || user.fullName}
                      </Box>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.rut ?? "—"}</TableCell>
                    <TableCell>
                      {(() => {
                        const cargos = user.currentRoles.filter((r) => r !== "PROFESOR");
                        if (cargos.length === 0) {
                          return (
                            <Typography variant="body2" color="text.secondary">
                              —
                            </Typography>
                          );
                        }
                        return (
                          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                            {cargos.map((role) => (
                              <Chip
                                key={role}
                                label={t(`roles.${role}`)}
                                size="small"
                                color={roleColor[role] ?? "default"}
                                sx={{ height: 24 }}
                              />
                            ))}
                          </Box>
                        );
                      })()}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={user.isAdmin}
                        onChange={(e) =>
                          updateUser(user.id, { isAdmin: e.target.checked })
                        }
                        disabled={saving === user.id}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="Gestionar periodos de membresía">
                        <IconButton
                          size="small"
                          onClick={() =>
                            setPeriodsUser({ id: user.id, name: user.name || user.fullName || "" })
                          }
                        >
                          <EventIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip
                        title={
                          user.rut
                            ? "Traer datos desde Ucampus (alias y foto)"
                            : "Sin RUT: no se puede consultar Ucampus"
                        }
                      >
                        <span>
                          <IconButton
                            size="small"
                            onClick={() => syncPhoto(user.id)}
                            disabled={!user.rut || syncing === user.id}
                          >
                            {syncing === user.id ? (
                              <CircularProgress size={18} />
                            ) : (
                              <AddAPhotoIcon fontSize="small" />
                            )}
                          </IconButton>
                        </span>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      <Typography variant="h5" sx={{ mt: 5, mb: 1 }}>
        Intentos de acceso denegados
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Personas que entraron por SSO pero no están en la lista de usuarios.
        Revisa el RUT y el correo para detectar por qué no coinciden con lo
        pre-cargado.
      </Typography>

      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Fecha</TableCell>
                <TableCell>Nombre</TableCell>
                <TableCell>Correo</TableCell>
                <TableCell>RUT</TableCell>
                <TableCell>Identificación VTI</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {deniedLogins.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5}>
                    <Typography variant="body2" color="text.secondary">
                      Sin intentos denegados registrados.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                deniedLogins.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>
                      {new Date(d.createdAt).toLocaleString("es-CL")}
                    </TableCell>
                    <TableCell>{d.name ?? "—"}</TableCell>
                    <TableCell>{d.email ?? "—"}</TableCell>
                    <TableCell>{d.rut ?? "—"}</TableCell>
                    <TableCell>{d.identification ?? "—"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {periodsUser && (
        <PeriodsDialog
          onClose={() => setPeriodsUser(null)}
          userId={periodsUser.id}
          userName={periodsUser.name}
        />
      )}
    </DashboardLayout>
  );
}
