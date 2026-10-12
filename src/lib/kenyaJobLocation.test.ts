/**
 * Run: npx tsx src/lib/kenyaJobLocation.test.ts
 */
import assert from 'node:assert/strict'
import {
  detectKenyaPlaceInText,
  kenyaPostalCode,
  lookupKenyaPlace,
} from './kenyaJobLocation'

assert.equal(lookupKenyaPlace('Nairobi')?.postalCode, '00100')
assert.equal(lookupKenyaPlace('Westlands')?.postalCode, '00800')
assert.equal(lookupKenyaPlace('Eldoret')?.county, 'Uasin Gishu')
assert.equal(lookupKenyaPlace('Thika')?.locality, 'Thika')
assert.equal(kenyaPostalCode({ city: 'Mombasa' }), '80100')
assert.equal(kenyaPostalCode({ county: 'Kajiado' }), '01100')
assert.equal(kenyaPostalCode({ city: 'Naivasha' }), '20117')
assert.equal(detectKenyaPlaceInText('Westlands, Nairobi, Kenya')?.postalCode, '00800')
assert.equal(detectKenyaPlaceInText('Kitengela')?.county, 'Kajiado')
assert.equal(lookupKenyaPlace('Kenya'), null)
assert.equal(
  detectKenyaPlaceInText('Baringo County Government')?.county,
  'Baringo',
  'county governments name the workplace county'
)

console.log('kenyaJobLocation.test.ts: all assertions passed')
