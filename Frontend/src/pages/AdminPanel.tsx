import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import * as authService from "@/services/authService";
import type { User as BackendUser } from "@/services/authService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Lock, User, LayoutDashboard, Users, Trophy, Settings } from "lucide-react";
import { toast } from "sonner";

const AdminPanel: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, login } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeSection, setActiveSection] = useState<"dashboard" | "users" | "umamusume" | "settings">(
    "dashboard"
  );
  const [users, setUsers] = useState<BackendUser[]>([]);
  const [isUsersLoading, setIsUsersLoading] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [editingUser, setEditingUser] = useState<BackendUser | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    username: "",
    email: "",
    full_name: "",
    phone_number: "",
  });
  const [newUser, setNewUser] = useState({
    username: "",
    email: "",
    full_name: "",
    phone_number: "",
    password: "",
    password_confirm: "",
  });

  const isAdmin = user?.isStaff && user?.isSuperuser;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await login(username, password);

      if (!result.success || !result.user) {
        toast.error(result.error || "Invalid username or password");
        return;
      }

      if (result.user.isStaff && result.user.isSuperuser) {
        toast.success("Admin login successful");
        navigate("/adminpanel");
      } else {
        toast.error("You do not have admin access");
      }
    } catch {
      toast.error("An error occurred during admin login");
    } finally {
      setIsLoading(false);
    }
  };

  const loadUsers = async () => {
    setIsUsersLoading(true);
    try {
      const data = await authService.adminGetUsers();
      setUsers(data);
    } catch (error) {
      console.error("Failed to load users", error);
      toast.error("Failed to load users");
    } finally {
      setIsUsersLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && isAdmin && activeSection === "users") {
      loadUsers();
    }
  }, [isAuthenticated, isAdmin, activeSection]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingUser(true);
    try {
      await authService.adminCreateUser(newUser);
      toast.success("User created");
      setNewUser({
        username: "",
        email: "",
        full_name: "",
        phone_number: "",
        password: "",
        password_confirm: "",
      });
      loadUsers();
    } catch (error: any) {
      console.error("Failed to create user", error);
      const firstError =
        error?.response?.data?.username?.[0] ||
        error?.response?.data?.email?.[0] ||
        error?.response?.data?.password?.[0] ||
        error?.response?.data?.non_field_errors?.[0] ||
        "Failed to create user";
      toast.error(firstError);
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleToggleFlag = async (u: BackendUser, field: "is_active" | "is_staff" | "is_superuser") => {
    try {
      const updated = await authService.adminUpdateUser(u.id, {
        [field]: !u[field],
      });
      setUsers((prev) => prev.map((usr) => (usr.id === updated.id ? updated : usr)));
    } catch (error) {
      console.error("Failed to update user", error);
      toast.error("Failed to update user");
    }
  };

  const handleDeleteUser = async (id: number) => {
    if (!confirm("Are you sure you want to delete this user?")) return;
    try {
      await authService.adminDeleteUser(id);
      setUsers((prev) => prev.filter((u) => u.id !== id));
      toast.success("User deleted");
    } catch (error) {
      console.error("Failed to delete user", error);
      toast.error("Failed to delete user");
    }
  };

  const handleStartEdit = (u: BackendUser) => {
    setEditingUser(u);
    setEditForm({
      username: u.username,
      email: u.email,
      full_name: u.full_name || "",
      phone_number: u.phone_number || "",
    });
    setIsEditOpen(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      const updated = await authService.adminUpdateUser(editingUser.id, editForm);
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      toast.success("User updated");
      setEditingUser(null);
      setIsEditOpen(false);
    } catch (error: any) {
      console.error("Failed to update user", error);
      const firstError =
        error?.response?.data?.username?.[0] ||
        error?.response?.data?.email?.[0] ||
        error?.response?.data?.non_field_errors?.[0] ||
        "Failed to update user";
      toast.error(firstError);
    }
  };

  if (isAuthenticated && isAdmin) {
    return (
      <div className="min-h-screen flex bg-background text-foreground">
        {/* Sidebar */}
        <aside className="w-64 border-r bg-muted/40 p-4 flex flex-col">
          <div className="mb-6">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <LayoutDashboard className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">UmaBet</p>
                <p className="text-sm font-semibold">Admin Panel</p>
              </div>
            </div>
          </div>

          <nav className="space-y-1 flex-1">
            <Button
              variant={activeSection === "dashboard" ? "default" : "ghost"}
              className="w-full justify-start gap-2"
              onClick={() => setActiveSection("dashboard")}
            >
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </Button>
            <Button
              variant={activeSection === "users" ? "default" : "ghost"}
              className="w-full justify-start gap-2"
              onClick={() => setActiveSection("users")}
            >
              <Users className="h-4 w-4" />
              User Management
            </Button>
            <Button
              variant={activeSection === "umamusume" ? "default" : "ghost"}
              className="w-full justify-start gap-2"
              onClick={() => setActiveSection("umamusume")}
            >
              <Trophy className="h-4 w-4" />
              Umamusume Management
            </Button>
            <Button
              variant={activeSection === "settings" ? "default" : "ghost"}
              className="w-full justify-start gap-2"
              onClick={() => setActiveSection("settings")}
            >
              <Settings className="h-4 w-4" />
              Settings
            </Button>
          </nav>

          <div className="mt-6 text-xs text-muted-foreground">
            Logged in as <span className="font-medium">{user?.username}</span>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-6 space-y-6">
          <header className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">
                {activeSection === "dashboard" && "Overview"}
                {activeSection === "users" && "User Management"}
                {activeSection === "umamusume" && "Umamusume Management"}
                {activeSection === "settings" && "Settings"}
              </h1>
              <p className="text-sm text-muted-foreground">
                Basic admin tools for your UmaBet dev environment.
              </p>
            </div>

            <Button variant="outline" size="sm" onClick={() => navigate("/")}>
              Back to Home
            </Button>
          </header>

          {activeSection === "dashboard" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">128</p>
                  <p className="text-xs text-muted-foreground mt-1">Hardcoded for now</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Umamusume</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">42</p>
                  <p className="text-xs text-muted-foreground mt-1">Hardcoded for now</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Active Events</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">5</p>
                  <p className="text-xs text-muted-foreground mt-1">Hardcoded for now</p>
                </CardContent>
              </Card>
            </div>
          )}

          {activeSection === "users" && (
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Create user */}
                <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  <div>
                    <Label htmlFor="new-username">Username</Label>
                    <Input
                      id="new-username"
                      value={newUser.username}
                      onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="new-email">Email</Label>
                    <Input
                      id="new-email"
                      type="email"
                      value={newUser.email}
                      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="md:col-span-1">
                    <Label htmlFor="new-password">Password</Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={newUser.password}
                      onChange={(e) =>
                        setNewUser({ ...newUser, password: e.target.value, password_confirm: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="new-fullname">Full Name (optional)</Label>
                    <Input
                      id="new-fullname"
                      value={newUser.full_name}
                      onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="new-phone">Phone (optional)</Label>
                    <Input
                      id="new-phone"
                      value={newUser.phone_number}
                      onChange={(e) => setNewUser({ ...newUser, phone_number: e.target.value })}
                    />
                  </div>
                  <div className="md:col-span-3 flex justify-end">
                    <Button type="submit" disabled={isCreatingUser}>
                      {isCreatingUser ? "Creating..." : "Create User"}
                    </Button>
                  </div>
                </form>

                {/* Users table */}
                <div className="border rounded-md overflow-x-auto bg-card">
                  <table className="min-w-full text-sm">
                    <thead className="bg-muted/60">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-xs uppercase tracking-wide text-muted-foreground">
                          Avatar
                        </th>
                        <th className="px-3 py-2 text-left font-medium text-xs uppercase tracking-wide text-muted-foreground">
                          Username
                        </th>
                        <th className="px-3 py-2 text-left font-medium text-xs uppercase tracking-wide text-muted-foreground">
                          Email
                        </th>
                        <th className="px-3 py-2 text-left font-medium text-xs uppercase tracking-wide text-muted-foreground">
                          Flags
                        </th>
                        <th className="px-3 py-2 text-left font-medium text-xs uppercase tracking-wide text-muted-foreground">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {isUsersLoading ? (
                        <tr>
                          <td className="px-3 py-4 text-center text-muted-foreground" colSpan={5}>
                            Loading users...
                          </td>
                        </tr>
                      ) : users.length === 0 ? (
                        <tr>
                          <td className="px-3 py-4 text-center text-muted-foreground" colSpan={5}>
                            No users found.
                          </td>
                        </tr>
                      ) : (
                        users.map((u) => {
                          const privilegedCount = users.filter(
                            (usr) => usr.is_staff && usr.is_superuser
                          ).length;
                          const isLastAdmin = privilegedCount <= 1 && u.is_staff && u.is_superuser;

                          return (
                            <tr key={u.id} className="border-t hover:bg-muted/40 transition-colors">
                              <td className="px-3 py-2">
                              {u.profile.avatar_url ? (
                                <img
                                  src={u.profile.avatar_url}
                                  alt={u.username}
                                  className="h-8 w-8 rounded-full object-cover"
                                />
                              ) : (
                                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs text-muted-foreground">
                                  {u.username.charAt(0).toUpperCase()}
                                </div>
                              )}
                              </td>
                              <td className="px-3 py-2">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{u.username}</span>
                                  {u.is_staff && u.is_superuser && (
                                    <Badge variant="outline" className="text-[10px]">
                                      Admin
                                    </Badge>
                                  )}
                                </div>
                              </td>
                              <td className="px-3 py-2">{u.email}</td>
                              <td className="px-3 py-2">
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center gap-2">
                                    <Switch
                                      checked={u.is_active}
                                      onCheckedChange={() => handleToggleFlag(u, "is_active")}
                                    />
                                    <span className="text-xs text-muted-foreground">Active</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Switch
                                      checked={u.is_staff}
                                      disabled={isLastAdmin}
                                      onCheckedChange={() => handleToggleFlag(u, "is_staff")}
                                    />
                                    <span className="text-xs text-muted-foreground">
                                      Staff{isLastAdmin ? " (required)" : ""}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Switch
                                      checked={u.is_superuser}
                                      disabled={isLastAdmin}
                                      onCheckedChange={() => handleToggleFlag(u, "is_superuser")}
                                    />
                                    <span className="text-xs text-muted-foreground">
                                      Superuser{isLastAdmin ? " (required)" : ""}
                                    </span>
                                  </div>
                                </div>
                              </td>
                              <td className="px-3 py-2">
                                <div className="flex gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleStartEdit(u)}
                                  >
                                    Edit
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => handleDeleteUser(u.id)}
                                    disabled={u.id === user?.id}
                                  >
                                    Delete
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                <Dialog open={!!editingUser && isEditOpen} onOpenChange={(open) => {
                  setIsEditOpen(open);
                  if (!open) setEditingUser(null);
                }}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>
                        Edit User{" "}
                        {editingUser && <span className="font-mono text-sm">{editingUser.username}</span>}
                      </DialogTitle>
                    </DialogHeader>
                    {editingUser && (
                      <form onSubmit={handleUpdateUser} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="edit-username">Username</Label>
                            <Input
                              id="edit-username"
                              value={editForm.username}
                              onChange={(e) =>
                                setEditForm({ ...editForm, username: e.target.value })
                              }
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor="edit-email">Email</Label>
                            <Input
                              id="edit-email"
                              type="email"
                              value={editForm.email}
                              onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor="edit-fullname">Full Name</Label>
                            <Input
                              id="edit-fullname"
                              value={editForm.full_name}
                              onChange={(e) =>
                                setEditForm({ ...editForm, full_name: e.target.value })
                              }
                            />
                          </div>
                          <div>
                            <Label htmlFor="edit-phone">Phone</Label>
                            <Input
                              id="edit-phone"
                              value={editForm.phone_number}
                              onChange={(e) =>
                                setEditForm({ ...editForm, phone_number: e.target.value })
                              }
                            />
                          </div>
                        </div>
                        <DialogFooter className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setIsEditOpen(false);
                              setEditingUser(null);
                            }}
                          >
                            Cancel
                          </Button>
                          <Button type="submit">Save changes</Button>
                        </DialogFooter>
                      </form>
                    )}
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          )}

          {activeSection === "umamusume" && (
            <Card>
              <CardHeader>
                <CardTitle>Umamusume Management (coming soon)</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Future tools for managing Umamusume entries and related data will go here.
                </p>
              </CardContent>
            </Card>
          )}

          {activeSection === "settings" && (
            <Card>
              <CardHeader>
                <CardTitle>Admin Settings (coming soon)</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Basic configuration options for your admin tooling will eventually live here.
                </p>
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-gradient">Admin Login</h1>
          <p className="text-muted-foreground text-sm">Enter your admin credentials.</p>
        </div>

        <Card className="border-2">
          <CardHeader>
            <CardTitle>Admin Access</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="admin-username">Username</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="admin-username"
                    type="text"
                    placeholder="admin_username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="admin-password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="admin-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                {isLoading ? "Checking access..." : "Login as Admin"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminPanel;

