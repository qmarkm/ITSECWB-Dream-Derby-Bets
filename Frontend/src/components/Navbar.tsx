import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, Sun, Moon, User, LogOut, Coins, Menu, X, Filter, Trophy, Users as UsersIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { mockRaces, mockUmamusumes } from "@/data/mockData";
import { Umamusume } from "@/types";
import * as authService from "@/services/authService";
import type { User as BackendUser } from "@/services/authService";

type SearchFilter = "races" | "users" | "umamusumes";

export const Navbar: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [filters, setFilters] = useState<SearchFilter[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [searchedUsers, setSearchedUsers] = useState<BackendUser[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Get all umamusumes including user-created ones
  const getAllUmamusumes = (): Umamusume[] => {
    const storedUmas: Umamusume[] = JSON.parse(localStorage.getItem("userUmamusumes") || "[]");
    return [...mockUmamusumes, ...storedUmas];
  };

  const activeFilters = filters.length === 0 ? ["races", "users", "umamusumes"] : filters;

  const filteredRaces = searchQuery.trim() && activeFilters.includes("races")
    ? mockRaces
        .filter((race) =>
          race.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          race.description.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .slice(0, 3)
    : [];

  const filteredUsers = searchQuery.trim() && activeFilters.includes("users")
    ? searchedUsers.slice(0, 3)
    : [];

  const filteredUmamusumes = searchQuery.trim() && activeFilters.includes("umamusumes")
    ? getAllUmamusumes()
        .filter((uma) =>
          uma.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          uma.owner.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .slice(0, 3)
    : [];

  const hasResults = filteredRaces.length > 0 || filteredUsers.length > 0 || filteredUmamusumes.length > 0;

  // Search users from backend when query changes
  useEffect(() => {
    const searchBackendUsers = async () => {
      if (searchQuery.trim() && activeFilters.includes("users")) {
        setIsSearchingUsers(true);
        try {
          const users = await authService.searchUsers(searchQuery);
          setSearchedUsers(users);
        } catch (error) {
          console.error("Failed to search users:", error);
          setSearchedUsers([]);
        } finally {
          setIsSearchingUsers(false);
        }
      } else {
        setSearchedUsers([]);
      }
    };

    const debounceTimer = setTimeout(searchBackendUsers, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery, activeFilters]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
        setShowFilters(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setShowDropdown(value.trim().length > 0);
  };

  const handleRaceClick = (raceId: string) => {
    setShowDropdown(false);
    setSearchQuery("");
    navigate(`/race/${raceId}`);
  };

  const handleUmamusumeClick = (umaId: string) => {
    setShowDropdown(false);
    setSearchQuery("");
    navigate(`/umamusume/${umaId}`);
  };

  const handleUserClick = (username: string) => {
    setShowDropdown(false);
    setSearchQuery("");
    navigate(`/profile/${username}`);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setShowDropdown(false);
      navigate(`/?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  const toggleFilter = (filter: SearchFilter) => {
    setFilters(prev => 
      prev.includes(filter) 
        ? prev.filter(f => f !== filter)
        : [...prev, filter]
    );
  };

  const handleLogout = () => {
    logout();
    navigate("/auth");
  };

  const SearchDropdown = () => (
    <>
      {showDropdown && (hasResults || searchQuery.trim()) && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-popover border border-border rounded-lg shadow-lg z-50 overflow-hidden max-h-96 overflow-y-auto">
          {/* Races Section */}
          {filteredRaces.length > 0 && (
            <div>
              <div className="px-4 py-2 bg-secondary/50 text-xs font-semibold text-muted-foreground flex items-center gap-2">
                <Trophy className="h-3 w-3" />
                Races
              </div>
              {filteredRaces.map((race) => (
                <button
                  key={race.id}
                  onClick={() => handleRaceClick(race.id)}
                  className="w-full px-4 py-3 text-left hover:bg-accent/50 flex items-center gap-3 transition-colors border-b border-border/50 last:border-b-0"
                >
                  <span className="text-lg">🏇</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{race.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{race.description}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    race.status === 'active' ? 'bg-green-500/20 text-green-500' :
                    race.status === 'upcoming' ? 'bg-blue-500/20 text-blue-500' :
                    race.status === 'completed' ? 'bg-gray-500/20 text-gray-500' :
                    race.status === 'open' ? 'bg-yellow-500/20 text-yellow-500' :
                    'bg-red-500/20 text-red-500'
                  }`}>
                    {race.status}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Umamusumes Section */}
          {filteredUmamusumes.length > 0 && (
            <div>
              <div className="px-4 py-2 bg-secondary/50 text-xs font-semibold text-muted-foreground flex items-center gap-2">
                🐴 Umamusumes
              </div>
              {filteredUmamusumes.map((uma) => (
                <button
                  key={uma.id}
                  onClick={() => handleUmamusumeClick(uma.id)}
                  className="w-full px-4 py-3 text-left hover:bg-accent/50 flex items-center gap-3 transition-colors border-b border-border/50 last:border-b-0"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={uma.picture} alt={uma.name} />
                    <AvatarFallback>{uma.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{uma.name}</p>
                    <p className="text-xs text-muted-foreground truncate">Trainer: {uma.owner}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{uma.odds}x</span>
                </button>
              ))}
            </div>
          )}

          {/* Users Section */}
          {filteredUsers.length > 0 && (
            <div>
              <div className="px-4 py-2 bg-secondary/50 text-xs font-semibold text-muted-foreground flex items-center gap-2">
                <UsersIcon className="h-3 w-3" />
                Users
              </div>
              {filteredUsers.map((u) => (
                <button
                  key={u.id}
                  onClick={() => handleUserClick(u.username)}
                  className="w-full px-4 py-3 text-left hover:bg-accent/50 flex items-center gap-3 transition-colors border-b border-border/50 last:border-b-0"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={u.profile.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {u.username.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{u.username}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* No Results */}
          {!hasResults && searchQuery.trim() && (
            <div className="p-4 text-center text-muted-foreground text-sm">
              No results found
            </div>
          )}
        </div>
      )}
    </>
  );

  const FilterButton = () => (
    <div className="relative">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-9 w-9"
        onClick={() => setShowFilters(!showFilters)}
      >
        <Filter className={`h-4 w-4 ${filters.length > 0 ? 'text-primary' : ''}`} />
      </Button>
      {showFilters && (
        <div className="absolute top-full right-0 mt-2 bg-popover border border-border rounded-lg shadow-lg z-50 p-3 min-w-40">
          <p className="text-xs font-semibold text-muted-foreground mb-2">Filter by</p>
          <div className="space-y-2">
            {[
              { id: "races", label: "Races", icon: "🏇" },
              { id: "umamusumes", label: "Umamusumes", icon: "🐴" },
              { id: "users", label: "Users", icon: "👤" },
            ].map((f) => (
              <label key={f.id} className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={filters.includes(f.id as SearchFilter)}
                  onCheckedChange={() => toggleFilter(f.id as SearchFilter)}
                />
                <span className="text-sm">{f.icon} {f.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <nav className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-lg">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary shadow-md group-hover:shadow-glow transition-shadow">
              <span className="text-xl">🏇</span>
            </div>
            <span className="hidden sm:block text-xl font-display font-bold text-gradient">
              UmaBet
            </span>
          </Link>

          {/* Desktop Search */}
          <div ref={searchRef} className="hidden md:flex flex-1 max-w-md mx-8 relative">
            <form onSubmit={handleSearch} className="w-full flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search races, umamusumes, users..."
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  onFocus={() => searchQuery.trim() && setShowDropdown(true)}
                  className="pl-10 bg-secondary/50 border-none focus-visible:ring-primary"
                />
              </div>
              <FilterButton />
            </form>
            <SearchDropdown />
          </div>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="rounded-full"
            >
              {theme === "light" ? (
                <Moon className="h-5 w-5" />
              ) : (
                <Sun className="h-5 w-5" />
              )}
            </Button>

            {user && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/20 text-accent-foreground">
                <Coins className="h-4 w-4 text-accent" />
                <span className="font-semibold">{user.balance.toLocaleString()}</span>
              </div>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar className="h-10 w-10 border-2 border-primary/20">
                    <AvatarImage src={user?.profilePicture} alt={user?.username} />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {user?.username?.charAt(0).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end">
                <div className="flex items-center gap-3 p-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user?.profilePicture} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {user?.username?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="font-semibold">{user?.username}</span>
                    <span className="text-xs text-muted-foreground">{user?.email}</span>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/profile" className="flex items-center gap-2 cursor-pointer">
                    <User className="h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive cursor-pointer">
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 space-y-4 animate-fade-in">
            <div className="relative" ref={searchRef}>
              <form onSubmit={handleSearch} className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    onFocus={() => searchQuery.trim() && setShowDropdown(true)}
                    className="pl-10 bg-secondary/50 border-none"
                  />
                </div>
                <FilterButton />
              </form>
              <SearchDropdown />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/20">
                <Coins className="h-4 w-4 text-accent" />
                <span className="font-semibold">{user?.balance.toLocaleString()}</span>
              </div>

              <Button variant="ghost" size="icon" onClick={toggleTheme}>
                {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
              </Button>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
              <Avatar className="h-10 w-10">
                <AvatarImage src={user?.profilePicture} />
                <AvatarFallback className="bg-primary/10 text-primary">
                  {user?.username?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-semibold">{user?.username}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
            </div>

            <Button variant="outline" className="w-full" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        )}
      </div>
    </nav>
  );
};
