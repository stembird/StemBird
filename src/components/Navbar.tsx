"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { Briefcase, LogOut, Linkedin, FileText, LayoutTemplate, PenLine } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import MobileNav from "./MobileNav";
import NotificationBell from "./NotificationBell";
import { useEffect, useCallback } from "react";
import { useNavContent } from "@/hooks/useNavContent";

const careerBoostLinks = [
  {
    title: "Boost Your LinkedIn",
    href: "/services/linkedin",
    description: "Stand out to recruiters on LinkedIn",
    icon: Linkedin,
  },
  {
    title: "Power Your CV & Resume",
    href: "/services/cv",
    description: "Build a CV that gets interviews",
    icon: FileText,
  },
  {
    title: "CV Templates",
    href: "/dashboard/career-tools",
    description: "Professional, ready-to-use templates",
    icon: LayoutTemplate,
  },
  {
    title: "Outstanding Cover Letters",
    href: "/services/cover-letter",
    description: "Cover letters that make an impression",
    icon: PenLine,
  },
];

const Navbar = () => {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const siteName = "CareerSasa";
  const logoUrl = "/logo.png";
  const { browseLabel, links: browseLinks } = useNavContent();

  // Close mobile menu on route change
  useEffect(() => {
    const closeEvent = new CustomEvent("close-mobile-menu");
    window.dispatchEvent(closeEvent);
  }, [pathname]);

  const handleSignOut = useCallback(async () => {
    try {
      // Use local scope so sign-out succeeds even if the server session is already expired
      await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
    } catch {
      // Swallow all errors — the user should always be able to sign out
    } finally {
      toast.success("Signed out successfully");
      router.push("/");
    }
  }, [router]);

  return (
    <nav className="border-b border-border/50 bg-card md:bg-card/80 sticky top-0 z-40 md:backdrop-blur-xl">
      <div className="container mx-auto px-4 py-3 md:py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 md:gap-4 group" prefetch={true}>
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={siteName}
              className="h-12 w-12 md:h-16 md:w-16 object-contain transition-all duration-300 group-hover:scale-105"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = "none";
              }}
            />
          ) : (
            <div className="p-2 md:p-2.5 rounded-xl bg-gradient-primary shadow-glow transition-all duration-300 group-hover:shadow-xl group-hover:scale-110">
              <Briefcase className="h-5 w-5 md:h-6 md:w-6 text-primary-foreground" />
            </div>
          )}
          <span className="text-xl md:text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            {siteName}
          </span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-1">
          <NavigationMenu>
            <NavigationMenuList>
              <NavigationMenuItem>
                <NavigationMenuTrigger className="bg-transparent hover:bg-accent/50 data-[state=open]:bg-accent/50 font-medium h-9 px-3">
                  {browseLabel}
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <ul className="grid w-[min(340px,calc(100vw-2rem))] gap-2 p-3">
                    {browseLinks.map((link) => (
                      <li key={link.href}>
                        <NavigationMenuLink asChild>
                          <Link
                            href={link.href}
                            className="flex items-start gap-3 rounded-md p-3 hover:bg-accent/60 transition-colors no-underline outline-none focus:shadow-md"
                            prefetch={true}
                          >
                            <link.icon className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                            <div>
                              <div className="text-sm font-semibold leading-none mb-1">
                                {link.title}
                              </div>
                              <p className="text-xs text-muted-foreground leading-snug">
                                {link.description}
                              </p>
                            </div>
                          </Link>
                        </NavigationMenuLink>
                      </li>
                    ))}
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <NavigationMenuTrigger className="bg-transparent hover:bg-accent/50 data-[state=open]:bg-accent/50 font-medium h-9 px-3">
                  Career Boost
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <ul className="grid w-[340px] gap-2 p-3">
                    {careerBoostLinks.map((link) => (
                      <li key={link.href}>
                        <NavigationMenuLink asChild>
                          <Link
                            href={link.href}
                            className="flex items-start gap-3 rounded-md p-3 hover:bg-accent/60 transition-colors no-underline outline-none focus:shadow-md"
                            prefetch={true}
                          >
                            <link.icon className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                            <div>
                              <div className="text-sm font-semibold leading-none mb-1">
                                {link.title}
                              </div>
                              <p className="text-xs text-muted-foreground leading-snug">
                                {link.description}
                              </p>
                            </div>
                          </Link>
                        </NavigationMenuLink>
                      </li>
                    ))}
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>

          <Link href="/scholarships" prefetch={true}>
            <Button variant="ghost">Scholarships</Button>
          </Link>

          <Link href="/companies" prefetch={true}>
            <Button variant="ghost">Companies</Button>
          </Link>

          <Link href="/blog" prefetch={true}>
            <Button variant="ghost">Blog</Button>
          </Link>

          {user ? (
            <>
              <Link href="/dashboard" prefetch={true}>
                <Button variant="ghost">Dashboard</Button>
              </Link>
              <NotificationBell />
              <Button
                variant="outline"
                size="icon"
                onClick={handleSignOut}
                title="Sign Out"
                className="hover:bg-destructive/10 hover:border-destructive/50 hover:text-destructive"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Link href="/auth" prefetch={true}>
                <Button variant="ghost">Sign In</Button>
              </Link>
              <Link href="/auth" prefetch={true}>
                <Button variant="gradient" size="lg" className="hidden lg:flex">
                  Get Started
                </Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile Navigation */}
        <MobileNav />
      </div>
    </nav>
  );
};

export default Navbar;
