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
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import OutlinedInput from "@mui/material/OutlinedInput";
import Skeleton from "@mui/material/Skeleton";
import Alert from "@mui/material/Alert";

interface UserItem {
  id: string;
  name: string;
  fullName: string | null;
  email: string;
  rut: string | null;
  roles: string[];
  isAdmin: boolean;
  createdAt: string;
}

const ALL_ROLES = ["DIRECTOR", "JEFE_DOCENTE", "CONSEJERO", "INVITADO", "PROFESOR"];

const roleColor: Record<string, "error" | "secondary" | "primary" | "default" | "info"> = {
  DIRECTOR: "error",
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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

  useEffect(() => {
    if (authStatus === "unauthenticated") router.replace("/auth/signin");
    if (authStatus === "authenticated" && !isAdmin) router.replace("/dashboard");
  }, [authStatus, isAdmin, router]);

  useEffect(() => {
    if (authStatus === "authenticated" && isAdmin) fetchUsers();
  }, [authStatus, isAdmin, fetchUsers]);

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
                  <TableCell>Roles</TableCell>
                  <TableCell>Admin</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.fullName ?? user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.rut ?? "—"}</TableCell>
                    <TableCell>
                      <Select
                        multiple
                        size="small"
                        value={user.roles}
                        onChange={(e) =>
                          updateUser(user.id, { roles: e.target.value as string[] })
                        }
                        input={<OutlinedInput />}
                        disabled={saving === user.id}
                        renderValue={(selected) => (
                          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                            {(selected as string[]).map((role) => (
                              <Chip
                                key={role}
                                label={t(`roles.${role}`)}
                                size="small"
                                color={roleColor[role] ?? "default"}
                                sx={{ height: 24 }}
                              />
                            ))}
                          </Box>
                        )}
                        sx={{ minWidth: 200 }}
                      >
                        {ALL_ROLES.map((role) => (
                          <MenuItem key={role} value={role}>
                            {t(`roles.${role}`)}
                          </MenuItem>
                        ))}
                      </Select>
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}
    </DashboardLayout>
  );
}
