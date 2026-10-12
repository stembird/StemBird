import { Metadata } from "next";
import { generateScholarshipMetadata } from "./metadata";

type Props = {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return generateScholarshipMetadata(id);
}

export const revalidate = 600;

export default function ScholarshipLayout({ children }: Props) {
  return <>{children}</>;
}
