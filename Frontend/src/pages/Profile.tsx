import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Camera, Mail, User, Calendar, Coins, Edit2, Check, X, Plus } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { toast } from "sonner";
import { useUmas } from '@/hooks/use-umas';
import { getMyBids } from "@/services/eventsService";
import type { Bid } from "@/services/eventsService";
import { StatusBadge } from "@/components/StatusBadge";

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const { user, updateAccount, uploadAvatar, isLoading } = useAuth();

  const { umas, isLoading: isLoadingUmas, fetchMyUmas } = useUmas();
  const [bids, setBids] = useState<Bid[]>([]);
  const [bidsLoading, setBidsLoading] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [editedUsername, setEditedUsername] = useState(user?.username || "");
  const [editedEmail, setEditedEmail] = useState(user?.email || "");

  useEffect(() => {
    if (user) {
      fetchMyUmas();
      setBidsLoading(true);
      getMyBids().then(setBids).catch(() => {}).finally(() => setBidsLoading(false));
    }
  }, [user, fetchMyUmas]);

  if (isLoading || isLoadingUmas) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <p>Loading...</p>
    </div>
  );
}

  if (!user) {
    navigate("/auth");
    return null;
  }

  const handleSave = async () => {
    if (!editedUsername.trim()) {
      toast.error("Username cannot be empty");
      return;
    }
    const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!editedEmail.trim() || !EMAIL_REGEX.test(editedEmail.trim())) {
      toast.error("Please enter a valid email address");
      return;
    }

    try {
      await updateAccount({
        username: editedUsername !== user.username ? editedUsername : undefined,
        email: editedEmail !== user.email ? editedEmail : undefined,
      });
      setIsEditing(false);
      toast.success("Profile updated!");
    } catch (error: any) {
      const errorMessage = error.response?.data?.username?.[0]
        || error.response?.data?.email?.[0]
        || "Failed to update profile";
      toast.error(errorMessage);
    }
  };

  const handleCancel = () => {
    setEditedUsername(user.username);
    setEditedEmail(user.email);
    setIsEditing(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB");
      return;
    }

    // Validate file type
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
    if (!validTypes.includes(file.type)) {
      toast.error("Please upload a valid image file (JPG, PNG, GIF, or WebP)");
      return;
    }

    try {
      await uploadAvatar(file);
      toast.success("Avatar uploaded successfully!");
    } catch (error) {
      toast.error("Failed to upload avatar");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Button
          variant="ghost"
          className="mb-6 -ml-2"
          onClick={() => navigate("/")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to home
        </Button>

        <div className="space-y-6">
          {/* Profile Header Card */}
          <Card className="overflow-hidden">
            <div className="h-24 gradient-primary" />
            <CardContent className="relative pt-0">
              <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 -mt-12">
                <div className="relative group">
                  <Avatar className="h-24 w-24 border-4 border-card shadow-lg">
                    <AvatarImage src={user.profilePicture} alt={user.username} />
                    <AvatarFallback className="text-2xl font-bold bg-primary/10 text-primary">
                      {user.username.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <label
                    htmlFor="avatar-upload"
                    className="absolute inset-0 flex items-center justify-center bg-foreground/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  >
                    <Camera className="h-6 w-6 text-background" />
                  </label>
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarUpload}
                  />
                </div>

                <div className="flex-1 text-center sm:text-left pb-2">
                  <h1 className="text-2xl font-display font-bold">{user.username}</h1>
                  <p className="text-muted-foreground">{user.email}</p>
                </div>

                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-accent/20">
                  <Coins className="h-5 w-5 text-accent" />
                  <span className="text-lg font-bold">{user.balance.toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Profile Details Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Profile Details</CardTitle>
                <CardDescription>Manage your account information</CardDescription>
              </div>
              {!isEditing ? (
                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={handleCancel}>
                    <X className="h-4 w-4 mr-1" />
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleSave}>
                    <Check className="h-4 w-4 mr-1" />
                    Save
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="username" className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  Username
                </Label>
                {isEditing ? (
                  <Input
                    id="username"
                    value={editedUsername}
                    onChange={(e) => setEditedUsername(e.target.value)}
                  />
                ) : (
                  <p className="text-lg font-medium">{user.username}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  Email
                </Label>
                {isEditing ? (
                  <Input
                    id="email"
                    type="email"
                    value={editedEmail}
                    onChange={(e) => setEditedEmail(e.target.value)}
                  />
                ) : (
                  <p className="text-lg font-medium">{user.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  Member Since
                </Label>
                <p className="text-lg font-medium">
                  {format(new Date(user.createdAt), "MMMM d, yyyy")}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* My Umamusumes Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>My Umamusumes</CardTitle>
                <CardDescription>Your stable of Umamusumes</CardDescription>
              </div>
              <Button asChild size="sm">
                <Link to="/umamusume/create">
                  <Plus className="h-4 w-4 mr-2" />
                  Create New
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {umas.length > 0 ? (
                <div className="grid gap-3">
                  {umas.map((uma) => (
                    <Link
                      key={uma.id}
                      to={`/umamusume/${uma.id}`}
                      className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                    >
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={uma.avatar_url || undefined} alt={uma.name} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {uma.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-semibold">{uma.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Spe: {uma.speed} | Sta: {uma.stamina} | Pow: {uma.power} | Gut: {uma.guts} | Wit: {uma.wit}
                        </p>
                      </div>
                      <div className="text-right text-sm text-muted-foreground">
                        <p>W: temp</p>
                        <p>L: temp</p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">You don't have any Umamusumes yet</p>
                  <Button asChild>
                    <Link to="/umamusume/create">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Your First Umamusume
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* My Bids Card */}
          <Card>
            <CardHeader>
              <CardTitle>My Bids</CardTitle>
              <CardDescription>Your recent betting history</CardDescription>
            </CardHeader>
            <CardContent>
              {bidsLoading ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Loading bids...</p>
              ) : bids.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">You haven't placed any bids yet.</p>
              ) : (
                <div className="space-y-2">
                  {bids.map((bid) => (
                    <Link
                      key={bid.id}
                      to={`/race/${bid.race_event}`}
                      className="flex items-center justify-between gap-3 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">
                          {bid.race_track_name ?? `Race #${bid.race_event}`}
                        </p>
                        {bid.umamusume_name && (
                          <p className="text-xs text-muted-foreground truncate">
                            Bet on {bid.umamusume_name}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {new Date(bid.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <StatusBadge status={bid.race_event_status} />
                        <span className="font-bold text-sm">{Number(bid.amount).toLocaleString()}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stats Card */}
          <Card>
            <CardHeader>
              <CardTitle>Your Stats</CardTitle>
              <CardDescription>Your betting activity</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-secondary/50 text-center">
                  <p className="text-3xl font-bold text-primary">{user.profile.total_bets_placed}</p>
                  <p className="text-sm text-muted-foreground">Total Bets</p>
                </div>
                <div className="p-4 rounded-lg bg-secondary/50 text-center">
                  <p className="text-3xl font-bold text-success">{user.profile.total_bets_won}</p>
                  <p className="text-sm text-muted-foreground">Wins</p>
                </div>
                <div className="p-4 rounded-lg bg-secondary/50 text-center">
                  <p className="text-3xl font-bold text-accent">{user.profile.win_rate.toFixed(1)}%</p>
                  <p className="text-sm text-muted-foreground">Win Rate</p>
                </div>
                <div className="p-4 rounded-lg bg-secondary/50 text-center">
                  <p className={`text-3xl font-bold ${user.profile.net_profit >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {user.profile.net_profit >= 0 ? '+' : ''}{user.profile.net_profit.toLocaleString()}
                  </p>
                  <p className="text-sm text-muted-foreground">Net Profit</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Profile;
