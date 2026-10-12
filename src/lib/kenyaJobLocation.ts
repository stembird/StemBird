/**
 * Kenyan place → county / GPO postal-code lookups for JobPosting JSON-LD.
 *
 * Postal codes are official Posta Kenya GPO (or well-known town) codes for the
 * named place. They are used only when the job is already known to be in that
 * city or county — never as a nationwide default.
 */

import { KENYA_COUNTIES, countyKey, resolveCountyName } from './counties'

/** Posta Kenya GPO codes for the 47 county headquarters. */
const COUNTY_GPO: Record<string, string> = {
  Baringo: '30400',
  Bomet: '20400',
  Bungoma: '50200',
  Busia: '50400',
  'Elgeyo-Marakwet': '30700',
  Embu: '60100',
  Garissa: '70100',
  'Homa Bay': '40300',
  Isiolo: '60300',
  Kajiado: '01100',
  Kakamega: '50100',
  Kericho: '20200',
  Kiambu: '00900',
  Kilifi: '80108',
  Kirinyaga: '10300',
  Kisii: '40200',
  Kisumu: '40100',
  Kitui: '90200',
  Kwale: '80403',
  Laikipia: '10400',
  Lamu: '80500',
  Machakos: '90100',
  Makueni: '90300',
  Mandera: '70300',
  Marsabit: '60500',
  Meru: '60200',
  Migori: '40400',
  Mombasa: '80100',
  "Murang'a": '10200',
  Nairobi: '00100',
  Nakuru: '20100',
  Nandi: '30300',
  Narok: '20500',
  Nyamira: '40500',
  Nyandarua: '20303',
  Nyeri: '10100',
  Samburu: '20600',
  Siaya: '40600',
  'Taita–Taveta': '80300',
  'Tana River': '70101',
  'Tharaka–Nithi': '60400',
  'Trans Nzoia': '30200',
  Turkana: '30500',
  'Uasin Gishu': '30100',
  Vihiga: '50300',
  Wajir: '70200',
  'West Pokot': '30600',
}

/**
 * Town / neighbourhood → { county, postalCode?, locality? }.
 * Longer / more specific keys are matched via exact countyKey of a token.
 */
const PLACE_HINTS: Array<{
  keys: string[]
  county: string
  locality?: string
  postalCode?: string
}> = [
  { keys: ['nairobi', 'nbi', 'nairobi cbd', 'cbd'], county: 'Nairobi', locality: 'Nairobi', postalCode: '00100' },
  { keys: ['westlands'], county: 'Nairobi', locality: 'Nairobi', postalCode: '00800' },
  { keys: ['parklands'], county: 'Nairobi', locality: 'Nairobi', postalCode: '00600' },
  { keys: ['industrial area'], county: 'Nairobi', locality: 'Nairobi', postalCode: '00500' },
  { keys: ['karen'], county: 'Nairobi', locality: 'Nairobi', postalCode: '00502' },
  { keys: ['langata', 'langata'], county: 'Nairobi', locality: 'Nairobi', postalCode: '00509' },
  { keys: ['gigiri'], county: 'Nairobi', locality: 'Nairobi', postalCode: '00621' },
  { keys: ['lavington'], county: 'Nairobi', locality: 'Nairobi', postalCode: '00603' },
  { keys: ['kileleshwa', 'kilimani', 'upper hill', 'hurlingham'], county: 'Nairobi', locality: 'Nairobi', postalCode: '00100' },
  { keys: ['embakasi'], county: 'Nairobi', locality: 'Nairobi', postalCode: '00501' },
  { keys: ['kasarani'], county: 'Nairobi', locality: 'Nairobi', postalCode: '00608' },
  { keys: ['eastleigh'], county: 'Nairobi', locality: 'Nairobi', postalCode: '00610' },
  { keys: ['south c', 'south b'], county: 'Nairobi', locality: 'Nairobi', postalCode: '00200' },
  { keys: ['mombasa', 'mombasa island', 'nyali', 'bamburi', 'likoni'], county: 'Mombasa', locality: 'Mombasa', postalCode: '80100' },
  { keys: ['kisumu'], county: 'Kisumu', locality: 'Kisumu', postalCode: '40100' },
  { keys: ['nakuru'], county: 'Nakuru', locality: 'Nakuru', postalCode: '20100' },
  { keys: ['naivasha'], county: 'Nakuru', locality: 'Naivasha', postalCode: '20117' },
  { keys: ['gilgil'], county: 'Nakuru', locality: 'Gilgil', postalCode: '20116' },
  { keys: ['eldoret'], county: 'Uasin Gishu', locality: 'Eldoret', postalCode: '30100' },
  { keys: ['kitale'], county: 'Trans Nzoia', locality: 'Kitale', postalCode: '30200' },
  { keys: ['thika'], county: 'Kiambu', locality: 'Thika', postalCode: '01000' },
  { keys: ['ruiru'], county: 'Kiambu', locality: 'Ruiru', postalCode: '00232' },
  { keys: ['kikuyu'], county: 'Kiambu', locality: 'Kikuyu', postalCode: '00902' },
  { keys: ['limuru'], county: 'Kiambu', locality: 'Limuru', postalCode: '00217' },
  { keys: ['kiambu'], county: 'Kiambu', locality: 'Kiambu', postalCode: '00900' },
  { keys: ['malindi'], county: 'Kilifi', locality: 'Malindi', postalCode: '80200' },
  { keys: ['watamu'], county: 'Kilifi', locality: 'Watamu', postalCode: '80202' },
  { keys: ['kilifi'], county: 'Kilifi', locality: 'Kilifi', postalCode: '80108' },
  { keys: ['athi river', 'athis river'], county: 'Machakos', locality: 'Athi River', postalCode: '00204' },
  { keys: ['machakos'], county: 'Machakos', locality: 'Machakos', postalCode: '90100' },
  { keys: ['kitengela'], county: 'Kajiado', locality: 'Kitengela', postalCode: '00242' },
  { keys: ['ngong'], county: 'Kajiado', locality: 'Ngong', postalCode: '00208' },
  { keys: ['ongata rongai', 'rongai'], county: 'Kajiado', locality: 'Ongata Rongai', postalCode: '00511' },
  { keys: ['kajiado'], county: 'Kajiado', locality: 'Kajiado', postalCode: '01100' },
  { keys: ['nyeri'], county: 'Nyeri', locality: 'Nyeri', postalCode: '10100' },
  { keys: ['nanyuki'], county: 'Laikipia', locality: 'Nanyuki', postalCode: '10400' },
  { keys: ['nyahururu'], county: 'Laikipia', locality: 'Nyahururu', postalCode: '20300' },
  { keys: ['meru'], county: 'Meru', locality: 'Meru', postalCode: '60200' },
  { keys: ['embu'], county: 'Embu', locality: 'Embu', postalCode: '60100' },
  { keys: ['kericho'], county: 'Kericho', locality: 'Kericho', postalCode: '20200' },
  { keys: ['kisii'], county: 'Kisii', locality: 'Kisii', postalCode: '40200' },
  { keys: ['kakamega'], county: 'Kakamega', locality: 'Kakamega', postalCode: '50100' },
  { keys: ['bungoma'], county: 'Bungoma', locality: 'Bungoma', postalCode: '50200' },
  { keys: ['webuye'], county: 'Bungoma', locality: 'Webuye', postalCode: '50205' },
  { keys: ['garissa'], county: 'Garissa', locality: 'Garissa', postalCode: '70100' },
  { keys: ['voi'], county: 'Taita–Taveta', locality: 'Voi', postalCode: '80300' },
  { keys: ['malaba'], county: 'Busia', locality: 'Malaba', postalCode: '50409' },
  { keys: ['busia'], county: 'Busia', locality: 'Busia', postalCode: '50400' },
  { keys: ['homabay', 'homa bay'], county: 'Homa Bay', locality: 'Homa Bay', postalCode: '40300' },
  { keys: ['migori'], county: 'Migori', locality: 'Migori', postalCode: '40400' },
  { keys: ['siaya'], county: 'Siaya', locality: 'Siaya', postalCode: '40600' },
  { keys: ['kitui'], county: 'Kitui', locality: 'Kitui', postalCode: '90200' },
  { keys: ['wote'], county: 'Makueni', locality: 'Wote', postalCode: '90300' },
  { keys: ['kapsabet'], county: 'Nandi', locality: 'Kapsabet', postalCode: '30300' },
  { keys: ['iten'], county: 'Elgeyo-Marakwet', locality: 'Iten', postalCode: '30700' },
  { keys: ['kapenguria'], county: 'West Pokot', locality: 'Kapenguria', postalCode: '30600' },
  { keys: ['lodwar'], county: 'Turkana', locality: 'Lodwar', postalCode: '30500' },
  { keys: ['maralal'], county: 'Samburu', locality: 'Maralal', postalCode: '20600' },
  { keys: ['narok'], county: 'Narok', locality: 'Narok', postalCode: '20500' },
  { keys: ['bomet'], county: 'Bomet', locality: 'Bomet', postalCode: '20400' },
  { keys: ['muranga', 'muranga'], county: "Murang'a", locality: "Murang'a", postalCode: '10200' },
]

const PLACE_BY_KEY = new Map<string, (typeof PLACE_HINTS)[number]>()
for (const hint of PLACE_HINTS) {
  for (const key of hint.keys) {
    PLACE_BY_KEY.set(countyKey(key), hint)
  }
}

const COUNTY_GPO_BY_KEY = new Map(
  Object.entries(COUNTY_GPO).map(([name, code]) => [countyKey(name), { name, code }])
)

export function isKenyaCountryToken(value?: string | null): boolean {
  if (!value) return true
  const key = countyKey(value)
  return key === 'kenya' || key === 'ke' || key === 'ken' || key === 'republicofkenya'
}

export function lookupKenyaPlace(value?: string | null): {
  county?: string
  locality?: string
  postalCode?: string
} | null {
  if (!value?.trim()) return null
  const key = countyKey(value)
  if (!key) return null

  const place = PLACE_BY_KEY.get(key)
  if (place) {
    return {
      county: place.county,
      locality: place.locality,
      postalCode: place.postalCode,
    }
  }

  const county = resolveCountyName(value)
  if (county) {
    return {
      county,
      locality: county,
      postalCode: COUNTY_GPO[county],
    }
  }

  return null
}

/** Scan a free-text location / title for the first known Kenyan place. */
export function detectKenyaPlaceInText(value?: string | null): {
  county?: string
  locality?: string
  postalCode?: string
} | null {
  if (!value?.trim()) return null
  const direct = lookupKenyaPlace(value)
  if (direct) return direct

  const tokens = value
    .split(/[,/|–—-]+/)
    .map((part) => part.trim())
    .filter(Boolean)

  for (const token of tokens) {
    const hit = lookupKenyaPlace(token)
    if (hit) return hit
  }

  const hay = countyKey(value)
  // Longer keys first so "ongata rongai" wins over "rongai" if both appear.
  const hints = [...PLACE_HINTS].sort(
    (a, b) => Math.max(...b.keys.map((k) => k.length)) - Math.max(...a.keys.map((k) => k.length))
  )
  for (const hint of hints) {
    for (const key of hint.keys) {
      const k = countyKey(key)
      if (k && hay.includes(k)) {
        return {
          county: hint.county,
          locality: hint.locality,
          postalCode: hint.postalCode,
        }
      }
    }
  }

  for (const county of KENYA_COUNTIES) {
    const k = countyKey(county.name)
    if (k && hay.includes(k)) {
      return {
        county: county.name,
        locality: county.name,
        postalCode: COUNTY_GPO[county.name],
      }
    }
  }

  return null
}

export function kenyaPostalCode(args: {
  town?: string | null
  city?: string | null
  county?: string | null
}): string | undefined {
  for (const value of [args.town, args.city, args.county]) {
    const place = lookupKenyaPlace(value)
    if (place?.postalCode) return place.postalCode
  }

  const county = resolveCountyName(args.county || args.city || args.town)
  if (county && COUNTY_GPO[county]) return COUNTY_GPO[county]

  const byKey = args.county ? COUNTY_GPO_BY_KEY.get(countyKey(args.county)) : undefined
  return byKey?.code
}
