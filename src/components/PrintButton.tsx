"use client";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export function PrintButton() {
  return (
    <Button onClick={() => window.print()} className="bg-[#0A66C2] hover:bg-[#004182] text-white">
      <Download className="mr-2 h-4 w-4" />
      Save This Page as PDF
    </Button>
  );
}
