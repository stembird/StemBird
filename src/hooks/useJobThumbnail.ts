import { useState, useCallback } from 'react';
import { JobThumbnailData } from '@/lib/thumbnailUtils';
import { getIndustryModelPublicPath, getModelForJob } from '@/lib/jobIndustryModel';

interface UseJobThumbnailReturn {
  generateThumbnail: (data: JobThumbnailData) => Promise<Blob | null>;
  isGenerating: boolean;
  error: string | null;
}

/** Re-export for existing imports (thumbnailTest, etc.) */
export { getModelForJob };

export const useJobThumbnail = (): UseJobThumbnailReturn => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const drawTextContent = useCallback((
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    jobTitle: string,
    company: string,
    location: string
  ) => {
    // Save the current context state
    ctx.save();
    
    // Configure text styles
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    
    // Draw job title with better positioning
    ctx.font = 'bold 48px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = 'white';
    
    // Wrap job title if too long
    const maxTitleWidth = width * 0.5;
    const wrappedTitle = wrapText(ctx, jobTitle, maxTitleWidth);
    let yPos = height * 0.3;
    
    // Draw each line of the wrapped title
    wrappedTitle.forEach((line, index) => {
      ctx.fillText(line, width * 0.1, yPos + (index * 55));
    });
    
    // Draw company name
    ctx.font = '36px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    yPos += wrappedTitle.length * 55 + 30;
    ctx.fillText(company, width * 0.1, yPos);
    
    // Draw location
    ctx.font = '28px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    yPos += 50;
    ctx.fillText(location, width * 0.1, yPos);
    
    // Draw branding
    ctx.font = 'bold 24px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fillText('CareerSasa.co.ke', width * 0.1, height * 0.9);
    
    // Draw "Apply Now" button
    drawApplyButton(ctx, width, height);
    
    // Restore the context state
    ctx.restore();
  }, []); // drawTextContent doesn't depend on any external values

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

  const drawApplyButton = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ) => {
    // Draw "Apply Now" button
    const buttonWidth = 200;
    const buttonHeight = 50;
    const buttonX = width * 0.1;
    const buttonY = height * 0.75;
    
    // Button background with brand colors
    const gradient = ctx.createLinearGradient(buttonX, buttonY, buttonX + buttonWidth, buttonY + buttonHeight);
    gradient.addColorStop(0, 'hsl(210 89% 40%)'); // Primary blue
    gradient.addColorStop(1, 'hsl(199 89% 48%)'); // Accent blue
    
    // Add shadow for depth
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 5;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    const radius = 8;
    ctx.moveTo(buttonX + radius, buttonY);
    ctx.lineTo(buttonX + buttonWidth - radius, buttonY);
    ctx.quadraticCurveTo(buttonX + buttonWidth, buttonY, buttonX + buttonWidth, buttonY + radius);
    ctx.lineTo(buttonX + buttonWidth, buttonY + buttonHeight - radius);
    ctx.quadraticCurveTo(buttonX + buttonWidth, buttonY + buttonHeight, buttonX + buttonWidth - radius, buttonY + buttonHeight);
    ctx.lineTo(buttonX + radius, buttonY + buttonHeight);
    ctx.quadraticCurveTo(buttonX, buttonY + buttonHeight, buttonX, buttonY + buttonHeight - radius);
    ctx.lineTo(buttonX, buttonY + radius);
    ctx.quadraticCurveTo(buttonX, buttonY, buttonX + radius, buttonY);
    ctx.closePath();
    ctx.fill();
    
    // Reset shadow
    ctx.shadowColor = 'transparent';
    
    // Button text
    ctx.font = 'bold 20px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Apply Now', buttonX + buttonWidth/2, buttonY + buttonHeight/2);
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

  const generateThumbnail = useCallback(async (data: JobThumbnailData): Promise<Blob | null> => {
    setIsGenerating(true);
    setError(null);
    
    try {
      // Create canvas
      const canvas = document.createElement('canvas');
      canvas.width = 1200;
      canvas.height = 630;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Failed to get canvas context');
      }
      
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw background gradient (using brand colors)
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, 'hsl(210 89% 40%)'); // Primary blue
      gradient.addColorStop(1, 'hsl(199 89% 48%)'); // Accent blue
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Add overlay for better text visibility
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Reset any shadow effects for other elements
      ctx.shadowColor = 'transparent';
      
      // Draw decorative elements
      drawDecorativeElements(ctx, canvas.width, canvas.height);
      
      // Load and draw professional image based on industry
      const category = getModelForJob(data.jobTitle, data.company);
      const imageUrl = getIndustryModelPublicPath(category);
      
      try {
        if (!imageUrl) throw new Error('Missing industry model image');
        const img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error('Failed to load image'));
          img.src = imageUrl;
        });
        
        // Creative circular frame on the right side
        const diameter = Math.min(canvas.width * 0.35, canvas.height * 0.68);
        const centerX = canvas.width * 0.78;
        const centerY = canvas.height * 0.48;
        const ringWidth = 10;
        const trimWidth = 6;

        // Soft halo
        ctx.save();
        ctx.beginPath();
        ctx.arc(centerX, centerY, diameter / 2 + 12, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
        ctx.fill();
        ctx.restore();

        // Gradient ring
        const ringGradient = ctx.createLinearGradient(
          centerX - diameter / 2,
          centerY - diameter / 2,
          centerX + diameter / 2,
          centerY + diameter / 2,
        );
        ringGradient.addColorStop(0, 'hsl(25 95% 53%)'); // orange
        ringGradient.addColorStop(0.55, 'hsl(188 94% 70%)'); // light teal
        ringGradient.addColorStop(1, '#ffffff');

        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
        ctx.shadowBlur = 16;
        ctx.shadowOffsetX = 4;
        ctx.shadowOffsetY = 8;
        ctx.beginPath();
        ctx.arc(centerX, centerY, diameter / 2, 0, Math.PI * 2);
        ctx.fillStyle = ringGradient;
        ctx.fill();
        ctx.restore();

        // White trim
        ctx.beginPath();
        ctx.arc(centerX, centerY, diameter / 2 - ringWidth, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();

        // Circular photo clip
        const photoRadius = diameter / 2 - ringWidth - trimWidth;
        ctx.save();
        ctx.beginPath();
        ctx.arc(centerX, centerY, photoRadius, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(
          img,
          centerX - photoRadius,
          centerY - photoRadius,
          photoRadius * 2,
          photoRadius * 2,
        );
        ctx.restore();

        // Accent dot on the ring
        const accentAngle = -Math.PI / 4;
        const accentR = diameter / 2 - ringWidth / 2;
        const accentX = centerX + Math.cos(accentAngle) * accentR;
        const accentY = centerY + Math.sin(accentAngle) * accentR;
        ctx.beginPath();
        ctx.arc(accentX, accentY, 10, 0, Math.PI * 2);
        ctx.fillStyle = 'hsl(25 95% 53%)';
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();
      } catch (error) {
        console.warn('Failed to load professional image, continuing without it:', error);
      }
      
      // Draw text content with improved positioning and no duplication
      drawTextContent(ctx, canvas.width, canvas.height, data.jobTitle, data.company, data.location);
      
      // Draw logo placeholder
      drawLogoPlaceholder(ctx, canvas.width, canvas.height);
      
      // Convert to blob
      return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to generate thumbnail'));
          }
        }, 'image/png');
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate thumbnail';
      setError(errorMessage);
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [drawTextContent]); // Added drawTextContent as dependency

  return {
    generateThumbnail,
    isGenerating,
    error
  };
};