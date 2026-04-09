import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Calendar, Trophy, TrendingUp, TrendingDown, DollarSign, Coins } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { toast } from "sonner";
import { Umamusume } from "@/types";
import { mockUmamusumes } from "@/data/mockData";
import * as authService from "@/services/authService";
import type { User } from "@/services/authService";

const UserProfile: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userUmamusumes, setUserUmamusumes] = useState<Umamusume[]>([]);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!username) {
        navigate("/");
        return;
      }

      setIsLoading(true);
      try {
        const user = await authService.getUserProfile(username);
        setProfileUser(user);

        // Get user's umamusumes from localStorage and mock data
        const storedUmas: Umamusume[] = JSON.parse(localStorage.getItem("userUmamusumes") || "[]");
        const allUmas = [...mockUmamusumes, ...storedUmas];
        const myUmas = allUmas.filter((uma) => uma.owner === user.username);
        setUserUmamusumes(myUmas);
      } catch (error) {
        console.error("Failed to fetch user profile:", error);
        toast.error("User not found");
        navigate("/");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserProfile();
  }, [username, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profileUser) {
    return null;
  }

  const hasPrivateStats = typeof profileUser.profile.win_rate === "number" && typeof profileUser.profile.net_profit === "number";
  const winRate = hasPrivateStats ? Number(profileUser.profile.win_rate).toFixed(1) : null;
  const netProfit = hasPrivateStats ? Number(profileUser.profile.net_profit) : null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Button
          variant="ghost"
          className="mb-6 -ml-2"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <div className="space-y-6">
          {/* Profile Header Card */}
          <Card className="overflow-hidden">
            <div className="h-24 gradient-primary" />
            <CardContent className="relative pt-0">
              <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 -mt-12">
                <Avatar className="h-24 w-24 border-4 border-card shadow-lg">
                  <AvatarImage src={profileUser.profile.avatar_url || undefined} alt={profileUser.username} />
                  <AvatarFallback className="text-2xl font-bold bg-primary/10 text-primary">
                    {profileUser.username.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 text-center sm:text-left pb-2">
                  <h1 className="text-2xl font-display font-bold">{profileUser.username}</h1>
                  {profileUser.profile.bio && (
                    <p className="text-sm text-muted-foreground mt-1 italic">{profileUser.profile.bio}</p>
                  )}
                  {profileUser.profile.favorite_umamusume && (
                    <p className="text-sm mt-1">
                      <span className="text-muted-foreground">Favorite:</span>{" "}
                      <span className="font-medium text-primary">{profileUser.profile.favorite_umamusume}</span>
                    </p>
                  )}
                </div>

                {typeof profileUser.profile.balance === "number" && (
                  <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-accent/20">
                    <Coins className="h-5 w-5 text-accent" />
                    <span className="text-lg font-bold">{Number(profileUser.profile.balance).toLocaleString()}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Profile Details Card */}
          <Card>
            <CardHeader>
              <CardTitle>Profile Details</CardTitle>
              <CardDescription>User information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Member Since
                </p>
                <p className="text-lg font-medium">
                  {format(new Date(profileUser.date_joined), "MMMM d, yyyy")}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* My Umamusumes Card */}
          <Card>
            <CardHeader>
              <div>
                <CardTitle>{profileUser.username}'s Umamusumes</CardTitle>
                <CardDescription>Their stable of Umamusumes</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {userUmamusumes.length > 0 ? (
                <div className="grid gap-3">
                  {userUmamusumes.map((uma) => (
                    <Link
                      key={uma.id}
                      to={`/umamusume/${uma.id}`}
                      className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                    >
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={uma.picture} alt={uma.name} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {uma.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-semibold">{uma.name}</p>
                        <p className="text-sm text-muted-foreground">Odds: {uma.odds}x</p>
                      </div>
                      <div className="text-right text-sm text-muted-foreground">
                        <p>SPD: {uma.stats?.speed || 0}</p>
                        <p>STA: {uma.stats?.stamina || 0}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">{profileUser.username} doesn't have any Umamusumes yet</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stats Card */}
          <Card>
            <CardHeader>
              <CardTitle>Betting Statistics</CardTitle>
              <CardDescription>{profileUser.username}'s betting activity</CardDescription>
            </CardHeader>
            <CardContent>
              {hasPrivateStats ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-secondary/50 text-center">
                    <Trophy className="h-6 w-6 mx-auto mb-2 text-blue-500" />
                    <p className="text-3xl font-bold text-primary">{profileUser.profile.total_bets_placed}</p>
                    <p className="text-sm text-muted-foreground">Total Bets</p>
                  </div>
                  <div className="p-4 rounded-lg bg-secondary/50 text-center">
                    <TrendingUp className="h-6 w-6 mx-auto mb-2 text-green-500" />
                    <p className="text-3xl font-bold text-success">{profileUser.profile.total_bets_won}</p>
                    <p className="text-sm text-muted-foreground">Wins</p>
                  </div>
                  <div className="p-4 rounded-lg bg-secondary/50 text-center">
                    <div className="h-6 w-6 mx-auto mb-2 flex items-center justify-center">
                      <span className="text-2xl">%</span>
                    </div>
                    <p className="text-3xl font-bold text-accent">{winRate}%</p>
                    <p className="text-sm text-muted-foreground">Win Rate</p>
                  </div>
                  <div className="p-4 rounded-lg bg-secondary/50 text-center">
                    <TrendingDown className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                    <p className={`text-3xl font-bold ${(netProfit ?? 0) >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {(netProfit ?? 0) >= 0 ? '+' : ''}{(netProfit ?? 0).toLocaleString()}
                    </p>
                    <p className="text-sm text-muted-foreground">Net Profit</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Betting stats are private for this profile.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default UserProfile;
