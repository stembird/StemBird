/**
 * Server-side thumbnail generation utility
 * This would typically be implemented as an API endpoint
 */

interface ThumbnailOptions {
  width?: number;
  height?: number;
  backgroundColor?: string;
  textColor?: string;
}

interface JobData {
  title: string;
  company: string;
  location: string;
}

/**
 * Generate a job thumbnail as a data URL
 * Note: This function is designed to work in a browser environment
 */
export const generateJobThumbnail = async (
  jobData: JobData,
  options: ThumbnailOptions = {}
): Promise<string> => {
  const {
    width = 1200,
    height = 630,
    backgroundColor = 'hsl(210 89% 40%)', // Primary brand color
    textColor = '#ffffff'
  } = options;

  // Create canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  // Draw background
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, width, height);

  // Add gradient overlay
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, backgroundColor);
  gradient.addColorStop(1, 'hsl(199 89% 48%)'); // Accent color
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Add overlay for better text visibility
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.fillRect(0, 0, width, height);

  // Draw decorative elements
  drawDecorativeElements(ctx, width, height);

  // Draw text content
  drawTextContent(ctx, width, height, jobData, textColor);

  // Draw logo placeholder
  drawLogoPlaceholder(ctx, width, height);

  // Return as data URL
  return canvas.toDataURL('image/png');
};

const drawDecorativeElements = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
) => {
  // Draw circles for decoration
  ctx.beginPath();
  ctx.arc(width * 0.8, height * 0.2, 80, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.fill();

  ctx.beginPath();
  ctx.arc(width * 0.2, height * 0.7, 60, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.fill();

  // Draw diagonal lines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, height * 0.3);
  ctx.lineTo(width * 0.3, 0);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(width, height * 0.7);
  ctx.lineTo(width * 0.7, height);
  ctx.stroke();
};

const drawTextContent = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  jobData: JobData,
  textColor: string
) => {
  // Configure text styles
  ctx.fillStyle = textColor;
  ctx.textAlign = 'left';
  
  // Draw job title
  ctx.font = 'bold 48px system-ui, -apple-system, sans-serif';
  
  // Wrap job title if too long
  const maxTitleWidth = width * 0.7;
  const wrappedTitle = wrapText(ctx, jobData.title, maxTitleWidth);
  let yPos = height * 0.4;
  
  wrappedTitle.forEach((line, index) => {
    ctx.fillText(line, width * 0.1, yPos + (index * 55));
  });
  
  // Draw company name
  ctx.font = '36px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  yPos += wrappedTitle.length * 55 + 30;
  ctx.fillText(jobData.company, width * 0.1, yPos);
  
  // Draw location
  ctx.font = '28px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  yPos += 50;
  ctx.fillText(jobData.location, width * 0.1, yPos);
  
  // Draw branding
  ctx.font = 'bold 24px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.fillText('CareerSasa.co.ke', width * 0.1, height * 0.9);
};

const drawLogoPlaceholder = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
) => {
  // Draw a simple logo placeholder in the top right
  const logoSize = 80;
  const x = width * 0.85;
  const y = height * 0.1;
  
  // Circle background
  ctx.beginPath();
  ctx.arc(x + logoSize/2, y + logoSize/2, logoSize/2, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.fill();
  
  // Letter "C" to represent CareerSasa
  ctx.font = 'bold 48px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = 'white';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('C', x + logoSize/2, y + logoSize/2);
};

const wrapText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] => {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = words[0];

  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const width = ctx.measureText(currentLine + ' ' + word).width;
    if (width < maxWidth) {
      currentLine += ' ' + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  lines.push(currentLine);
  return lines;
};