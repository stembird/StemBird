"use client";

import { RequireAdmin } from "@/components/RequireAdmin";

export default function AdminSectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RequireAdmin>{children}</RequireAdmin>;
}
