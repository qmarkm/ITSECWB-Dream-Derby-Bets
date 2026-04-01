import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import * as authService from "@/services/authService";
import type { User as BackendUser } from "@/services/authService";
import * as umaService from "@/services/umaService";
import type { BaseUma, CsvImportResult, Skill } from "@/services/umaService";
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
import { Lock, User, LayoutDashboard, Users, Trophy, Settings, ChevronRight, Upload } from "lucide-react";
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
  const [newUmaName, setNewUmaName] = useState("");
  const [newUmaAvatarUrl, setNewUmaAvatarUrl] = useState("");
  const [isCreatingUma, setIsCreatingUma] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<CsvImportResult | null>(null);

  // Skill management
  const [allUmas, setAllUmas] = useState<BaseUma[]>([]);
  const [allSkills, setAllSkills] = useState<Skill[]>([]);
  const [newSkillName, setNewSkillName] = useState("");
  const [newSkillDescription, setNewSkillDescription] = useState("");
  const [isCreatingSkill, setIsCreatingSkill] = useState(false);
  const [assignUmaId, setAssignUmaId] = useState<number | null>(null);
  const [assignSkillId, setAssignSkillId] = useState<number | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);
  const [umaSearch, setUmaSearch] = useState("");
  const [skillSearch, setSkillSearch] = useState("");
  const [showCsvDialog, setShowCsvDialog] = useState(false);
  const [isLoadingUmas, setIsLoadingUmas] = useState(false);

  // Uma list view
  const [umaTab, setUmaTab] = useState<"setup" | "list">("setup");
  const [umaListSearch, setUmaListSearch] = useState("");
  const [umaListFilter, setUmaListFilter] = useState<"all" | "active" | "disabled" | "has_skills" | "no_skills">("all");
  const [viewingUma, setViewingUma] = useState<BaseUma | null>(null);

  // Edit Uma
  const [editingUma, setEditingUma] = useState<BaseUma | null>(null);
  const [editName, setEditName] = useState("");
  const [editAvatarUrl, setEditAvatarUrl] = useState("");
  const [isUpdatingUma, setIsUpdatingUma] = useState(false);

  const [newUser, setNewUser] = useState({
    username: "",
    email: "",
    full_name: "",
    phone_number: "",
    password: "",
    password_confirm: "",
  });

  const isAdmin = user?.isStaff && user?.isSuperuser;

  const filteredUmas = allUmas
    .filter((u) => u.name.toLowerCase().includes(umaListSearch.toLowerCase()))
    .filter((u) => {
      if (umaListFilter === "active") return u.is_active;
      if (umaListFilter === "disabled") return !u.is_active;
      if (umaListFilter === "has_skills") return u.skills.length > 0;
      if (umaListFilter === "no_skills") return u.skills.length === 0;
      return true;
    });

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
    if (isAuthenticated && isAdmin && activeSection === "umamusume") {
      setIsLoadingUmas(true);
      umaService.adminGetAllUmas().then(setAllUmas).catch(() => {}).finally(() => setIsLoadingUmas(false));
      umaService.getSkills().then(setAllSkills).catch(() => {});
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

  const handleCreateUma = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingUma(true);
    try {
      const uma = await umaService.adminCreateBaseUma({
        name: newUmaName,
        avatar_url: newUmaAvatarUrl || undefined,
      });
      setAllUmas((prev) => [...prev, uma]);
      toast.success("Uma created successfully.");
      setNewUmaName("");
      setNewUmaAvatarUrl("");
    } catch (error: any) {
      const firstError =
        error?.response?.data?.name?.[0] ||
        error?.response?.data?.avatar_url?.[0] ||
        error?.response?.data?.detail ||
        "Failed to create Uma.";
      toast.error(firstError);
    } finally {
      setIsCreatingUma(false);
    }
  };

  const handleCsvImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvFile) {
      toast.error("Please select a CSV file.");
      return;
    }
    setIsImporting(true);
    setImportResult(null);
    try {
      const result = await umaService.adminImportUmasCSV(csvFile);
      setImportResult(result);
      if (result.created > 0) {
        umaService.adminGetAllUmas().then(setAllUmas).catch(() => {});
      }
      toast.success(`Import complete: ${result.created} created, ${result.skipped} skipped.`);
    } catch (error: any) {
      const msg =
        error?.response?.data?.error ||
        "Failed to import CSV.";
      toast.error(msg);
    } finally {
      setIsImporting(false);
      setCsvFile(null);
    }
  };

  const openEditDialog = (uma: BaseUma) => {
    setEditingUma(uma);
    setEditName(uma.name);
    setEditAvatarUrl(uma.avatar_url || "");
  };

  const handleUpdateUma = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUma) return;
    setIsUpdatingUma(true);
    try {
      const updated = await umaService.adminUpdateUma(editingUma.id, {
        name: editName,
        avatar_url: editAvatarUrl || undefined,
      });
      setAllUmas((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      toast.success("Uma updated.");
      setEditingUma(null);
    } catch (error: any) {
      const firstError =
        error?.response?.data?.name?.[0] ||
        error?.response?.data?.avatar_url?.[0] ||
        error?.response?.data?.detail ||
        "Failed to update Uma.";
      toast.error(firstError);
    } finally {
      setIsUpdatingUma(false);
    }
  };

  const handleToggleUmaActive = async (uma: BaseUma) => {
    try {
      const updated = await umaService.adminToggleUmaActive(uma.id);
      setAllUmas((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      if (editingUma?.id === updated.id) setEditingUma(updated);
      toast.success(`Uma ${updated.is_active ? "enabled" : "disabled"}.`);
    } catch {
      toast.error("Failed to update Uma status.");
    }
  };

  const handleUnassignSkill = async (skillId: number) => {
    if (!editingUma) return;
    try {
      await umaService.adminUnassignSkill(skillId);
      const updatedUma = {
        ...editingUma,
        skills: editingUma.skills.filter((s) => s.id !== skillId),
      };
      setEditingUma(updatedUma);
      setAllUmas((prev) => prev.map((u) => (u.id === editingUma.id ? updatedUma : u)));
      toast.success("Skill removed.");
    } catch {
      toast.error("Failed to remove skill.");
    }
  };

  const handleCreateSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingSkill(true);
    try {
      const skill = await umaService.adminCreateSkill({
        name: newSkillName,
        description: newSkillDescription,
      });
      toast.success("Skill created.");
      setAllSkills((prev) => [...prev, skill]);
      setNewSkillName("");
      setNewSkillDescription("");
    } catch (error: any) {
      const firstError =
        error?.response?.data?.name?.[0] ||
        error?.response?.data?.description?.[0] ||
        error?.response?.data?.detail ||
        "Failed to create skill.";
      toast.error(firstError);
    } finally {
      setIsCreatingSkill(false);
    }
  };

  const handleAssignSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignSkillId || !assignUmaId) {
      toast.error("Select both an Uma and a skill.");
      return;
    }
    setIsAssigning(true);
    try {
      const updated = await umaService.adminAssignSkillToUma(assignSkillId, assignUmaId);
      toast.success("Skill assigned to Uma.");
      setAllSkills((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      setAllUmas((prev) => prev.map((u) =>
        u.id === assignUmaId
          ? { ...u, skills: [...u.skills.filter((s) => s.id !== updated.id), updated] }
          : u
      ));
      setAssignSkillId(null);
      setAssignUmaId(null);
      setUmaSearch("");
      setSkillSearch("");
    } catch (error: any) {
      const msg =
        error?.response?.data?.error ||
        error?.response?.data?.detail ||
        "Failed to assign skill.";
      toast.error(msg);
    } finally {
      setIsAssigning(false);
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
            <div className="space-y-6">
              {/* Sub-tab navigation */}
              <div className="flex border-b">
                <button
                  className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${umaTab === "setup" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                  onClick={() => setUmaTab("setup")}
                >
                  Setup
                </button>
                <button
                  className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-1.5 ${umaTab === "list" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                  onClick={() => setUmaTab("list")}
                >
                  All Umas
                  {allUmas.length > 0 && (
                    <span className="inline-flex items-center justify-center rounded-full bg-muted px-1.5 text-xs font-medium">
                      {allUmas.length}
                    </span>
                  )}
                </button>
              </div>

              {umaTab === "setup" && <>
              {/* Toolbar */}
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Follow the steps below to set up Umas and their skills.
                </p>
                <Button variant="outline" size="sm" onClick={() => setShowCsvDialog(true)}>
                  <Upload className="h-4 w-4 mr-2" />
                  Import from CSV
                </Button>
              </div>

              {/* Step flow indicator */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">1</span>
                  <span className="text-sm font-medium">Create Uma</span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">2</span>
                  <span className="text-sm font-medium">Create Skill</span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">3</span>
                  <span className="text-sm font-medium">Assign Skill to Uma</span>
                </div>
              </div>

              {/* Steps 1 & 2 side by side */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Step 1 */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">1</span>
                      <CardTitle className="text-base">Create Base Uma</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleCreateUma} className="space-y-3">
                      <div>
                        <Label htmlFor="uma-name">Name</Label>
                        <Input
                          id="uma-name"
                          value={newUmaName}
                          onChange={(e) => setNewUmaName(e.target.value)}
                          placeholder="e.g. Special Week"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="uma-avatar">
                          Avatar URL{" "}
                          <span className="text-muted-foreground font-normal">(optional)</span>
                        </Label>
                        <Input
                          id="uma-avatar"
                          value={newUmaAvatarUrl}
                          onChange={(e) => setNewUmaAvatarUrl(e.target.value)}
                          placeholder="https://..."
                        />
                      </div>
                      <Button type="submit" className="w-full" disabled={isCreatingUma}>
                        {isCreatingUma ? "Creating..." : "Create Uma"}
                      </Button>
                    </form>
                  </CardContent>
                </Card>

                {/* Step 2 */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">2</span>
                      <CardTitle className="text-base">Create Skill</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleCreateSkill} className="space-y-3">
                      <div>
                        <Label htmlFor="skill-name">Skill Name</Label>
                        <Input
                          id="skill-name"
                          value={newSkillName}
                          onChange={(e) => setNewSkillName(e.target.value)}
                          placeholder="e.g. Straight Dash"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="skill-desc">Description</Label>
                        <Input
                          id="skill-desc"
                          value={newSkillDescription}
                          onChange={(e) => setNewSkillDescription(e.target.value)}
                          placeholder="What the skill does..."
                          required
                        />
                      </div>
                      <Button type="submit" className="w-full" disabled={isCreatingSkill}>
                        {isCreatingSkill ? "Creating..." : "Create Skill"}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </div>

              {/* Step 3 — full width */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">3</span>
                    <CardTitle className="text-base">Assign Skill to Uma</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleAssignSkill} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Uma searchable list */}
                      <div className="space-y-2">
                        <Label>Select Uma</Label>
                        <Input
                          placeholder="Search umas..."
                          value={umaSearch}
                          onChange={(e) => setUmaSearch(e.target.value)}
                        />
                        <div className="border rounded-md max-h-40 overflow-y-auto">
                          {allUmas
                            .filter((u) => u.name.toLowerCase().includes(umaSearch.toLowerCase()))
                            .map((u) => (
                              <button
                                key={u.id}
                                type="button"
                                onClick={() => setAssignUmaId(u.id)}
                                className={`w-full text-left px-3 py-2 text-sm hover:bg-muted/60 transition-colors ${
                                  assignUmaId === u.id ? "bg-primary/10 font-medium text-primary" : ""
                                }`}
                              >
                                {u.name}
                              </button>
                            ))}
                          {allUmas.filter((u) =>
                            u.name.toLowerCase().includes(umaSearch.toLowerCase())
                          ).length === 0 && (
                            <p className="px-3 py-2 text-sm text-muted-foreground">No umas found.</p>
                          )}
                        </div>
                        {assignUmaId && (
                          <p className="text-xs text-muted-foreground">
                            Selected:{" "}
                            <span className="font-medium text-foreground">
                              {allUmas.find((u) => u.id === assignUmaId)?.name}
                            </span>
                          </p>
                        )}
                      </div>

                      {/* Skill searchable list */}
                      <div className="space-y-2">
                        <Label>Select Skill</Label>
                        <Input
                          placeholder="Search skills..."
                          value={skillSearch}
                          onChange={(e) => setSkillSearch(e.target.value)}
                        />
                        <div className="border rounded-md max-h-40 overflow-y-auto">
                          {allSkills
                            .filter((s) => s.name.toLowerCase().includes(skillSearch.toLowerCase()))
                            .map((s) => (
                              <button
                                key={s.id}
                                type="button"
                                onClick={() => setAssignSkillId(s.id)}
                                className={`w-full text-left px-3 py-2 text-sm hover:bg-muted/60 transition-colors ${
                                  assignSkillId === s.id ? "bg-primary/10 font-medium text-primary" : ""
                                }`}
                              >
                                <span className="font-medium">{s.name}</span>
                                <span className="block text-xs text-muted-foreground truncate">
                                  {s.description}
                                </span>
                              </button>
                            ))}
                          {allSkills.filter((s) =>
                            s.name.toLowerCase().includes(skillSearch.toLowerCase())
                          ).length === 0 && (
                            <p className="px-3 py-2 text-sm text-muted-foreground">No skills found.</p>
                          )}
                        </div>
                        {assignSkillId && (
                          <p className="text-xs text-muted-foreground">
                            Selected:{" "}
                            <span className="font-medium text-foreground">
                              {allSkills.find((s) => s.id === assignSkillId)?.name}
                            </span>
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button
                        type="submit"
                        disabled={isAssigning || !assignUmaId || !assignSkillId}
                      >
                        {isAssigning ? "Assigning..." : "Assign Skill"}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>

              {/* CSV Import Dialog */}
              <Dialog open={showCsvDialog} onOpenChange={(open) => {
                setShowCsvDialog(open);
                if (!open) { setImportResult(null); setCsvFile(null); }
              }}>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Import Umas from CSV</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      UTF-8 CSV, max 50KB. Supported columns:
                    </p>
                    <div className="rounded-md bg-muted/60 px-3 py-2 text-xs font-mono text-muted-foreground space-y-0.5">
                      <p><span className="text-foreground font-semibold">name</span> — required</p>
                      <p><span className="text-foreground">avatar_url</span> — optional</p>
                      <p><span className="text-foreground">skill_name</span> — optional</p>
                      <p><span className="text-foreground">skill_description</span> — optional, used with skill_name</p>
                    </div>
                    <form onSubmit={handleCsvImport} className="flex items-end gap-3">
                      <div className="flex-1">
                        <Label htmlFor="csv-upload">CSV File</Label>
                        <Input
                          id="csv-upload"
                          type="file"
                          accept=".csv"
                          onChange={(e) => {
                            setImportResult(null);
                            setCsvFile(e.target.files?.[0] ?? null);
                          }}
                        />
                      </div>
                      <Button type="submit" disabled={isImporting || !csvFile}>
                        {isImporting ? "Importing..." : "Import"}
                      </Button>
                    </form>

                    {importResult && (
                      <div className="space-y-2">
                        <div className="flex gap-4 text-sm">
                          <span className="text-green-600 font-medium">{importResult.created} created</span>
                          <span className="text-muted-foreground">{importResult.skipped} skipped</span>
                          {importResult.error_count > 0 && (
                            <span className="text-destructive font-medium">{importResult.error_count} errors</span>
                          )}
                        </div>
                        {importResult.errors.length > 0 && (
                          <div className="border rounded-md overflow-x-auto max-h-48">
                            <table className="min-w-full text-sm">
                              <thead className="bg-muted/60">
                                <tr>
                                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Row</th>
                                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Name</th>
                                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Reason</th>
                                </tr>
                              </thead>
                              <tbody>
                                {importResult.errors.map((err, i) => (
                                  <tr key={i} className="border-t">
                                    <td className="px-3 py-2 text-muted-foreground">{err.row}</td>
                                    <td className="px-3 py-2 font-mono">{err.name}</td>
                                    <td className="px-3 py-2 text-destructive">{err.reason}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
              </>}

              {umaTab === "list" && (
                <div className="space-y-4">
                  {/* Search + filter bar */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Input
                      placeholder="Search by name..."
                      value={umaListSearch}
                      onChange={(e) => setUmaListSearch(e.target.value)}
                      className="sm:max-w-xs"
                    />
                    <div className="flex rounded-md border overflow-hidden shrink-0 flex-wrap">
                      {(["all", "active", "disabled", "has_skills", "no_skills"] as const).map((f) => (
                        <button
                          key={f}
                          onClick={() => setUmaListFilter(f)}
                          className={`px-3 py-1.5 text-xs font-medium transition-colors border-r last:border-r-0 ${
                            umaListFilter === f
                              ? "bg-primary text-primary-foreground"
                              : "hover:bg-muted/60 text-muted-foreground"
                          }`}
                        >
                          {f === "all" ? "All" : f === "active" ? "Active" : f === "disabled" ? "Disabled" : f === "has_skills" ? "Has Skills" : "No Skills"}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Table */}
                  <Card>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                          <thead className="bg-muted/60 border-b">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Avatar</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Name</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Skills</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {isLoadingUmas ? (
                              <tr>
                                <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                                  Loading...
                                </td>
                              </tr>
                            ) : filteredUmas.length === 0 ? (
                              <tr>
                                <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                                  No Umas found.
                                </td>
                              </tr>
                            ) : (
                              filteredUmas.map((uma) => (
                                <tr
                                  key={uma.id}
                                  className={`border-t hover:bg-muted/30 transition-colors cursor-pointer ${!uma.is_active ? "opacity-50" : ""}`}
                                  onClick={() => setViewingUma(uma)}
                                >
                                  <td className="px-4 py-3">
                                    {uma.avatar_url ? (
                                      <img
                                        src={uma.avatar_url}
                                        alt={uma.name}
                                        className="h-9 w-9 rounded-full object-cover"
                                      />
                                    ) : (
                                      <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-lg">
                                        🐴
                                      </div>
                                    )}
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium">{uma.name}</span>
                                      {!uma.is_active && (
                                        <Badge variant="outline" className="text-[10px] text-muted-foreground">
                                          Disabled
                                        </Badge>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3">
                                    {uma.skills.length === 0 ? (
                                      <span className="text-xs text-muted-foreground">—</span>
                                    ) : (
                                      <div className="flex flex-wrap gap-1">
                                        {uma.skills.map((skill) => (
                                          <Badge key={skill.id} variant="secondary" className="text-xs">
                                            {skill.name}
                                          </Badge>
                                        ))}
                                      </div>
                                    )}
                                  </td>
                                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                    <div className="flex gap-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => openEditDialog(uma)}
                                      >
                                        Edit
                                      </Button>
                                      <Button
                                        variant={uma.is_active ? "destructive" : "outline"}
                                        size="sm"
                                        onClick={() => handleToggleUmaActive(uma)}
                                      >
                                        {uma.is_active ? "Disable" : "Enable"}
                                      </Button>
                                    </div>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>

                  {/* View Uma Dialog */}
                  <Dialog open={!!viewingUma} onOpenChange={(open) => { if (!open) setViewingUma(null); }}>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>{viewingUma?.name}</DialogTitle>
                      </DialogHeader>
                      {viewingUma && (
                        <>
                          <div className="space-y-4">
                            <div className="flex items-center gap-4">
                              {viewingUma.avatar_url ? (
                                <img
                                  src={viewingUma.avatar_url}
                                  alt={viewingUma.name}
                                  className="h-16 w-16 rounded-full object-cover border"
                                />
                              ) : (
                                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center text-3xl border">
                                  🐴
                                </div>
                              )}
                              <div>
                                <p className="font-semibold text-lg">{viewingUma.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {viewingUma.skills.length === 0
                                    ? "No skills assigned"
                                    : `${viewingUma.skills.length} skill${viewingUma.skills.length > 1 ? "s" : ""}`}
                                </p>
                              </div>
                            </div>
                            {viewingUma.skills.length > 0 && (
                              <div className="space-y-2">
                                <p className="text-sm font-medium">Skills</p>
                                <div className="space-y-2">
                                  {viewingUma.skills.map((skill) => (
                                    <div key={skill.id} className="rounded-md border px-3 py-2">
                                      <p className="text-sm font-medium">{skill.name}</p>
                                      <p className="text-xs text-muted-foreground mt-0.5">{skill.description}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                          <DialogFooter>
                            <Button
                              onClick={() => {
                                openEditDialog(viewingUma);
                                setViewingUma(null);
                              }}
                            >
                              Edit Uma
                            </Button>
                          </DialogFooter>
                        </>
                      )}
                    </DialogContent>
                  </Dialog>

                  {/* Edit Uma Dialog */}
                  <Dialog open={!!editingUma} onOpenChange={(open) => { if (!open) setEditingUma(null); }}>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Edit Uma</DialogTitle>
                      </DialogHeader>
                      {editingUma && (
                        <form onSubmit={handleUpdateUma} className="space-y-4">
                          <div>
                            <Label htmlFor="edit-uma-name">Name</Label>
                            <Input
                              id="edit-uma-name"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor="edit-uma-avatar">
                              Avatar URL{" "}
                              <span className="text-muted-foreground font-normal text-xs">(optional)</span>
                            </Label>
                            <Input
                              id="edit-uma-avatar"
                              value={editAvatarUrl}
                              onChange={(e) => setEditAvatarUrl(e.target.value)}
                              placeholder="https://..."
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Assigned Skills</Label>
                            {editingUma.skills.length === 0 ? (
                              <p className="text-sm text-muted-foreground">No skills assigned.</p>
                            ) : (
                              <div className="space-y-1.5">
                                {editingUma.skills.map((skill) => (
                                  <div
                                    key={skill.id}
                                    className="flex items-start justify-between gap-2 rounded-md border px-3 py-2"
                                  >
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium">{skill.name}</p>
                                      <p className="text-xs text-muted-foreground truncate">{skill.description}</p>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleUnassignSkill(skill.id)}
                                      className="text-muted-foreground hover:text-destructive transition-colors text-xl leading-none shrink-0 mt-0.5"
                                      title="Remove skill"
                                    >
                                      ×
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-between gap-2">
                            <Button
                              type="button"
                              variant={editingUma.is_active ? "destructive" : "outline"}
                              onClick={() => { handleToggleUmaActive(editingUma); setEditingUma(null); }}
                            >
                              {editingUma.is_active ? "Disable Uma" : "Enable Uma"}
                            </Button>
                            <div className="flex gap-2 justify-end">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => setEditingUma(null)}
                              >
                                Cancel
                              </Button>
                              <Button type="submit" disabled={isUpdatingUma}>
                                {isUpdatingUma ? "Saving..." : "Save Changes"}
                              </Button>
                            </div>
                          </DialogFooter>
                        </form>
                      )}
                    </DialogContent>
                  </Dialog>
                </div>
              )}
            </div>
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

