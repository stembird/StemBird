import Head from 'next/head';

interface CanonicalTagProps {
  url: string;
}

export default function CanonicalTag({ url }: CanonicalTagProps) {
  // Ensure the URL is absolute
  const absoluteUrl = url.startsWith('http') ? url : `https://careersasa.com${url}`;
  
  return (
    <Head>
      <link rel="canonical" href={absoluteUrl} />
    </Head>
  );
}