import { NextRequest, NextResponse } from 'next/server'
import { parseCVText } from '@/lib/cvParsingServer'
import { extractCVText } from '@/lib/cvTextExtraction'

export const maxDuration = 60

const MAX_FILE_SIZE = 10 * 1024 * 1024

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file')

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Please select a CV file to parse.' }, { status: 400 })
    }

    if (!file.size) {
      return NextResponse.json({ error: 'The selected CV file is empty.' }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'CV files must be 10 MB or smaller.' },
        { status: 413 }
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const cvText = await extractCVText(file.name, file.type, buffer)
    const { response: parsedData, modelUsed } = await parseCVText(cvText)

    return NextResponse.json({
      success: true,
      data: parsedData,
      modelUsed,
      textLength: cvText.length,
    })
  } catch (error) {
    console.error('[parse-cv] CV parsing failed:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to parse CV'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
