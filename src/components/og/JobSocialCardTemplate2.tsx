import React from 'react';
import {
  OG_CARD_SIZES,
  OG_COLORS,
  truncateWords,
  type OgJobCardData,
} from '@/lib/ogJobCardDesign';

function PinIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={OG_COLORS.primaryBlue}>
      <path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z" />
    </svg>
  );
}

function BriefcaseIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={OG_COLORS.primaryBlue}>
      <path d="M10 2h4a2 2 0 0 1 2 2v2h4a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4V4a2 2 0 0 1 2-2zm0 4h4V4h-4v2z" />
    </svg>
  );
}

function MonitorIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={OG_COLORS.primaryBlue}>
      <path d="M3 4h18a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1h-7v2h3v2H8v-2h3v-2H3a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zm1 2v9h16V6H4z" />
    </svg>
  );
}

function ShieldIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={OG_COLORS.primaryBlue}>
      <path d="M12 2l8 3v6c0 5-3.5 9.4-8 11-4.5-1.6-8-6-8-11V5l8-3zm-1 13.2l5.6-5.6-1.4-1.4-4.2 4.2-2-2-1.4 1.4 3.4 3.4z" />
    </svg>
  );
}

function MegaphoneIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={OG_COLORS.primaryBlue}>
      <path d="M3 10v4a2 2 0 0 0 2 2h2l2 5h3l-2-5 8 3V5l-11 4H5a2 2 0 0 0-2 2v-1zm17-2.5a6 6 0 0 1 0 9v-9z" />
    </svg>
  );
}

function ClockIcon({ size = 17 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={OG_COLORS.white} strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function GlobeIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={OG_COLORS.primaryBlue}>
      <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm6.9 9h-3a15.5 15.5 0 0 0-1.3-5A8 8 0 0 1 18.9 11zM12 4c.8 1 1.6 3.3 1.9 7h-3.8C10.4 7.3 11.2 5 12 4zM9.4 6a15.5 15.5 0 0 0-1.3 5h-3A8 8 0 0 1 9.4 6zM5.1 13h3a15.5 15.5 0 0 0 1.3 5A8 8 0 0 1 5.1 13zm6.9 7c-.8-1-1.6-3.3-1.9-7h3.8c-.3 3.7-1.1 6-1.9 7zm2.6-2a15.5 15.5 0 0 0 1.3-5h3a8 8 0 0 1-4.3 5z" />
    </svg>
  );
}

type MetaTileProps = {
  icon: React.ReactNode;
  label: string;
  caption: string;
  s: number;
};

function MetaTile({ icon, label, caption, s }: MetaTileProps) {
  return (
    <div
      style={{
        width: `${Math.round(260 * s)}px`,
        minHeight: `${Math.round(58 * s)}px`,
        display: 'flex',
        alignItems: 'center',
        gap: `${Math.round(12 * s)}px`,
        padding: `${Math.round(8 * s)}px ${Math.round(12 * s)}px`,
        borderRadius: `${Math.round(14 * s)}px`,
        border: '1px solid rgba(21,101,192,0.08)',
        backgroundColor: 'rgba(255,255,255,0.94)',
        boxShadow: '0 7px 20px rgba(13,71,161,0.10)',
      }}
    >
      <div
        style={{
          width: `${Math.round(38 * s)}px`,
          height: `${Math.round(38 * s)}px`,
          borderRadius: `${Math.round(12 * s)}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: OG_COLORS.lightBlue,
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: `${Math.round(2 * s)}px`,
          minWidth: 0,
        }}
      >
        <div
          style={{
            display: 'flex',
            fontSize: `${Math.round(17 * s)}px`,
            lineHeight: 1.1,
            fontWeight: 700,
            color: '#102A56',
            fontFamily: 'Inter',
          }}
        >
          {label}
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: `${Math.round(11 * s)}px`,
            lineHeight: 1.1,
            fontWeight: 500,
            color: '#66758A',
            fontFamily: 'Inter',
          }}
        >
          {caption}
        </div>
      </div>
    </div>
  );
}

/**
 * Template 2: light editorial split-panel card.
 * This is the default CareerSasa job OG / social card.
 */
export function JobSocialCardTemplate2(data: OgJobCardData) {
  const { width, height } = OG_CARD_SIZES[data.size];
  const s = Math.min(width / 1200, height / 630);
  const stripW = Math.max(6, Math.round(8 * s));
  const footerInset = Math.round(18 * s);
  const footerH = Math.round(78 * s);
  const companyLogoBox = Math.round(86 * s);
  const portrait = Math.round(344 * s);
  const portraitWrap = portrait + Math.round(32 * s);
  const titleFont = Math.round(
    (data.title.length > 38 ? 35 : data.title.length > 26 ? 45 : 54) * s,
  );
  const displayTitle = truncateWords(data.title, data.title.length > 52 ? 50 : 58);

  const meta = [
    data.location
      ? {
          key: 'location',
          icon: <PinIcon size={Math.round(22 * s)} />,
          label: truncateWords(data.location, 21),
          caption: 'Location',
        }
      : null,
    data.employmentType
      ? {
          key: 'type',
          icon: <BriefcaseIcon size={Math.round(22 * s)} />,
          label: data.employmentType,
          caption: 'Employment Type',
        }
      : null,
    data.jobFunction
      ? {
          key: 'function',
          icon: <MonitorIcon size={Math.round(22 * s)} />,
          label: truncateWords(data.jobFunction, 22),
          caption: 'Function',
        }
      : null,
    data.showVerified
      ? {
          key: 'verified',
          icon: <ShieldIcon size={Math.round(22 * s)} />,
          label: 'Verified Employer',
          caption: 'Trusted & Verified',
        }
      : null,
  ].filter(Boolean) as Array<{
    key: string;
    icon: React.ReactNode;
    label: string;
    caption: string;
  }>;

  return (
    <div
      style={{
        width: `${width}px`,
        height: `${height}px`,
        display: 'flex',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: 'Inter',
        backgroundColor: '#F7FAFF',
      }}
    >
      {/* Crisp split background: airy editorial left, premium blue right. */}
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ position: 'absolute', inset: 0 }}
      >
        <defs>
          <linearGradient id="t2-light" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#EEF5FF" />
          </linearGradient>
          <linearGradient id="t2-blue" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#1565C0" />
            <stop offset="100%" stopColor="#06439A" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width={width} height={height} fill="url(#t2-light)" />
        <polygon
          points={`${Math.round(width * 0.69)},0 ${width},0 ${width},${height} ${Math.round(
            width * 0.49,
          )},${height}`}
          fill="url(#t2-blue)"
        />
        {/* White-panel geometry, intentionally 3–5% opacity. */}
        <circle
          cx={Math.round(490 * s)}
          cy={Math.round(-30 * s)}
          r={Math.round(170 * s)}
          fill="none"
          stroke="rgba(21,101,192,0.035)"
          strokeWidth={Math.round(20 * s)}
        />
        <circle
          cx={Math.round(95 * s)}
          cy={Math.round(525 * s)}
          r={Math.round(80 * s)}
          fill="none"
          stroke="rgba(21,101,192,0.035)"
          strokeWidth={Math.round(2 * s)}
        />
        <circle
          cx={Math.round(1150 * s)}
          cy={Math.round(470 * s)}
          r={Math.round(90 * s)}
          fill="none"
          stroke="rgba(255,255,255,0.045)"
          strokeWidth={Math.round(2 * s)}
        />
      </svg>

      {/* Subtle dot clusters. */}
      {[0, 1, 2, 3].map((row) =>
        [0, 1, 2, 3, 4].map((col) => (
          <div
            key={`left-dot-${row}-${col}`}
            style={{
              position: 'absolute',
              left: `${Math.round((400 + col * 15) * s)}px`,
              top: `${Math.round((76 + row * 15) * s)}px`,
              width: `${Math.max(2, Math.round(4 * s))}px`,
              height: `${Math.max(2, Math.round(4 * s))}px`,
              borderRadius: '50%',
              backgroundColor: 'rgba(21,101,192,0.08)',
              display: 'flex',
            }}
          />
        )),
      )}
      {[0, 1, 2, 3].map((row) =>
        [0, 1, 2, 3, 4].map((col) => (
          <div
            key={`right-dot-${row}-${col}`}
            style={{
              position: 'absolute',
              right: `${Math.round((34 + col * 14) * s)}px`,
              top: `${Math.round((28 + row * 14) * s)}px`,
              width: `${Math.max(2, Math.round(4 * s))}px`,
              height: `${Math.max(2, Math.round(4 * s))}px`,
              borderRadius: '50%',
              backgroundColor: 'rgba(255,255,255,0.22)',
              display: 'flex',
            }}
          />
        )),
      )}

      {/* Dynamic category strip remains part of the CareerSasa template system. */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: `${stripW}px`,
          backgroundColor: data.categoryColor,
          display: 'flex',
        }}
      />

      {/* Left editorial column. */}
      <div
        style={{
          position: 'absolute',
          left: `${Math.round(66 * s)}px`,
          top: `${Math.round(30 * s)}px`,
          width: `${Math.round(570 * s)}px`,
          height: `${Math.round(492 * s)}px`,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            width: `${companyLogoBox}px`,
            height: `${companyLogoBox}px`,
            borderRadius: `${Math.round(18 * s)}px`,
            backgroundColor: OG_COLORS.white,
            padding: `${Math.round(15 * s)}px`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 10px 28px rgba(13,71,161,0.13)',
            overflow: 'hidden',
          }}
        >
          {data.companyLogoSrc ? (
            <img
              src={data.companyLogoSrc}
              alt=""
              width={companyLogoBox - Math.round(30 * s)}
              height={companyLogoBox - Math.round(30 * s)}
              style={{
                width: `${companyLogoBox - Math.round(30 * s)}px`,
                height: `${companyLogoBox - Math.round(30 * s)}px`,
                objectFit: 'contain',
              }}
            />
          ) : (
            <div
              style={{
                width: '100%',
                height: '100%',
                borderRadius: `${Math.round(12 * s)}px`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: OG_COLORS.lightBlue,
                color: OG_COLORS.primaryBlue,
                fontSize: `${Math.round(26 * s)}px`,
                fontWeight: 800,
              }}
            >
              {data.companyName
                .split(/\s+/)
                .filter(Boolean)
                .slice(0, 2)
                .map((word) => word[0]?.toUpperCase() || '')
                .join('') || 'CS'}
            </div>
          )}
        </div>

        <div
          style={{
            marginTop: `${Math.round(18 * s)}px`,
            alignSelf: 'flex-start',
            display: 'flex',
            alignItems: 'center',
            gap: `${Math.round(8 * s)}px`,
            padding: `${Math.round(7 * s)}px ${Math.round(14 * s)}px`,
            borderRadius: `${Math.round(999 * s)}px`,
            border: `${Math.max(1, Math.round(1.5 * s))}px solid ${OG_COLORS.primaryBlue}`,
            color: OG_COLORS.primaryBlue,
            backgroundColor: 'rgba(255,255,255,0.78)',
            fontSize: `${Math.round(15 * s)}px`,
            fontWeight: 800,
            letterSpacing: '0.04em',
          }}
        >
          <MegaphoneIcon size={Math.round(20 * s)} />
          {"WE'RE HIRING"}
        </div>

        <div
          style={{
            display: 'flex',
            marginTop: `${Math.round(14 * s)}px`,
            width: `${Math.round(560 * s)}px`,
            color: '#071A3D',
            fontSize: `${titleFont}px`,
            lineHeight: 1.02,
            letterSpacing: '-0.035em',
            fontWeight: 800,
          }}
        >
          {displayTitle}
        </div>

        <div
          style={{
            marginTop: `${Math.round(10 * s)}px`,
            width: `${Math.round(56 * s)}px`,
            height: `${Math.round(4 * s)}px`,
            borderRadius: `${Math.round(2 * s)}px`,
            backgroundColor: OG_COLORS.accentOrange,
            display: 'flex',
          }}
        />

        <div
          style={{
            display: 'flex',
            marginTop: `${Math.round(10 * s)}px`,
            color: '#102A56',
            fontSize: `${Math.round(25 * s)}px`,
            lineHeight: 1.08,
            fontWeight: 650,
          }}
        >
          {truncateWords(data.companyName, 38)}
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: `${Math.round(8 * s)}px`,
            marginTop: `${Math.round(14 * s)}px`,
          }}
        >
          {[0, 1].map((row) => (
            <div
              key={`meta-row-${row}`}
              style={{
                display: 'flex',
                gap: `${Math.round(10 * s)}px`,
              }}
            >
              {meta.slice(row * 2, row * 2 + 2).map((item) => (
                <MetaTile
                  key={item.key}
                  icon={item.icon}
                  label={item.label}
                  caption={item.caption}
                  s={s}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Right visual column. */}
      <div
        style={{
          position: 'absolute',
          right: `${Math.round(48 * s)}px`,
          top: `${Math.round(30 * s)}px`,
          width: `${Math.round(490 * s)}px`,
          height: `${Math.round(492 * s)}px`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {data.personImageSrc ? (
          <div
            style={{
              width: `${portraitWrap}px`,
              height: `${portraitWrap}px`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
            }}
          >
            {/* Orange partial arc from the supplied reference. */}
            <svg
              width={portraitWrap}
              height={portraitWrap}
              viewBox={`0 0 ${portraitWrap} ${portraitWrap}`}
              style={{ position: 'absolute', inset: 0 }}
            >
              <circle
                cx={portraitWrap / 2}
                cy={portraitWrap / 2}
                r={portrait / 2 + Math.round(12 * s)}
                fill="none"
                stroke={OG_COLORS.accentOrange}
                strokeWidth={Math.round(4 * s)}
                strokeLinecap="round"
                strokeDasharray={`${Math.round(188 * s)} ${Math.round(1000 * s)}`}
                transform={`rotate(205 ${portraitWrap / 2} ${portraitWrap / 2})`}
              />
            </svg>
            <div
              style={{
                width: `${portrait}px`,
                height: `${portrait}px`,
                borderRadius: `${portrait / 2}px`,
                border: `${Math.round(7 * s)}px solid ${OG_COLORS.white}`,
                overflow: 'hidden',
                display: 'flex',
                boxShadow: '0 16px 42px rgba(0,34,92,0.28)',
                backgroundColor: OG_COLORS.primaryBlueDeep,
              }}
            >
              <img
                src={data.personImageSrc}
                alt=""
                width={portrait}
                height={portrait}
                style={{
                  width: `${portrait}px`,
                  height: `${portrait}px`,
                  objectFit: 'cover',
                }}
              />
            </div>
            <div
              style={{
                position: 'absolute',
                top: `${Math.round(47 * s)}px`,
                right: `${Math.round(15 * s)}px`,
                width: `${Math.round(25 * s)}px`,
                height: `${Math.round(25 * s)}px`,
                borderRadius: `${Math.round(13 * s)}px`,
                backgroundColor: OG_COLORS.accentOrange,
                border: `${Math.round(5 * s)}px solid ${OG_COLORS.white}`,
                boxShadow: '0 4px 10px rgba(0,0,0,0.18)',
                display: 'flex',
              }}
            />
          </div>
        ) : null}

        <div
          style={{
            marginTop: `${Math.round(8 * s)}px`,
            width: `${Math.round(338 * s)}px`,
            height: `${Math.round(64 * s)}px`,
            borderRadius: `${Math.round(16 * s)}px`,
            background: `linear-gradient(135deg, ${OG_COLORS.accentOrange}, ${OG_COLORS.accentOrangeDeep})`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingLeft: `${Math.round(34 * s)}px`,
            paddingRight: `${Math.round(14 * s)}px`,
            boxShadow: '0 12px 26px rgba(255,122,0,0.30)',
            color: OG_COLORS.white,
            fontSize: `${Math.round(28 * s)}px`,
            fontWeight: 800,
          }}
        >
          <span>APPLY NOW</span>
          <div
            style={{
              width: `${Math.round(42 * s)}px`,
              height: `${Math.round(42 * s)}px`,
              borderRadius: `${Math.round(21 * s)}px`,
              backgroundColor: OG_COLORS.white,
              color: OG_COLORS.accentOrange,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: `${Math.round(28 * s)}px`,
              fontWeight: 800,
            }}
          >
            →
          </div>
        </div>

        <div
          style={{
            marginTop: `${Math.round(9 * s)}px`,
            display: 'flex',
            alignItems: 'center',
            gap: `${Math.round(6 * s)}px`,
            color: 'rgba(255,255,255,0.84)',
            fontSize: `${Math.round(12 * s)}px`,
            fontWeight: 600,
          }}
        >
          <ClockIcon size={Math.round(16 * s)} />
          <span>Don&apos;t wait. Great opportunities go fast.</span>
        </div>
      </div>

      {/* Inset CareerSasa signature footer. */}
      <div
        style={{
          position: 'absolute',
          left: `${footerInset + stripW}px`,
          right: `${footerInset}px`,
          bottom: `${Math.round(14 * s)}px`,
          height: `${footerH}px`,
          borderRadius: `${Math.round(18 * s)}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: `0 ${Math.round(26 * s)}px`,
          backgroundColor: 'rgba(255,255,255,0.98)',
          boxShadow: '0 9px 30px rgba(13,71,161,0.14)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: `${Math.round(10 * s)}px`,
          }}
        >
          {data.brandLogoSrc ? (
            <img
              src={data.brandLogoSrc}
              alt=""
              width={Math.round(52 * s)}
              height={Math.round(52 * s)}
              style={{
                width: `${Math.round(52 * s)}px`,
                height: `${Math.round(52 * s)}px`,
                objectFit: 'contain',
              }}
            />
          ) : null}
          <div
            style={{
              display: 'flex',
              fontSize: `${Math.round(29 * s)}px`,
              fontWeight: 800,
              letterSpacing: '-0.02em',
            }}
          >
            <span style={{ color: OG_COLORS.primaryBlue }}>Career</span>
            <span style={{ color: OG_COLORS.accentOrange }}>Sasa</span>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: `${Math.round(20 * s)}px`,
          }}
        >
          <div
            style={{
              width: `${Math.max(1, Math.round(1.5 * s))}px`,
              height: `${Math.round(46 * s)}px`,
              backgroundColor: '#D3DAE5',
              display: 'flex',
            }}
          />
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: `${Math.round(3 * s)}px`,
            }}
          >
            <div
              style={{
                display: 'flex',
                color: '#102A56',
                fontSize: `${Math.round(17 * s)}px`,
                fontWeight: 800,
              }}
            >
              AI-Powered Job Search
            </div>
            <div
              style={{
                display: 'flex',
                color: '#66758A',
                fontSize: `${Math.round(14 * s)}px`,
                fontWeight: 500,
              }}
            >
              Find. Apply. Grow.
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: `${Math.round(8 * s)}px`,
            color: OG_COLORS.primaryBlue,
            fontSize: `${Math.round(17 * s)}px`,
            fontWeight: 700,
          }}
        >
          <GlobeIcon size={Math.round(21 * s)} />
          <span>careersasa.co.ke</span>
        </div>
      </div>
    </div>
  );
}
