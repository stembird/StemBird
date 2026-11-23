import mammoth from 'mammoth'
import WordExtractor from 'word-extractor'
import { extractTextFromPdfBuffer } from './pdfText'

const MIN_CV_TEXT_LENGTH = 50

function getFileFormat(fileName: string, fileType: string): 'pdf' | 'doc' | 'docx' | 'text' | null {
  const extension = fileName.toLowerCase().split('.').pop()

  if (fileType === 'application/pdf' || extension === 'pdf') return 'pdf'
  if (fileType === 'application/msword' || extension === 'doc') return 'doc'
  if (
    fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    extension === 'docx'
  ) {
    return 'docx'
  }
  if (fileType === 'text/plain' || extension === 'txt') return 'text'
  return null
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  try {
    const text = await extractTextFromPdfBuffer(buffer)
    if (text.length >= MIN_CV_TEXT_LENGTH) return text
  } catch (error) {
    console.warn(
      '[cvTextExtraction] PDF text extraction failed; trying Gemini OCR',
      error instanceof Error ? error.message : error
    )
  }

  const apiKey = [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
  ].find((key): key is string => Boolean(key?.trim()))

  if (!apiKey) {
    throw new Error(
      'Could not extract text from this PDF. It may be scanned; please upload a searchable PDF or DOCX.'
    )
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 12000)

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                inline_data: {
                  mime_type: 'application/pdf',
                  data: buffer.toString('base64'),
                },
              },
              {
                text: 'Extract all text from this CV. Preserve its structure and return only the extracted text.',
              },
            ],
          }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 8192 },
        }),
        signal: controller.signal,
      }
    )

    if (!response.ok) {
      throw new Error(`Gemini PDF extraction failed (${response.status})`)
    }

    const result = await response.json()
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
    if (text && text.length >= MIN_CV_TEXT_LENGTH) return text
    throw new Error(
      'Could not extract sufficient text from this PDF. Please upload a searchable PDF or DOCX.'
    )
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('PDF text extraction timed out. Please try again or upload a searchable PDF.')
    }
    throw error
  } finally {
    clearTimeout(timeout)
  }
}

export async function extractCVText(
  fileName: string,
  fileType: string,
  buffer: Buffer
): Promise<string> {
  const format = getFileFormat(fileName, fileType)
  let text: string

  switch (format) {
    case 'pdf':
      text = await extractPdfText(buffer)
      break
    case 'doc':
      text = (await new WordExtractor().extract(buffer)).getBody()
      break
    case 'docx':
      text = (await mammoth.extractRawText({ buffer })).value
      break
    case 'text':
      text = new TextDecoder('utf-8').decode(buffer)
      break
    default:
      throw new Error('Unsupported file type. Please use PDF, Word, or text files.')
  }

  const normalizedText = text.replace(/\s+/g, ' ').trim()
  if (normalizedText.length < MIN_CV_TEXT_LENGTH) {
    throw new Error(
      'Could not extract sufficient text from the file. Please check that it is not empty or corrupted.'
    )
  }
  return normalizedText
}
