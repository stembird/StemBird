import ThumbnailTestComponent from '@/components/ThumbnailTestPage';
import OGImageTest from '@/components/OGImageTest';

export default function ThumbnailTestPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Thumbnail Generation Test</h1>
      <p className="mb-8 text-muted-foreground">
        Test the generation of social media thumbnails for job postings.
      </p>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Existing ThumbnailTestPage component */}
        <div className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Interactive Thumbnail Generator</h2>
          <ThumbnailTestComponent />
        </div>
        
        {/* New OG Image Test component */}
        <div className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">OG Image Test</h2>
          <OGImageTest />
        </div>
      </div>
    </div>
  );
}