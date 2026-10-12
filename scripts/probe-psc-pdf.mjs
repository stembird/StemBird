import fs from 'fs'
import path from 'path'
import os from 'os'
import { PDFParse } from 'pdf-parse'

const pdfPath = path.join(os.tmpdir(), 'psc-advert.pdf')
const buf = fs.readFileSync(pdfPath)
const parser = new PDFParse({ data: buf })
const result = await parser.getText()
await parser.destroy()
console.log('text length:', result.text.length)
console.log('\n--- first 5000 chars ---\n')
console.log(result.text.slice(0, 5000))
