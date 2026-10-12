import { Metadata } from 'next';
import { generateJobMetadata } from './metadata';

type Props = {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return generateJobMetadata(id);
}

export const revalidate = 600;

export default function JobLayout({ children }: Props) {
  return <>{children}</>;
}
