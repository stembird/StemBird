"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/contexts/AuthContext";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { ThemeProvider } from "next-themes";
import { Footer } from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import { LeadMagnetPopup } from "@/components/LeadMagnetPopup";
import { useState } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => {
    const defaultOptions = {
      queries: {
        staleTime: 5 * 60 * 1000,
      },
    };
    try {
      return new QueryClient({ defaultOptions });
    } catch (error) {
      console.debug('Error creating QueryClient:', error);
      return new QueryClient({
        defaultOptions: {
          queries: {
            ...defaultOptions.queries,
            retry: false,
          },
        },
      });
    }
  });

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            {children}
            <Footer />
            <WhatsAppButton />
            <LeadMagnetPopup />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}