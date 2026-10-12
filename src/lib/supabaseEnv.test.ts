import assert from 'node:assert/strict'
import {
  getSupabaseAnonKey,
  getSupabaseUrl,
} from './supabaseEnv'

// Simulate missing Vercel env: helpers must still return usable values.
const prevUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const prevAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const prevPub = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
const prevViteUrl = process.env.VITE_SUPABASE_URL
const prevViteKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY

delete process.env.NEXT_PUBLIC_SUPABASE_URL
delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
delete process.env.VITE_SUPABASE_URL
delete process.env.VITE_SUPABASE_PUBLISHABLE_KEY

assert.match(getSupabaseUrl(), /^https:\/\//)
assert.ok(getSupabaseAnonKey().length > 20)

if (prevUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL
else process.env.NEXT_PUBLIC_SUPABASE_URL = prevUrl
if (prevAnon === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = prevAnon
if (prevPub === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
else process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = prevPub
if (prevViteUrl === undefined) delete process.env.VITE_SUPABASE_URL
else process.env.VITE_SUPABASE_URL = prevViteUrl
if (prevViteKey === undefined) delete process.env.VITE_SUPABASE_PUBLISHABLE_KEY
else process.env.VITE_SUPABASE_PUBLISHABLE_KEY = prevViteKey

console.log('supabaseEnv fallback test: ok')
