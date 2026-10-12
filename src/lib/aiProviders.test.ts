/**
 * Run: npx tsx src/lib/aiProviders.test.ts
 */
import assert from 'node:assert/strict'
import { hasAIConfigured, aiProviderSummary } from './aiProviders'

// Without env keys in this process, both should report empty/false.
// (Do not read real secrets into tests.)
const prevDeepseek = process.env.DEEPSEEK_API_KEY
const prevGemini = process.env.GEMINI_API_KEY
delete process.env.DEEPSEEK_API_KEY
delete process.env.DEEPSEEK_API_KEY_2
delete process.env.GEMINI_API_KEY
delete process.env.GEMINI_API_KEY_2
delete process.env.GEMINI_API_KEY_3

assert.equal(hasAIConfigured(), false)
assert.equal(aiProviderSummary(), 'none')

process.env.DEEPSEEK_API_KEY = 'test-deepseek'
assert.equal(hasAIConfigured(), true)
assert.equal(aiProviderSummary(), 'deepseek(1)')

process.env.GEMINI_API_KEY = 'test-gemini'
assert.equal(aiProviderSummary(), 'deepseek(1) → gemini(1)')

// restore
if (prevDeepseek === undefined) delete process.env.DEEPSEEK_API_KEY
else process.env.DEEPSEEK_API_KEY = prevDeepseek
if (prevGemini === undefined) delete process.env.GEMINI_API_KEY
else process.env.GEMINI_API_KEY = prevGemini
delete process.env.DEEPSEEK_API_KEY_2
delete process.env.GEMINI_API_KEY_2
delete process.env.GEMINI_API_KEY_3

console.log('aiProviders.test.ts: all assertions passed')
