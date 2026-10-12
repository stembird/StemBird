"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Briefcase,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Linkedin,
  FileText,
  LayoutTemplate,
  PenLine,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavContent } from "@/hooks/useNavContent";

const careerBoostLinks = [
  {
    title: "Boost Your LinkedIn",
    href: "/services/linkedin",
    icon: Linkedin,
  },
  {
    title: "Power Your CV & Resume",
    href: "/services/cv",
    icon: FileText,
  },
  {
    title: "CV Templates",
    href: "/dashboard/career-tools",
    icon: LayoutTemplate,
  },
  {
    title: "Outstanding Cover Letters",
    href: "/services/cover-letter",
    icon: PenLine,
  },
];

const MobileNav = () => {
  const { user } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [boostOpen, setBoostOpen] = useState(false);
  const [browseOpen, setBrowseOpen] = useState(false);

  const siteName = "CareerSasa";
  const logoUrl = "/logo.png";
  const { browseLabel, links: browseLinks } = useNavContent();

  // Listen for close event from Navbar
  useEffect(() => {
    const closeMenu = () => {
      setOpen(false);
      setBoostOpen(false);
      setBrowseOpen(false);
    };
    window.addEventListener("close-mobile-menu", closeMenu);
    return () => window.removeEventListener("close-mobile-menu", closeMenu);
  }, []);

  const handleSignOut = async () => {
    try {
      // Use local scope so sign-out succeeds even if the server session is already expired
      await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
    } catch {
      // Swallow all errors — the user should always be able to sign out
    } finally {
      toast.success("Signed out successfully");
      router.push("/");
      setOpen(false);
    }
  };

  const closeMenu = () => {
    try {
      setOpen(false);
      setBoostOpen(false);
      setBrowseOpen(false);
    } catch (error) {
      console.debug("Error closing menu:", error);
    }
  };

  if (!open) {
    return (
      <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setOpen(true)}>
        <Menu className="h-5 w-5" />
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] md:hidden">
      <div className="fixed inset-0 bg-black/60" onClick={closeMenu} />
      <div className="fixed right-4 top-4 w-3/4 max-w-[300px] rounded-xl border border-border bg-background shadow-lg animate-in slide-in-from-right duration-300">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={siteName}
                  className="h-10 w-10 object-contain"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = "none";
                  }}
                />
              ) : (
                <div className="p-1.5 rounded-lg bg-gradient-primary shadow-glow">
                  <Briefcase className="h-4 w-4 text-primary-foreground" />
                </div>
              )}
              <span className="text-lg font-bold bg-gradient-primary bg-clip-text text-transparent">
                {siteName}
              </span>
            </div>
            <Button variant="ghost" size="icon" onClick={closeMenu} className="h-6 w-6">
              <X className="h-4 w-4" />
            </Button>
          </div>

          <nav className="flex flex-col gap-1">
            <div>
              <button
                type="button"
                onClick={() => setBrowseOpen(!browseOpen)}
                className="flex items-center justify-between w-full px-4 py-2 text-base font-medium rounded-md hover:bg-accent/50 transition-colors"
              >
                {browseLabel}
                <ChevronDown
                  className={`h-4 w-4 transition-transform duration-200 ${
                    browseOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
              {browseOpen && (
                <div className="ml-3 pl-3 border-l-2 border-border/50 flex flex-col gap-0.5 mt-1">
                  {browseLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={closeMenu}
                      prefetch={true}
                    >
                      <Button
                        variant="ghost"
                        className="w-full justify-start text-sm h-9 gap-2"
                      >
                        <link.icon className="h-4 w-4 text-primary shrink-0" />
                        {link.title}
                      </Button>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <Link href="/scholarships" onClick={closeMenu} prefetch={true}>
              <Button variant="ghost" className="w-full justify-start text-base">
                Scholarships
              </Button>
            </Link>

            <Link href="/companies" onClick={closeMenu} prefetch={true}>
              <Button variant="ghost" className="w-full justify-start text-base">
                Companies
              </Button>
            </Link>

            {/* Career Boost accordion */}
            <div>
              <button
                type="button"
                onClick={() => setBoostOpen(!boostOpen)}
                className="flex items-center justify-between w-full px-4 py-2 text-base font-medium rounded-md hover:bg-accent/50 transition-colors"
              >
                Career Boost
                <ChevronDown
                  className={`h-4 w-4 transition-transform duration-200 ${
                    boostOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
              {boostOpen && (
                <div className="ml-3 pl-3 border-l-2 border-border/50 flex flex-col gap-0.5 mt-1">
                  {careerBoostLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={closeMenu}
                      prefetch={true}
                    >
                      <Button
                        variant="ghost"
                        className="w-full justify-start text-sm h-9 gap-2"
                      >
                        <link.icon className="h-4 w-4 text-primary shrink-0" />
                        {link.title}
                      </Button>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <Link href="/blog" onClick={closeMenu} prefetch={true}>
              <Button variant="ghost" className="w-full justify-start text-base">
                Blog
              </Button>
            </Link>

            {user ? (
              <>
                <Link href="/dashboard" onClick={closeMenu} prefetch={true}>
                  <Button variant="ghost" className="w-full justify-start text-base">
                    Dashboard
                  </Button>
                </Link>
                <div className="pt-3 mt-2 border-t">
                  <Button
                    variant="outline"
                    className="w-full justify-start text-base hover:bg-destructive/10 hover:border-destructive/50 hover:text-destructive"
                    onClick={handleSignOut}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </Button>
                </div>
              </>
            ) : (
              <div className="pt-3 mt-2 border-t">
                <Link href="/auth" onClick={closeMenu} prefetch={true}>
                  <Button variant="ghost" className="w-full text-base mb-2">
                    Sign In
                  </Button>
                </Link>
                <Link href="/auth" onClick={closeMenu} prefetch={true}>
                  <Button variant="gradient" className="w-full text-base">
                    Get Started
                  </Button>
                </Link>
              </div>
            )}
          </nav>
        </div>
      </div>
    </div>
  );
};

export default MobileNav;
