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
function ClockIcon({ s, color }: { s: number; color: string }) {
  const sz = Math.round(15 * s);
  return <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>;
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

function hexPoints(cx: number, cy: number, r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 180) * (60 * i - 30);
    pts.push(`${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`);
  }
  return pts.join(' ');
}

/**
 * Template 4 — Light/white background + hexagonal portrait frame.
 * Mirrors the reference top-right tile. Blue hex ring, "Don't wait" subtext.
 */
export function JobSocialCardTemplate4(data: OgJobCardData) {
  const { width, height } = OG_CARD_SIZES[data.size];
  const s = Math.min(width / 1200, height / 630);
  const stripW = Math.max(5, Math.round(6 * s));
  const footerH = Math.round(76 * s);
  const portrait = Math.round(296 * s);
  const hexR = portrait / 2 + Math.round(18 * s);
  const hexFrame = hexR * 2 + Math.round(10 * s);
  const hx = hexFrame / 2;
  const hy = hexFrame / 2;
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
    <div style={{ width: `${width}px`, height: `${height}px`, display: 'flex', position: 'relative', overflow: 'hidden', fontFamily: 'Inter', background: 'linear-gradient(160deg, #FFFFFF 0%, #EEF5FF 60%, #E2EEFA 100%)' }}>

      {/* Dot grid top-center */}
      {[0, 1, 2, 3].map((row) =>
        [0, 1, 2, 3, 4, 5].map((col) => (
          <div key={`d-${row}-${col}`} style={{ position: 'absolute', left: `${Math.round((520 + col * 16) * s)}px`, top: `${Math.round((26 + row * 16) * s)}px`, width: `${Math.max(2, Math.round(3 * s))}px`, height: `${Math.max(2, Math.round(3 * s))}px`, borderRadius: '50%', backgroundColor: 'rgba(21,101,192,0.14)', display: 'flex' }} />
        )),
      )}

      {/* Soft radial glow top-right */}
      <div style={{ position: 'absolute', right: `${Math.round(-60 * s)}px`, top: `${Math.round(-60 * s)}px`, width: `${Math.round(400 * s)}px`, height: `${Math.round(400 * s)}px`, borderRadius: '50%', background: 'radial-gradient(circle, rgba(21,101,192,0.09), transparent 70%)', display: 'flex' }} />

      {/* Category strip */}
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${stripW}px`, backgroundColor: data.categoryColor, display: 'flex' }} />

      {/* ── Left column ── */}
      <div style={{ position: 'absolute', left: `${colLeft}px`, top: `${colTop}px`, width: `${Math.round(560 * s)}px`, display: 'flex', flexDirection: 'column', gap: `${Math.round(12 * s)}px` }}>

        {/* Company logo */}
        <div style={{ width: `${logoBox}px`, height: `${logoBox}px`, borderRadius: `${Math.round(16 * s)}px`, backgroundColor: OG_COLORS.white, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: `${Math.round(9 * s)}px`, boxShadow: '0 8px 22px rgba(13,71,161,0.13)', overflow: 'hidden' }}>
          {data.companyLogoSrc
            ? <img src={data.companyLogoSrc} alt="" width={logoBox - Math.round(18 * s)} height={logoBox - Math.round(18 * s)} style={{ width: `${logoBox - Math.round(18 * s)}px`, height: `${logoBox - Math.round(18 * s)}px`, objectFit: 'contain' }} />
            : <div style={{ width: '100%', height: '100%', borderRadius: `${Math.round(10 * s)}px`, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: OG_COLORS.lightBlue, color: OG_COLORS.primaryBlue, fontSize: `${Math.round(24 * s)}px`, fontWeight: 800 }}>{initials}</div>}
        </div>

        {/* WE'RE HIRING */}
        <div style={{ display: 'flex', alignSelf: 'flex-start', alignItems: 'center', gap: `${Math.round(7 * s)}px`, padding: `${Math.round(7 * s)}px ${Math.round(14 * s)}px`, borderRadius: `${Math.round(999 * s)}px`, backgroundColor: OG_COLORS.primaryBlue, color: OG_COLORS.white, fontSize: `${Math.round(13 * s)}px`, fontWeight: 800, letterSpacing: '0.05em' }}>
          <StarIcon s={s} color={OG_COLORS.white} />
          {"WE'RE HIRING"}
        </div>

        {/* Title */}
        <div style={{ display: 'flex', fontSize: `${titleSize}px`, fontWeight: 800, color: '#071A3D', lineHeight: 1.06, letterSpacing: '-0.025em', maxWidth: `${Math.round(555 * s)}px` }}>
          {displayTitle}
        </div>

        {/* Orange accent */}
        <div style={{ width: `${Math.round(46 * s)}px`, height: `${Math.round(4 * s)}px`, borderRadius: 2, backgroundColor: OG_COLORS.accentOrange, display: 'flex' }} />

        {/* Company */}
        <div style={{ display: 'flex', fontSize: `${Math.round(24 * s)}px`, fontWeight: 600, color: '#1A335C', marginTop: `${Math.round(-4 * s)}px` }}>
          {truncateWords(data.companyName, 40)}
        </div>

        {/* Meta tiles 2×2 — light style */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: `${tileGap}px`, marginTop: `${Math.round(2 * s)}px` }}>
          {[0, 1].map((row) => (
            <div key={`row-${row}`} style={{ display: 'flex', gap: `${tileGap}px` }}>
              {meta.slice(row * 2, row * 2 + 2).map((item) => (
                <div key={item.key} style={{ width: `${tileW}px`, minHeight: `${tileH}px`, display: 'flex', alignItems: 'center', gap: `${Math.round(10 * s)}px`, padding: `${Math.round(10 * s)}px ${Math.round(12 * s)}px`, borderRadius: `${Math.round(10 * s)}px`, border: '1px solid rgba(21,101,192,0.09)', backgroundColor: 'rgba(255,255,255,0.92)', boxShadow: '0 4px 14px rgba(13,71,161,0.07)' }}>
                  <div style={{ width: `${iconBox}px`, height: `${iconBox}px`, borderRadius: `${Math.round(8 * s)}px`, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: OG_COLORS.lightBlue, flexShrink: 0 }}>
                    {item.iconType === 'pin' && <PinIcon s={s} color={OG_COLORS.primaryBlue} />}
                    {item.iconType === 'briefcase' && <BriefcaseIcon s={s} color={OG_COLORS.primaryBlue} />}
                    {item.iconType === 'monitor' && <MonitorIcon s={s} color={OG_COLORS.primaryBlue} />}
                    {item.iconType === 'shield' && <ShieldIcon s={s} color={OG_COLORS.primaryBlue} />}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: `${Math.round(2 * s)}px` }}>
                    <div style={{ display: 'flex', fontSize: `${Math.round(16 * s)}px`, fontWeight: 700, color: '#0C2347', lineHeight: 1.15 }}>{item.label}</div>
                    <div style={{ display: 'flex', fontSize: `${Math.round(11 * s)}px`, fontWeight: 500, color: '#66758A' }}>{item.caption}</div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ── Right column — hex portrait + CTA + Don't wait ── */}
      <div style={{ position: 'absolute', right: `${Math.round(36 * s)}px`, top: `${Math.round(20 * s)}px`, width: `${Math.round(460 * s)}px`, bottom: `${footerH + Math.round(26 * s)}px`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: `${Math.round(14 * s)}px` }}>

        {data.personImageSrc ? (
          <div style={{ width: `${hexFrame}px`, height: `${hexFrame}px`, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            {/* Hex ring — stroke only, Satori-safe */}
            <svg width={hexFrame} height={hexFrame} viewBox={`0 0 ${hexFrame} ${hexFrame}`} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
              <polygon points={hexPoints(hx, hy, hexR + Math.round(6 * s))} fill="rgba(21,101,192,0.08)" />
              <polygon points={hexPoints(hx, hy, hexR)} fill="none" stroke={OG_COLORS.primaryBlue} strokeWidth={Math.round(9 * s)} />
              <polygon points={hexPoints(hx, hy, hexR + Math.round(5 * s))} fill="none" stroke={OG_COLORS.accentOrange} strokeWidth={Math.round(2.5 * s)} strokeDasharray={`${Math.round(52 * s)} ${Math.round(400 * s)}`} strokeLinecap="round" />
            </svg>
            <div style={{ width: `${portrait}px`, height: `${portrait}px`, borderRadius: `${portrait / 2}px`, border: `${Math.round(6 * s)}px solid ${OG_COLORS.white}`, overflow: 'hidden', display: 'flex', boxShadow: '0 14px 36px rgba(13,71,161,0.22)', backgroundColor: OG_COLORS.primaryBlueDeep }}>
              <img src={data.personImageSrc} alt="" width={portrait} height={portrait} style={{ width: `${portrait}px`, height: `${portrait}px`, objectFit: 'cover' }} />
            </div>
          </div>
        ) : null}

        {/* APPLY NOW */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: `${Math.round(318 * s)}px`, height: `${Math.round(60 * s)}px`, borderRadius: `${Math.round(15 * s)}px`, background: `linear-gradient(135deg, ${OG_COLORS.accentOrange}, ${OG_COLORS.accentOrangeDeep})`, color: OG_COLORS.white, fontSize: `${Math.round(25 * s)}px`, fontWeight: 800, letterSpacing: '0.04em', paddingLeft: `${Math.round(24 * s)}px`, paddingRight: `${Math.round(10 * s)}px`, boxShadow: '0 10px 26px rgba(255,122,0,0.30)' }}>
          <span>APPLY NOW</span>
          <div style={{ width: `${Math.round(40 * s)}px`, height: `${Math.round(40 * s)}px`, borderRadius: `${Math.round(20 * s)}px`, backgroundColor: OG_COLORS.white, color: OG_COLORS.accentOrange, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: `${Math.round(24 * s)}px`, fontWeight: 800 }}>→</div>
        </div>

        {/* Don't wait */}
        <div style={{ display: 'flex', alignItems: 'center', gap: `${Math.round(6 * s)}px`, color: OG_COLORS.textMuted, fontSize: `${Math.round(13 * s)}px`, fontWeight: 600, marginTop: `${Math.round(-6 * s)}px` }}>
          <ClockIcon s={s} color={OG_COLORS.textMuted} />
          <span>Don&apos;t wait. Great opportunities go fast.</span>
        </div>
      </div>

      {/* ── Footer ── */}
      <div style={{ position: 'absolute', left: `${stripW + Math.round(14 * s)}px`, right: `${Math.round(14 * s)}px`, bottom: `${Math.round(14 * s)}px`, height: `${footerH}px`, borderRadius: `${Math.round(18 * s)}px`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: `0 ${Math.round(24 * s)}px`, backgroundColor: OG_COLORS.white, boxShadow: '0 6px 24px rgba(13,71,161,0.12)' }}>
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
