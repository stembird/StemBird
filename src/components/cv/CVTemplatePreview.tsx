/**
 * CV Template Preview Component
 * Renders a thumbnail preview of CV templates with full content
 * SAME SIZE ON ALL DEVICES
 */

import React from 'react';

interface CVTemplatePreviewProps {
  templateName: string;
  showDescription?: boolean;
  descriptionOnly?: boolean;
}

const templateDescriptions: Record<string, string> = {
  'Classic Professional': 'A clean, ATS-friendly single-column layout perfect for entry to mid-level professionals. Emphasizes clarity and readability.',
  'Modern Professional': 'A stylized two-column design with blue accents and modern aesthetics. Ideal for corporate roles and marketing positions.',
  'Executive Leadership': 'A premium serif layout emphasizing leadership achievements and strategic impact. Perfect for directors, CEOs, and senior management.',
  'Graduate Starter CV': 'Education-focused layout prioritizing academic projects, internships, and extracurricular activities. Perfect for fresh graduates and students.',
  'Skills-Based (Functional)': 'Emphasizes skills and competencies over chronological work history. Perfect for career changers, candidates with employment gaps, or those with strong transferable skills.',
  'Internship / Industrial Attachment': 'Student-focused template emphasizing education, technical skills, and potential. Perfect for students seeking industrial attachment or internship opportunities.',
  'Creative Portfolio': 'Eye-catching template with bold sidebar design showcasing portfolio projects prominently. Perfect for graphic designers, UI/UX designers, photographers, and creative professionals.',
  'Digital Professional': 'Tech-focused template with dark sidebar highlighting tech stack, tools, and certifications. Perfect for software developers, data scientists, IT professionals, and digital specialists.',
  'Personal Brand CV': 'Designed for professionals whose reputation and public presence matter. Perfect for consultants, marketing professionals, speakers, influencers, coaches, and content creators. Highlights personal tagline, online presence, media features, and speaking engagements.',
  'Academic / Research CV': 'Single-column serif layout designed for academics, researchers, PhD applicants, and fellowship seekers. Highlights research interests, publications, conferences, teaching positions, grants, and academic achievements.',
  'Technical / Engineering CV': 'Two-column layout with sidebar for technical skills, tools, and certifications. Main section highlights engineering projects with measurable outcomes and structured work experience. Ideal for mechanical, electrical, civil, and process engineers.',
  'International / ATS Optimized CV': 'Single-column, plain-text-friendly CV built to pass Applicant Tracking Systems (ATS) like Workday, Greenhouse, Lever, and Taleo. No graphics or icons — just clean, keyword-rich content with standard headings. Essential for remote jobs, international NGOs, multinational companies, and global tech roles.',
};

export default function CVTemplatePreview({ templateName, showDescription = false, descriptionOnly = false }: CVTemplatePreviewProps) {
  // If only showing description, return just that
  if (descriptionOnly && templateDescriptions[templateName]) {
    return (
      <p className="text-xs text-muted-foreground leading-relaxed">
        {templateDescriptions[templateName]}
      </p>
    );
  }

  const renderPreview = () => {
    switch (templateName) {
      case 'Classic Professional':
        return (
          <div className="w-full aspect-[3/4] bg-white border border-gray-200 rounded p-4 text-[8px] leading-[1.4] overflow-hidden shadow-sm">
            {/* Header */}
            <div className="border-b border-gray-800 pb-1.5 mb-2">
              <div className="flex items-start gap-1.5 mb-0.5">
                <img src="https://randomuser.me/api/portraits/med/men/75.jpg" className="w-7 h-7 rounded-full flex-shrink-0 object-cover" alt="" />
                <div>
                  <div className="font-bold text-[8px]">JOHN MWANGI KARIUKI</div>
                  <div className="text-[5.5px] text-gray-700">Administrative Officer</div>
                </div>
              </div>
              <div className="text-[4px] text-gray-600 space-y-0.5">
                <div> Nairobi, Kenya</div>
                <div>P +254 712 345 678</div>
                <div>• johnmwangi@email.com</div>
                <div> linkedin.com/in/johnmwangi</div>
              </div>
            </div>
            
            {/* Professional Summary */}
            <div className="mb-1.5">
              <div className="font-bold text-[5px] uppercase border-b border-gray-300 mb-0.5">Professional Summary</div>
              <div className="text-[4px] text-gray-700">Results-driven administrative and operations professional with over 5 years of experience supporting organizational efficiency, office coordination, and project administration.</div>
            </div>
            
            {/* Skills */}
            <div className="mb-1.5">
              <div className="font-bold text-[5px] uppercase border-b border-gray-300 mb-0.5">Key Skills</div>
              <div className="grid grid-cols-2 gap-x-2 text-[4px]">
                <div>• Office Administration</div>
                <div>• Records Management</div>
                <div>• Customer Service</div>
                <div>• Scheduling & Calendar</div>
                <div>• Report Preparation</div>
                <div>• Microsoft Office</div>
                <div>• Problem Solving</div>
                <div>• Team Collaboration</div>
              </div>
            </div>
            
            {/* Experience */}
            <div className="mb-1.5">
              <div className="font-bold text-[5px] uppercase border-b border-gray-300 mb-0.5">Professional Experience</div>
              <div className="text-[4px] mb-1">
                <div className="font-semibold">Administrative Officer</div>
                <div className="text-gray-700">ABC Logistics Ltd — Nairobi</div>
                <div className="text-gray-500 italic mb-0.5">March 2021 — Present</div>
                <div className="space-y-0.5">
                  <div>• Coordinate daily office operations and administrative activities</div>
                  <div>• Prepare reports, meeting minutes, and official correspondence</div>
                  <div>• Manage document filing systems and maintain accurate records</div>
                  <div>• Supervise office support staff and coordinate schedules</div>
                </div>
              </div>
              <div className="text-[4px] mb-1">
                <div className="font-semibold">Office Assistant</div>
                <div className="text-gray-700">Greenfield Solutions Ltd — Nairobi</div>
                <div className="text-gray-500 italic mb-0.5">January 2019 — February 2021</div>
                <div className="space-y-0.5">
                  <div>• Supported administrative tasks including data entry and scheduling</div>
                  <div>• Managed incoming calls, emails, and office correspondence</div>
                  <div>• Assisted with event planning and coordination</div>
                </div>
              </div>
              <div className="text-[4px]">
                <div className="font-semibold">Administrative Intern</div>
                <div className="text-gray-700">Kenya Commercial Bank — Nairobi</div>
                <div className="text-gray-500 italic mb-0.5">June 2018 — December 2018</div>
                <div className="space-y-0.5">
                  <div>• Assisted with filing, data entry, and document management</div>
                  <div>• Supported customer service and front desk operations</div>
                </div>
              </div>
            </div>
            
            {/* Education */}
            <div className="mb-1.5">
              <div className="font-bold text-[5px] uppercase border-b border-gray-300 mb-0.5">Education</div>
              <div className="text-[4px] mb-0.5">
                <div className="font-semibold">Bachelor of Business Administration</div>
                <div>University of Nairobi</div>
                <div className="text-gray-500 italic">2014 — 2018</div>
              </div>
              <div className="text-[4px] mb-0.5">
                <div className="font-semibold">Diploma in Business Management</div>
                <div>Kenya Institute of Management</div>
                <div className="text-gray-500 italic">2012 — 2014</div>
              </div>
              <div className="text-[4px]">
                <div className="font-semibold">Kenya Certificate of Secondary Education</div>
                <div>Starehe Boys Centre</div>
                <div className="text-gray-500 italic">2008 — 2011</div>
              </div>
            </div>
            
            {/* Certifications */}
            <div className="mb-1.5">
              <div className="font-bold text-[5px] uppercase border-b border-gray-300 mb-0.5">Professional Certifications</div>
              <div className="text-[4px] space-y-0.5">
                <div>• Certificate in Project Management • Kenya Institute of Management 2020</div>
                <div>• Advanced Microsoft Excel Training — Strathmore University 2019</div>
              </div>
            </div>
            
            {/* Achievements */}
            <div className="mb-1.5">
              <div className="font-bold text-[5px] uppercase border-b border-gray-300 mb-0.5">Professional Achievements</div>
              <div className="text-[4px] space-y-0.5">
                <div>• Streamlined office filing system, reducing document retrieval time by 40%</div>
                <div>• Successfully coordinated 15+ company events with 100% attendance</div>
                <div>• Implemented digital record-keeping improving efficiency by 30%</div>
                <div>• Reduced office supply costs by 25% through strategic vendor negotiations</div>
                <div>• Trained and mentored 5 new administrative staff members</div>
              </div>
            </div>
            
            {/* Referees */}
            <div>
              <div className="font-bold text-[5px] uppercase border-b border-gray-300 mb-0.5">Referees</div>
              <div className="text-[4px] italic">Available upon request.</div>
            </div>
          </div>
        );
      
      case 'Modern Professional':
        return (
          <div className="w-full aspect-[3/4] bg-white border border-gray-200 rounded overflow-hidden flex text-[4.5px] leading-[1.3]">
            {/* Left Sidebar */}
            <div className="w-[35%] bg-blue-50 p-2">
              <div className="flex justify-center mb-1.5">
                <img src="https://randomuser.me/api/portraits/med/women/65.jpg" className="w-8 h-8 rounded-full object-cover" alt="" />
              </div>
              <div className="mb-1.5">
                <div className="font-bold text-[6px] text-blue-900 uppercase mb-1">Key Skills</div>
                <div className="space-y-0.5 text-[4.2px]">
                  <div>• Digital Marketing Strategy</div>
                  <div>• Social Media Management</div>
                  <div>• Content Marketing</div>
                  <div>• SEO Optimization</div>
                  <div>• Campaign Analytics</div>
                  <div>• Brand Communication</div>
                  <div>• Email Marketing</div>
                  <div>• Copywriting</div>
                </div>
              </div>
              <div className="mb-1.5">
                <div className="font-bold text-[6px] text-blue-900 uppercase mb-1">Tools & Platforms</div>
                <div className="space-y-0.5 text-[4.2px]">
                  <div>• Google Analytics</div>
                  <div>• Meta Ads Manager</div>
                  <div>• Canva</div>
                  <div>• Mailchimp</div>
                  <div>• Hootsuite</div>
                  <div>• Microsoft Office</div>
                  <div>• WordPress</div>
                </div>
              </div>
              <div className="mb-1.5">
                <div className="font-bold text-[6px] text-blue-900 uppercase mb-1">Languages</div>
                <div className="space-y-0.5 text-[4.2px]">
                  <div>English • Fluent</div>
                  <div>Swahili • Fluent</div>
                </div>
              </div>
              <div>
                <div className="font-bold text-[6px] text-blue-900 uppercase mb-1">Referees</div>
                <div className="text-[4.2px] italic">Available upon request.</div>
              </div>
            </div>
            
            {/* Right Main Content */}
            <div className="flex-1 p-2">
              {/* Header */}
              <div className="border-b border-blue-600 pb-1 mb-1.5">
                <div className="font-bold text-[9px] mb-1">GRACE WANJIKU NJOROGE</div>
                <div className="text-[6.5px] text-blue-700 font-medium mb-1">Digital Marketing Specialist</div>
                <div className="text-[4px] text-gray-600 space-y-0.5">
                  <div> Nairobi, Kenya P +254 723 456 789</div>
                  <div>• grace.njoroge@email.com</div>
                  <div> linkedin.com/in/grace-njoroge</div>
                </div>
              </div>
              
              {/* Professional Profile */}
              <div className="mb-1.5">
                <div className="font-bold text-[6px] text-blue-900 uppercase mb-1">Professional Profile</div>
                <div className="text-[4.2px] text-gray-700">Results-driven digital marketing specialist with over 6 years of experience developing and executing marketing campaigns that increase brand visibility and drive customer engagement. Skilled in digital strategy, social media management, and marketing analytics.</div>
              </div>
              
              {/* Experience */}
              <div className="mb-1.5">
                <div className="font-bold text-[6px] text-blue-900 uppercase mb-1">Professional Experience</div>
                <div className="mb-1">
                  <div className="font-bold text-[4.2px]">Digital Marketing Officer</div>
                  <div className="text-[4.2px] text-blue-700 font-medium">BrightWave Communications Ltd — Nairobi</div>
                  <div className="text-[3.8px] text-gray-500 italic mb-0.5">April 2021 — Present</div>
                  <div className="space-y-0.5 text-[4.2px]">
                    <div>• Develop and execute digital marketing campaigns</div>
                    <div>• Increased social media engagement by 45%</div>
                    <div>• Analyze campaign performance and prepare reports</div>
                    <div>• Coordinate content production and brand messaging</div>
                  </div>
                </div>
                <div className="mb-1">
                  <div className="font-bold text-[4.2px]">Marketing Assistant</div>
                  <div className="text-[4.2px] text-blue-700 font-medium">Skyline Retail Group — Nairobi</div>
                  <div className="text-[3.8px] text-gray-500 italic mb-0.5">Jan 2019 — Mar 2021</div>
                  <div className="space-y-0.5 text-[4.2px]">
                    <div>• Assisted with promotional campaigns and events</div>
                    <div>• Managed customer engagement on social media</div>
                    <div>• Supported market research and competitor analysis</div>
                  </div>
                </div>
                <div>
                  <div className="font-bold text-[4.2px]">Marketing Intern</div>
                  <div className="text-[4.2px] text-blue-700 font-medium">Creative Hub Agency — Nairobi</div>
                  <div className="text-[3.8px] text-gray-500 italic mb-0.5">Jun 2018 — Dec 2018</div>
                  <div className="space-y-0.5 text-[4.2px]">
                    <div>• Assisted in social media content creation</div>
                    <div>• Conducted market research and data analysis</div>
                  </div>
                </div>
              </div>
              
              {/* Education */}
              <div className="mb-1.5">
                <div className="font-bold text-[6px] text-blue-900 uppercase mb-1">Education</div>
                <div className="mb-1">
                  <div className="font-bold text-[4.2px]">Bachelor of Commerce (Marketing Option)</div>
                  <div className="text-[4.2px]">Kenyatta University</div>
                  <div className="text-[3.8px] text-gray-500 italic">2014 — 2018</div>
                </div>
                <div className="mb-1">
                  <div className="font-bold text-[4.2px]">Diploma in Marketing</div>
                  <div className="text-[4.2px]">Kenya Institute of Marketing</div>
                  <div className="text-[3.8px] text-gray-500 italic">2012 — 2014</div>
                </div>
                <div>
                  <div className="font-bold text-[4.2px]">Kenya Certificate of Secondary Education</div>
                  <div className="text-[4.2px]">Alliance Girls High School</div>
                  <div className="text-[3.8px] text-gray-500 italic">2010 — 2013</div>
                </div>
              </div>
              
              {/* Certifications */}
              <div className="mb-1.5">
                <div className="font-bold text-[6px] text-blue-900 uppercase mb-1">Certifications</div>
                <div className="space-y-0.5 text-[4.2px]">
                  <div>• Digital Marketing • Google (2022)</div>
                  <div>• Content Marketing • HubSpot (2021)</div>
                  <div>• Social Media Marketing • Meta (2020)</div>
                </div>
              </div>
              
              {/* Achievements */}
              <div>
                <div className="font-bold text-[6px] text-blue-900 uppercase mb-1">Professional Achievements</div>
                <div className="space-y-0.5 text-[4.2px]">
                  <div>• Increased social media engagement by 45% in 12 months</div>
                  <div>• Successfully launched 20+ digital campaigns with 95% success rate</div>
                  <div>• Grew email subscriber base from 5,000 to 15,000 in 18 months</div>
                  <div>• Achieved 30% increase in website traffic through SEO optimization</div>
                  <div>• Won Best Digital Campaign Award at Kenya Marketing Awards 2023</div>
                </div>
              </div>
            </div>
          </div>
        );
      
      case 'Executive Leadership':
        return (
          <div className="w-full aspect-[3/4] bg-white border border-gray-200 rounded overflow-hidden text-[5px] leading-[1.3]">
            {/* Header */}
            <div className="border-b border-gray-900 pb-1 mb-1.5 px-2 pt-2">
              <div className="flex items-start gap-1.5 mb-0.5">
                <img src="https://randomuser.me/api/portraits/med/men/83.jpg" className="w-7 h-7 rounded-full flex-shrink-0 object-cover" alt="" />
                <div>
                  <div className="font-bold text-[10px]">DAVID OCHIENG OTIENO</div>
                  <div className="text-[7.5px] text-gray-700">Chief Operations Officer (COO)</div>
                </div>
              </div>
              <div className="text-[4.2px] text-gray-600">
                Nairobi, Kenya • +254 711 234 567 • david.otieno@email.com • linkedin.com/in/david-otieno
              </div>
            </div>
            
            <div className="px-2">
              {/* Leadership Profile */}
              <div className="mb-1.5">
                <div className="font-bold text-[6.5px] uppercase mb-1">Leadership Profile</div>
                <div className="text-[4.5px] text-gray-700">Strategic operations executive with over 15 years of leadership experience driving operational efficiency, business growth, and organizational transformation across East Africa.</div>
              </div>
              
              {/* Key Achievements */}
              <div className="mb-1.5">
                <div className="font-bold text-[6.5px] uppercase mb-1">Key Leadership Achievements</div>
                <div className="space-y-0.5 text-[4.5px]">
                  <div>• Led operational restructuring reducing costs by 28% within two years</div>
                  <div>• Oversaw expansion into three East African markets</div>
                  <div>• Implemented digital transformation improving efficiency by 35%</div>
                  <div>• Managed cross-functional teams of over 250 employees</div>
                  <div>• Achieved 40% revenue growth through strategic initiatives</div>
                </div>
              </div>
              
              {/* Experience */}
              <div className="mb-1.5">
                <div className="font-bold text-[6.5px] uppercase mb-1">Strategic Leadership Experience</div>
                <div className="mb-1">
                  <div className="font-semibold text-[4.5px]">Chief Operations Officer</div>
                  <div className="text-[4.5px] text-gray-700">EastAfrica Logistics Group — Nairobi</div>
                  <div className="text-[4px] text-gray-500 italic mb-0.5">2019 — Present</div>
                  <div className="space-y-0.5 text-[4.5px]">
                    <div>• Lead operational strategy for regional company with 300+ staff</div>
                    <div>• Drive business growth and operational excellence initiatives</div>
                    <div>• Implement performance improvement across supply chain</div>
                  </div>
                </div>
                <div className="mb-1">
                  <div className="font-semibold text-[4.5px]">Operations Director</div>
                  <div className="text-[4.5px] text-gray-700">TransGlobal Supply Chain Ltd — Nairobi</div>
                  <div className="text-[4px] text-gray-500 italic mb-0.5">2015 — 2019</div>
                  <div className="space-y-0.5 text-[4.5px]">
                    <div>• Managed nationwide logistics and distribution network</div>
                    <div>• Introduced automation improving efficiency by 22%</div>
                    <div>• Led strategic planning and operational budgeting</div>
                  </div>
                </div>
                <div>
                  <div className="font-semibold text-[4.5px]">Regional Operations Manager</div>
                  <div className="text-[4.5px] text-gray-700">Kenya Freight Services — Nairobi</div>
                  <div className="text-[4px] text-gray-500 italic mb-0.5">2011 — 2015</div>
                  <div className="space-y-0.5 text-[4.5px]">
                    <div>• Oversaw operations for 5 regional branches</div>
                    <div>• Reduced operational costs by 18% through process optimization</div>
                  </div>
                </div>
              </div>
              
              {/* Board Memberships */}
              <div className="mb-1.5">
                <div className="font-bold text-[6.5px] uppercase mb-1">Board Memberships</div>
                <div className="space-y-0.5 text-[4.5px]">
                  <div>• Board Member • Kenya Transport & Logistics Association</div>
                  <div>• Advisory Board — East Africa Supply Chain Council</div>
                  <div>• Board Member • Kenya Institute of Supply Management</div>
                </div>
              </div>
              
              {/* Strategic Initiatives */}
              <div className="mb-1.5">
                <div className="font-bold text-[6.5px] uppercase mb-1">Strategic Initiatives</div>
                <div className="space-y-0.5 text-[4.5px]">
                  <div>• Digital transformation program across all operations</div>
                  <div>• Regional expansion strategy into Tanzania and Uganda</div>
                  <div>• Sustainability initiative reducing carbon footprint by 30%</div>
                </div>
              </div>
              
              {/* Education */}
              <div className="mb-1.5">
                <div className="font-bold text-[6.5px] uppercase mb-1">Education</div>
                <div className="mb-1">
                  <div className="font-semibold text-[4.5px]">Master of Business Administration (MBA)</div>
                  <div className="text-[4.5px]">Strathmore Business School</div>
                  <div className="text-[4px] text-gray-500 italic">2012 — 2014</div>
                </div>
                <div className="mb-1">
                  <div className="font-semibold text-[4.5px]">Bachelor of Commerce (Operations Management)</div>
                  <div className="text-[4.5px]">University of Nairobi</div>
                  <div className="text-[4px] text-gray-500 italic">2004 — 2008</div>
                </div>
                <div>
                  <div className="font-semibold text-[4.5px]">Diploma in Business Management</div>
                  <div className="text-[4.5px]">Kenya Institute of Management</div>
                  <div className="text-[4px] text-gray-500 italic">2002 — 2004</div>
                </div>
              </div>
              
              {/* Certifications */}
              <div>
                <div className="font-bold text-[6.5px] uppercase mb-1">Certifications</div>
                <div className="space-y-0.5 text-[4.5px]">
                  <div>• Certified Supply Chain Professional (CSCP)</div>
                  <div>• Strategic Leadership • Harvard Business School</div>
                  <div>• Project Management Professional (PMP)</div>
                </div>
              </div>
            </div>
          </div>
        );
      
      case 'Graduate Starter CV':
        return (
          <div className="w-full aspect-[3/4] bg-white border border-gray-200 rounded p-2 text-[5.5px] leading-[1.35] overflow-hidden shadow-sm">
            {/* Header */}
            <div className="border-b border-gray-300 pb-1 mb-1.5">
              <div className="flex items-start gap-1.5 mb-0.5">
                <img src="https://randomuser.me/api/portraits/med/men/42.jpg" className="w-6 h-6 rounded-full flex-shrink-0 object-cover" alt="" />
                <div>
                  <div className="font-bold text-[9px] text-gray-900">BRIAN KIPRONO CHEBET</div>
                  <div className="text-[6px] text-gray-700">Recent Graduate • Mechanical Engineering</div>
                </div>
              </div>
              <div className="text-[4.5px] text-gray-600 mt-0.5">
                Nakuru, Kenya | +254 712 987 654 | brian.chebet@email.com | linkedin.com/in/brian-chebet
              </div>
            </div>
            
            {/* Career Objective */}
            <div className="mb-1.5">
              <div className="font-semibold text-[6px] text-gray-900 border-b border-gray-200 pb-0.5 mb-0.5">Career Objective</div>
              <div className="text-[4.8px] text-gray-700">Motivated mechanical engineering graduate seeking an entry-level engineering role where I can apply technical knowledge, problem-solving skills, and hands-on experience to contribute to innovative engineering solutions.</div>
            </div>
            
            {/* Education */}
            <div className="mb-1.5">
              <div className="font-semibold text-[6px] text-gray-900 border-b border-gray-200 pb-0.5 mb-0.5">Education</div>
              <div className="text-[4.8px] mb-1">
                <div className="font-semibold text-gray-900">Bachelor of Science in Mechanical Engineering</div>
                <div className="text-gray-700">Jomo Kenyatta University of Agriculture and Technology</div>
                <div className="text-gray-500 text-[4.2px]">2019 — 2023 | Second Class Honours (Upper Division)</div>
              </div>
              <div className="text-[4.8px]">
                <div className="font-semibold text-gray-900">Kenya Certificate of Secondary Education</div>
                <div className="text-gray-700">Nakuru High School</div>
                <div className="text-gray-500 text-[4.2px]">2015 — 2018 | Grade A-</div>
              </div>
            </div>
            
            {/* Academic Projects */}
            <div className="mb-1.5">
              <div className="font-semibold text-[6px] text-gray-900 border-b border-gray-200 pb-0.5 mb-0.5">Academic Projects</div>
              <div className="mb-1">
                <div className="font-semibold text-[4.8px] text-gray-900">Automated Irrigation System</div>
                <div className="text-[4.2px] text-gray-500 mb-0.5">Final Year Project • 2023</div>
                <div className="text-[4.8px] text-gray-700">Designed and built an automated irrigation system using sensors to regulate water flow based on soil moisture levels. Achieved 40% water savings in test trials.</div>
              </div>
              <div>
                <div className="font-semibold text-[4.8px] text-gray-900">Solar Water Heater Design</div>
                <div className="text-[4.2px] text-gray-500 mb-0.5">Third Year Project • 2022</div>
                <div className="text-[4.8px] text-gray-700">Developed a prototype solar-powered water heater aimed at improving energy efficiency in rural households. Presented at university innovation fair.</div>
              </div>
            </div>
            
            {/* Internship */}
            <div className="mb-1.5">
              <div className="font-semibold text-[6px] text-gray-900 border-b border-gray-200 pb-0.5 mb-0.5">Internship / Industrial Attachment</div>
              <div>
                <div className="font-semibold text-[4.8px] text-gray-900">Engineering Intern • KenGen</div>
                <div className="text-[4.2px] text-gray-500 mb-0.5">Naivasha | May 2022 — Aug 2022</div>
                <div className="space-y-0.5 text-[4.8px]">
                  <div>• Assisted engineers with maintenance and inspection of turbine systems</div>
                  <div>• Participated in safety audits and plant operations monitoring</div>
                  <div>• Prepared technical reports on equipment performance</div>
                  <div>• Gained hands-on experience with geothermal power generation</div>
                </div>
              </div>
            </div>
            
            {/* Skills */}
            <div className="mb-1.5">
              <div className="font-semibold text-[6px] text-gray-900 border-b border-gray-200 pb-0.5 mb-0.5">Key Skills</div>
              <div className="grid grid-cols-2 gap-x-1 gap-y-0.5 text-[4.8px]">
                <div>• AutoCAD & SolidWorks</div>
                <div>• Microsoft Excel & Word</div>
                <div>• Engineering Drawing</div>
                <div>• Team Collaboration</div>
                <div>• Technical Problem Solving</div>
                <div>• Technical Report Writing</div>
                <div>• MATLAB Programming</div>
                <div>• Project Management</div>
              </div>
            </div>
            
            {/* Extracurricular */}
            <div className="mb-1.5">
              <div className="font-semibold text-[6px] text-gray-900 border-b border-gray-200 pb-0.5 mb-0.5">Extracurricular Activities</div>
              <div className="space-y-0.5 text-[4.8px]">
                <div>• Member • Engineering Students Association (2020-2023)</div>
                <div>• Volunteer • Community STEM Mentorship Program</div>
                <div>• Participant • National Engineering Innovation Competition 2022</div>
              </div>
            </div>
            
            {/* Referees */}
            <div>
              <div className="font-semibold text-[6px] text-gray-900 border-b border-gray-200 pb-0.5 mb-0.5">Referees</div>
              <div className="text-[4.8px] text-gray-700">Available upon request.</div>
            </div>
          </div>
        );
      
      case 'Skills-Based (Functional)':
        return (
          <div className="w-full aspect-[3/4] bg-white border border-gray-200 rounded p-2 text-[5.5px] leading-[1.35] overflow-hidden shadow-sm">
            {/* Header */}
            <div className="border-b-2 border-gray-300 pb-1 mb-1.5">
              <div className="flex items-start gap-1.5 mb-0.5">
                <img src="https://randomuser.me/api/portraits/med/women/44.jpg" className="w-6 h-6 rounded-full flex-shrink-0 object-cover" alt="" />
                <div>
                  <div className="font-bold text-[9px] text-gray-900">MARY ACHIENG ODHIAMBO</div>
                  <div className="text-[6px] text-blue-700 font-medium">Customer Service Specialist</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-x-1 text-[4.5px] text-gray-600 mt-0.5">
                <span> Kisumu, Kenya</span>
                <span>P +254 710 234 567</span>
                <span>• mary.odhiambo@email.com</span>
                <span> linkedin.com/in/mary-odhiambo</span>
              </div>
            </div>
            
            {/* Professional Summary */}
            <div className="mb-1.5">
              <div className="font-bold text-[6px] text-gray-900 uppercase border-b border-gray-300 pb-0.5 mb-0.5">Professional Summary</div>
              <div className="text-[4.8px] text-gray-700">Customer-focused professional with strong communication and problem-solving skills developed through experience in retail, community service, and administrative roles. Proven ability to build positive relationships and deliver excellent service.</div>
            </div>
            
            {/* Core Competencies */}
            <div className="mb-1.5">
              <div className="font-bold text-[6px] text-gray-900 uppercase border-b border-gray-300 pb-0.5 mb-0.5">Core Competencies</div>
              <div className="grid grid-cols-2 gap-x-1 gap-y-0.5">
                <div className="flex items-start text-[4.8px]">
                  <span className="text-blue-600 mr-0.5">•</span>
                  <span>Customer Support</span>
                </div>
                <div className="flex items-start text-[4.8px]">
                  <span className="text-blue-600 mr-0.5">•</span>
                  <span>Communication</span>
                </div>
                <div className="flex items-start text-[4.8px]">
                  <span className="text-blue-600 mr-0.5">•</span>
                  <span>Conflict Resolution</span>
                </div>
                <div className="flex items-start text-[4.8px]">
                  <span className="text-blue-600 mr-0.5">•</span>
                  <span>Team Collaboration</span>
                </div>
                <div className="flex items-start text-[4.8px]">
                  <span className="text-blue-600 mr-0.5">•</span>
                  <span>Problem Solving</span>
                </div>
                <div className="flex items-start text-[4.8px]">
                  <span className="text-blue-600 mr-0.5">•</span>
                  <span>Data Entry & MS Office</span>
                </div>
              </div>
            </div>
            
            {/* Professional Skills */}
            <div className="mb-1.5">
              <div className="font-bold text-[6px] text-gray-900 uppercase border-b border-gray-300 pb-0.5 mb-0.5">Professional Skills</div>
              <div className="space-y-1">
                <div>
                  <div className="text-[4.8px] font-bold text-blue-700">Customer Service Skills</div>
                  <div className="space-y-0.5 ml-1 text-[4.5px]">
                    <div className="flex items-start">
                      <span className="text-gray-400 mr-0.5">•</span>
                      <span>Handling customer inquiries and complaints professionally</span>
                    </div>
                    <div className="flex items-start">
                      <span className="text-gray-400 mr-0.5">•</span>
                      <span>Providing accurate product information and recommendations</span>
                    </div>
                    <div className="flex items-start">
                      <span className="text-gray-400 mr-0.5">•</span>
                      <span>Building rapport and maintaining customer relationships</span>
                    </div>
                  </div>
                </div>
                <div>
                  <div className="text-[4.8px] font-bold text-blue-700">Administrative Skills</div>
                  <div className="space-y-0.5 ml-1 text-[4.5px]">
                    <div className="flex items-start">
                      <span className="text-gray-400 mr-0.5">•</span>
                      <span>Document management and filing systems</span>
                    </div>
                    <div className="flex items-start">
                      <span className="text-gray-400 mr-0.5">•</span>
                      <span>Data entry and reporting with high accuracy</span>
                    </div>
                    <div className="flex items-start">
                      <span className="text-gray-400 mr-0.5">•</span>
                      <span>Scheduling and calendar management</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Work Experience */}
            <div className="mb-1.5">
              <div className="font-bold text-[6px] text-gray-900 uppercase border-b border-gray-300 pb-0.5 mb-0.5">Relevant Work Experience</div>
              <div className="space-y-0.5 text-[4.8px]">
                <div>
                  <span className="font-semibold">Retail Assistant</span>
                  <span className="text-gray-600"> • QuickMart Supermarket, Kisumu</span>
                  <span className="text-gray-500 italic"> (2021 — 2023)</span>
                </div>
                <div>
                  <span className="font-semibold">Volunteer Admin Assistant</span>
                  <span className="text-gray-600"> • Community Development Initiative</span>
                  <span className="text-gray-500 italic"> (2020 — 2021)</span>
                </div>
                <div>
                  <span className="font-semibold">Sales Intern</span>
                  <span className="text-gray-600"> • Tuskys Supermarket, Kisumu</span>
                  <span className="text-gray-500 italic"> (2019 — 2020)</span>
                </div>
              </div>
            </div>
            
            {/* Education */}
            <div className="mb-1.5">
              <div className="font-bold text-[6px] text-gray-900 uppercase border-b border-gray-300 pb-0.5 mb-0.5">Education</div>
              <div className="text-[4.8px] mb-1">
                <div className="font-semibold">Diploma in Business Administration</div>
                <div className="text-gray-700">Kisumu National Polytechnic</div>
                <div className="text-[4.2px] text-gray-500 italic">2018 — 2020 | Credit Pass</div>
              </div>
              <div className="text-[4.8px]">
                <div className="font-semibold">Kenya Certificate of Secondary Education</div>
                <div className="text-gray-700">Kisumu Girls High School</div>
                <div className="text-[4.2px] text-gray-500 italic">2014 — 2017 | Grade C+</div>
              </div>
            </div>
            
            {/* Certifications */}
            <div className="mb-1.5">
              <div className="font-bold text-[6px] text-gray-900 uppercase border-b border-gray-300 pb-0.5 mb-0.5">Certifications</div>
              <div className="space-y-0.5 text-[4.8px]">
                <div className="flex items-start">
                  <span className="text-blue-600 mr-0.5">•</span>
                  <span>Customer Service Excellence • Alison (2022)</span>
                </div>
                <div className="flex items-start">
                  <span className="text-blue-600 mr-0.5">•</span>
                  <span>Basic Computer Applications • Kenya ICT Board (2020)</span>
                </div>
              </div>
            </div>
            
            {/* Referees */}
            <div>
              <div className="font-bold text-[6px] text-gray-900 uppercase border-b border-gray-300 pb-0.5 mb-0.5">Referees</div>
              <div className="text-[4.8px] text-gray-700">Available upon request.</div>
            </div>
          </div>
        );
      
      case 'Classic Executive':
        return (
          <div className="w-full aspect-[3/4] bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded p-2 flex items-center justify-center">
            <div className="text-center text-gray-400">
              <div className="text-[6px] font-semibold">Classic Executive</div>
              <div className="text-[4px] mt-1">Coming Soon</div>
            </div>
          </div>
        );
      
      case 'Internship / Industrial Attachment':
        return (
          <div className="w-full aspect-[3/4] bg-white border border-gray-200 rounded p-2 text-[5.5px] leading-[1.35] overflow-hidden shadow-sm">
            {/* Header */}
            <div className="border-b border-gray-800 pb-1 mb-1.5">
              <div className="flex items-start gap-1.5 mb-0.5">
                <img src="https://randomuser.me/api/portraits/med/men/22.jpg" className="w-6 h-6 rounded-full flex-shrink-0 object-cover" alt="" />
                <div>
                  <div className="font-bold text-[9px] text-gray-900">KEVIN MUTUA MULI</div>
                  <div className="text-[6px] text-gray-700">Student • Diploma in Electrical Engineering</div>
                </div>
              </div>
              <div className="text-[4.5px] text-gray-600 mt-0.5">
                Machakos, Kenya | +254 712 345 901 | kevin.mutua@email.com | linkedin.com/in/kevin-mutua
              </div>
            </div>
            
            {/* Career Objective */}
            <div className="mb-1.5">
              <div className="font-semibold text-[6px] text-gray-900 border-b border-gray-200 pb-0.5 mb-0.5">Career Objective</div>
              <div className="text-[4.8px] text-gray-700">Motivated electrical engineering student seeking an industrial attachment opportunity to gain hands-on experience in electrical systems, maintenance, and engineering operations while applying classroom knowledge to real-world challenges.</div>
            </div>
            
            {/* Education */}
            <div className="mb-1.5">
              <div className="font-semibold text-[6px] text-gray-900 border-b border-gray-200 pb-0.5 mb-0.5">Education</div>
              <div className="text-[4.8px] mb-1">
                <div className="font-semibold text-gray-900">Diploma in Electrical and Electronic Engineering</div>
                <div className="text-gray-700">Machakos Technical Institute</div>
                <div className="text-gray-500 text-[4.2px]">2022 — Present | Current GPA: 3.5/4.0</div>
              </div>
              <div className="text-[4.8px]">
                <div className="font-semibold text-gray-900">Kenya Certificate of Secondary Education</div>
                <div className="text-gray-700">Machakos Boys High School</div>
                <div className="text-gray-500 text-[4.2px]">2018 — 2021 | Grade B+</div>
              </div>
            </div>
            
            {/* Technical Skills */}
            <div className="mb-1.5">
              <div className="font-semibold text-[6px] text-gray-900 border-b border-gray-200 pb-0.5 mb-0.5">Technical Skills</div>
              <div className="grid grid-cols-2 gap-x-1 gap-y-0.5 text-[4.8px]">
                <div>• Electrical Installation</div>
                <div>• Circuit Analysis</div>
                <div>• Basic PLC Programming</div>
                <div>• Electrical Safety Procedures</div>
                <div>• Technical Drawing</div>
                <div>• Microsoft Office Suite</div>
                <div>• Wiring & Troubleshooting</div>
                <div>• Equipment Maintenance</div>
              </div>
            </div>
            
            {/* Academic Projects */}
            <div className="mb-1.5">
              <div className="font-semibold text-[6px] text-gray-900 border-b border-gray-200 pb-0.5 mb-0.5">Academic Projects</div>
              <div className="mb-1">
                <div className="font-semibold text-[4.8px] text-gray-900">Automatic Street Lighting System</div>
                <div className="text-[4.2px] text-gray-500 mb-0.5">Final Year Project • 2023</div>
                <div className="text-[4.8px] text-gray-700">Designed a light-dependent resistor system that automatically switches street lights on and off based on ambient light. Reduced energy consumption by 35% in test environment.</div>
              </div>
              <div>
                <div className="font-semibold text-[4.8px] text-gray-900">Home Electrical Wiring Simulation</div>
                <div className="text-[4.2px] text-gray-500 mb-0.5">Second Year Project • 2023</div>
                <div className="text-[4.8px] text-gray-700">Created a complete residential wiring diagram and simulation demonstrating proper electrical installation standards and safety protocols.</div>
              </div>
            </div>
            
            {/* Industrial Attachment */}
            <div className="mb-1.5">
              <div className="font-semibold text-[6px] text-gray-900 border-b border-gray-200 pb-0.5 mb-0.5">Industrial Attachment</div>
              <div>
                <div className="font-semibold text-[4.8px] text-gray-900">Industrial Attachment Trainee • Kenya Power</div>
                <div className="text-[4.2px] text-gray-500 mb-0.5">Machakos | May 2024 — Aug 2024</div>
                <div className="space-y-0.5 text-[4.8px]">
                  <div>• Assisted technicians with electrical line inspection and maintenance</div>
                  <div>• Observed transformer servicing procedures and safety protocols</div>
                  <div>• Participated in installation of electrical wiring systems</div>
                  <div>• Learned meter reading and customer service procedures</div>
                </div>
              </div>
            </div>
            
            {/* Extracurricular Activities */}
            <div className="mb-1.5">
              <div className="font-semibold text-[6px] text-gray-900 border-b border-gray-200 pb-0.5 mb-0.5">Extracurricular Activities</div>
              <div className="space-y-0.5 text-[4.8px]">
                <div>• Member • Engineering Students Association (2022-Present)</div>
                <div>• Volunteer • Local Community Electrical Repairs Initiative</div>
                <div>• Participant • Technical Skills Competition 2023</div>
              </div>
            </div>
            
            {/* Referees */}
            <div>
              <div className="font-semibold text-[6px] text-gray-900 border-b border-gray-200 pb-0.5 mb-0.5">Referees</div>
              <div className="text-[4.8px] text-gray-700">Available upon request.</div>
            </div>
          </div>
        );
      
      case 'Creative Portfolio':
        return (
          <div className="w-full aspect-[3/4] bg-white border border-gray-200 rounded overflow-hidden flex text-[4.5px] leading-[1.3]">
            {/* Left Sidebar */}
            <div className="w-[33%] bg-indigo-600 text-white p-2">
              <div className="flex justify-center mb-1">
                <img src="https://randomuser.me/api/portraits/med/men/36.jpg" className="w-8 h-8 rounded-full border border-indigo-300 object-cover" alt="" />
              </div>
              <div className="font-bold text-[7px] mb-0.5 text-center">BRIAN MWANGI KIMANI</div>
              <div className="text-[5px] opacity-90 mb-1.5 text-center">Graphic Designer | Brand Identity</div>
              
              <div className="text-[4px] mb-1.5 space-y-0.5">
                <div> Nairobi, Kenya</div>
                <div>P +254 712 567 890</div>
                <div>• brian.kimani@email.com</div>
                <div> briankimani.design</div>
              </div>
              
              <div className="mb-1.5">
                <div className="font-semibold text-[5px] mb-1">Core Skills</div>
                <div className="space-y-0.5 text-[4px]">
                  <div>• Brand Identity Design</div>
                  <div>• Logo Design</div>
                  <div>• Typography</div>
                  <div>• Social Media Graphics</div>
                  <div>• Illustration</div>
                  <div>• Visual Storytelling</div>
                  <div>• Print Design</div>
                  <div>• Digital Marketing</div>
                </div>
              </div>
              
              <div className="mb-1.5">
                <div className="font-semibold text-[5px] mb-1">Design Tools</div>
                <div className="space-y-0.5 text-[4px]">
                  <div>• Adobe Photoshop</div>
                  <div>• Adobe Illustrator</div>
                  <div>• Figma</div>
                  <div>• Canva</div>
                  <div>• After Effects</div>
                  <div>• InDesign</div>
                  <div>• Sketch</div>
                </div>
              </div>
              
              <div>
                <div className="font-semibold text-[5px] mb-1">Languages</div>
                <div className="space-y-0.5 text-[4px]">
                  <div>• English - Fluent</div>
                  <div>• Swahili - Native</div>
                </div>
              </div>
            </div>
            
            {/* Right Main Content */}
            <div className="flex-1 p-2">
              {/* Creative Profile */}
              <div className="mb-1.5">
                <div className="font-semibold text-[5.5px] border-b-2 border-indigo-600 pb-0.5 mb-1">Creative Profile</div>
                <div className="text-[4px] text-gray-700">Creative graphic designer with over 5 years of experience creating brand identities, digital marketing visuals, and social media campaigns. Passionate about crafting designs that communicate brand stories effectively and resonate with target audiences.</div>
              </div>
              
              {/* Portfolio Projects */}
              <div className="mb-1.5">
                <div className="font-semibold text-[5.5px] border-b-2 border-indigo-600 pb-0.5 mb-1">Portfolio Projects</div>
                <div className="space-y-1">
                  <div>
                    <div className="font-semibold text-[4px]">Brand Identity • Nairobi Coffee Co.</div>
                    <div className="text-[3.5px] text-gray-500">Nairobi Coffee Co. | 2024</div>
                    <div className="text-[4px]">Designed full brand identity including logo, packaging, and social media visuals for local coffee startup. Created warm, approachable brand celebrating Kenyan coffee culture.</div>
                  </div>
                  <div>
                    <div className="font-semibold text-[4px]">Digital Campaign Graphics</div>
                    <div className="text-[3.5px] text-gray-500">Safaricom SME Campaign | 2023</div>
                    <div className="text-[4px]">Created marketing graphics used across social media ads and digital platforms. Developed over 50 unique assets increasing engagement by 40%.</div>
                  </div>
                  <div>
                    <div className="font-semibold text-[4px]">E-commerce Website Design</div>
                    <div className="text-[3.5px] text-gray-500">Zuri Fashion Boutique | 2023</div>
                    <div className="text-[4px]">Designed complete UI/UX for online fashion store including product photography direction and promotional materials.</div>
                  </div>
                </div>
              </div>
              
              {/* Work Experience */}
              <div className="mb-1.5">
                <div className="font-semibold text-[5.5px] border-b-2 border-indigo-600 pb-0.5 mb-1">Work Experience</div>
                <div className="space-y-1">
                  <div>
                    <div className="font-semibold text-[4px]">Senior Graphic Designer • Creative Edge Agency</div>
                    <div className="text-[3.5px] text-gray-500">Nairobi | 2022 — Present</div>
                  </div>
                  <div>
                    <div className="font-semibold text-[4px]">Graphic Designer • Pixel Studio</div>
                    <div className="text-[3.5px] text-gray-500">Nairobi | 2020 — 2022</div>
                  </div>
                  <div>
                    <div className="font-semibold text-[4px]">Junior Designer • Design Hub Kenya</div>
                    <div className="text-[3.5px] text-gray-500">Nairobi | 2019 — 2020</div>
                  </div>
                </div>
              </div>
              
              {/* Education */}
              <div className="mb-1.5">
                <div className="font-semibold text-[5.5px] border-b-2 border-indigo-600 pb-0.5 mb-1">Education</div>
                <div>
                  <div className="font-semibold text-[4px]">Diploma in Graphic Design</div>
                  <div className="text-[4px]">Nairobi Institute of Technology</div>
                  <div className="text-[3.5px] text-gray-500">2017 — 2019</div>
                </div>
              </div>
              
              {/* Awards */}
              <div className="mb-1.5">
                <div className="font-semibold text-[5.5px] border-b-2 border-indigo-600 pb-0.5 mb-1">Awards & Recognition</div>
                <div className="space-y-0.5 text-[4px]">
                  <div>• Best Brand Identity - Kenya Design Awards 2023</div>
                  <div>• Creative Excellence Award - East Africa Advertising Summit 2022</div>
                  <div>• Rising Designer of the Year - Nairobi Creative Week 2021</div>
                  <div>• Gold Award for Print Design - Nairobi Design Festival 2022</div>
                  <div>• Best Packaging Design - East Africa Brand Awards 2021</div>
                </div>
              </div>

              {/* Notable Clients */}
              <div className="mb-1.5">
                <div className="font-semibold text-[5.5px] border-b-2 border-indigo-600 pb-0.5 mb-1">Notable Clients</div>
                <div className="grid grid-cols-2 gap-x-1 gap-y-0.5 text-[4px]">
                  <div>• Safaricom Limited</div>
                  <div>• KCB Bank</div>
                  <div>• Nairobi Coffee Co.</div>
                  <div>• Zuri Fashion</div>
                  <div>• Kenya Wildlife Foundation</div>
                  <div>• East African Breweries</div>
                  <div>• Nairobi Jazz Festival</div>
                  <div>• Equity Bank Kenya</div>
                </div>
              </div>

              {/* Memberships */}
              <div>
                <div className="font-semibold text-[5.5px] border-b-2 border-indigo-600 pb-0.5 mb-1">Professional Memberships</div>
                <div className="space-y-0.5 text-[4px]">
                  <div>• Member - Design Society of Kenya</div>
                  <div>• Member - African Creative Network</div>
                  <div>• Member - Graphic Design Association of East Africa</div>
                  <div>• Volunteer Mentor - Nairobi Design Week</div>
                </div>
              </div>
            </div>
          </div>
        );
      
      case 'Digital Professional':
        return (
          <div className="w-full aspect-[3/4] bg-white border border-gray-200 rounded overflow-hidden flex text-[4px] leading-[1.3]">
            {/* Left Sidebar */}
            <div className="w-[33%] bg-gray-900 text-white p-2">
              <div className="flex justify-center mb-1">
                <img src="https://randomuser.me/api/portraits/med/men/55.jpg" className="w-8 h-8 rounded-full border border-gray-600 object-cover" alt="" />
              </div>
              <div className="font-bold text-[6px] mb-0.5 text-center">KEVIN OTIENO</div>
              <div className="text-[4.5px] text-gray-300 mb-1 text-center">Full Stack Developer</div>
              
              <div className="text-[3.5px] mb-1.5 space-y-0.5">
                <div>Nairobi, Kenya</div>
                <div>+254 712 888 999</div>
                <div>kevin@email.com</div>
                <div>github.com/kevin</div>
              </div>
              
              <div className="mb-1.5">
                <div className="font-semibold text-[4.5px] border-b border-gray-700 pb-0.5 mb-0.5">Tech Stack</div>
                <div className="space-y-0.5 text-[3.5px]">
                  <div>• JavaScript / TypeScript</div>
                  <div>• React / Next.js</div>
                  <div>• Node.js / Express</div>
                  <div>• PostgreSQL</div>
                  <div>• Tailwind CSS</div>
                  <div>• GraphQL / REST</div>
                </div>
              </div>
              
              <div className="mb-1.5">
                <div className="font-semibold text-[4.5px] border-b border-gray-700 pb-0.5 mb-0.5">Tools</div>
                <div className="space-y-0.5 text-[3.5px]">
                  <div>• Git / GitHub</div>
                  <div>• Docker</div>
                  <div>• AWS / Vercel</div>
                  <div>• VS Code</div>
                  <div>• Figma</div>
                </div>
              </div>
              
              <div>
                <div className="font-semibold text-[4.5px] border-b border-gray-700 pb-0.5 mb-0.5">Certifications</div>
                <div className="space-y-0.5 text-[3.5px]">
                  <div>• AWS Developer</div>
                  <div>• Google Analytics</div>
                  <div>• Meta Front-End</div>
                </div>
              </div>
            </div>
            
            {/* Right Main Content */}
            <div className="flex-1 p-2">
              {/* Summary */}
              <div className="mb-1.5">
                <div className="font-semibold text-[5px] border-b-2 border-gray-900 pb-0.5 mb-0.5">Professional Summary</div>
                <div className="text-[3.5px] text-gray-700">Full stack developer with 4+ years building scalable web applications using modern JavaScript frameworks and cloud technologies.</div>
              </div>
              
              {/* Projects */}
              <div className="mb-1.5">
                <div className="font-semibold text-[5px] border-b-2 border-gray-900 pb-0.5 mb-0.5">Key Projects</div>
                <div className="space-y-1">
                  <div>
                    <div className="font-semibold text-[3.5px]">E-Commerce Platform</div>
                    <div className="text-[3px] text-gray-600 italic">Next.js, Supabase, Stripe</div>
                    <div className="text-[3.5px]">Built full-stack platform with payment integration and admin dashboard. Handled 10K+ monthly transactions.</div>
                  </div>
                  <div>
                    <div className="font-semibold text-[3.5px]">Job Board Application</div>
                    <div className="text-[3px] text-gray-600 italic">React, Node.js, PostgreSQL</div>
                    <div className="text-[3.5px]">Developed job board with advanced search and application tracking. Serves 500+ employers.</div>
                  </div>
                </div>
              </div>
              
              {/* Experience */}
              <div className="mb-1.5">
                <div className="font-semibold text-[5px] border-b-2 border-gray-900 pb-0.5 mb-0.5">Experience</div>
                <div className="space-y-1">
                  <div>
                    <div className="font-semibold text-[3.5px]">Senior Developer • TechNova</div>
                    <div className="text-[3px] text-gray-600">Nairobi | 2022 — Present</div>
                    <div className="space-y-0.5 text-[3.5px] ml-1">
                      <div>• Lead development of web apps</div>
                      <div>• Reduced load time by 40%</div>
                    </div>
                  </div>
                  <div>
                    <div className="font-semibold text-[3.5px]">Developer • Digital Edge</div>
                    <div className="text-[3px] text-gray-600">Nairobi | 2020 — 2022</div>
                    <div className="space-y-0.5 text-[3.5px] ml-1">
                      <div>• Built MERN stack projects</div>
                      <div>• Implemented CI/CD pipelines</div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Education */}
              <div className="mb-1.5">
                <div className="font-semibold text-[5px] border-b-2 border-gray-900 pb-0.5 mb-0.5">Education</div>
                <div>
                  <div className="font-semibold text-[3.5px]">BSc Computer Science</div>
                  <div className="text-[3.5px]">University of Nairobi</div>
                  <div className="text-[3px] text-gray-600">2016 — 2020 | GPA: 3.7/4.0</div>
                </div>
              </div>

              {/* Achievements */}
              <div className="mb-1.5">
                <div className="font-semibold text-[5px] border-b-2 border-gray-900 pb-0.5 mb-0.5">Key Achievements</div>
                <div className="space-y-0.5 text-[3.5px]">
                  <div>• Migrated monolith to microservices, improving scalability by 300%</div>
                  <div>• Reduced API response time from 2s to 200ms via Redis caching</div>
                  <div>• Mentored 5 junior devs, all promoted within 18 months</div>
                  <div>• Increased test coverage from 40% to 85%, cutting bugs by 60%</div>
                  <div>• Saved KES 200K/month through database query optimisation</div>
                </div>
              </div>

              {/* Open Source */}
              <div className="mb-1.5">
                <div className="font-semibold text-[5px] border-b-2 border-gray-900 pb-0.5 mb-0.5">Open Source</div>
                <div className="space-y-0.5 text-[3.5px]">
                  <div>• React Admin Dashboard • 250+ GitHub stars</div>
                  <div>• Kenya Payment Gateway SDK • 180+ stars</div>
                  <div>• East Africa Timezone Library • 120+ stars</div>
                </div>
              </div>

              {/* Technical Writing */}
              <div className="mb-1.5">
                <div className="font-semibold text-[5px] border-b-2 border-gray-900 pb-0.5 mb-0.5">Technical Writing</div>
                <div className="space-y-0.5 text-[3.5px]">
                  <div>• Building Scalable APIs with Node.js • Dev.to (5K+ views)</div>
                  <div>• React Performance Optimization Guide • Medium (3K+ views)</div>
                  <div>• Database Design Best Practices • Personal Blog</div>
                </div>
              </div>

              {/* Volunteer */}
              <div>
                <div className="font-semibold text-[5px] border-b-2 border-gray-900 pb-0.5 mb-0.5">Volunteer & Community</div>
                <div className="space-y-0.5 text-[3.5px]">
                  <div>• Code Mentor • Moringa School (2022•Present)</div>
                  <div>• Tech Workshop Facilitator • iHub Nairobi</div>
                  <div>• Guest Lecturer • University of Nairobi CS Dept (2023)</div>
                </div>
              </div>
            </div>
          </div>
        );
      
      case 'Personal Brand CV':
        return (
          <div className="w-full aspect-[3/4] bg-white border border-gray-200 rounded overflow-hidden flex text-[4px] leading-[1.3]">
            {/* Left Sidebar */}
            <div className="w-[35%] bg-gray-100 p-2">
              <div className="flex justify-center mb-1.5">
                <img src="https://randomuser.me/api/portraits/med/women/28.jpg" className="w-8 h-8 rounded-full object-cover" alt="" />
              </div>
              <div className="mb-1.5">
                <div className="font-semibold text-[5px] text-indigo-700 mb-0.5">CONTACT</div>
                <div className="text-[3.5px] space-y-0.5">
                  <div>Nairobi, Kenya</div>
                  <div>+254 712 555 444</div>
                  <div>grace@email.com</div>
                </div>
              </div>
              
              <div className="mb-1.5">
                <div className="font-semibold text-[5px] text-indigo-700 mb-0.5">ONLINE PRESENCE</div>
                <div className="text-[3.5px] space-y-0.5">
                  <div>LinkedIn: /gracemwangi</div>
                  <div>Twitter: @gracebrands</div>
                  <div>Website: gracemwangi.co.ke</div>
                </div>
              </div>
              
              <div className="mb-1.5">
                <div className="font-semibold text-[5px] text-indigo-700 mb-0.5">KEY SKILLS</div>
                <div className="text-[3.5px] space-y-0.5">
                  <div>• Brand Strategy</div>
                  <div>• Digital Marketing</div>
                  <div>• Public Speaking</div>
                  <div>• Content Marketing</div>
                  <div>• Personal Branding</div>
                  <div>• Social Media</div>
                </div>
              </div>
              
              <div>
                <div className="font-semibold text-[5px] text-indigo-700 mb-0.5">CERTIFICATIONS</div>
                <div className="text-[3.5px] space-y-0.5">
                  <div>• Google Digital Marketing</div>
                  <div>• HubSpot Content</div>
                  <div>• Facebook Blueprint</div>
                </div>
              </div>
            </div>
            
            {/* Right Main Content */}
            <div className="flex-1 p-2">
              {/* Header */}
              <div className="bg-indigo-600 text-white p-1.5 mb-1.5 -mx-2 -mt-2">
                <div className="font-bold text-[7px]">GRACE WANJIKU MWANGI</div>
                <div className="text-[4.5px]">Marketing Strategist | Brand Storyteller</div>
              </div>
              
              {/* Profile */}
              <div className="mb-1.5">
                <div className="font-semibold text-[4.5px] border-b-2 border-indigo-600 pb-0.5 mb-0.5">PERSONAL PROFILE</div>
                <div className="text-[3.5px] text-gray-700">Award-winning marketing strategist with 8+ years helping brands build connections through storytelling and digital marketing.</div>
              </div>
              
              {/* Publications */}
              <div className="mb-1.5">
                <div className="font-semibold text-[4.5px] border-b-2 border-indigo-600 pb-0.5 mb-0.5">PUBLICATIONS & MEDIA</div>
                <div className="space-y-0.5 text-[3.5px]">
                  <div>
                    <div className="font-semibold">Building Authentic Brands in Africa</div>
                    <div className="text-gray-600">Marketing Africa Magazine | 2024</div>
                  </div>
                  <div>
                    <div className="font-semibold">SME Digital Marketing Guide</div>
                    <div className="text-gray-600">Business Daily Kenya | 2023</div>
                  </div>
                </div>
              </div>
              
              {/* Speaking */}
              <div className="mb-1.5">
                <div className="font-semibold text-[4.5px] border-b-2 border-indigo-600 pb-0.5 mb-0.5">SPEAKING ENGAGEMENTS</div>
                <div className="space-y-0.5 text-[3.5px]">
                  <div>
                    <div className="font-semibold">Nairobi Digital Marketing Summit</div>
                    <div className="text-gray-600">Nairobi | 2024</div>
                  </div>
                  <div>
                    <div className="font-semibold">Kenya SME Growth Forum</div>
                    <div className="text-gray-600">Nairobi | 2023</div>
                  </div>
                </div>
              </div>
              
              {/* Experience */}
              <div className="mb-1.5">
                <div className="font-semibold text-[4.5px] border-b-2 border-indigo-600 pb-0.5 mb-0.5">EXPERIENCE</div>
                <div className="space-y-1">
                  <div>
                    <div className="font-semibold text-[3.5px]">Marketing Consultant • BrandGrow</div>
                    <div className="text-[3px] text-gray-600">Nairobi | 2021 — Present</div>
                    <div className="text-[3.5px]">Lead brand strategy for 20+ clients. 150% ROI improvement.</div>
                  </div>
                  <div>
                    <div className="font-semibold text-[3.5px]">Marketing Manager • BrightWave</div>
                    <div className="text-[3px] text-gray-600">Nairobi | 2018 — 2021</div>
                    <div className="text-[3.5px]">Managed campaigns for major brands. Led team of 8.</div>
                  </div>
                </div>
              </div>
              
              {/* Education */}
              <div className="mb-1.5">
                <div className="font-semibold text-[4.5px] border-b-2 border-indigo-600 pb-0.5 mb-0.5">EDUCATION</div>
                <div>
                  <div className="font-semibold text-[3.5px]">BCom Marketing - First Class Honours</div>
                  <div className="text-[3.5px]">Kenyatta University</div>
                  <div className="text-[3px] text-gray-600">2013 — 2017</div>
                </div>
              </div>

              {/* Awards */}
              <div className="mb-1.5">
                <div className="font-semibold text-[4.5px] border-b-2 border-indigo-600 pb-0.5 mb-0.5">AWARDS & RECOGNITION</div>
                <div className="space-y-0.5 text-[3.5px]">
                  <div>• Marketing Professional of the Year • Kenya Marketing Awards 2023</div>
                  <div>• Best Digital Campaign • East Africa Advertising Awards 2022</div>
                  <div>• Top 40 Under 40 Marketing Leaders • Business Daily 2022</div>
                  <div>• Excellence in Brand Strategy • Marketing Society of Kenya 2021</div>
                </div>
              </div>

              {/* Media Features */}
              <div className="mb-1.5">
                <div className="font-semibold text-[4.5px] border-b-2 border-indigo-600 pb-0.5 mb-0.5">MEDIA FEATURES</div>
                <div className="space-y-0.5 text-[3.5px]">
                  <div>• Featured Expert • Citizen TV Business Today (2024)</div>
                  <div>• Guest Columnist • Business Daily Kenya (Monthly, 2023•Present)</div>
                  <div>• Podcast Interview • The Marketing Show Africa (2023)</div>
                  <div>• Radio Interview • Capital FM Business Breakfast (2023)</div>
                </div>
              </div>

              {/* Affiliations */}
              <div>
                <div className="font-semibold text-[4.5px] border-b-2 border-indigo-600 pb-0.5 mb-0.5">PROFESSIONAL AFFILIATIONS</div>
                <div className="space-y-0.5 text-[3.5px]">
                  <div>• Member • Marketing Society of Kenya (MSK)</div>
                  <div>• Member • Kenya Speakers Association</div>
                  <div>• Board Member • Young Marketing Professionals Network</div>
                  <div>• Mentor • Women in Marketing Initiative</div>
                </div>
              </div>
            </div>
          </div>
        );
      
      case 'Academic / Research CV':
        return (
          <div className="w-full aspect-[3/4] bg-white border border-gray-200 rounded p-2.5 text-[3.5px] leading-[1.35] overflow-hidden shadow-sm font-serif">
            {/* Header */}
            <div className="border-b-2 border-gray-800 pb-0.5 mb-1">
              <div className="flex items-start gap-1.5 mb-0.5">
                <img src="https://randomuser.me/api/portraits/med/men/91.jpg" className="w-6 h-6 rounded-full flex-shrink-0 object-cover" alt="" />
                <div>
                  <div className="font-bold text-[6.5px]">Dr. Daniel Mwangi Njoroge</div>
                  <div className="text-[4px] text-gray-700 italic">Senior Lecturer — Department of Environmental Science</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-x-2 text-[3px] text-gray-600">
                <span>University of Nairobi</span>
                <span>Nairobi, Kenya</span>
                <span>daniel.njoroge@uonbi.ac.ke</span>
                <span>ORCID: 0000-0002-1234-5678</span>
              </div>
            </div>
            {/* Profile */}
            <div className="mb-0.5">
              <div className="font-bold text-[3.5px] uppercase tracking-widest border-b border-gray-400 pb-0.5 mb-0.5">Academic Profile</div>
              <div className="text-[3px] text-gray-700">Environmental scientist with 12+ years of research and teaching experience focusing on climate change adaptation, sustainable land management, and environmental policy in East Africa. Published author of 15+ peer-reviewed articles and recipient of three national research grants.</div>
            </div>
            {/* Research Interests */}
            <div className="mb-0.5">
              <div className="font-bold text-[3.5px] uppercase tracking-widest border-b border-gray-400 pb-0.5 mb-0.5">Research Interests</div>
              <div className="grid grid-cols-2 gap-x-1 text-[3px]">
                <div>• Climate Change Adaptation</div>
                <div>• Sustainable Agriculture & Food Security</div>
                <div>• Environmental Policy & Governance</div>
                <div>• Land Degradation & Restoration</div>
                <div>• Community-Based NRM</div>
                <div>• Dryland Ecology</div>
              </div>
            </div>
            {/* Positions */}
            <div className="mb-0.5">
              <div className="font-bold text-[3.5px] uppercase tracking-widest border-b border-gray-400 pb-0.5 mb-0.5">Academic Positions</div>
              <div className="flex justify-between text-[3px] mb-0.5">
                <div><span className="font-semibold">Senior Lecturer</span>, Dept. of Environmental Science — University of Nairobi</div>
                <div className="text-gray-600 ml-1 shrink-0">2018—Present</div>
              </div>
              <div className="flex justify-between text-[3px] mb-0.5">
                <div><span className="font-semibold">Lecturer</span>, Dept. of Natural Resources — Egerton University</div>
                <div className="text-gray-600 ml-1 shrink-0">2014—2018</div>
              </div>
              <div className="flex justify-between text-[3px] mb-0.5">
                <div><span className="font-semibold">Research Associate</span>, Environment & Society Programme — ILRI</div>
                <div className="text-gray-600 ml-1 shrink-0">2012—2014</div>
              </div>
              <div className="flex justify-between text-[3px]">
                <div><span className="font-semibold">Graduate Teaching Assistant</span> — University of Nairobi</div>
                <div className="text-gray-600 ml-1 shrink-0">2010—2012</div>
              </div>
            </div>
            {/* Publications */}
            <div className="mb-0.5">
              <div className="font-bold text-[3.5px] uppercase tracking-widest border-b border-gray-400 pb-0.5 mb-0.5">Selected Publications</div>
              <ol className="list-decimal ml-3 text-[3px] space-y-0.5">
                <li>Njoroge, D.M. (2023). Climate Adaptation Strategies for Smallholder Farmers. Journal of Environmental Studies, 45(3), 112—128.</li>
                <li>Njoroge, D.M. & Kamau, P. (2021). Land Restoration in Semi-Arid East Africa. African Environmental Review, 18(2), 45—62.</li>
                <li>Njoroge, D.M. et al. (2020). Community Participation in Environmental Governance. Ecology & Society, 25(1), 34.</li>
                <li>Njoroge, D.M. (2019). Sustainable Agriculture Practices in Kenya. Int. Journal of Climate Research, 12(4), 78—95.</li>
                <li>Njoroge, D.M. & Muthoni, L. (2018). Soil Carbon Sequestration in Degraded Rangelands. Land Degradation & Development, 29(8).</li>
                <li>Njoroge, D.M. (2016). Pastoral Adaptation to Climate Variability in Northern Kenya. African Studies, 75(2), 201—218.</li>
              </ol>
            </div>
            {/* Conferences */}
            <div className="mb-0.5">
              <div className="font-bold text-[3.5px] uppercase tracking-widest border-b border-gray-400 pb-0.5 mb-0.5">Conferences & Presentations</div>
              <div className="text-[3px] space-y-0.5">
                <div>• Int. Climate Change Conference — Nairobi, Kenya (2024) — Keynote Presenter</div>
                <div>• African Environmental Research Forum — Kigali, Rwanda (2022) — Paper Presenter</div>
                <div>• World Congress of Soil Science — Glasgow, UK (2022) — Poster Presentation</div>
                <div>• Sustainable Agriculture Summit — Addis Ababa, Ethiopia (2021) — Panel Discussant</div>
                <div>• East Africa Climate Adaptation Forum — Dar es Salaam (2020) — Paper Presenter</div>
                <div>• Int. Society for Ecological Economics — Washington DC (2019) — Paper Presenter</div>
              </div>
            </div>
            {/* Education */}
            <div className="mb-0.5">
              <div className="font-bold text-[3.5px] uppercase tracking-widest border-b border-gray-400 pb-0.5 mb-0.5">Education</div>
              <div className="flex justify-between text-[3px] mb-0.5">
                <div><span className="font-semibold">PhD Environmental Science</span> — University of Nairobi <span className="italic text-gray-600">(Thesis: Climate Variability & Pastoral Adaptation)</span></div>
                <div className="text-gray-600 ml-1 shrink-0">2010—2014</div>
              </div>
              <div className="flex justify-between text-[3px] mb-0.5">
                <div><span className="font-semibold">MSc Environmental Management</span> — Kenyatta University</div>
                <div className="text-gray-600 ml-1 shrink-0">2007—2009</div>
              </div>
              <div className="flex justify-between text-[3px]">
                <div><span className="font-semibold">BSc Environmental Science (First Class Honours)</span> — University of Nairobi</div>
                <div className="text-gray-600 ml-1 shrink-0">2003—2007</div>
              </div>
            </div>
            {/* Grants */}
            <div className="mb-0.5">
              <div className="font-bold text-[3.5px] uppercase tracking-widest border-b border-gray-400 pb-0.5 mb-0.5">Grants & Funding</div>
              <div className="text-[3px] space-y-0.5">
                <div>• Principal Investigator — NEMA Research Grant: Ecosystem Restoration in Degraded Drylands (KES 4.5M, 2022—2024)</div>
                <div>• Co-Investigator — IDRC Climate Adaptation Fund: Smallholder Farmer Resilience in East Africa (USD 120K, 2020—2022)</div>
                <div>• Principal Investigator — UoN Research Fund: Land Use Change & Carbon Stocks (KES 1.2M, 2019—2020)</div>
                <div>• Research Fellow — British Council Climate Research Programme (GBP 15K, 2017—2018)</div>
              </div>
            </div>
            {/* Awards */}
            <div className="mb-0.5">
              <div className="font-bold text-[3.5px] uppercase tracking-widest border-b border-gray-400 pb-0.5 mb-0.5">Awards & Honours</div>
              <div className="text-[3px] space-y-0.5">
                <div>• Best Research Paper Award — African Environmental Research Forum (2022)</div>
                <div>• Excellence in Teaching Award — University of Nairobi (2021)</div>
                <div>• Young Scientist Award — Kenya National Academy of Sciences (2018)</div>
                <div>• Outstanding Doctoral Thesis Prize — University of Nairobi (2014)</div>
              </div>
            </div>
            {/* Teaching */}
            <div className="mb-0.5">
              <div className="font-bold text-[3.5px] uppercase tracking-widest border-b border-gray-400 pb-0.5 mb-0.5">Teaching Experience</div>
              <div className="text-[3px] space-y-0.5">
                <div>• ENV 301: Environmental Impact Assessment (Undergraduate, UoN)</div>
                <div>• ENV 502: Climate Change & Sustainable Development (Postgraduate, UoN)</div>
                <div>• NRM 201: Natural Resource Management (Undergraduate, Egerton)</div>
                <div>• ENV 401: Research Methods in Environmental Science (Undergraduate, UoN)</div>
              </div>
            </div>
            {/* Professional Memberships */}
            <div>
              <div className="font-bold text-[3.5px] uppercase tracking-widest border-b border-gray-400 pb-0.5 mb-0.5">Professional Memberships</div>
              <div className="text-[3px] space-y-0.5">
                <div>• Member — Kenya National Academy of Sciences (KNAS)</div>
                <div>• Member — African Association of Environmental Scientists (AAES)</div>
                <div>• Fellow — International Society for Ecological Economics (ISEE)</div>
                <div>• Reviewer — Journal of Environmental Management; African Environmental Review</div>
              </div>
            </div>
          </div>
        );

      case 'Creative Designer':
        return (
          <div className="w-full aspect-[3/4] bg-gradient-to-br from-purple-50 to-white border border-gray-200 rounded p-2 flex items-center justify-center">
            <div className="text-center text-gray-400">
              <div className="text-[6px] font-semibold">Creative Designer</div>
              <div className="text-[4px] mt-1">Coming Soon</div>
            </div>
          </div>
        );

      case 'Technical / Engineering CV':
        return (
          <div className="w-full aspect-[3/4] bg-white border border-gray-200 rounded overflow-hidden flex text-[4px] leading-[1.3] shadow-sm">
            {/* Sidebar */}
            <div className="w-[33%] bg-gray-100 p-2">
              <div className="flex justify-center mb-1">
                <img src="https://randomuser.me/api/portraits/med/men/62.jpg" className="w-8 h-8 rounded-full object-cover" alt="" />
              </div>
              <div className="font-bold text-[6px] mb-0.5 text-center">SAMUEL K. CHERUIYOT</div>
              <div className="text-[4px] text-gray-600 mb-1 text-center">Mechanical Engineer | Manufacturing</div>
              <div className="text-[3.8px] text-gray-700 space-y-0.5 mb-1.5">
                <div>Nairobi, Kenya</div>
                <div>+254 712 333 777</div>
                <div>samuel@email.com</div>
                <div>linkedin.com/in/samuel-cheruiyot</div>
              </div>
              <div className="mb-1.5">
                <div className="font-bold text-[4.5px] uppercase border-b border-gray-400 pb-0.5 mb-0.5">Technical Skills</div>
                <div className="space-y-0.5 text-[3.8px] text-gray-700">
                  <div>• Mechanical Systems Maintenance</div>
                  <div>• Preventive Maintenance Planning</div>
                  <div>• Production Line Optimization</div>
                  <div>• Root Cause Analysis</div>
                  <div>• Industrial Safety Compliance</div>
                  <div>• Process Improvement (Lean)</div>
                  <div>• Equipment Commissioning</div>
                  <div>• Technical Report Writing</div>
                  <div>• Hydraulics & Pneumatics</div>
                  <div>• Welding & Fabrication</div>
                </div>
              </div>
              <div className="mb-1.5">
                <div className="font-bold text-[4.5px] uppercase border-b border-gray-400 pb-0.5 mb-0.5">Tools & Systems</div>
                <div className="space-y-0.5 text-[3.8px] text-gray-700">
                  <div>• AutoCAD</div>
                  <div>• SolidWorks</div>
                  <div>• SAP PM</div>
                  <div>• PLC Systems</div>
                  <div>• CMMS Software</div>
                  <div>• Microsoft Excel</div>
                  <div>• SCADA Systems</div>
                </div>
              </div>
              <div>
                <div className="font-bold text-[4.5px] uppercase border-b border-gray-400 pb-0.5 mb-0.5">Certifications</div>
                <div className="space-y-0.5 text-[3.8px] text-gray-700">
                  <div>• Certified Maintenance Professional</div>
                  <div>• OSH Certificate</div>
                  <div>• Lean Manufacturing — KIM</div>
                  <div>• First Aid & Fire Safety</div>
                </div>
              </div>
            </div>
            {/* Main */}
            <div className="flex-1 p-2">
              <div className="mb-1.5">
                <div className="font-bold text-[4.5px] uppercase border-b-2 border-gray-800 pb-0.5 mb-0.5">Professional Summary</div>
                <div className="text-[3.8px] text-gray-700">Mechanical engineer with 6 years of experience in manufacturing operations, equipment maintenance, and process optimization within large-scale production facilities. Proven track record of reducing downtime and improving production efficiency through data-driven preventive maintenance strategies.</div>
              </div>
              <div className="mb-1.5">
                <div className="font-bold text-[4.5px] uppercase border-b-2 border-gray-800 pb-0.5 mb-1">Key Engineering Projects</div>
                <div className="mb-1">
                  <div className="font-bold text-[3.8px]">Production Line Efficiency Improvement</div>
                  <div className="text-[3.5px] text-gray-500">East Africa Packaging Ltd | 2023</div>
                  <div className="text-[3.8px] text-gray-700">Increased production efficiency by 18% through equipment optimization and preventive maintenance scheduling. Coordinated a team of 8 technicians, reducing unplanned stoppages by 30%.</div>
                </div>
                <div className="mb-1">
                  <div className="font-bold text-[3.8px]">Machine Maintenance Program Overhaul</div>
                  <div className="text-[3.5px] text-gray-500">Nairobi Steel Manufacturing | 2022</div>
                  <div className="text-[3.8px] text-gray-700">Designed and implemented a preventive maintenance program reducing equipment downtime by 25% and extending average machine lifespan by 2 years.</div>
                </div>
                <div>
                  <div className="font-bold text-[3.8px]">Energy Audit & Consumption Reduction</div>
                  <div className="text-[3.5px] text-gray-500">East Africa Packaging Ltd | 2023</div>
                  <div className="text-[3.8px] text-gray-700">Conducted plant-wide energy audit identifying inefficiencies in compressed air and cooling systems. Reduced energy consumption by 12%, saving KES 1.8M annually.</div>
                </div>
              </div>
              <div className="mb-1.5">
                <div className="font-bold text-[4.5px] uppercase border-b-2 border-gray-800 pb-0.5 mb-1">Professional Experience</div>
                <div className="mb-1">
                  <div className="font-bold text-[3.8px]">Mechanical Engineer — East Africa Packaging Ltd</div>
                  <div className="text-[3.5px] text-gray-500">Nairobi | 2022 — Present</div>
                  <div className="space-y-0.5 text-[3.8px] text-gray-700 mt-0.5">
                    <div>• Oversee maintenance of 40+ production machines across 3 lines</div>
                    <div>• Develop and execute preventive maintenance schedules via SAP PM</div>
                    <div>• Lead root cause analysis for recurring equipment failures</div>
                    <div>• Ensure compliance with OSHA and company safety standards</div>
                  </div>
                </div>
                <div className="mb-1">
                  <div className="font-bold text-[3.8px]">Maintenance Engineer — Nairobi Steel Manufacturing</div>
                  <div className="text-[3.5px] text-gray-500">Nairobi | 2019 — 2022</div>
                  <div className="space-y-0.5 text-[3.8px] text-gray-700 mt-0.5">
                    <div>• Managed mechanical maintenance for steel rolling and cutting equipment</div>
                    <div>• Supervised a team of 6 technicians on daily maintenance activities</div>
                    <div>• Reduced spare parts costs by 20% through improved inventory management</div>
                  </div>
                </div>
                <div>
                  <div className="font-bold text-[3.8px]">Graduate Trainee — Engineering — Kenya Breweries Ltd</div>
                  <div className="text-[3.5px] text-gray-500">Nairobi | 2018 — 2019</div>
                  <div className="space-y-0.5 text-[3.8px] text-gray-700 mt-0.5">
                    <div>• Rotated across production, utilities, and maintenance departments</div>
                    <div>• Assisted senior engineers with equipment inspections and reports</div>
                  </div>
                </div>
              </div>
              <div className="mb-1.5">
                <div className="font-bold text-[4.5px] uppercase border-b-2 border-gray-800 pb-0.5 mb-1">Education</div>
                <div className="mb-0.5">
                  <div className="font-bold text-[3.8px]">BSc Mechanical Engineering</div>
                  <div className="text-[3.8px] text-gray-700">Jomo Kenyatta University of Agriculture & Technology</div>
                  <div className="text-[3.5px] text-gray-500">2014 — 2018</div>
                </div>
                <div>
                  <div className="font-bold text-[3.8px]">Kenya Certificate of Secondary Education</div>
                  <div className="text-[3.8px] text-gray-700">Moi High School Kabarak</div>
                  <div className="text-[3.5px] text-gray-500">2010 — 2013</div>
                </div>
              </div>
              <div className="mb-1.5">
                <div className="font-bold text-[4.5px] uppercase border-b-2 border-gray-800 pb-0.5 mb-1">Key Achievements</div>
                <div className="space-y-0.5 text-[3.8px] text-gray-700">
                  <div>• Reduced unplanned machine downtime by 30% through predictive maintenance</div>
                  <div>• Saved KES 1.8M annually via energy audit and system optimization</div>
                  <div>• Extended average machine lifespan by 2 years through improved PM program</div>
                  <div>• Mentored 4 junior engineers and 3 graduate trainees</div>
                </div>
              </div>
              <div>
                <div className="font-bold text-[4.5px] uppercase border-b-2 border-gray-800 pb-0.5 mb-1">Professional Memberships</div>
                <div className="space-y-0.5 text-[3.8px] text-gray-700">
                  <div>• Member — Engineers Board of Kenya (EBK)</div>
                  <div>• Member — Institution of Engineers of Kenya (IEK)</div>
                  <div>• Member — Kenya Association of Manufacturers (KAM)</div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'International / ATS Optimized CV':
        return (
          <div className="w-full aspect-[3/4] bg-white border border-gray-200 rounded p-2 text-[3.5px] leading-[1.3] overflow-hidden shadow-sm">
            {/* Header */}
            <div className="mb-1">
              <div className="flex items-start gap-1.5 mb-0.5">
                <img src="https://randomuser.me/api/portraits/med/men/48.jpg" className="w-6 h-6 rounded-full flex-shrink-0 object-cover" alt="" />
                <div>
                  <div className="font-bold text-[7px] text-gray-900">DAVID OCHIENG ONYANGO</div>
                  <div className="text-[4.5px] text-gray-700 mt-0.5">Data Analyst</div>
                  <div className="text-[3.5px] text-gray-600 mt-0.5">
                    Nairobi, Kenya &nbsp;|&nbsp; +254 712 000 111 &nbsp;|&nbsp; david.onyango@email.com &nbsp;|&nbsp; linkedin.com/in/davidonyango
                  </div>
                </div>
              </div>
            </div>
            {/* Summary */}
            <div className="mb-1">
              <div className="font-semibold text-[4px] uppercase border-b border-gray-400 pb-0.5 mb-0.5 tracking-wide">Professional Summary</div>
              <div className="text-[3.5px] text-gray-700">Data analyst with 5+ years of experience transforming complex datasets into actionable insights. Skilled in SQL, Python, and business intelligence tools to support data-driven decision making in fast-paced environments. Proven ability to automate reporting and build executive dashboards.</div>
            </div>
            {/* Skills */}
            <div className="mb-1">
              <div className="font-semibold text-[4px] uppercase border-b border-gray-400 pb-0.5 mb-0.5 tracking-wide">Core Skills</div>
              <div className="grid grid-cols-2 text-[3.5px] gap-y-0.5">
                <div>• Data Analysis</div>
                <div>• SQL</div>
                <div>• Python</div>
                <div>• Power BI</div>
                <div>• Excel (Advanced)</div>
                <div>• Data Visualization</div>
                <div>• Statistical Analysis</div>
                <div>• Business Intelligence</div>
                <div>• ETL Pipelines</div>
                <div>• Stakeholder Reporting</div>
              </div>
            </div>
            {/* Experience */}
            <div className="mb-1">
              <div className="font-semibold text-[4px] uppercase border-b border-gray-400 pb-0.5 mb-0.5 tracking-wide">Professional Experience</div>
              <div className="mb-0.5">
                <div className="font-semibold text-[3.5px]">Data Analyst — Insight Analytics Ltd</div>
                <div className="text-[3.2px] text-gray-600 mb-0.5">Nairobi, Kenya | January 2021 — Present</div>
                <div className="space-y-0.5 text-[3.5px] text-gray-700">
                  <div>• Analyzed large datasets to support business decision-making across 5 departments.</div>
                  <div>• Developed Power BI dashboards tracking 20+ KPIs for senior leadership.</div>
                  <div>• Automated weekly reporting using Python scripts, saving 8 hours per week.</div>
                  <div>• Collaborated with product and finance teams to deliver quarterly data insights.</div>
                </div>
              </div>
              <div className="mb-0.5">
                <div className="font-semibold text-[3.5px]">Junior Data Analyst — TechData Solutions</div>
                <div className="text-[3.2px] text-gray-600 mb-0.5">Nairobi, Kenya | March 2019 — December 2020</div>
                <div className="space-y-0.5 text-[3.5px] text-gray-700">
                  <div>• Prepared reports and visualizations for management review.</div>
                  <div>• Maintained company data warehouse and ensured data integrity.</div>
                  <div>• Supported analytics projects across finance, sales, and operations.</div>
                </div>
              </div>
              <div>
                <div className="font-semibold text-[3.5px]">Data Intern — Kenya Revenue Authority</div>
                <div className="text-[3.2px] text-gray-600 mb-0.5">Nairobi, Kenya | June 2018 — February 2019</div>
                <div className="space-y-0.5 text-[3.5px] text-gray-700">
                  <div>• Assisted with data cleaning and validation for compliance reporting.</div>
                  <div>• Built Excel models to track revenue collection trends across regions.</div>
                </div>
              </div>
            </div>
            {/* Education */}
            <div className="mb-1">
              <div className="font-semibold text-[4px] uppercase border-b border-gray-400 pb-0.5 mb-0.5 tracking-wide">Education</div>
              <div className="mb-0.5">
                <div className="font-semibold text-[3.5px]">BSc Statistics</div>
                <div className="text-[3.5px] text-gray-700">University of Nairobi</div>
                <div className="text-[3.2px] text-gray-600">2015 — 2019 | Second Class Honours (Upper Division)</div>
              </div>
              <div>
                <div className="font-semibold text-[3.5px]">Kenya Certificate of Secondary Education</div>
                <div className="text-[3.5px] text-gray-700">Starehe Boys Centre, Nairobi</div>
                <div className="text-[3.2px] text-gray-600">2011 — 2014 | Grade A-</div>
              </div>
            </div>
            {/* Certifications */}
            <div className="mb-1">
              <div className="font-semibold text-[4px] uppercase border-b border-gray-400 pb-0.5 mb-0.5 tracking-wide">Certifications</div>
              <div className="space-y-0.5 text-[3.5px] text-gray-700">
                <div>• Google Data Analytics Professional Certificate — Google (2022)</div>
                <div>• Microsoft Power BI Data Analyst Associate — Microsoft (2023)</div>
                <div>• SQL for Data Science — Coursera / UC Davis (2021)</div>
              </div>
            </div>
            {/* Additional */}
            <div className="mb-1">
              <div className="font-semibold text-[4px] uppercase border-b border-gray-400 pb-0.5 mb-0.5 tracking-wide">Additional Information</div>
              <div className="space-y-0.5 text-[3.5px] text-gray-700">
                <div>• Languages: English (Fluent), Swahili (Fluent), French (Basic)</div>
                <div>• Volunteer Data Analyst — DataKind Kenya (2022 — Present)</div>
                <div>• Member — Kenya Data Science Society</div>
              </div>
            </div>
            {/* Key Achievements */}
            <div className="mb-1">
              <div className="font-semibold text-[4px] uppercase border-b border-gray-400 pb-0.5 mb-0.5 tracking-wide">Key Achievements</div>
              <div className="space-y-0.5 text-[3.5px] text-gray-700">
                <div>• Automated reporting workflows saving 8+ hours per week across 3 teams.</div>
                <div>• Built executive dashboards adopted by C-suite for monthly business reviews.</div>
                <div>• Reduced data processing errors by 40% through improved validation pipelines.</div>
                <div>• Recognized as top performer Q3 2023 for data-driven cost savings initiative.</div>
              </div>
            </div>
            {/* References */}
            <div>
              <div className="font-semibold text-[4px] uppercase border-b border-gray-400 pb-0.5 mb-0.5 tracking-wide">References</div>
              <div className="text-[3.5px] text-gray-700">Available upon request.</div>
            </div>
          </div>
        );

      default:
        return (
          <div className="w-full aspect-[3/4] bg-gray-100 border border-gray-200 rounded flex items-center justify-center">
            <div className="text-center text-gray-400">
              <div className="text-[6px]">Template Preview</div>
              <div className="text-[4px] mt-1">Not Available</div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="space-y-2">
      {renderPreview()}
      {showDescription && templateDescriptions[templateName] && (
        <p className="text-xs text-muted-foreground leading-relaxed">
          {templateDescriptions[templateName]}
        </p>
      )}
    </div>
  );
}


