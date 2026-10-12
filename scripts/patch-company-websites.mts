/**
 * Patch companies.website for all companies that have no website stored.
 * Run: npx tsx scripts/patch-company-websites.mts
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// company name (as stored in DB, case-insensitive) → website domain
const COMPANY_WEBSITES: Record<string, string> = {
  // ── International Orgs ───────────────────────────────────────────────
  'acted': 'acted.org',
  'action against hunger international': 'actionagainsthunger.org',
  'african development bank': 'afdb.org',
  'amentum': 'amentum.com',
  'amnesty international': 'amnesty.org',
  'baker hughes': 'bakerhughes.com',
  'bayer': 'bayer.com',
  'bolloré logistics': 'bollore-logistics.com',
  'brac': 'brac.net',
  'british council': 'britishcouncil.org',
  'care kenya': 'care.org',
  'catholic relief services': 'crs.org',
  'cgiar': 'cgiar.org',
  'childfund': 'childfund.org',
  'cifor-icraf': 'cifor-icraf.org',
  'cigna': 'cigna.com',
  'crossboundary': 'crossboundary.com',
  'danish refugee council': 'drc.ngo',
  'diageo': 'diageo.com',
  'doctors without borders': 'msf.org',
  'dhl': 'dhl.com',
  'ecolab': 'ecolab.com',
  'ey': 'ey.com',
  'filmaid': 'filmaid.org',
  'giz': 'giz.de',
  'giz kenya': 'giz.de',
  'grant thornton kenya': 'grantthornton.co.ke',
  'ibm': 'ibm.com',
  'impact initiatives': 'impact-initiatives.org',
  'international medical corps': 'internationalmedicalcorps.org',
  "médecins sans frontières (msf) – ubuntu": 'msf.org',
  'mercy corps': 'mercycorps.org',
  'microsoft': 'microsoft.com',
  'microsoft kenya': 'microsoft.com',
  'ntt data': 'nttdata.com',
  'nutrition international': 'nutritionintl.org',
  'open society foundations': 'opensocietyfoundations.org',
  'oracle': 'oracle.com',
  'peace winds japan kenya (pwj)': 'peace-winds.org',
  'plan international': 'plan-international.org',
  'pz cussons': 'pzcussons.com',
  'rsm': 'rsm.global',
  'remote': 'remote.com',
  'save the children': 'savethechildren.org',
  'siemens healthineers': 'siemens-healthineers.com',
  'swisscontact': 'swisscontact.org',
  'teleperformance kenya': 'teleperformance.com',
  'teltonika': 'teltonika.com',
  'undp': 'undp.org',
  'unicef': 'unicef.org',
  'unhcr': 'unhcr.org',
  'united nations': 'un.org',
  'united nations environment programme (unep)': 'unep.org',
  'unops': 'unops.org',
  'usaid': 'usaid.gov',
  'wetlands international – east africa': 'wetlands.org',
  'world bank': 'worldbank.org',
  'world bank group': 'worldbank.org',
  'world food programme (wfp)': 'wfp.org',
  'world vision': 'worldvision.org',
  'wfp': 'wfp.org',
  "l'oréal": 'loreal.com',
  'loreal': 'loreal.com',
  'lutheran world federation (lwf)': 'lutheranworld.org',
  'lutheran world federation (lwf) – world service': 'lutheranworld.org',

  // ── Banks / Finance ──────────────────────────────────────────────────
  'bank of africa kenya limited (boa-kenya)': 'boakenya.co.ke',
  'central bank of kenya (cbk)': 'centralbank.go.ke',
  'dib bank kenya limited': 'dibbankkenya.com',
  'kenya women finance trust (kwft)': 'kwftbank.com',
  'liberty life': 'libertylife.co.ke',
  'rafiki microfinance bank': 'rafikimfbank.co.ke',

  // ── Health ───────────────────────────────────────────────────────────
  'aga khan academies': 'agakhanacademies.org',
  'aga khan academy': 'agakhanacademies.org',
  'aga khan hospital kisumu': 'agakhanhospitals.org',
  'aga khan university hospital': 'agakhanhospitals.org',
  'aga khan university hospital (akuh), nairobi': 'agakhanhospitals.org',
  "gertrude's children's hospital": 'gerties.org',
  'equity afya': 'equityafya.co.ke',
  'kenyatta university teaching, referral & research hospital': 'kutrrh.go.ke',
  'nairobi hospital': 'nairobihospital.org',
  'p.c.e.a kikuyu hospital': 'pcea.or.ke',
  'penda health': 'pendahealth.com',

  // ── Energy / Clean Tech ──────────────────────────────────────────────
  'burn manufacturing': 'burnstoves.com',
  'd.light': 'dlight.com',
  'kengen': 'kengen.co.ke',
  'kenya electricity generating company plc, kengen': 'kengen.co.ke',
  'm-kopa solar': 'm-kopa.com',
  'moja ev kenya': 'mojamobility.co.ke',
  'octavia carbon': 'octaviacarbon.com',
  'proto energy': 'protoenergy.co.ke',
  'sun king': 'sunking.com',
  'sun king ': 'sunking.com',
  'sun king (formerly greenlight planet)': 'sunking.com',
  'sunculture kenya ltd': 'sunculture.io',
  'sunculture kenya ltd ': 'sunculture.io',
  'the global energy alliance for people and planet (geapp)': 'energyalliance.org',
  'tugende': 'tugende.com',

  // ── Agriculture / Food ───────────────────────────────────────────────
  'aaa growers': 'aaagrowers.co.ke',
  'agricultural finance corporation': 'agfc.co.ke',
  'agro-chemical and food company': 'acfcl.co.ke',
  'apollo agriculture': 'apolloagriculture.com',
  'capwell industries ltd': 'capwellindustries.co.ke',
  'drema food industries': 'drema.co.ke',
  'haco industries (kenya) limited': 'hacoindustries.com',
  'kenchic': 'kenchic.co.ke',
  'kenya wine agencies limited (kwal)': 'kwal.co.ke',
  'kwal (kenya wine agencies limited)': 'kwal.co.ke',
  'kinangop dairy limited': 'kinangop.co.ke',
  'kim-fay': 'kimfay.co.ke',
  'living goods': 'livinggoods.org',
  'mamlo foods': 'mamlofoods.com',
  'one acre fund': 'oneacrefund.org',
  'safal group': 'safalgroup.com',
  'smart farm': 'smartfarm.co.ke',
  'synnefa': 'synnefa.com',
  'victory farms': 'victory-farms.com',
  'west kenya sugar company ltd': 'wksc.co.ke',

  // ── Tech / Fintech ───────────────────────────────────────────────────
  'andela': 'andela.com',
  'branch': 'branch.co',
  'branch international': 'branch.co',
  'bolt': 'bolt.eu',
  'cloudfactory': 'cloudfactory.com',
  'give directly': 'givedirectly.org',
  'givedirectly': 'givedirectly.org',
  'inkomoko': 'inkomoko.com',
  'jiji kenya': 'jiji.co.ke',
  'm-kopa': 'm-kopa.com',
  'novapioneer': 'novapioneer.com',
  'nova pioneer': 'novapioneer.com',
  'nala': 'nala.money',
  'pesapal': 'pesapal.com',
  'poa internet': 'poa.co.ke',
  'q-sourcing servtec group': 'q-sourcing.com',
  'q-sourcing': 'q-sourcing.com',
  'senga': 'senga.co',
  'senga technologies': 'senga.co',
  'solvo global': 'solvoglobal.com',
  'tala': 'tala.co',
  'tatu city': 'tatucity.com',
  'twiga': 'twiga.com',
  'twiga foods': 'twiga.com',
  'umba': 'umba.com',
  'vert': 'myvert.co.ke',

  // ── Education ────────────────────────────────────────────────────────
  'africa nazarene university': 'anu.ac.ke',
  'international school of kenya (isk)': 'isk.ac.ke',
  'jaramogi oginga odinga university of science and technology': 'jooust.ac.ke',
  'maseno university': 'maseno.ac.ke',
  'masinde muliro': 'mmust.ac.ke',
  'rongo university': 'rongouni.ac.ke',
  'umma university': 'umma.ac.ke',
  'university of nairobi': 'uon.ac.ke',

  // ── Media / Hospitality / Retail ─────────────────────────────────────
  'aa kenya': 'aakenya.co.ke',
  'artcaffe coffee and bakery': 'artcaffe.co.ke',
  'artcaffe': 'artcaffe.co.ke',
  'cfao mobility kenya': 'cfao.com',
  'hotpoint appliances ltd': 'hotpoint.co.ke',
  'kwetu nairobi, curio collection by hilton': 'hilton.com',
  'majid al futtaim retail': 'majidalfuttaim.com',
  'mediamax network limited': 'mediamax.co.ke',
  'nation media': 'nation.africa',
  'nation media group': 'nation.africa',
  'rendeavour': 'rendeavour.com',
  'swahili beach': 'swahilibeach.com',
  'takataka solutions': 'takataka.co.ke',

  // ── HR / Staffing ────────────────────────────────────────────────────
  'corporate staffing': 'corporatestaffing.co.ke',
  'corporate staffing services': 'corporatestaffing.co.ke',
  'gap recruitment services limited': 'gaprecruitment.co.ke',
  'smollan kenya': 'smollan.com',
  'stratostaff': 'stratostaff.co.ke',
  'stratostaff east africa': 'stratostaff.co.ke',

  // ── Public / Government ──────────────────────────────────────────────
  'baringo county government': 'baringo.go.ke',
  'christian health association of kenya (chak)': 'chak.or.ke',
  'kenya revenue authority': 'kra.go.ke',
  'makueni county public service board': 'makueni.go.ke',
  'nakuru county government': 'nakuru.go.ke',
  'national environment management authority (nema)': 'nema.go.ke',
  'public service commission ': 'publicservice.go.ke',
  'public service commission kenya (psck)': 'publicservice.go.ke',
  'public service superannuation fund': 'pssf.go.ke',
  'trans nzoia county public service board': 'transnzoia.go.ke',
  'zizi afrique foundation': 'ziziafrique.org',

  // ── NGO / Social ─────────────────────────────────────────────────────
  'agl (africa global logistics)': 'aglgroup.com',
  'association for the physically disabled of kenya (apdk)': 'apdk.org',
  'macheo children\'s organization': 'macheo.org',
  'wts energy': 'wtsenergy.com',

  // Round 2 — user-reported gaps
  'international fellowship kenya': 'interfelk.org',
  'international fellowship kenya (interfelk)': 'interfelk.org',
  'abno softwares international': 'abnosoftwares.com',
  'smart applications international': 'smartapplicationsgroup.com',
  'tropikal brands afrika limited': 'tropikal.co.ke',
  'bwasco water & sewerage plc': 'bwasco.co.ke',
  'morsan hr': 'morsanhr.co.ke',
  'progressive credit': 'progressivecr.co.ke',
  'total security surveillance': 'totalsecuritykenya.com',
  'total security surveillance ltd': 'totalsecuritykenya.com',
  'the bungoma national polytechnic': 'bungomapoly.ac.ke',
  'durham international school kenya': 'durhamkenya.com',
  'st. andrews turi': 'standrewsturi.com',
  'people foco': 'peoplefoco.co.ke',
  'people foco agency': 'peoplefoco.co.ke',
  'hcs affiliates group': 'hcsaffiliatesgroup.com',
  'pearl hospital': 'pearlhospital.co.ke',
  'woodland star international school': 'woodlandstarkenya.com',
  'rapha hospitals and clinics': 'raphahospitalkenya.com',
  'juja st. peter\'s school': 'jsps.ac.ke',
  'westlands specialist hospital': 'wgshospital.com',
  'kiharu technical college murang\'a': 'kiharutechnical.ac.ke',
  'kenchic': 'kenchic.com',
  'tugende': 'gotugende.com',

  // Round 3 — remaining no-website employers
  'talent grid africa': 'talentgridafrica.com',
  'talent nexus': 'talentnexus.co.ke',
  'switch media limited': 'switchmedia.ke',
  "l'oréal": 'loreal.com',
  'l’oréal': 'loreal.com',
  'loreal': 'loreal.com',
  "macheo children's organization": 'macheo.org',
  'macheo children’s organization': 'macheo.org',
  'zebra coffee': 'zebracoffee.co.ke',
  'county sacco society ltd': 'countysacco.co.ke',
  'jm associates': 'jmassociates.co.ke',
  'piedmont global': 'piedmontglobal.com',
  'work global careers limited': 'workglobalcareers.com',
  'swinton consulting limited': 'swintonconsulting.com',
  'ravine dairies limited': 'ravinedairies.co.ke',
  'adpath laboratories': 'adpathlabs.com',
  'lainisha sacco': 'lainisha.co.ke',
  'globalhunt associates': 'globalhuntassociates.com',
  'human asset consultants limited': 'humanasset.co.ke',
  'msvl group': 'msvlgroup.com',
  'newmark group': 'newmark.co.ke',
  'transnep insurance brokers ltd': 'transnep.co.ke',
  'sporty h2o': 'sportyh2o.com',
  'skm africa': 'skmafrica.com',
  'premier audio visual limited': 'premierav.co.ke',
  'amplus international ltd': 'amplusinternational.com',
  'world network systems': 'worldnetworksystems.com',
};


function normalizeKey(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[\u2018\u2019\u201A\u2032']/g, "'")
    .replace(/\s+/g, ' ');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/** Force-correct known bad / suboptimal domains even when website is already set. */
const WEBSITE_CORRECTIONS: Record<string, string> = {
  'university of nairobi': 'uonbi.ac.ke',
  'q-sourcing servtec group': 'q-sourcing.com',
  'q-sourcing': 'q-sourcing.com',
  'victory farms': 'victoryfarms.com',
  'bank of africa kenya limited (boa-kenya)': 'bankofafrica.co.ke',
};

// Fetch companies with no website + companies needing corrections
const { data: companies, error } = await supabase
  .from('companies')
  .select('id, name, website')
  .limit(500);

if (error) { console.error('Error:', error.message); process.exit(1); }

const missing = (companies || []).filter((c) => !c.website);
console.log(`\nCompanies without website: ${missing.length}\n`);

let patched = 0, corrected = 0, nomatch = 0;
const unmatched: string[] = [];

for (const company of companies || []) {
  const key = normalizeKey(company.name);
  const correction = WEBSITE_CORRECTIONS[key];
  const domain = correction || (!company.website ? COMPANY_WEBSITES[key] : null);

  if (!domain) {
    if (!company.website) {
      nomatch++;
      unmatched.push(company.name);
    }
    continue;
  }

  const website = `https://${domain}`;
  const currentDomain = company.website
    ? company.website.replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/$/, '')
    : null;
  if (currentDomain === domain) continue;

  const { error: uErr } = await supabase
    .from('companies')
    .update({ website })
    .eq('id', company.id);

  if (uErr) {
    console.log(`  ERROR ${company.name}: ${uErr.message}`);
  } else {
    const tag = company.website ? '↻' : '✓';
    console.log(`  ${tag} ${company.name.padEnd(55)} → ${website}`);
    if (company.website) corrected++;
    else patched++;
  }
}

console.log(`\n────────────────────────────────────────`);
console.log(`Patched:    ${patched}`);
console.log(`Corrected:  ${corrected}`);
console.log(`No match:   ${nomatch}`);
console.log(`────────────────────────────────────────`);
if (unmatched.length) {
  console.log('\nUnmatched (no domain known):');
  unmatched.forEach(n => console.log(`  - ${n}`));
}
