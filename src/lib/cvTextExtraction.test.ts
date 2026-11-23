import assert from 'node:assert/strict'
import { Document, Packer, Paragraph } from 'docx'
import { extractCVText } from './cvTextExtraction'

const sampleText =
  'Software engineer with a computer science degree and five years of experience.'

function makePdf(text: string): Buffer {
  const stream = `BT /F1 12 Tf 72 720 Td (${text}) Tj ET`
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
  ]

  let pdf = '%PDF-1.4\n'
  const offsets = [0]
  for (let index = 0; index < objects.length; index += 1) {
    offsets.push(Buffer.byteLength(pdf))
    pdf += `${index + 1} 0 obj\n${objects[index]}\nendobj\n`
  }

  const xrefOffset = Buffer.byteLength(pdf)
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  pdf += offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`
  return Buffer.from(pdf)
}

async function main() {
  const text = await extractCVText('resume.txt', 'text/plain', Buffer.from(sampleText))
  assert.equal(text, sampleText)

  const pdfText = await extractCVText(
    'resume.pdf',
    'application/pdf',
    makePdf(sampleText)
  )
  assert.ok(pdfText.includes(sampleText))

  const docxBuffer = await Packer.toBuffer(
    new Document({
      sections: [{ children: [new Paragraph(sampleText)] }],
    })
  )
  const docxText = await extractCVText(
    'resume.docx',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    Buffer.from(docxBuffer)
  )
  assert.ok(docxText.includes(sampleText))

  await assert.rejects(
    extractCVText('empty.txt', 'text/plain', Buffer.from('too short')),
    /Could not extract sufficient text/
  )
  await assert.rejects(
    extractCVText('resume.rtf', 'application/rtf', Buffer.from(sampleText)),
    /Unsupported file type/
  )

  console.log('cvTextExtraction.test.ts: all assertions passed')
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
