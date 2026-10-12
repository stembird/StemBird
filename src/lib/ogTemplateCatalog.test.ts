/**
 * Run: npx tsx src/lib/ogTemplateCatalog.test.ts
 */
import assert from 'node:assert/strict'
import {
  buildShareOgImageFilePath,
  buildShareOgImagePath,
  pickOgTemplateForJob,
} from './ogTemplateCatalog'

const slug = 'call-agent'
const template = pickOgTemplateForJob(slug)
const expected = `/og/jobs/${slug}.png?template=${template}`

assert.equal(
  buildShareOgImagePath(slug),
  expected,
  'HTML og:image uses the file-like .png path Facebook will fetch'
)
assert.equal(
  buildShareOgImageFilePath(slug),
  expected,
  'Buffer media URL matches HTML og:image so the warmed CDN entry is reused'
)
assert.equal(
  buildShareOgImagePath(slug),
  buildShareOgImageFilePath(slug),
  'share path and file path stay identical'
)
assert.match(
  buildShareOgImagePath(slug),
  /\.png\?template=[245]$/,
  'canonical share URL looks like an image file'
)
assert.doesNotMatch(
  buildShareOgImagePath(slug),
  /\/api\/og\//,
  'must not use /api/og/job URLs — Facebook often skips those'
)
assert.equal(
  buildShareOgImagePath('nurse nairobi'),
  `/og/jobs/${encodeURIComponent('nurse nairobi')}.png?template=${pickOgTemplateForJob('nurse nairobi')}`,
  'encodes slugs that need URI escaping'
)

console.log('ogTemplateCatalog.test.ts: all assertions passed')
