/**
 * Cover Letter Template Preview
 * Renders a scaled-down thumbnail of a cover letter template for the gallery.
 * Mirrors the pattern used in CVTemplatePreview.tsx.
 */

import React from 'react';

interface Props {
  templateName: string;
  showDescription?: boolean;
  descriptionOnly?: boolean;
}

const descriptions: Record<string, string> = {
  'Classic Professional Cover Letter':
    'A formal, structured layout with traditional formatting. The safest option — works for government, NGOs, banking, corporate, and administrative roles.',
  'Modern Professional Cover Letter':
    'Cleaner layout with better spacing and a contemporary tone. Ideal for private sector, marketing, business, and mid-level professional roles.',
  'Short & Direct Cover Letter':
    'A concise, high-impact letter of 3 short paragraphs. Perfect for startups, tech companies, online applications, and busy recruiters.',
  'Graduate / Entry-Level Cover Letter':
    'Focuses on education, projects, and potential rather than experience. Solves the "I don\'t have experience" problem for fresh graduates.',
  'Internship / Attachment Cover Letter':
    'Tailored for students applying for industrial attachment or internships. Highly relevant for university and TVET students in Kenya.',
  'Skills-Focused Entry-Level Cover Letter':
    'For candidates with little or no formal experience who have real, demonstrable skills. Ideal for self-taught professionals, freelancers, and hustlers who can do the work.',
  'Career Change Cover Letter':
    'Helps candidates explain transitions between industries or roles. Ideal for career switchers and people re-entering the workforce.',
  'Personal Brand Cover Letter':
    'Highlights personality, online presence, and unique voice. Pairs perfectly with the Personal Brand CV for creatives and consultants.',
  'International / ATS-Friendly Cover Letter':
    'Simple, clean, keyword-focused format optimised for global applications, remote jobs, and ATS-based hiring systems.',
};

function ClassicPreviewThumbnail() {
  return (
    <div className="w-full aspect-[3/4] bg-white border border-gray-200 rounded px-4 py-4 text-[5px] leading-[1.5] overflow-hidden shadow-sm font-serif">
      {/* Header */}
      <div className="border-b border-gray-300 pb-2 mb-2">
        <div className="font-bold text-[8px]">JOHN MWANGI KARIUKI</div>
        <div className="text-gray-600 space-y-0.5 mt-0.5">
          <div>+254 712 345 678</div>
          <div>john.mwangi@email.com</div>
          <div>Nairobi, Kenya</div>
        </div>
      </div>
      {/* Date */}
      <div className="mb-2">24 March 2026</div>
      {/* Employer */}
      <div className="mb-2 space-y-0.5">
        <div className="font-semibold">Hiring Manager</div>
        <div>ABC Company Ltd</div>
        <div className="text-gray-500">P.O. Box 12345, Nairobi</div>
      </div>
      {/* Salutation */}
      <div className="mb-2">Dear Hiring Manager,</div>
      {/* Body */}
      <div className="space-y-2 mb-3 text-gray-700">
        <p>I am writing to express my interest in the Administrative Officer position at ABC Company Ltd. With a strong background in office administration and customer service, I am confident in my ability to contribute effectively to your team.</p>
        <p>In my previous role, I successfully managed office operations, coordinated schedules, and supported senior staff in daily administrative tasks. I am highly organised, detail-oriented, and proficient in Microsoft Office tools.</p>
        <p>I am particularly interested in this opportunity because of your company's reputation for excellence. I would welcome the opportunity to contribute my skills and grow within your organisation.</p>
      </div>
      {/* Closing */}
      <div>
        <div className="mb-3">Sincerely,</div>
        <div className="font-semibold">John Mwangi Kariuki</div>
      </div>
    </div>
  );
}

function ModernPreviewThumbnail() {
  return (
    <div className="w-full aspect-[3/4] bg-white border border-gray-200 rounded px-4 py-4 text-[5px] leading-[1.5] overflow-hidden shadow-sm font-sans">
      {/* Header */}
      <div className="mb-3">
        <div className="font-bold text-[8px] text-gray-900">Grace Wanjiku Mwangi</div>
        <div className="flex gap-2 text-gray-500 mt-0.5 flex-wrap">
          <span>+254 712 555 444</span>
          <span>grace@email.com</span>
          <span>Nairobi, Kenya</span>
        </div>
        <div className="mt-1.5 h-[1.5px] w-6 bg-gray-800 rounded" />
      </div>
      {/* Date */}
      <div className="text-gray-500 mb-2">24 March 2026</div>
      {/* Employer */}
      <div className="mb-2 space-y-0.5">
        <div className="font-semibold text-gray-900">Hiring Manager</div>
        <div>BrightWave Marketing Ltd</div>
        <div className="text-gray-500">P.O. Box 67890, Nairobi</div>
      </div>
      {/* Salutation */}
      <div className="mb-2">Dear Hiring Manager,</div>
      {/* Body */}
      <div className="space-y-2 mb-3 text-gray-700">
        <p>I am excited to apply for the Marketing Executive position at BrightWave Marketing Ltd. With over five years of experience in digital marketing and brand strategy, I have developed a strong ability to create impactful campaigns.</p>
        <p>In my current role, I have successfully managed multi-channel marketing campaigns, increased social media engagement, and contributed to revenue growth through data-driven strategies.</p>
        <p>I am particularly drawn to your company's innovative approach to marketing and would welcome the opportunity to contribute my expertise to your team.</p>
      </div>
      {/* Closing */}
      <div>
        <div className="mb-2 text-gray-700">Sincerely,</div>
        <div className="font-semibold text-gray-900">Grace Wanjiku Mwangi</div>
      </div>
    </div>
  );
}

function ShortDirectPreviewThumbnail() {
  return (
    <div className="w-full aspect-[3/4] bg-white border border-gray-200 rounded px-4 py-4 text-[5px] leading-[1.5] overflow-hidden shadow-sm font-sans">
      {/* Header */}
      <div className="mb-2">
        <div className="font-bold text-[8px] text-gray-900">David Otieno Mwangi</div>
        <div className="flex gap-2 text-gray-500 mt-0.5 flex-wrap">
          <span>+254 700 123 456</span>
          <span>david@email.com</span>
          <span>Nairobi, Kenya</span>
        </div>
      </div>
      {/* Date */}
      <div className="text-gray-500 mb-1.5">24 March 2026</div>
      {/* Employer */}
      <div className="mb-1.5 space-y-0.5">
        <div className="font-medium text-gray-900">Hiring Manager</div>
        <div>TechNova Ltd</div>
        <div className="text-gray-500">P.O. Box 98765, Nairobi</div>
      </div>
      {/* Salutation */}
      <div className="mb-1.5">Dear Hiring Manager,</div>
      {/* Body */}
      <div className="space-y-1.5 mb-2 text-gray-700">
        <p>I am applying for the Software Developer position at TechNova Ltd. With 3 years of experience in web development, I have delivered solutions that increased client satisfaction by 20%.</p>
        <p>I lead project teams, streamline workflows, and implement efficient coding practices. My technical skills and proactive approach will contribute positively to your team.</p>
        <p>I am excited about TechNova's mission and would welcome the opportunity to bring my expertise to your projects.</p>
      </div>
      {/* Closing */}
      <div>
        <div className="mb-1.5 text-gray-700">Best regards,</div>
        <div className="font-semibold text-gray-900">David Otieno Mwangi</div>
      </div>
    </div>
  );
}

function GraduatePreviewThumbnail() {
  return (
    <div className="w-full aspect-[3/4] bg-white border border-gray-200 rounded px-4 py-4 text-[5px] leading-[1.5] overflow-hidden shadow-sm font-sans">
      {/* Header */}
      <div className="mb-2">
        <div className="font-bold text-[8px] text-gray-900">Faith Wanjiru Njeri</div>
        <div className="w-3 h-[1px] bg-emerald-500 rounded my-0.5" />
        <div className="flex gap-2 text-gray-500 mt-0.5 flex-wrap">
          <span>+254 712 888 222</span>
          <span>faith.njeri@email.com</span>
          <span>Nairobi, Kenya</span>
        </div>
      </div>
      {/* Date */}
      <div className="text-gray-500 mb-1.5">24 March 2026</div>
      {/* Employer */}
      <div className="mb-1.5 space-y-0.5">
        <div className="font-medium text-gray-900">Hiring Manager</div>
        <div>ABC Company Ltd</div>
        <div className="text-gray-500">P.O. Box 12345, Nairobi</div>
      </div>
      {/* Salutation */}
      <div className="mb-1.5">Dear Hiring Manager,</div>
      {/* Body */}
      <div className="space-y-1.5 mb-2 text-gray-700">
        <p>I am writing to apply for the Graduate Trainee position at ABC Company Ltd. I recently graduated with a Bachelor of Commerce (Finance) from Kenyatta University.</p>
        <p>During my studies, I completed academic projects involving financial modeling and data analysis. I am proficient in Microsoft Excel and have a strong interest in financial planning.</p>
        <p>I am eager to begin my professional career in a dynamic organisation such as yours, where I can apply my knowledge and learn from experienced professionals.</p>
      </div>
      {/* Closing */}
      <div>
        <div className="mb-2 text-gray-700">Sincerely,</div>
        <div className="font-semibold text-gray-900">Faith Wanjiru Njeri</div>
      </div>
    </div>
  );
}

function InternshipPreviewThumbnail() {
  return (
    <div className="w-full aspect-[3/4] bg-white border border-gray-200 rounded px-4 py-4 text-[5px] leading-[1.5] overflow-hidden shadow-sm font-sans">
      {/* Header */}
      <div className="mb-2">
        <div className="font-bold text-[8px] text-gray-900">Brian Omondi Otieno</div>
        <div className="w-3 h-[1px] bg-indigo-500 rounded my-0.5" />
        <div className="flex gap-2 text-gray-500 mt-0.5 flex-wrap">
          <span>+254 722 333 444</span>
          <span>brian.omondi@email.com</span>
          <span>Nairobi, Kenya</span>
        </div>
      </div>
      {/* Institution */}
      <div className="text-[5.5px] text-gray-600 mb-1.5">
        <div>Kenyatta University</div>
        <div>BSc Computer Science (Year 3)</div>
      </div>
      {/* Date */}
      <div className="text-gray-500 mb-1.5">24 March 2026</div>
      {/* Employer */}
      <div className="mb-1.5 space-y-0.5">
        <div className="font-medium text-gray-900">Hiring Manager</div>
        <div>TechHub Solutions Ltd</div>
        <div className="text-gray-500">P.O. Box 56789, Nairobi</div>
      </div>
      {/* Salutation */}
      <div className="mb-1.5">Dear Hiring Manager,</div>
      {/* Body */}
      <div className="space-y-1.5 mb-2 text-gray-700">
        <p>I am writing to apply for industrial attachment at TechHub Solutions Ltd. I am a third-year Computer Science student at Kenyatta University.</p>
        <p>Through my coursework, I have developed skills in Python, web development, and database management. I am eager to apply these skills in a professional environment.</p>
        <p>I am available for a 3-month attachment from May to July 2026. I would be grateful for the opportunity to learn from your team.</p>
      </div>
      {/* Closing */}
      <div>
        <div className="mb-2 text-gray-700">Yours faithfully,</div>
        <div className="font-semibold text-gray-900">Brian Omondi Otieno</div>
      </div>
    </div>
  );
}

function SkillsEntryPreviewThumbnail() {
  return (
    <div className="w-full aspect-[3/4] bg-white border border-gray-200 rounded px-4 py-4 text-[5px] leading-[1.5] overflow-hidden shadow-sm font-sans">
      {/* Header */}
      <div className="mb-2">
        <div className="font-bold text-[8px] text-gray-900">Kevin Otieno Onyango</div>
        <div className="w-3 h-[1px] bg-blue-500 rounded my-0.5" />
        <div className="flex gap-2 text-gray-500 mt-0.5 flex-wrap">
          <span>+254 700 888 111</span>
          <span>kevin.onyango@email.com</span>
          <span>Nairobi, Kenya</span>
        </div>
      </div>
      {/* Date */}
      <div className="text-gray-500 mb-1.5">24 March 2026</div>
      {/* Employer */}
      <div className="mb-1.5 space-y-0.5">
        <div className="font-medium text-gray-900">Hiring Manager</div>
        <div>Digital Solutions Ltd</div>
        <div className="text-gray-500">P.O. Box 45678, Nairobi</div>
      </div>
      {/* Salutation */}
      <div className="mb-1.5">Dear Hiring Manager,</div>
      {/* Body */}
      <div className="space-y-1.5 mb-2 text-gray-700">
        <p>I am writing to apply for the Social Media Assistant position. Although I am at the early stage of my career, I have developed strong practical skills through self-learning.</p>
        <p>I have experience managing social media pages, creating content using Canva, and applying basic SEO strategies. Through personal projects and freelance work, I have built skills in audience engagement.</p>
        <p>I am eager to grow in a professional environment where I can apply my skills and learn from experienced professionals.</p>
      </div>
      {/* Key Skills Box */}
      <div className="mb-2 p-1.5 bg-gray-50 rounded border border-gray-200">
        <div className="text-[4px] font-semibold text-gray-600 uppercase mb-0.5">Key Skills</div>
        <div className="text-[4.5px] text-gray-800">Social Media Management, Content Creation, Canva, Basic SEO</div>
      </div>
      {/* Closing */}
      <div>
        <div className="mb-1.5 text-gray-700">Sincerely,</div>
        <div className="font-semibold text-gray-900">Kevin Otieno Onyango</div>
      </div>
    </div>
  );
}

function GenericPreviewThumbnail({ templateName }: { templateName: string }) {
  const isShort = templateName === 'Short & Direct Cover Letter';
  const isPersonalBrand = templateName === 'Personal Brand Cover Letter';

  return (
    <div className="w-full aspect-[3/4] bg-white border border-gray-200 rounded px-4 py-4 text-[5px] leading-[1.5] overflow-hidden shadow-sm font-sans">
      {/* Header bar */}
      <div className={`pb-2 mb-2 ${isPersonalBrand ? 'border-b-2 border-orange-400' : 'border-b border-gray-300'}`}>
        <div className={`font-bold text-[8px] ${isPersonalBrand ? 'text-orange-600' : 'text-gray-900'}`}>
          {isPersonalBrand ? 'AMINA ODHIAMBO' : 'GRACE WANJIKU NJOROGE'}
        </div>
        {isPersonalBrand && (
          <div className="text-orange-500 text-[6px] italic mb-0.5">Brand Strategist & Content Creator</div>
        )}
        <div className="text-gray-500 mt-0.5">
          +254 723 456 789 | grace@email.com | Nairobi
        </div>
      </div>
      {/* Date + recipient */}
      {!isShort && !isPersonalBrand && (
        <div className="mb-2 space-y-0.5">
          <div>24 March 2026</div>
          <div className="font-semibold mt-1">Hiring Manager</div>
          <div className="text-gray-500">XYZ Company Ltd, Nairobi</div>
        </div>
      )}
      {/* Salutation */}
      <div className="mb-2">
        {isPersonalBrand ? 'Hi Sarah,' : isShort ? 'Hi Hiring Manager,' : 'Dear Hiring Manager,'}
      </div>
      {/* Body lines */}
      <div className="space-y-2 text-gray-700">
        {isShort ? (
          <>
            <p>I am applying for the Marketing Manager position at XYZ Ltd. I have 5 years of experience in digital marketing and a proven ability to grow brand presence by 40%.</p>
            <p>My core strengths — SEO, content strategy, and campaign analytics — match what you are looking for. At BrightWave, I led a team of 4 and delivered 20+ successful campaigns.</p>
            <p>I would love to bring this energy to XYZ Ltd. Happy to chat at your convenience.</p>
          </>
        ) : isPersonalBrand ? (
          <>
            <p>I am Amina Odhiambo — a brand strategist who turns ideas into movements.</p>
            <p>I am reaching out about the Brand Manager opportunity at XYZ Ltd. I have been following your work in sustainable fashion and I believe there is a strong alignment between what you are building and what I do best.</p>
            <p>My work speaks for itself: 3 award-winning campaigns, 50K+ engaged followers, and a portfolio that blends creativity with measurable results.</p>
          </>
        ) : (
          <>
            <p>I am writing to apply for the position at XYZ Company Ltd. With 4 years of experience in marketing, I am confident in my ability to contribute to your team.</p>
            <p>In my current role, I have successfully managed campaigns that increased brand awareness by 35% and grew our social media following by 20,000 in 12 months.</p>
            <p>I am particularly drawn to your organisation because of your reputation for innovation. I would welcome the opportunity to contribute my skills and grow with you.</p>
          </>
        )}
      </div>
      {/* Closing */}
      <div className="mt-3">
        <div className="mb-2">{isPersonalBrand ? "Let's connect." : isShort ? '' : 'Sincerely,'}</div>
        <div className="font-semibold">
          {isPersonalBrand ? 'Amina Odhiambo' : 'Grace Wanjiku Njoroge'}
        </div>
      </div>
    </div>
  );
}

export default function CoverLetterTemplatePreview({ templateName, showDescription = false, descriptionOnly = false }: Props) {
  if (descriptionOnly && descriptions[templateName]) {
    return (
      <p className="text-xs text-muted-foreground leading-relaxed">
        {descriptions[templateName]}
      </p>
    );
  }

  const thumbnail = templateName === 'Classic Professional Cover Letter'
    ? <ClassicPreviewThumbnail />
    : templateName === 'Modern Professional Cover Letter'
    ? <ModernPreviewThumbnail />
    : templateName === 'Short & Direct Cover Letter'
    ? <ShortDirectPreviewThumbnail />
    : templateName === 'Graduate / Entry-Level Cover Letter'
    ? <GraduatePreviewThumbnail />
    : templateName === 'Internship / Attachment Cover Letter'
    ? <InternshipPreviewThumbnail />
    : templateName === 'Skills-Focused Entry-Level Cover Letter'
    ? <SkillsEntryPreviewThumbnail />
    : <GenericPreviewThumbnail templateName={templateName} />;

  return (
    <div>
      {thumbnail}
      {showDescription && descriptions[templateName] && (
        <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
          {descriptions[templateName]}
        </p>
      )}
    </div>
  );
}
