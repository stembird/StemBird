import React from 'react';
import {
  OG_CARD_SIZES,
  OG_COLORS,
  truncateWords,
  type OgJobCardData,
} from '@/lib/ogJobCardDesign';

function PinIcon({ s, color }: { s: number; color: string }) {
  const sz = Math.round(19 * s);
  return <svg width={sz} height={sz} viewBox="0 0 24 24" fill={color}><path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z" /></svg>;
}
function BriefcaseIcon({ s, color }: { s: number; color: string }) {
  const sz = Math.round(19 * s);
  return <svg width={sz} height={sz} viewBox="0 0 24 24" fill={color}><path d="M10 2h4a2 2 0 0 1 2 2v2h4a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4V4a2 2 0 0 1 2-2zm0 4h4V4h-4v2z" /></svg>;
}
function MonitorIcon({ s, color }: { s: number; color: string }) {
  const sz = Math.round(19 * s);
  return <svg width={sz} height={sz} viewBox="0 0 24 24" fill={color}><path d="M3 4h18a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1h-7v2h3v2H8v-2h3v-2H3a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zm1 2v9h16V6H4z" /></svg>;
}
function ShieldIcon({ s, color }: { s: number; color: string }) {
  const sz = Math.round(19 * s);
  return <svg width={sz} height={sz} viewBox="0 0 24 24" fill={color}><path d="M12 2l8 3v6c0 5-3.5 9.4-8 11-4.5-1.6-8-6-8-11V5l8-3zm-1 13.2l5.6-5.6-1.4-1.4-4.2 4.2-2-2-1.4 1.4 3.4 3.4z" /></svg>;
}
function GlobeIcon({ s, color }: { s: number; color: string }) {
  const sz = Math.round(18 * s);
  return <svg width={sz} height={sz} viewBox="0 0 24 24" fill={color}><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm6.9 9h-3a15.5 15.5 0 0 0-1.3-5A8 8 0 0 1 18.9 11zM12 4c.8 1 1.6 3.3 1.9 7h-3.8C10.4 7.3 11.2 5 12 4zM9.4 6a15.5 15.5 0 0 0-1.3 5h-3A8 8 0 0 1 9.4 6zM5.1 13h3a15.5 15.5 0 0 0 1.3 5A8 8 0 0 1 5.1 13zm6.9 7c-.8-1-1.6-3.3-1.9-7h3.8c-.3 3.7-1.1 6-1.9 7zm2.6-2a15.5 15.5 0 0 0 1.3-5h3a8 8 0 0 1-4.3 5z" /></svg>;
}
function StarIcon({ s, color }: { s: number; color: string }) {
  const sz = Math.round(14 * s);
  return <svg width={sz} height={sz} viewBox="0 0 24 24" fill={color}><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" /></svg>;
}

type MetaItem = { key: string; label: string; caption: string; iconType: 'pin' | 'briefcase' | 'monitor' | 'shield' };
function buildMeta(data: OgJobCardData): MetaItem[] {
  const items: MetaItem[] = [];
  if (data.location) items.push({ key: 'loc', label: truncateWords(data.location, 22), caption: 'Location', iconType: 'pin' });
  if (data.employmentType) items.push({ key: 'type', label: data.employmentType, caption: 'Employment Type', iconType: 'briefcase' });
  if (data.jobFunction) items.push({ key: 'fn', label: truncateWords(data.jobFunction, 20), caption: 'Function', iconType: 'monitor' });
  if (data.showVerified) items.push({ key: 'ver', label: 'Verified Employer', caption: 'Trusted & Verified', iconType: 'shield' });
  return items;
}

/**
 * Template 5 — Medium LinkedIn-blue gradient (green reference → CareerSasa blue).
 * Circular portrait with white ring. CareerSasa branding throughout.
 */
export function JobSocialCardTemplate5(data: OgJobCardData) {
  const { width, height } = OG_CARD_SIZES[data.size];
  const s = Math.min(width / 1200, height / 630);
  const stripW = Math.max(5, Math.round(6 * s));
  const footerH = Math.round(76 * s);
  const portrait = Math.round(320 * s);
  const logoBox = Math.round(76 * s);
  const tileW = Math.round(254 * s);
  const tileH = Math.round(56 * s);
  const iconBox = Math.round(34 * s);
  const tileGap = Math.round(9 * s);
  const colLeft = stripW + Math.round(56 * s);
  const colTop = Math.round(34 * s);

  const titleLen = data.title.length;
  const titleSize = Math.round((titleLen > 36 ? 42 : titleLen > 24 ? 52 : 60) * s);
  const displayTitle = truncateWords(data.title, titleLen > 40 ? 50 : 58);
  const initials = data.companyName.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase() || '').join('') || 'CS';
  const meta = buildMeta(data);

  return (
    <div style={{ width: `${width}px`, height: `${height}px`, display: 'flex', position: 'relative', overflow: 'hidden', fontFamily: 'Inter', background: 'linear-gradient(145deg, #0D47A1 0%, #1565C0 50%, #1E88E5 100%)' }}>

      {/* Radial glow top-right */}
      <div style={{ position: 'absolute', right: `${Math.round(-80 * s)}px`, top: `${Math.round(-80 * s)}px`, width: `${Math.round(500 * s)}px`, height: `${Math.round(500 * s)}px`, borderRadius: '50%', background: 'radial-gradient(circle, rgba(100,181,246,0.24), transparent 65%)', display: 'flex' }} />
      {/* Faint large circle bottom-right */}
      <div style={{ position: 'absolute', right: `${Math.round(-100 * s)}px`, bottom: `${Math.round(60 * s)}px`, width: `${Math.round(420 * s)}px`, height: `${Math.round(420 * s)}px`, borderRadius: '50%', border: `${Math.round(2 * s)}px solid rgba(255,255,255,0.08)`, display: 'flex' }} />

      {/* Dot grid top-right */}
      {[0, 1, 2, 3].map((row) =>
        [0, 1, 2, 3, 4].map((col) => (
          <div key={`d-${row}-${col}`} style={{ position: 'absolute', right: `${Math.round((30 + col * 16) * s)}px`, top: `${Math.round((28 + row * 16) * s)}px`, width: `${Math.max(2, Math.round(4 * s))}px`, height: `${Math.max(2, Math.round(4 * s))}px`, borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.22)', display: 'flex' }} />
        )),
      )}

      {/* Category strip */}
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${stripW}px`, backgroundColor: data.categoryColor, display: 'flex' }} />

      {/* ── Left column ── */}
      <div style={{ position: 'absolute', left: `${colLeft}px`, top: `${colTop}px`, width: `${Math.round(560 * s)}px`, display: 'flex', flexDirection: 'column', gap: `${Math.round(12 * s)}px` }}>

        {/* Company logo */}
        <div style={{ width: `${logoBox}px`, height: `${logoBox}px`, borderRadius: `${Math.round(16 * s)}px`, backgroundColor: OG_COLORS.white, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: `${Math.round(9 * s)}px`, boxShadow: '0 8px 22px rgba(0,0,0,0.18)', overflow: 'hidden' }}>
          {data.companyLogoSrc
            ? <img src={data.companyLogoSrc} alt="" width={logoBox - Math.round(18 * s)} height={logoBox - Math.round(18 * s)} style={{ width: `${logoBox - Math.round(18 * s)}px`, height: `${logoBox - Math.round(18 * s)}px`, objectFit: 'contain' }} />
            : <div style={{ width: '100%', height: '100%', borderRadius: `${Math.round(10 * s)}px`, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: OG_COLORS.lightBlue, color: OG_COLORS.primaryBlue, fontSize: `${Math.round(24 * s)}px`, fontWeight: 800 }}>{initials}</div>}
        </div>

        {/* WE'RE HIRING */}
        <div style={{ display: 'flex', alignSelf: 'flex-start', alignItems: 'center', gap: `${Math.round(7 * s)}px`, padding: `${Math.round(7 * s)}px ${Math.round(14 * s)}px`, borderRadius: `${Math.round(999 * s)}px`, backgroundColor: 'rgba(13,71,161,0.55)', border: '1.5px solid rgba(255,255,255,0.32)', color: OG_COLORS.white, fontSize: `${Math.round(13 * s)}px`, fontWeight: 800, letterSpacing: '0.05em' }}>
          <StarIcon s={s} color={OG_COLORS.accentOrange} />
          {"WE'RE HIRING"}
        </div>

        {/* Title */}
        <div style={{ display: 'flex', fontSize: `${titleSize}px`, fontWeight: 800, color: OG_COLORS.white, lineHeight: 1.06, letterSpacing: '-0.025em', maxWidth: `${Math.round(555 * s)}px` }}>
          {displayTitle}
        </div>

        {/* Orange accent */}
        <div style={{ width: `${Math.round(46 * s)}px`, height: `${Math.round(4 * s)}px`, borderRadius: 2, backgroundColor: OG_COLORS.accentOrange, display: 'flex' }} />

        {/* Company */}
        <div style={{ display: 'flex', fontSize: `${Math.round(24 * s)}px`, fontWeight: 600, color: 'rgba(255,255,255,0.88)', marginTop: `${Math.round(-4 * s)}px` }}>
          {truncateWords(data.companyName, 40)}
        </div>

        {/* Meta tiles 2×2 — dark style */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: `${tileGap}px`, marginTop: `${Math.round(2 * s)}px` }}>
          {[0, 1].map((row) => (
            <div key={`row-${row}`} style={{ display: 'flex', gap: `${tileGap}px` }}>
              {meta.slice(row * 2, row * 2 + 2).map((item) => (
                <div key={item.key} style={{ width: `${tileW}px`, minHeight: `${tileH}px`, display: 'flex', alignItems: 'center', gap: `${Math.round(10 * s)}px`, padding: `${Math.round(10 * s)}px ${Math.round(12 * s)}px`, borderRadius: `${Math.round(10 * s)}px`, border: '1px solid rgba(255,255,255,0.14)', backgroundColor: 'rgba(255,255,255,0.08)' }}>
                  <div style={{ width: `${iconBox}px`, height: `${iconBox}px`, borderRadius: `${Math.round(8 * s)}px`, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.14)', flexShrink: 0 }}>
                    {item.iconType === 'pin' && <PinIcon s={s} color={OG_COLORS.white} />}
                    {item.iconType === 'briefcase' && <BriefcaseIcon s={s} color={OG_COLORS.white} />}
                    {item.iconType === 'monitor' && <MonitorIcon s={s} color={OG_COLORS.white} />}
                    {item.iconType === 'shield' && <ShieldIcon s={s} color={OG_COLORS.white} />}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: `${Math.round(2 * s)}px` }}>
                    <div style={{ display: 'flex', fontSize: `${Math.round(16 * s)}px`, fontWeight: 700, color: OG_COLORS.white, lineHeight: 1.15 }}>{item.label}</div>
                    <div style={{ display: 'flex', fontSize: `${Math.round(11 * s)}px`, fontWeight: 500, color: 'rgba(255,255,255,0.52)' }}>{item.caption}</div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ── Right column — portrait + CTA ── */}
      <div style={{ position: 'absolute', right: `${Math.round(44 * s)}px`, top: `${Math.round(28 * s)}px`, width: `${Math.round(460 * s)}px`, bottom: `${footerH + Math.round(30 * s)}px`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: `${Math.round(20 * s)}px` }}>
        {data.personImageSrc ? (
          <div style={{ width: `${portrait + Math.round(14 * s)}px`, height: `${portrait + Math.round(14 * s)}px`, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            <div style={{ width: `${portrait}px`, height: `${portrait}px`, borderRadius: `${portrait / 2}px`, border: `${Math.round(6 * s)}px solid ${OG_COLORS.white}`, overflow: 'hidden', display: 'flex', boxShadow: '0 16px 40px rgba(0,0,0,0.30)', backgroundColor: OG_COLORS.primaryBlueDeep }}>
              <img src={data.personImageSrc} alt="" width={portrait} height={portrait} style={{ width: `${portrait}px`, height: `${portrait}px`, objectFit: 'cover' }} />
            </div>
            <div style={{ position: 'absolute', top: `${Math.round(42 * s)}px`, right: `${Math.round(4 * s)}px`, width: `${Math.round(22 * s)}px`, height: `${Math.round(22 * s)}px`, borderRadius: '50%', backgroundColor: OG_COLORS.accentOrange, border: `${Math.round(4 * s)}px solid ${OG_COLORS.white}`, display: 'flex' }} />
          </div>
        ) : null}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: `${Math.round(326 * s)}px`, height: `${Math.round(60 * s)}px`, borderRadius: `${Math.round(15 * s)}px`, background: `linear-gradient(135deg, ${OG_COLORS.accentOrange}, ${OG_COLORS.accentOrangeDeep})`, color: OG_COLORS.white, fontSize: `${Math.round(25 * s)}px`, fontWeight: 800, letterSpacing: '0.04em', paddingLeft: `${Math.round(26 * s)}px`, paddingRight: `${Math.round(10 * s)}px`, boxShadow: '0 12px 28px rgba(255,122,0,0.42)' }}>
          <span>APPLY NOW</span>
          <div style={{ width: `${Math.round(40 * s)}px`, height: `${Math.round(40 * s)}px`, borderRadius: `${Math.round(20 * s)}px`, backgroundColor: OG_COLORS.white, color: OG_COLORS.accentOrange, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: `${Math.round(24 * s)}px`, fontWeight: 800 }}>→</div>
        </div>
      </div>

      {/* ── Footer ── */}
      <div style={{ position: 'absolute', left: `${stripW + Math.round(14 * s)}px`, right: `${Math.round(14 * s)}px`, bottom: `${Math.round(14 * s)}px`, height: `${footerH}px`, borderRadius: `${Math.round(18 * s)}px`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: `0 ${Math.round(24 * s)}px`, backgroundColor: OG_COLORS.white, boxShadow: '0 6px 24px rgba(0,0,0,0.12)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: `${Math.round(10 * s)}px` }}>
          {data.brandLogoSrc ? <img src={data.brandLogoSrc} alt="" width={Math.round(44 * s)} height={Math.round(44 * s)} style={{ width: `${Math.round(44 * s)}px`, height: `${Math.round(44 * s)}px`, objectFit: 'contain' }} /> : null}
          <div style={{ display: 'flex', fontSize: `${Math.round(26 * s)}px`, fontWeight: 800, letterSpacing: '-0.02em' }}>
            <span style={{ color: OG_COLORS.primaryBlue }}>Career</span>
            <span style={{ color: OG_COLORS.accentOrange }}>Sasa</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: `${Math.round(14 * s)}px` }}>
          <div style={{ width: `${Math.max(1, Math.round(1.5 * s))}px`, height: `${Math.round(34 * s)}px`, backgroundColor: '#D3DAE5', display: 'flex' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: `${Math.round(2 * s)}px` }}>
            <div style={{ display: 'flex', fontSize: `${Math.round(15 * s)}px`, fontWeight: 700, color: '#102A56' }}>AI-Powered Job Search</div>
            <div style={{ display: 'flex', fontSize: `${Math.round(12 * s)}px`, fontWeight: 500, color: '#66758A' }}>Find. Apply. Grow.</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: `${Math.round(6 * s)}px`, color: OG_COLORS.primaryBlue, fontSize: `${Math.round(16 * s)}px`, fontWeight: 700 }}>
          <GlobeIcon s={s} color={OG_COLORS.primaryBlue} />
          <span>careersasa.co.ke</span>
        </div>
      </div>
    </div>
  );
}
