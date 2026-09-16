import { Compass } from 'lucide-react';

/**
 * MiniMap Component
 * Compact translucent radar thumbnail in the bottom-right of the scene.
 * Shows relative positions of the 4 zones in the 16:9 panorama.
 */
export function MiniMap({
  zones = [],
  activeZoneId,
  completedZoneIds = new Set(),
  unlockedZoneIds = new Set(),
  className = '',
}) {
  return (
    <div
      className={`minimap-wrapper ${className}`}
      style={{
        position: 'absolute',
        bottom: 12,
        right: 12,
        zIndex: 35,
        background: 'rgba(15, 23, 42, 0.82)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        border: '1px solid rgba(148, 163, 184, 0.25)',
        borderRadius: 10,
        padding: '5px 7px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
        pointerEvents: 'none',
        userSelect: 'none',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          marginBottom: 3,
          fontSize: 9.5,
          fontWeight: 700,
          color: '#94a3b8',
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
        }}
      >
        <Compass size={10} color="#38bdf8" /> Radar
      </div>

      {/* 16:9 Mini Viewport Representation */}
      <div
        style={{
          width: 96,
          height: 54,
          background: 'rgba(7, 11, 20, 0.9)',
          borderRadius: 6,
          position: 'relative',
          border: '1px solid rgba(51, 65, 85, 0.6)',
          overflow: 'hidden',
        }}
      >
        {/* Subtle grid */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'linear-gradient(to right, rgba(51,65,85,0.2) 1px, transparent 1px), linear-gradient(to bottom, rgba(51,65,85,0.2) 1px, transparent 1px)',
            backgroundSize: '24px 18px',
          }}
        />

        {/* Zone Markers */}
        {zones.map((zone, idx) => {
          const isCurrent = zone.zoneId === activeZoneId;
          const isDone = completedZoneIds.has(zone.zoneId);

          const posX = `${(zone.center?.x ?? 0.25) * 100}%`;
          const posY = `${(zone.center?.y ?? 0.5) * 100}%`;

          let color = '#475569';
          let glow = 'none';

          if (isDone) {
            color = '#14b8a6';
            glow = '0 0 6px #14b8a6';
          } else if (isCurrent) {
            color = '#38bdf8';
            glow = '0 0 8px #38bdf8';
          }

          return (
            <div
              key={zone.zoneId}
              style={{
                position: 'absolute',
                left: posX,
                top: posY,
                transform: 'translate(-50%, -50%)',
                width: isCurrent ? 14 : 11,
                height: isCurrent ? 14 : 11,
                borderRadius: '50%',
                background: color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: glow,
                transition: 'all 0.3s ease',
                border: isCurrent ? '1.5px solid #ffffff' : 'none',
              }}
            >
              <span
                style={{
                  fontSize: 7.5,
                  fontWeight: 800,
                  color: isCurrent ? '#0b1220' : '#ffffff',
                  lineHeight: 1,
                }}
              >
                {idx + 1}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
