import assert from 'node:assert/strict'
import {
  cleanJobBoardCompanyDescription,
  companyProfileToEnsureInput,
  isJobBoardWebsite,
  preferFullFuzuLogo,
  preferFullMyJobMagLogo,
  sanitizeEmployerWebsite,
} from './jobBoardCompany'

assert.equal(
  preferFullFuzuLogo(
    'https://public-s3.fuzu.com/employers/medium_729d44e6-4c68-4266-a5e8-9919dba35b91.png'
  ),
  'https://public-s3.fuzu.com/employers/729d44e6-4c68-4266-a5e8-9919dba35b91.png'
)

assert.equal(
  preferFullMyJobMagLogo('/company_logo/86/35570glantix.png'),
  'https://www.myjobmag.co.ke/company_logo/35570glantix.png'
)

assert.equal(isJobBoardWebsite('https://www.fuzu.com/company/x'), true)
assert.equal(isJobBoardWebsite('https://digitalqatalyst.com/'), false)
assert.equal(sanitizeEmployerWebsite('https://www.fuzu.com/company/x'), null)
assert.equal(sanitizeEmployerWebsite('digitalqatalyst.com'), 'https://digitalqatalyst.com/')

assert.ok(
  cleanJobBoardCompanyDescription(
    'At DQ, we blend strategy, tech, and talent to build Digital Cognitive Organizations.'
  )?.includes('Digital Cognitive')
)
assert.equal(
  cleanJobBoardCompanyDescription('Find the latest job openings at Acme on MyJobMag.'),
  null
)
assert.equal(
  cleanJobBoardCompanyDescription(
    'Apply for the latest jobs at Glantix in Kenya. Browse current vacancies, career opportunities and job openings. Submit your application today on MyJobMag.'
  ),
  null
)

const mapped = companyProfileToEnsureInput({
  name: 'Digital Qatalyst',
  logo: 'https://public-s3.fuzu.com/employers/medium_abc.png',
  website: 'https://digitalqatalyst.com/',
  description: 'At DQ, we blend strategy, tech, and talent to build Digital Cognitive Organizations.',
  location: 'Nairobi, Kenya',
  size: '1-10 people',
  industry: 'Computers, software development and services',
  source: 'fuzu',
})
assert.equal(mapped.website, 'https://digitalqatalyst.com/')
assert.equal(mapped.size, '1-10 people')
assert.ok(mapped.description?.includes('Digital Cognitive'))

console.log('jobBoardCompany.test.ts: ok')
