/**
 * Deterministic HTML table → bullet list conversion for scraped job content.
 * Preserves cell text verbatim (no paraphrasing) so qualification matrices
 * from ATS boards (e.g. Oracle Cloud / KCB) stay fact-faithful.
 */

import * as cheerio from 'cheerio'
import type { Element as DomElement } from 'domhandler'

function cellText($: cheerio.CheerioAPI, cell: DomElement): string {
  return $(cell)
    .text()
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\[\d+\]/g, '') // drop footnote markers like [1]
    .trim()
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Expand a table into a rectangular grid, honouring rowspan/colspan so
 * values are not dropped when Oracle/Word paste uses merged cells.
 */
function tableToGrid($: cheerio.CheerioAPI, table: DomElement): string[][] {
  const rows = $(table).find('tr').toArray()
  const grid: string[][] = []
  const occupied: boolean[][] = []

  const ensureRow = (r: number, minCols: number) => {
    if (!grid[r]) grid[r] = []
    if (!occupied[r]) occupied[r] = []
    while (grid[r].length < minCols) grid[r].push('')
    while (occupied[r].length < minCols) occupied[r].push(false)
  }

  for (let r = 0; r < rows.length; r++) {
    ensureRow(r, 1)
    const cells = $(rows[r]).children('th,td').toArray()
    let c = 0
    for (const cell of cells) {
      while (occupied[r]?.[c]) c++
      const rowspan = Math.max(1, parseInt($(cell).attr('rowspan') || '1', 10) || 1)
      const colspan = Math.max(1, parseInt($(cell).attr('colspan') || '1', 10) || 1)
      const text = cellText($, cell)

      for (let rr = r; rr < r + rowspan; rr++) {
        for (let cc = c; cc < c + colspan; cc++) {
          ensureRow(rr, cc + 1)
          if (rr === r && cc === c) {
            grid[rr][cc] = text
          } else if (!grid[rr][cc]) {
            // Carry merged value into covered cells for faithful row reads
            grid[rr][cc] = text
          }
          occupied[rr][cc] = true
        }
      }
      c += colspan
    }
  }

  // Normalize column counts
  const width = grid.reduce((max, row) => Math.max(max, row.length), 0)
  return grid.map(row => {
    const copy = row.slice()
    while (copy.length < width) copy.push('')
    return copy.map(v => v.trim())
  })
}

function isHeaderRow(row: string[]): boolean {
  const cells = row.map(c => c.trim()).filter(Boolean)
  if (cells.length < 2) return false
  // Data rows often carry years, need-type codes, or long prose — never headers.
  if (cells.some(c => /\d+\s*years?/i.test(c))) return false
  if (cells.some(c => /^(RQ|AA|ES|DE)$/i.test(c))) return false
  if (cells.some(c => c.length > 64)) return false

  const joined = cells.join(' ').toLowerCase()
  return (
    (/particulars/.test(joined) && /detail/.test(joined)) ||
    (/need type/.test(joined) && /minimum/.test(joined)) ||
    (/detail/.test(joined) && /need type/.test(joined))
  )
}

function formatRowBullet(headers: string[] | null, row: string[]): string | null {
  const values = row.map(v => v.trim())
  if (values.every(v => !v)) return null

  // Skip rows that are identical to the header labels
  if (headers && headers.every((h, i) => !h || h === values[i])) return null

  if (headers && headers.some(Boolean)) {
    const lower = headers.map(h => h.toLowerCase())
    const particularsIdx = lower.findIndex(h => /particulars/.test(h))
    const detailIdx = lower.findIndex(h => /^detail$/.test(h.trim()))
    const fieldIdx = lower.findIndex(
      h => /specific field|qualification/.test(h) && !/particulars/.test(h)
    )
    const needIdx = lower.findIndex(h => /need type/.test(h))
    const minYearsIdx = lower.findIndex(h => /minimum/.test(h) && /year/.test(h))

    // Education / experience matrices from Oracle Cloud / KCB-style boards
    if (detailIdx >= 0 || fieldIdx >= 0 || minYearsIdx >= 0) {
      const parts: string[] = []
      if (particularsIdx >= 0 && values[particularsIdx]) parts.push(values[particularsIdx])
      if (detailIdx >= 0 && values[detailIdx]) parts.push(values[detailIdx])
      if (fieldIdx >= 0 && values[fieldIdx]) parts.push(values[fieldIdx])
      if (minYearsIdx >= 0 && values[minYearsIdx]) {
        const raw = values[minYearsIdx]
        parts.push(/\byears?\b/i.test(raw) ? raw : `${raw} year${raw === '1' ? '' : 's'}`)
      }
      let bullet = parts.join(' — ').trim()
      if (needIdx >= 0 && values[needIdx]) {
        bullet = bullet
          ? `${bullet} (Need Type: ${values[needIdx]})`
          : `Need Type: ${values[needIdx]}`
      }
      return bullet || null
    }

    const parts: string[] = []
    for (let i = 0; i < values.length; i++) {
      const value = values[i]
      if (!value) continue
      const header = (headers[i] || '').replace(/:\s*$/, '').trim()
      if (header) {
        if (header.toLowerCase() === value.toLowerCase()) parts.push(value)
        else parts.push(`${header}: ${value}`)
      } else {
        parts.push(value)
      }
    }
    const bullet = parts.join(' — ').trim()
    return bullet || null
  }

  // No headers: key — value for 2-col, else join with em dash
  const nonEmpty = values.filter(Boolean)
  if (nonEmpty.length === 0) return null
  if (nonEmpty.length === 2) return `${nonEmpty[0]} — ${nonEmpty[1]}`
  return nonEmpty.join(' — ')
}

export function tableElementToBulletListHtml(
  $: cheerio.CheerioAPI,
  table: DomElement
): string {
  const grid = tableToGrid($, table)
  if (grid.length === 0) return ''

  let start = 0
  let headers: string[] | null = null
  if (grid.length > 1 && isHeaderRow(grid[0])) {
    headers = grid[0].map(h => h.replace(/:\s*$/, '').trim())
    start = 1
  }

  const items: string[] = []
  for (let r = start; r < grid.length; r++) {
    const bullet = formatRowBullet(headers, grid[r])
    if (bullet) items.push(bullet)
  }

  if (items.length === 0) return ''
  return `<ul>${items.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
}

/**
 * Replace every <table> in HTML with an equivalent <ul><li>…</li></ul>.
 * Non-table markup is left untouched. Empty / layout-only tables are removed.
 */
export function convertHtmlTablesToBulletLists(html: string): string {
  if (!html?.trim() || !/<table[\s>]/i.test(html)) return html || ''

  const $ = cheerio.load(`<div id="ttb-root">${html}</div>`, null, false)
  const root = $('#ttb-root')

  root.find('table').each((_, table) => {
    const listHtml = tableElementToBulletListHtml($, table)
    const $table = $(table)
    const $figure = $table.parent('figure')

    if (listHtml) {
      if ($figure.length && $figure.children().length === 1) {
        $figure.replaceWith(listHtml)
      } else {
        $table.replaceWith(listHtml)
      }
    } else if ($figure.length && $figure.children().length === 1) {
      $figure.remove()
    } else {
      $table.remove()
    }
  })

  // Oracle/Word paste often wraps leftover matrix rows in footnote containers.
  root.find('div[id^=ftn], div[id^=_ftn]').each((_, el) => {
    $(el).replaceWith($(el).html() || '')
  })
  root.find('a[href^="#_ftn"], a[href^="#ftn"], a[name^="_ftn"], a[name^="ftn"]').remove()

  return root.html() || ''
}

/** True when HTML still contains a data table (pre-conversion). */
export function htmlContainsTable(html?: string | null): boolean {
  return Boolean(html && /<table[\s>]/i.test(html))
}
