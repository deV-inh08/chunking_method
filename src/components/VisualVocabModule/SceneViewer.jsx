import { useState, useEffect, useRef, useMemo } from 'react';
import { ZoomIn, ZoomOut } from 'lucide-react';
import { SceneHotspot } from './SceneHotspot';
import { MiniMap } from './MiniMap';

// Parse "x y w h" string into array of numbers
function parseViewBox(vbStr) {
  if (!vbStr) return [0, 0, 1000, 562.5];
  const parts = vbStr.trim().split(/\s+/).map(Number);
  return parts.length === 4 ? parts : [0, 0, 1000, 562.5];
}

/**
 * SceneViewer Component
 * Interactive SVG Viewport with smooth cinematic pan/zoom between zones.
 * Clean, distraction-free: no dashed bounding boxes, no dark spotlight cutout.
 */
export function SceneViewer({
  scene,
  activeZone,
  activeZoneIndex = 0,
  selectedItem = null,
  completedItemIds = new Set(),
  completedZoneIds = new Set(),
  unlockedZoneIds = new Set(),
  mode = 'level1', // 'level1' | 'level2'
  onSelectItem,
}) {
  const [isOverview, setIsOverview] = useState(false);
  const targetViewBoxStr = useMemo(() => {
    if (isOverview || !activeZone) {
      return scene.fullViewBox || '0 0 1000 562.5';
    }
    return activeZone.viewBox || scene.fullViewBox;
  }, [isOverview, activeZone, scene.fullViewBox]);

  // Animated current viewBox coordinates [x, y, w, h]
  const [currentVb, setCurrentVb] = useState(() => parseViewBox(targetViewBoxStr));
  const animFrameRef = useRef(null);
  const currentVbRef = useRef(currentVb);
  currentVbRef.current = currentVb;

  // Smooth lerp animation for viewBox
  useEffect(() => {
    const targetVb = parseViewBox(targetViewBoxStr);
    let start = null;
    const duration = 500; // ms
    const initialVb = [...currentVbRef.current];

    const easeInOutQuad = (t) => {
      return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    };

    const step = (timestamp) => {
      if (!start) start = timestamp;
      const elapsed = timestamp - start;
      const progress = Math.min(elapsed / duration, 1);
      const ease = easeInOutQuad(progress);

      const nextVb = [
        initialVb[0] + (targetVb[0] - initialVb[0]) * ease,
        initialVb[1] + (targetVb[1] - initialVb[1]) * ease,
        initialVb[2] + (targetVb[2] - initialVb[2]) * ease,
        initialVb[3] + (targetVb[3] - initialVb[3]) * ease,
      ];

      setCurrentVb(nextVb);

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(step);
      }
    };

    animFrameRef.current = requestAnimationFrame(step);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [targetViewBoxStr]);

  const viewBoxString = currentVb.map(v => Math.round(v * 10) / 10).join(' ');

  // All hotspots across all zones
  const allHotspots = useMemo(() => {
    const list = [];
    (scene.zones || []).forEach(z => {
      (z.items || []).forEach(item => {
        list.push({
          ...item,
          zoneId: z.zoneId,
          order: z.order,
        });
      });
    });
    return list;
  }, [scene.zones]);

  return (
    <div
      className="scene-viewer-wrapper"
      style={{
        position: 'relative',
        width: '100%',
        borderRadius: 16,
        overflow: 'hidden',
        background: '#070b14',
        border: '1.5px solid rgba(148, 163, 184, 0.2)',
        boxShadow: '0 12px 36px rgba(0, 0, 0, 0.5)',
      }}
    >
      {/* Sleek Floating Top Control Overlay */}
      <div
        className="scene-header-bar flex items-center justify-between gap-2 px-3 py-2"
        style={{
          position: 'absolute',
          top: 8,
          left: 8,
          right: 8,
          zIndex: 30,
          pointerEvents: 'none',
        }}
      >
        {/* Active Zone Pill */}
        <div
          className="flex items-center gap-2 px-2.5 py-1"
          style={{
            pointerEvents: 'auto',
            background: 'rgba(15, 23, 42, 0.82)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            borderRadius: 99,
            border: '1px solid rgba(56, 189, 248, 0.3)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.35)',
            maxWidth: 'calc(100% - 110px)',
          }}
        >
          <span
            style={{
              fontSize: 10,
              fontWeight: 800,
              padding: '1.5px 6px',
              borderRadius: 99,
              background: 'var(--primary, #356ae6)',
              color: '#ffffff',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            Khu {activeZoneIndex + 1}/{scene.zones?.length || 4}
          </span>
          <span
            style={{
              fontSize: 11.5,
              fontWeight: 700,
              color: '#ffffff',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {activeZone?.label}
          </span>
        </div>

        {/* Zoom Out / Overview Button */}
        <div style={{ pointerEvents: 'auto', flexShrink: 0 }}>
          <button
            type="button"
            onClick={() => setIsOverview(prev => !prev)}
            className="btn btn-ghost btn-xs"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 9px',
              borderRadius: 99,
              background: 'rgba(15, 23, 42, 0.82)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              color: isOverview ? '#38bdf8' : '#cbd5e1',
              border: '1px solid rgba(148, 163, 184, 0.25)',
              cursor: 'pointer',
              fontSize: 11,
              fontWeight: 600,
              boxShadow: '0 4px 12px rgba(0,0,0,0.35)',
            }}
            title={isOverview ? 'Zoom lại Zone đang học' : 'Xem toàn cảnh'}
          >
            {isOverview ? <ZoomIn size={12} /> : <ZoomOut size={12} />}
            <span>{isOverview ? 'Khu vực' : 'Toàn cảnh'}</span>
          </button>
        </div>
      </div>

      {/* MiniMap in Top-Right corner */}
      <MiniMap
        zones={scene.zones || []}
        activeZoneId={activeZone?.zoneId}
        completedZoneIds={completedZoneIds}
        unlockedZoneIds={unlockedZoneIds}
      />

      {/* SVG Viewport */}
      <div
        style={{
          width: '100%',
          aspectRatio: '1000 / 562.5',
          position: 'relative',
        }}
      >
        <svg
          id="scene-svg-canvas"
          viewBox={viewBoxString}
          preserveAspectRatio="xMidYMid meet"
          style={{
            width: '100%',
            height: '100%',
            display: 'block',
          }}
        >
          {/* External SVG Definitions */}
          <defs>
            {/* Glowing Filters */}
            <filter id="glow-teal" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="glow-amber" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Photorealistic Panorama Image */}
          <image
            href={scene.image || "/scenes/office_main.jpg"}
            x="0"
            y="0"
            width="1000"
            height="562.5"
            preserveAspectRatio="xMidYMid slice"
          />

          {/* Subtle natural vignette */}
          <rect
            x="0"
            y="0"
            width="1000"
            height="562.5"
            fill="black"
            opacity="0.04"
            pointerEvents="none"
          />

          {/* ======================================================== */}
          {/* HOTSPOT LAYER (Focused on active zone, clean & elegant)  */}
          {/* ======================================================== */}
          <g id="svg_hotspots_layer">
            {allHotspots.map((item) => {
              const isCurrentZone = item.zoneId === activeZone?.zoneId;
              const isCompleted = completedItemIds.has(item.id);
              const isSelected = selectedItem?.id === item.id;

              // Clean view: In focused mode, only show hotspots of the active zone
              // (or subtle completed checkmarks). Never litter the photo with padlocks!
              if (!isOverview && !isCurrentZone && !isCompleted) {
                return null;
              }

              return (
                <SceneHotspot
                  key={item.id}
                  item={item}
                  isCompleted={isCompleted}
                  isSelected={isSelected}
                  isActiveZone={isCurrentZone}
                  mode={mode}
                  onClick={onSelectItem}
                />
              );
            })}
          </g>
        </svg>
      </div>
    </div>
  );
}
