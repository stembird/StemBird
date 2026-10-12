import { NextRequest, NextResponse } from 'next/server';
import { parseCVText } from '@/lib/cvParsing';

// This route handles CV parsing
// It can receive either a file URL or a direct file upload

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';
    let fileBuffer: ArrayBuffer;
    let fileType: string;

    // Handle both FormData (file upload) and JSON (file URL)
    if (contentType.includes('multipart/form-data')) {
      // Direct file upload
      const formData = await request.formData();
      const file = formData.get('file') as File;

      if (!file) {
        return NextResponse.json(
          { error: 'File is required' },
          { status: 400 }
        );
      }

      fileType = file.type;
      fileBuffer = await file.arrayBuffer();
    } else {
      // File URL (existing functionality)
      const { fileUrl, fileType: urlFileType } = await request.json();

      if (!fileUrl) {
        return NextResponse.json(
          { error: 'File URL is required' },
          { status: 400 }
        );
      }

      fileType = urlFileType;

      // Fetch the file
      const fileResponse = await fetch(fileUrl);
      if (!fileResponse.ok) {
        throw new Error('Failed to fetch file');
      }

      fileBuffer = await fileResponse.arrayBuffer();
    }

    let cvText = '';

    // Extract text based on file type
    if (fileType === 'text/plain') {
      // Plain text file
      const textDecoder = new TextDecoder('utf-8');
      cvText = textDecoder.decode(fileBuffer);
    } else if (fileType === 'application/pdf') {
      // For PDF files, use Gemini's multimodal capabilities
      // Convert to base64 and let Gemini extract the text
      const base64Data = Buffer.from(fileBuffer).toString('base64');
      
      // Use Gemini to extract text from PDF
      const geminiApiKey = process.env.GEMINI_API_KEY || 
                          process.env.GEMINI_API_KEY_2 || 
                          process.env.GEMINI_API_KEY_3;

      if (!geminiApiKey) {
        throw new Error('No Gemini API key configured');
      }

      const extractResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${geminiApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                {
                  inline_data: {
                    mime_type: 'application/pdf',
                    data: base64Data
                  }
                },
                {
                  text: 'Extract all text content from this CV/Resume document. Return only the extracted text, preserving the structure and formatting as much as possible.'
                }
              ]
            }],
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 8192,
            }
          })
        }
      );

      if (!extractResponse.ok) {
        throw new Error('Failed to extract text from PDF');
      }

      const extractData = await extractResponse.json();
      cvText = extractData.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } else if (
      fileType === 'application/msword' ||
      fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      // For Word documents, use Gemini's multimodal capabilities
      const base64Data = Buffer.from(fileBuffer).toString('base64');
      
      const geminiApiKey = process.env.GEMINI_API_KEY || 
                          process.env.GEMINI_API_KEY_2 || 
                          process.env.GEMINI_API_KEY_3;

      if (!geminiApiKey) {
        throw new Error('No Gemini API key configured');
      }

      // Note: Gemini may not support Word docs directly, so we'll try basic extraction
      // and fall back to asking user to convert to PDF
      const textDecoder = new TextDecoder('utf-8');
      cvText = textDecoder.decode(fileBuffer);
      
      // Clean up (remove control characters and normalize whitespace)
      cvText = cvText
        .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F-\x9F]/g, '') // eslint-disable-line no-control-regex
        .replace(/\s+/g, ' ')
        .trim();

      // If extraction failed, suggest PDF
      if (!cvText || cvText.length < 100) {
        return NextResponse.json(
          { error: 'Could not extract text from Word document. Please convert to PDF and try again.' },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        { error: 'Unsupported file type. Please use PDF, Word, or text files.' },
        { status: 400 }
      );
    }

    if (!cvText || cvText.length < 50) {
      return NextResponse.json(
        { error: 'Could not extract sufficient text from the file. The file might be an image-based PDF, corrupted, or empty.' },
        { status: 400 }
      );
    }

    // Parse the CV text using Gemini
    const { response: parsedData, modelUsed } = await parseCVText(cvText);

    return NextResponse.json({
      success: true,
      data: parsedData,
      modelUsed,
      textLength: cvText.length,
    });

  } catch (error: any) {
    console.error('CV parsing error:', error);
    
    let errorMessage = 'Failed to parse CV';
    if (error.message) {
      errorMessage = error.message;
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
