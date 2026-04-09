import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import * as authService from "@/services/authService";
import type { User as BackendUser } from "@/services/authService";
import * as umaService from "@/services/umaService";
import type { BaseUma, CsvImportResult, Skill, SkillAdmin } from "@/services/umaService";
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
import { Lock, User, LayoutDashboard, Users, Trophy, Settings, ChevronRight, Upload, Flag, AlertTriangle } from "lucide-react";
import * as eventsService from "@/services/eventsService";
import type { Track, TrackWriteData, DistCategory, TrackDirection, TrackType, RaceEvent, RaceEventWriteData, RaceEventUpdateData, RaceStatus, RaceResultInput, RaceParticipant } from "@/services/eventsService";
import { toast } from "sonner";
import { getSystemSettings, updateSystemSettings } from "@/services/settingsService";

const AdminPanel: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, login } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeSection, setActiveSection] = useState<"dashboard" | "users" | "umamusume" | "races" | "settings">(
    "dashboard"
  );

  // ── Tracks state ──
  const [tracks, setTracks] = useState<Track[]>([]);
  const [tracksLoading, setTracksLoading] = useState(false);
  const [trackSearch, setTrackSearch] = useState("");
  const [showCreateTrackForm, setShowCreateTrackForm] = useState(false);
  const [editingTrack, setEditingTrack] = useState<Track | null>(null);
  const [trackDeleteConfirmId, setTrackDeleteConfirmId] = useState<number | null>(null);
  const [isSavingTrack, setIsSavingTrack] = useState(false);

  const EMPTY_TRACK_FORM: TrackWriteData = {
    name: "", image: "", distance: "",
    dist_category: "Sprint", direction: "right", track_type: "turf",
  };
  const [trackForm, setTrackForm] = useState<TrackWriteData>(EMPTY_TRACK_FORM);

  // ── Race Events state ──
  const [raceEvents, setRaceEvents] = useState<RaceEvent[]>([]);
  const [racesLoading, setRacesLoading] = useState(false);
  const [raceSearch, setRaceSearch] = useState("");
  const [showCreateRaceForm, setShowCreateRaceForm] = useState(false);
  const [editingRace, setEditingRace] = useState<RaceEvent | null>(null);
  const [raceDeleteConfirmId, setRaceDeleteConfirmId] = useState<number | null>(null);
  const [isSavingRace, setIsSavingRace] = useState(false);
  const RACE_STATUSES: RaceStatus[] = ['scheduled', 'open', 'active', 'race_ongoing', 'completed'];

  const EMPTY_RACE_FORM: RaceEventWriteData = {
    track: null, opening_dt: null, is_published: false,
    active_dt: null, race_start_dt: null, race_end_dt: null,
  };
  const [raceForm, setRaceForm] = useState<RaceEventWriteData>(EMPTY_RACE_FORM);
  const [raceEditForm, setRaceEditForm] = useState<RaceEventUpdateData>({});

  // Set results dialog
  const [setResultsRace, setSetResultsRace] = useState<RaceEvent | null>(null);
  const [resultAssignments, setResultAssignments] = useState<Record<number, string>>({});
  const [isSavingResults, setIsSavingResults] = useState(false);

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
  const [umaTab, setUmaTab] = useState<"setup" | "list" | "skills">("setup");

  // Session timeout settings
  const [sessionTimeout, setSessionTimeout] = useState(30);
  const [sessionWarning, setSessionWarning] = useState(5);
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);

  // Skills tab
  const [managedSkills, setManagedSkills] = useState<SkillAdmin[]>([]);
  const [skillsLoading, setSkillsLoading] = useState(false);
  const [skillTabSearch, setSkillTabSearch] = useState("");
  const [editingSkill, setEditingSkill] = useState<SkillAdmin | null>(null);
  const [editSkillName, setEditSkillName] = useState("");
  const [editSkillDescription, setEditSkillDescription] = useState("");
  const [isSavingSkill, setIsSavingSkill] = useState(false);
  const [skillDeleteConfirmId, setSkillDeleteConfirmId] = useState<number | null>(null);
  const [umaListSearch, setUmaListSearch] = useState("");
  const [umaListFilter, setUmaListFilter] = useState<"all" | "active" | "disabled" | "has_skills" | "no_skills">("all");
  const [viewingUma, setViewingUma] = useState<BaseUma | null>(null);

  // Edit Uma
  const [editingUma, setEditingUma] = useState<BaseUma | null>(null);
  const [editName, setEditName] = useState("");
  const [editAvatarUrl, setEditAvatarUrl] = useState("");
  const [isUpdatingUma, setIsUpdatingUma] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const [newUser, setNewUser] = useState({
    username: "",
    email: "",
    full_name: "",
    phone_number: "",
    password: "",
    password_confirm: "",
  });

  const isAdmin = user?.isStaff && user?.isSuperuser;

  // Validation patterns — mirror backend regex rules exactly
  const USERNAME_REGEX = /^[a-zA-Z0-9_]+$/;
  const FULL_NAME_REGEX = /^[a-zA-Z\s\-\.']+$/;
  const PHONE_REGEX = /^\+?[0-9\s\-\(\)]{7,20}$/;
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const URL_REGEX = /^https?:\/\/.+/;
  const HTML_PATTERN = /<[^>]+>/;
  const XSS_PATTERN = /(javascript\s*:|on\w+\s*=|<script)/i;

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
    if (isAuthenticated && isAdmin && activeSection === "races") {
      loadTracks();
      loadRaceEvents();
    }
    if (isAuthenticated && isAdmin && activeSection === "settings") {
      const fetchSettings = async () => {
        try {
          const data = await getSystemSettings();
          const timeoutSetting = data.settings.find(s => s.setting_key === 'SESSION_TIMEOUT_MINUTES');
          const warningSetting = data.settings.find(s => s.setting_key === 'SESSION_WARNING_MINUTES');

          if (timeoutSetting) setSessionTimeout(parseInt(timeoutSetting.setting_value));
          if (warningSetting) setSessionWarning(parseInt(warningSetting.setting_value));
        } catch (error) {
          console.error('Failed to fetch settings:', error);
        }
      };
      fetchSettings();
    }
  }, [isAuthenticated, isAdmin, activeSection]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!USERNAME_REGEX.test(newUser.username)) { toast.error("Username can only contain letters, numbers, and underscores"); return; }
    if (newUser.username.length < 3 || newUser.username.length > 30) { toast.error("Username must be between 3 and 30 characters"); return; }
    if (!EMAIL_REGEX.test(newUser.email)) { toast.error("Please enter a valid email address"); return; }
    if (newUser.full_name && !FULL_NAME_REGEX.test(newUser.full_name)) { toast.error("Full name can only contain letters, spaces, hyphens, dots, and apostrophes"); return; }
    if (newUser.phone_number && !PHONE_REGEX.test(newUser.phone_number)) { toast.error("Please enter a valid phone number"); return; }
    if (newUser.password.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    if (/^\d+$/.test(newUser.password)) { toast.error("Password cannot be entirely numeric"); return; }
    if (newUser.password !== newUser.password_confirm) { toast.error("Passwords do not match"); return; }
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
    if (!USERNAME_REGEX.test(editForm.username)) { toast.error("Username can only contain letters, numbers, and underscores"); return; }
    if (editForm.username.length < 3 || editForm.username.length > 30) { toast.error("Username must be between 3 and 30 characters"); return; }
    if (!EMAIL_REGEX.test(editForm.email)) { toast.error("Please enter a valid email address"); return; }
    if (editForm.full_name && !FULL_NAME_REGEX.test(editForm.full_name)) { toast.error("Full name can only contain letters, spaces, hyphens, dots, and apostrophes"); return; }
    if (editForm.phone_number && !PHONE_REGEX.test(editForm.phone_number)) { toast.error("Please enter a valid phone number"); return; }

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
    const trimmedUmaName = newUmaName.trim();
    if (!trimmedUmaName) { toast.error("Uma name cannot be empty"); return; }
    if (trimmedUmaName.length > 100) { toast.error("Uma name cannot exceed 100 characters"); return; }
    if (HTML_PATTERN.test(trimmedUmaName)) { toast.error("Uma name must not contain HTML tags"); return; }
    if (XSS_PATTERN.test(trimmedUmaName)) { toast.error("Uma name contains invalid content"); return; }
    if (newUmaAvatarUrl) {
      if (!URL_REGEX.test(newUmaAvatarUrl)) { toast.error("Avatar URL must start with http:// or https://"); return; }
      if (XSS_PATTERN.test(newUmaAvatarUrl)) { toast.error("Avatar URL contains invalid content"); return; }
    }
    setIsCreatingUma(true);
    try {
      const uma = await umaService.adminCreateBaseUma({
        name: trimmedUmaName,
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
    setDeleteConfirmId(null);
  };

  const handleDeleteUma = async (uma: BaseUma) => {
    try {
      await umaService.adminDeleteUma(uma.id);
      setAllUmas((prev) => prev.filter((u) => u.id !== uma.id));
      setEditingUma(null);
      toast.success(`${uma.name} deleted.`);
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Failed to delete Uma.';
      toast.error(msg);
    }
  };

  const loadAllSkills = async () => {
    setSkillsLoading(true);
    try {
      const data = await umaService.adminGetAllSkills();
      setManagedSkills(data);
    } catch {
      toast.error('Failed to load skills.');
    } finally {
      setSkillsLoading(false);
    }
  };

  const openEditSkillDialog = (skill: SkillAdmin) => {
    setEditingSkill(skill);
    setEditSkillName(skill.name);
    setEditSkillDescription(skill.description);
    setSkillDeleteConfirmId(null);
  };

  const handleUpdateSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSkill) return;
    const trimmedName = editSkillName.trim();
    if (!trimmedName) { toast.error('Skill name cannot be empty.'); return; }
    setIsSavingSkill(true);
    try {
      const updated = await umaService.adminUpdateSkill(editingSkill.id, {
        name: trimmedName,
        description: editSkillDescription.trim(),
      });
      setManagedSkills((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      setEditingSkill(null);
      toast.success('Skill updated.');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to update skill.');
    } finally {
      setIsSavingSkill(false);
    }
  };

  const handleDeleteSkill = async (skill: SkillAdmin) => {
    try {
      await umaService.adminDeleteSkill(skill.id);
      setManagedSkills((prev) => prev.filter((s) => s.id !== skill.id));
      setEditingSkill(null);
      toast.success(`"${skill.name}" deleted.`);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to delete skill.');
    }
  };

  // ── Track handlers ──
  const loadTracks = async () => {
    setTracksLoading(true);
    try {
      const data = await eventsService.adminGetTracks();
      setTracks(data);
    } catch {
      toast.error('Failed to load tracks.');
    } finally {
      setTracksLoading(false);
    }
  };

  const handleCreateTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackForm.name.trim()) { toast.error('Track name is required.'); return; }
    setIsSavingTrack(true);
    try {
      const created = await eventsService.adminCreateTrack({
        ...trackForm,
        name: trackForm.name.trim(),
        image: trackForm.image?.trim() || undefined,
        distance: trackForm.distance?.trim() || undefined,
      });
      setTracks((prev) => [...prev, created]);
      setTrackForm(EMPTY_TRACK_FORM);
      setShowCreateTrackForm(false);
      toast.success(`Track "${created.name}" created.`);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to create track.');
    } finally {
      setIsSavingTrack(false);
    }
  };

  const openEditTrackDialog = (track: Track) => {
    setEditingTrack(track);
    setTrackForm({
      name: track.name,
      image: track.image || "",
      distance: track.distance || "",
      dist_category: track.dist_category,
      direction: track.direction,
      track_type: track.track_type,
    });
    setTrackDeleteConfirmId(null);
  };

  const handleUpdateTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTrack) return;
    if (!trackForm.name.trim()) { toast.error('Track name is required.'); return; }
    setIsSavingTrack(true);
    try {
      const updated = await eventsService.adminUpdateTrack(editingTrack.id, {
        ...trackForm,
        name: trackForm.name.trim(),
        image: trackForm.image?.trim() || undefined,
        distance: trackForm.distance?.trim() || undefined,
      });
      setTracks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      setEditingTrack(null);
      toast.success(`Track "${updated.name}" updated.`);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to update track.');
    } finally {
      setIsSavingTrack(false);
    }
  };

  const handleDeleteTrack = async (track: Track) => {
    try {
      await eventsService.adminDeleteTrack(track.id);
      setTracks((prev) => prev.filter((t) => t.id !== track.id));
      setEditingTrack(null);
      toast.success(`"${track.name}" deleted.`);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to delete track.');
    }
  };

  // ── Race Event handlers ──
  const loadRaceEvents = async () => {
    setRacesLoading(true);
    try {
      const data = await eventsService.adminGetRaceEvents();
      setRaceEvents(data);
    } catch {
      toast.error('Failed to load race events.');
    } finally {
      setRacesLoading(false);
    }
  };

  const handleCreateRaceEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingRace(true);
    try {
      const created = await eventsService.adminCreateRaceEvent(raceForm);
      setRaceEvents((prev) => [created, ...prev]);
      setRaceForm(EMPTY_RACE_FORM);
      setShowCreateRaceForm(false);
      toast.success(`Race #${created.id} created.`);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to create race event.');
    } finally {
      setIsSavingRace(false);
    }
  };

  const openEditRaceDialog = (race: RaceEvent) => {
    setEditingRace(race);
    setRaceEditForm({
      status: race.status,
      track: race.track,
      opening_dt: race.opening_dt,
      is_published: race.is_published,
      active_dt: race.active_dt,
      race_start_dt: race.race_start_dt,
      race_end_dt: race.race_end_dt,
    });
    setRaceDeleteConfirmId(null);
  };

  const handleUpdateRaceEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRace) return;
    setIsSavingRace(true);
    try {
      const updated = await eventsService.adminUpdateRaceEvent(editingRace.id, raceEditForm);
      setRaceEvents((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      setEditingRace(null);
      toast.success(`Race #${updated.id} updated.`);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to update race event.');
    } finally {
      setIsSavingRace(false);
    }
  };

  const handleDeleteRaceEvent = async (race: RaceEvent) => {
    try {
      await eventsService.adminDeleteRaceEvent(race.id);
      setRaceEvents((prev) => prev.filter((r) => r.id !== race.id));
      setEditingRace(null);
      toast.success(`Race #${race.id} deleted and bids refunded.`);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to delete race event.');
    }
  };

  const openSetResultsDialog = (race: RaceEvent) => {
    setSetResultsRace(race);
    const initial: Record<number, string> = {};
    race.participants.forEach((p) => {
      initial[p.id] = p.place != null ? String(p.place) : '';
    });
    setResultAssignments(initial);
  };

  const handleSetResults = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setResultsRace) return;
    const results: RaceResultInput[] = [];
    for (const [resultIdStr, placeStr] of Object.entries(resultAssignments)) {
      const place = parseInt(placeStr);
      if (placeStr && !isNaN(place) && place >= 1) {
        results.push({ result_id: parseInt(resultIdStr), place });
      }
    }
    if (results.length === 0) {
      toast.error('Enter at least one finishing place.');
      return;
    }
    setIsSavingResults(true);
    try {
      const updated = await eventsService.adminSetRaceResults(setResultsRace.id, results);
      setRaceEvents((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      setSetResultsRace(null);
      toast.success('Results saved.');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to save results.');
    } finally {
      setIsSavingResults(false);
    }
  };

  const handleUpdateUma = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUma) return;
    const trimmedEditName = editName.trim();
    if (!trimmedEditName) { toast.error("Uma name cannot be empty"); return; }
    if (trimmedEditName.length > 100) { toast.error("Uma name cannot exceed 100 characters"); return; }
    if (HTML_PATTERN.test(trimmedEditName)) { toast.error("Uma name must not contain HTML tags"); return; }
    if (XSS_PATTERN.test(trimmedEditName)) { toast.error("Uma name contains invalid content"); return; }
    if (editAvatarUrl) {
      if (!URL_REGEX.test(editAvatarUrl)) { toast.error("Avatar URL must start with http:// or https://"); return; }
      if (XSS_PATTERN.test(editAvatarUrl)) { toast.error("Avatar URL contains invalid content"); return; }
    }
    setIsUpdatingUma(true);
    try {
      const updated = await umaService.adminUpdateUma(editingUma.id, {
        name: trimmedEditName,
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
    const trimmedSkillName = newSkillName.trim();
    const trimmedSkillDesc = newSkillDescription.trim();
    if (!trimmedSkillName) { toast.error("Skill name cannot be empty"); return; }
    if (trimmedSkillName.length > 100) { toast.error("Skill name cannot exceed 100 characters"); return; }
    if (HTML_PATTERN.test(trimmedSkillName)) { toast.error("Skill name must not contain HTML tags"); return; }
    if (XSS_PATTERN.test(trimmedSkillName)) { toast.error("Skill name contains invalid content"); return; }
    if (trimmedSkillDesc.length > 500) { toast.error("Skill description cannot exceed 500 characters"); return; }
    if (HTML_PATTERN.test(trimmedSkillDesc)) { toast.error("Skill description must not contain HTML tags"); return; }
    if (XSS_PATTERN.test(trimmedSkillDesc)) { toast.error("Skill description contains invalid content"); return; }
    setIsCreatingSkill(true);
    try {
      const skill = await umaService.adminCreateSkill({
        name: trimmedSkillName,
        description: trimmedSkillDesc,
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

  const handleSaveSessionSettings = async () => {
    // Validation
    if (sessionTimeout < 1 || sessionTimeout > 60) {
      toast.error('Timeout must be between 1 and 60 minutes');
      return;
    }

    if (sessionWarning < 1 || sessionWarning > 10) {
      toast.error('Warning time must be between 1 and 10 minutes');
      return;
    }

    if (sessionWarning >= sessionTimeout) {
      toast.error('Warning time must be less than timeout duration');
      return;
    }

    setIsLoadingSettings(true);
    try {
      await updateSystemSettings({
        timeout_minutes: sessionTimeout,
        warning_minutes: sessionWarning,
      });
      toast.success('Session settings updated successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update settings');
    } finally {
      setIsLoadingSettings(false);
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
              variant={activeSection === "races" ? "default" : "ghost"}
              className="w-full justify-start gap-2"
              onClick={() => setActiveSection("races")}
            >
              <Flag className="h-4 w-4" />
              Race Management
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
                {activeSection === "races" && "Race Management"}
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
                <button
                  className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-1.5 ${umaTab === "skills" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                  onClick={() => { setUmaTab("skills"); loadAllSkills(); }}
                >
                  Skills
                  {managedSkills.length > 0 && (
                    <span className="inline-flex items-center justify-center rounded-full bg-muted px-1.5 text-xs font-medium">
                      {managedSkills.length}
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
                    <div className="rounded-md border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-600 dark:text-yellow-400">
                      <span className="font-semibold">Avatar images:</span> Use URLs from hotlink-friendly hosts (e.g. Imgur, GitHub raw). Most sites (Reddit, Wikis, Google) block direct image embedding and will show as broken.
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
                  <Dialog open={!!editingUma} onOpenChange={(open) => { if (!open) { setEditingUma(null); setDeleteConfirmId(null); } }}>
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
                                      <p className="text-xs text-muted-foreground">{skill.description}</p>
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
                          <DialogFooter>
                            <div className="flex w-full flex-col gap-3">
                              {/* Primary actions */}
                              <div className="flex justify-between items-center gap-2">
                                <Button
                                  type="button"
                                  variant={editingUma.is_active ? "destructive" : "outline"}
                                  onClick={() => { handleToggleUmaActive(editingUma); setEditingUma(null); }}
                                >
                                  {editingUma.is_active ? "Disable Uma" : "Enable Uma"}
                                </Button>
                                <div className="flex gap-2">
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
                              </div>
                              {/* Danger zone */}
                              <div className="border-t border-border/50 pt-3">
                                <Button
                                  type="button"
                                  variant="destructive"
                                  className="w-full"
                                  onClick={() => {
                                    if (deleteConfirmId === editingUma.id) {
                                      handleDeleteUma(editingUma);
                                      setDeleteConfirmId(null);
                                    } else {
                                      setDeleteConfirmId(editingUma.id);
                                    }
                                  }}
                                >
                                  {deleteConfirmId === editingUma.id ? "Confirm Delete? (Irreversible)" : "Delete Uma"}
                                </Button>
                              </div>
                            </div>
                          </DialogFooter>
                        </form>
                      )}
                    </DialogContent>
                  </Dialog>
                </div>
              )}

              {/* ── Skills Tab ── */}
              {umaTab === "skills" && (
                <div className="space-y-4">
                  <Input
                    placeholder="Search by skill name or Uma..."
                    value={skillTabSearch}
                    onChange={(e) => setSkillTabSearch(e.target.value)}
                    className="max-w-sm"
                  />

                  {skillsLoading ? (
                    <p className="text-sm text-muted-foreground py-8 text-center">Loading skills...</p>
                  ) : managedSkills.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-8 text-center">No skills found.</p>
                  ) : (
                    <div className="rounded-md border overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Skill</th>
                            <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">Description</th>
                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Uma</th>
                            <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {managedSkills
                            .filter((s) => {
                              const q = skillTabSearch.toLowerCase();
                              return !q || s.name.toLowerCase().includes(q) || (s.uma_name ?? "").toLowerCase().includes(q);
                            })
                            .map((skill) => (
                              <tr key={skill.id} className="hover:bg-muted/30 transition-colors">
                                <td className="px-4 py-3 font-medium">{skill.name}</td>
                                <td className="px-4 py-3 text-muted-foreground hidden md:table-cell max-w-xs truncate">{skill.description || "—"}</td>
                                <td className="px-4 py-3">
                                  {skill.uma_name ? (
                                    <span className="inline-flex items-center rounded-full bg-primary/10 text-primary px-2 py-0.5 text-xs font-medium">
                                      {skill.uma_name}
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground text-xs">Unassigned</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <Button size="sm" variant="outline" onClick={() => openEditSkillDialog(skill)}>
                                    Edit
                                  </Button>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Edit Skill Dialog */}
                  <Dialog open={!!editingSkill} onOpenChange={(open) => { if (!open) { setEditingSkill(null); setSkillDeleteConfirmId(null); } }}>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Edit Skill</DialogTitle>
                      </DialogHeader>
                      {editingSkill && (
                        <form onSubmit={handleUpdateSkill} className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="skill-name">Name</Label>
                            <Input
                              id="skill-name"
                              value={editSkillName}
                              onChange={(e) => setEditSkillName(e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="skill-desc">Description</Label>
                            <textarea
                              id="skill-desc"
                              value={editSkillDescription}
                              onChange={(e) => setEditSkillDescription(e.target.value)}
                              rows={3}
                              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                            />
                          </div>
                          {editingSkill.uma_name && (
                            <p className="text-xs text-muted-foreground">
                              Assigned to: <span className="font-medium text-foreground">{editingSkill.uma_name}</span>
                            </p>
                          )}
                          <DialogFooter>
                            <div className="flex w-full flex-col gap-3">
                              <div className="flex justify-between items-center gap-2">
                                <Button type="button" variant="outline" onClick={() => setEditingSkill(null)}>
                                  Cancel
                                </Button>
                                <Button type="submit" disabled={isSavingSkill}>
                                  {isSavingSkill ? "Saving..." : "Save Changes"}
                                </Button>
                              </div>
                              <div className="border-t border-border/50 pt-3">
                                <Button
                                  type="button"
                                  variant="destructive"
                                  className="w-full"
                                  onClick={() => {
                                    if (skillDeleteConfirmId === editingSkill.id) {
                                      handleDeleteSkill(editingSkill);
                                      setSkillDeleteConfirmId(null);
                                    } else {
                                      setSkillDeleteConfirmId(editingSkill.id);
                                    }
                                  }}
                                >
                                  {skillDeleteConfirmId === editingSkill.id ? "Confirm Delete? (Irreversible)" : "Delete Skill"}
                                </Button>
                              </div>
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

          {activeSection === "races" && (
            <div className="space-y-6">
              {/* ── Tracks ── */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Tracks</CardTitle>
                    <Button size="sm" onClick={() => { setShowCreateTrackForm((v) => !v); setTrackForm(EMPTY_TRACK_FORM); }}>
                      {showCreateTrackForm ? "Cancel" : "+ New Track"}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">

                  {/* Create form */}
                  {showCreateTrackForm && (
                    <form onSubmit={handleCreateTrack} className="rounded-md border p-4 space-y-4 bg-muted/30">
                      <h3 className="text-sm font-semibold">New Track</h3>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1">
                          <Label htmlFor="t-name">Name *</Label>
                          <Input id="t-name" value={trackForm.name} onChange={(e) => setTrackForm({ ...trackForm, name: e.target.value })} placeholder="e.g. Tokyo Racecourse" />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="t-image">Image URL</Label>
                          <Input id="t-image" value={trackForm.image || ""} onChange={(e) => setTrackForm({ ...trackForm, image: e.target.value })} placeholder="https://..." />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="t-distance">Distance</Label>
                          <Input id="t-distance" value={trackForm.distance || ""} onChange={(e) => setTrackForm({ ...trackForm, distance: e.target.value })} placeholder="e.g. 1600m" />
                        </div>
                        <div className="space-y-1">
                          <Label>Category</Label>
                          <select
                            value={trackForm.dist_category}
                            onChange={(e) => setTrackForm({ ...trackForm, dist_category: e.target.value as DistCategory })}
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          >
                            {(['Sprint', 'Mile', 'Medium', 'Long'] as DistCategory[]).map((c) => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <Label>Direction</Label>
                          <select
                            value={trackForm.direction}
                            onChange={(e) => setTrackForm({ ...trackForm, direction: e.target.value as TrackDirection })}
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          >
                            {(['left', 'right', 'straight'] as TrackDirection[]).map((d) => (
                              <option key={d} value={d} className="capitalize">{d.charAt(0).toUpperCase() + d.slice(1)}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <Label>Track Type</Label>
                          <select
                            value={trackForm.track_type}
                            onChange={(e) => setTrackForm({ ...trackForm, track_type: e.target.value as TrackType })}
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          >
                            {(['turf', 'dirt'] as TrackType[]).map((t) => (
                              <option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <Button type="submit" size="sm" disabled={isSavingTrack}>
                        {isSavingTrack ? "Creating..." : "Create Track"}
                      </Button>
                    </form>
                  )}

                  {/* Search */}
                  <Input
                    placeholder="Search tracks..."
                    value={trackSearch}
                    onChange={(e) => setTrackSearch(e.target.value)}
                    className="max-w-sm"
                  />

                  {/* Table */}
                  {tracksLoading ? (
                    <p className="text-sm text-muted-foreground py-6 text-center">Loading tracks...</p>
                  ) : tracks.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-6 text-center">No tracks yet.</p>
                  ) : (
                    <div className="rounded-md border overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                            <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">Distance</th>
                            <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">Category</th>
                            <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">Type</th>
                            <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">Direction</th>
                            <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {tracks
                            .filter((t) => !trackSearch || t.name.toLowerCase().includes(trackSearch.toLowerCase()))
                            .map((track) => (
                              <tr key={track.id} className="hover:bg-muted/30 transition-colors">
                                <td className="px-4 py-3 font-medium flex items-center gap-2">
                                  {track.image && (
                                    <img src={track.image} alt={track.name} className="h-8 w-12 rounded object-cover shrink-0" />
                                  )}
                                  {track.name}
                                </td>
                                <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{track.distance || "—"}</td>
                                <td className="px-4 py-3 hidden md:table-cell">
                                  <span className="inline-flex items-center rounded-full bg-primary/10 text-primary px-2 py-0.5 text-xs font-medium">
                                    {track.dist_category}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-muted-foreground capitalize hidden lg:table-cell">{track.track_type}</td>
                                <td className="px-4 py-3 text-muted-foreground capitalize hidden lg:table-cell">{track.direction}</td>
                                <td className="px-4 py-3 text-right">
                                  <Button size="sm" variant="outline" onClick={() => openEditTrackDialog(track)}>
                                    Edit
                                  </Button>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* ── Race Events ── */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Race Events</CardTitle>
                    <Button size="sm" onClick={() => { setShowCreateRaceForm((v) => !v); setRaceForm(EMPTY_RACE_FORM); }}>
                      {showCreateRaceForm ? "Cancel" : "+ New Race"}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Create form */}
                  {showCreateRaceForm && (
                    <form onSubmit={handleCreateRaceEvent} className="rounded-md border p-4 space-y-4 bg-muted/30">
                      <h3 className="text-sm font-semibold">New Race Event</h3>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1">
                          <Label>Track</Label>
                          <select
                            value={raceForm.track ?? ""}
                            onChange={(e) => setRaceForm({ ...raceForm, track: e.target.value ? Number(e.target.value) : null })}
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          >
                            <option value="">— No track —</option>
                            {tracks.map((t) => (
                              <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="r-opening">Opening Date</Label>
                          <Input
                            id="r-opening"
                            type="datetime-local"
                            value={raceForm.opening_dt?.slice(0, 16) ?? ""}
                            onChange={(e) => setRaceForm({ ...raceForm, opening_dt: e.target.value ? e.target.value + ':00Z' : null })}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="r-active">Active Date</Label>
                          <Input
                            id="r-active"
                            type="datetime-local"
                            value={raceForm.active_dt?.slice(0, 16) ?? ""}
                            onChange={(e) => setRaceForm({ ...raceForm, active_dt: e.target.value ? e.target.value + ':00Z' : null })}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="r-start">Race Start</Label>
                          <Input
                            id="r-start"
                            type="datetime-local"
                            value={raceForm.race_start_dt?.slice(0, 16) ?? ""}
                            onChange={(e) => setRaceForm({ ...raceForm, race_start_dt: e.target.value ? e.target.value + ':00Z' : null })}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="r-end">Race End</Label>
                          <Input
                            id="r-end"
                            type="datetime-local"
                            value={raceForm.race_end_dt?.slice(0, 16) ?? ""}
                            onChange={(e) => setRaceForm({ ...raceForm, race_end_dt: e.target.value ? e.target.value + ':00Z' : null })}
                          />
                        </div>
                        <div className="flex items-center gap-2 pt-5">
                          <Switch
                            id="r-published"
                            checked={!!raceForm.is_published}
                            onCheckedChange={(v) => setRaceForm({ ...raceForm, is_published: v })}
                          />
                          <Label htmlFor="r-published">Published</Label>
                        </div>
                      </div>
                      <Button type="submit" size="sm" disabled={isSavingRace}>
                        {isSavingRace ? "Creating..." : "Create Race"}
                      </Button>
                    </form>
                  )}

                  {/* Search */}
                  <Input
                    placeholder="Search by track or host..."
                    value={raceSearch}
                    onChange={(e) => setRaceSearch(e.target.value)}
                    className="max-w-sm"
                  />

                  {/* Table */}
                  {racesLoading ? (
                    <p className="text-sm text-muted-foreground py-6 text-center">Loading race events...</p>
                  ) : raceEvents.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-6 text-center">No race events yet.</p>
                  ) : (
                    <div className="rounded-md border overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">#</th>
                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Track</th>
                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                            <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">Host</th>
                            <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">Bids</th>
                            <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">Participants</th>
                            <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {raceEvents
                            .filter((r) => {
                              const q = raceSearch.toLowerCase();
                              return !q || (r.track_name ?? "").toLowerCase().includes(q) || r.host_username.toLowerCase().includes(q);
                            })
                            .map((race) => (
                              <tr key={race.id} className="hover:bg-muted/30 transition-colors">
                                <td className="px-4 py-3 text-muted-foreground font-mono">{race.id}</td>
                                <td className="px-4 py-3 font-medium">{race.track_name ?? <span className="text-muted-foreground">—</span>}</td>
                                <td className="px-4 py-3">
                                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                    race.status === 'completed' ? 'bg-green-500/10 text-green-600 dark:text-green-400' :
                                    race.status === 'open' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' :
                                    race.status === 'race_ongoing' ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400' :
                                    race.status === 'active' ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400' :
                                    'bg-muted text-muted-foreground'
                                  }`}>
                                    {race.status}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{race.host_username}</td>
                                <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{race.bid_count}</td>
                                <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{race.participants.length}</td>
                                <td className="px-4 py-3 text-right">
                                  <div className="flex gap-2 justify-end">
                                    <Button size="sm" variant="outline" onClick={() => openEditRaceDialog(race)}>Edit</Button>
                                    <Button size="sm" variant="outline" onClick={() => openSetResultsDialog(race)}>Results</Button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Edit Race Event Dialog */}
              <Dialog open={!!editingRace} onOpenChange={(open) => { if (!open) { setEditingRace(null); setRaceDeleteConfirmId(null); } }}>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Edit Race #{editingRace?.id}</DialogTitle>
                  </DialogHeader>
                  {editingRace && (
                    <form onSubmit={handleUpdateRaceEvent} className="space-y-4">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1">
                          <Label>Status</Label>
                          <select
                            value={raceEditForm.status ?? editingRace.status}
                            onChange={(e) => setRaceEditForm({ ...raceEditForm, status: e.target.value as RaceStatus })}
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          >
                            {RACE_STATUSES.map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <Label>Track</Label>
                          <select
                            value={raceEditForm.track ?? ""}
                            onChange={(e) => setRaceEditForm({ ...raceEditForm, track: e.target.value ? Number(e.target.value) : null })}
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          >
                            <option value="">— No track —</option>
                            {tracks.map((t) => (
                              <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <Label>Opening Date</Label>
                          <Input
                            type="datetime-local"
                            value={(raceEditForm.opening_dt ?? editingRace.opening_dt)?.slice(0, 16) ?? ""}
                            onChange={(e) => setRaceEditForm({ ...raceEditForm, opening_dt: e.target.value ? e.target.value + ':00Z' : null })}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label>Active Date</Label>
                          <Input
                            type="datetime-local"
                            value={(raceEditForm.active_dt ?? editingRace.active_dt)?.slice(0, 16) ?? ""}
                            onChange={(e) => setRaceEditForm({ ...raceEditForm, active_dt: e.target.value ? e.target.value + ':00Z' : null })}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label>Race Start</Label>
                          <Input
                            type="datetime-local"
                            value={(raceEditForm.race_start_dt ?? editingRace.race_start_dt)?.slice(0, 16) ?? ""}
                            onChange={(e) => setRaceEditForm({ ...raceEditForm, race_start_dt: e.target.value ? e.target.value + ':00Z' : null })}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label>Race End</Label>
                          <Input
                            type="datetime-local"
                            value={(raceEditForm.race_end_dt ?? editingRace.race_end_dt)?.slice(0, 16) ?? ""}
                            onChange={(e) => setRaceEditForm({ ...raceEditForm, race_end_dt: e.target.value ? e.target.value + ':00Z' : null })}
                          />
                        </div>
                        <div className="flex items-center gap-2 pt-5">
                          <Switch
                            id="re-published"
                            checked={raceEditForm.is_published ?? editingRace.is_published}
                            onCheckedChange={(v) => setRaceEditForm({ ...raceEditForm, is_published: v })}
                          />
                          <Label htmlFor="re-published">Published</Label>
                        </div>
                      </div>

                      {/* Participants */}
                      {editingRace.participants.length > 0 && (
                        <div className="space-y-2">
                          <Label>Enrolled Participants ({editingRace.participants.length})</Label>
                          <div className="rounded-md border divide-y max-h-40 overflow-y-auto">
                            {editingRace.participants.map((p) => (
                              <div key={p.id} className="px-3 py-2 flex items-center justify-between text-sm">
                                <span className="font-medium">{p.umamusume_data?.name ?? `Uma #${p.umamusume}`}</span>
                                {p.place != null && (
                                  <span className="text-xs text-muted-foreground">Place: #{p.place}</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <DialogFooter>
                        <div className="flex w-full flex-col gap-3">
                          <div className="flex justify-between items-center gap-2">
                            <Button type="button" variant="outline" onClick={() => setEditingRace(null)}>Cancel</Button>
                            <Button type="submit" disabled={isSavingRace}>
                              {isSavingRace ? "Saving..." : "Save Changes"}
                            </Button>
                          </div>
                          <div className="border-t border-border/50 pt-3">
                            <Button
                              type="button"
                              variant="destructive"
                              className="w-full"
                              onClick={() => {
                                if (raceDeleteConfirmId === editingRace.id) {
                                  handleDeleteRaceEvent(editingRace);
                                  setRaceDeleteConfirmId(null);
                                } else {
                                  setRaceDeleteConfirmId(editingRace.id);
                                }
                              }}
                            >
                              {raceDeleteConfirmId === editingRace.id ? "Confirm Delete? (Bids will be refunded)" : "Delete Race Event"}
                            </Button>
                          </div>
                        </div>
                      </DialogFooter>
                    </form>
                  )}
                </DialogContent>
              </Dialog>

              {/* Set Results Dialog */}
              <Dialog open={!!setResultsRace} onOpenChange={(open) => { if (!open) setSetResultsRace(null); }}>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Set Results — Race #{setResultsRace?.id}</DialogTitle>
                  </DialogHeader>
                  {setResultsRace && (
                    <form onSubmit={handleSetResults} className="space-y-4">
                      {setResultsRace.participants.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No participants enrolled in this race.</p>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-xs text-muted-foreground">Assign a finishing place to each participant. Leave blank to skip.</p>
                          <div className="rounded-md border divide-y">
                            {setResultsRace.participants.map((p) => (
                              <div key={p.id} className="px-3 py-2 flex items-center justify-between gap-4">
                                <span className="text-sm font-medium">{p.umamusume_data?.name ?? `Uma #${p.umamusume}`}</span>
                                <Input
                                  type="number"
                                  min={1}
                                  placeholder="Place"
                                  className="w-20 text-center"
                                  value={resultAssignments[p.id] ?? ''}
                                  onChange={(e) => setResultAssignments((prev) => ({ ...prev, [p.id]: e.target.value }))}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setSetResultsRace(null)}>Cancel</Button>
                        <Button type="submit" disabled={isSavingResults || setResultsRace.participants.length === 0}>
                          {isSavingResults ? "Saving..." : "Save Results"}
                        </Button>
                      </DialogFooter>
                    </form>
                  )}
                </DialogContent>
              </Dialog>

              {/* Edit Track Dialog */}
              <Dialog open={!!editingTrack} onOpenChange={(open) => { if (!open) { setEditingTrack(null); setTrackDeleteConfirmId(null); } }}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Edit Track</DialogTitle>
                  </DialogHeader>
                  {editingTrack && (
                    <form onSubmit={handleUpdateTrack} className="space-y-4">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1 sm:col-span-2">
                          <Label htmlFor="et-name">Name *</Label>
                          <Input id="et-name" value={trackForm.name} onChange={(e) => setTrackForm({ ...trackForm, name: e.target.value })} />
                        </div>
                        <div className="space-y-1 sm:col-span-2">
                          <Label htmlFor="et-image">Image URL</Label>
                          <Input id="et-image" value={trackForm.image || ""} onChange={(e) => setTrackForm({ ...trackForm, image: e.target.value })} placeholder="https://..." />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="et-distance">Distance</Label>
                          <Input id="et-distance" value={trackForm.distance || ""} onChange={(e) => setTrackForm({ ...trackForm, distance: e.target.value })} placeholder="e.g. 1600m" />
                        </div>
                        <div className="space-y-1">
                          <Label>Category</Label>
                          <select
                            value={trackForm.dist_category}
                            onChange={(e) => setTrackForm({ ...trackForm, dist_category: e.target.value as DistCategory })}
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          >
                            {(['Sprint', 'Mile', 'Medium', 'Long'] as DistCategory[]).map((c) => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <Label>Direction</Label>
                          <select
                            value={trackForm.direction}
                            onChange={(e) => setTrackForm({ ...trackForm, direction: e.target.value as TrackDirection })}
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          >
                            {(['left', 'right', 'straight'] as TrackDirection[]).map((d) => (
                              <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <Label>Track Type</Label>
                          <select
                            value={trackForm.track_type}
                            onChange={(e) => setTrackForm({ ...trackForm, track_type: e.target.value as TrackType })}
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          >
                            {(['turf', 'dirt'] as TrackType[]).map((t) => (
                              <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <DialogFooter>
                        <div className="flex w-full flex-col gap-3">
                          <div className="flex justify-between items-center gap-2">
                            <Button type="button" variant="outline" onClick={() => setEditingTrack(null)}>Cancel</Button>
                            <Button type="submit" disabled={isSavingTrack}>
                              {isSavingTrack ? "Saving..." : "Save Changes"}
                            </Button>
                          </div>
                          <div className="border-t border-border/50 pt-3">
                            <Button
                              type="button"
                              variant="destructive"
                              className="w-full"
                              onClick={() => {
                                if (trackDeleteConfirmId === editingTrack.id) {
                                  handleDeleteTrack(editingTrack);
                                  setTrackDeleteConfirmId(null);
                                } else {
                                  setTrackDeleteConfirmId(editingTrack.id);
                                }
                              }}
                            >
                              {trackDeleteConfirmId === editingTrack.id ? "Confirm Delete? (Irreversible)" : "Delete Track"}
                            </Button>
                          </div>
                        </div>
                      </DialogFooter>
                    </form>
                  )}
                </DialogContent>
              </Dialog>
            </div>
          )}

          {activeSection === "settings" && (
            <Card>
              <CardHeader>
                <CardTitle>Session Timeout Settings</CardTitle>
                <p className="text-sm text-muted-foreground mt-2">
                  Configure automatic logout for inactive users
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="timeout">
                    Session Timeout (minutes)
                  </Label>
                  <Input
                    id="timeout"
                    type="number"
                    min="1"
                    max="60"
                    value={sessionTimeout}
                    onChange={(e) => setSessionTimeout(parseInt(e.target.value) || 1)}
                  />
                  <p className="text-sm text-muted-foreground">
                    Users will be logged out after this many minutes of inactivity (1-60)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="warning">
                    Warning Time (minutes)
                  </Label>
                  <Input
                    id="warning"
                    type="number"
                    min="1"
                    max="10"
                    value={sessionWarning}
                    onChange={(e) => setSessionWarning(parseInt(e.target.value) || 1)}
                    disabled={sessionTimeout <= 1}
                  />
                  <p className="text-sm text-muted-foreground">
                    Show warning modal this many minutes before timeout (1-10)
                  </p>
                </div>

                <div className="flex items-center p-4 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-md">
                  <AlertTriangle className="h-5 w-5 text-amber-500 mr-3 flex-shrink-0" />
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    Current setting: Users will see a warning after <strong>{sessionTimeout - sessionWarning} minutes</strong> of inactivity,
                    then auto-logout after <strong>{sessionTimeout} minutes</strong> total.
                  </p>
                </div>

                <Button
                  onClick={handleSaveSessionSettings}
                  disabled={isLoadingSettings}
                >
                  {isLoadingSettings ? 'Saving...' : 'Save Settings'}
                </Button>
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

