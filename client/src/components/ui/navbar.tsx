import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, User, LogOut, Settings } from "lucide-react";

export default function Navbar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { href: "/facilities", label: "Find Courts" },
    { href: "/matches", label: "Matches" },
  ];

  const getDashboardLink = () => {
    if (!user) return "/dashboard";
    switch (user.role) {
      case "facility_owner":
        return "/facility-owner";
      case "admin":
        return "/admin";
      default:
        return "/dashboard";
    }
  };

  const NavItems = ({ mobile = false }) => (
    <>
      {navItems.map((item) => (
        <Link key={item.href} href={item.href}>
          <a
            className={`${
              mobile
                ? "block px-3 py-2 text-base font-medium"
                : "px-3 py-2 text-sm font-medium"
            } ${
              location === item.href
                ? "text-primary"
                : "text-gray-700 hover:text-primary"
            } transition-colors`}
            onClick={() => mobile && setMobileMenuOpen(false)}
          >
            {item.label}
          </a>
        </Link>
      ))}
      {user && (
        <Link href={getDashboardLink()}>
          <a
            className={`${
              mobile
                ? "block px-3 py-2 text-base font-medium"
                : "px-3 py-2 text-sm font-medium"
            } ${
              location === getDashboardLink()
                ? "text-primary"
                : "text-gray-700 hover:text-primary"
            } transition-colors`}
            onClick={() => mobile && setMobileMenuOpen(false)}
          >
            My Bookings
          </a>
        </Link>
      )}
    </>
  );

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/">
              <a className="text-2xl font-bold text-gray-900">QuickCourt</a>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex md:items-center md:space-x-4">
            <NavItems />
          </div>

          {/* Desktop Auth */}
          <div className="hidden md:flex md:items-center md:space-x-4">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.profileImage} alt={user.username} />
                      <AvatarFallback>
                        {user.firstName[0]}{user.lastName[0]}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <div className="flex items-center justify-start gap-2 p-2">
                    <div className="flex flex-col space-y-1 leading-none">
                      <p className="font-medium">{user.firstName} {user.lastName}</p>
                      <p className="w-[200px] truncate text-sm text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </div>
                  <DropdownMenuItem asChild>
                    <Link href={getDashboardLink()}>
                      <User className="mr-2 h-4 w-4" />
                      <span>Dashboard</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={logout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="outline">Login</Button>
                </Link>
                <Link href="/signup">
                  <Button>Sign Up</Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                <div className="flex flex-col space-y-4">
                  <NavItems mobile />
                  <div className="border-t pt-4">
                    {user ? (
                      <div className="space-y-4">
                        <div className="flex items-center space-x-4">
                          <Avatar>
                            <AvatarImage src={user.profileImage} alt={user.username} />
                            <AvatarFallback>
                              {user.firstName[0]}{user.lastName[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{user.firstName} {user.lastName}</p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                        <Button onClick={logout} variant="outline" className="w-full">
                          Log out
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Link href="/login">
                          <Button variant="outline" className="w-full" onClick={() => setMobileMenuOpen(false)}>
                            Login
                          </Button>
                        </Link>
                        <Link href="/signup">
                          <Button className="w-full" onClick={() => setMobileMenuOpen(false)}>
                            Sign Up
                          </Button>
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
}
