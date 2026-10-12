const fs = require('fs');
const path = require('path');

const hook = `'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

/** Reads a single app_settings key. Returns null while loading. */
export function useAppSetting(key: string): boolean | null {
  const [value, setValue] = useState<boolean | null>(null);

  useEffect(() => {
    supabase
      .from('app_settings' as any)
      .select('value')
      .eq('key', key)
      .single()
      .then(({ data }) => {
        const row = data as unknown as { value: string } | null;
        setValue(row ? row.value === 'true' : true);
      });
  }, [key]);

  return value;
}

/** Updates a single app_settings key. Admin only. */
export async function setAppSetting(key: string, value: boolean): Promise<void> {
  const { error } = await supabase
    .from('app_settings' as any)
    .upsert({ key, value: String(value), updated_at: new Date().toISOString() });
  if (error) throw error;
}
`;

const whatsapp = `import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle } from "lucide-react";
import { useAppSetting } from "@/hooks/useAppSettings";

const WhatsAppButton = () => {
  const whatsappEnabled = useAppSetting('whatsapp_enabled');
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const buttonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY < lastScrollY || currentScrollY < 100) {
        setIsVisible(true);
      } else if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false);
      }
      setLastScrollY(currentScrollY);
    };
    if (typeof window !== "undefined") {
      window.addEventListener("scroll", handleScroll, { passive: true });
      return () => {
        try { window.removeEventListener("scroll", handleScroll); } catch (e) {}
      };
    }
  }, [lastScrollY]);

  const handleClick = () => {
    if (typeof window !== "undefined") {
      window.open("https://wa.me/254795564135", "_blank");
    }
  };

  return (
    <AnimatePresence>
      {whatsappEnabled && isVisible && (
        <motion.div
          ref={buttonRef}
          className="fixed bottom-6 left-6 z-40"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.8 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          <button
            onClick={handleClick}
            className="bg-green-500 hover:bg-green-600 text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-opacity-50"
            aria-label="Chat with us on WhatsApp"
          >
            <MessageCircle className="h-6 w-6 md:h-8 md:w-8" />
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-green-500"></span>
            </span>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default WhatsAppButton;
`;

const migration = `-- App-wide feature flag settings table
CREATE TABLE IF NOT EXISTS app_settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed default: WhatsApp enabled
INSERT INTO app_settings (key, value)
VALUES ('whatsapp_enabled', 'true')
ON CONFLICT (key) DO NOTHING;

-- Public read (so the floating button can check without auth)
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read app_settings"
  ON app_settings FOR SELECT
  USING (true);

-- Only admins can update
CREATE POLICY "Admins can update app_settings"
  ON app_settings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
`;

const base = path.join(__dirname, 'src');
fs.writeFileSync(path.join(base, 'hooks', 'useAppSettings.ts'), hook, 'utf8');
fs.writeFileSync(path.join(base, 'components', 'WhatsAppButton.tsx'), whatsapp, 'utf8');
fs.writeFileSync(
  path.join(__dirname, 'supabase', 'migrations', '20260415_create_app_settings.sql'),
  migration, 'utf8'
);

console.log('Written: useAppSettings.ts, WhatsAppButton.tsx, migration');
