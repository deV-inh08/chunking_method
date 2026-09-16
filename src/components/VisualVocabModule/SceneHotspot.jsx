import { useState } from 'react';

/**
 * SceneHotspot Component (Native SVG)
 * High-end interactive glowing pin with native hover tooltips.
 * Eliminates ugly grey padlock icons and visual clutter.
 */
export function SceneHotspot({
  item,
  isCompleted = false,
  isSelected = false,
  isActiveZone = true,
  mode = 'level1',
  onClick,
}) {
  const [isHovered, setIsHovered] = useState(false);

  const isAction = item.visualType === 'action';
  const cx = item.hotspot.x * 1000;
  const cy = item.hotspot.y * 562.5;

  // Completed Hotspot (Teal checkmark)
  if (isCompleted) {
    return (
      <g
        className="scene-hotspot-svg hotspot-completed"
        transform={`translate(${cx}, ${cy})`}
        onClick={(e) => { e.stopPropagation(); onClick(item); }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{ cursor: 'pointer' }}
      >
        <circle
          cx={0}
          cy={0}
          r={isSelected ? 14 : isHovered ? 13 : 11}
          fill="#0d9488"
          stroke={isSelected || isHovered ? '#ffffff' : '#2dd4bf'}
          strokeWidth={isSelected || isHovered ? 2 : 1.5}
          filter="url(#glow-teal)"
          style={{ transition: 'r 0.15s ease, stroke-width 0.15s ease' }}
        />
        {/* Checkmark icon */}
        <path
          d="M-3.5,-0.5 L-1,2 L3.5,-2.5"
          stroke="#ffffff"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </g>
    );
  }

  // Active / Ready Hotspot
  const outerRadius = isSelected
    ? (isAction ? 17 : 15)
    : isHovered
    ? (isAction ? 16 : 14)
    : (isAction ? 14 : 12);

  const showTooltip = isHovered || isSelected;
  const tooltipText = mode === 'level2' ? item.meaningVi : item.word;
  const tooltipWidth = Math.max(tooltipText.length * 7.5 + 16, 60);

  return (
    <g
      className={`scene-hotspot-svg ${isAction ? 'hotspot-action' : 'hotspot-object'} ${
        isSelected ? 'hotspot-selected' : ''
      }`}
      transform={`translate(${cx}, ${cy})`}
      onClick={(e) => { e.stopPropagation(); onClick(item); }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ cursor: 'pointer' }}
    >
      {/* Pulsing ripple ring */}
      {isActiveZone && !isSelected && (
        <circle
          cx={0}
          cy={0}
          r={isAction ? 22 : 18}
          fill="none"
          stroke={isAction ? 'rgba(192, 132, 252, 0.65)' : 'rgba(245, 158, 11, 0.65)'}
          strokeWidth={1.8}
          className="svg-hotspot-pulse"
        />
      )}

      {/* Main outer circle */}
      <circle
        cx={0}
        cy={0}
        r={outerRadius}
        fill={isAction ? '#7c3aed' : '#f59e0b'}
        stroke={isSelected || isHovered ? '#ffffff' : (isAction ? '#e9d5ff' : '#fef3c7')}
        strokeWidth={isSelected || isHovered ? 2.5 : 1.8}
        filter={isAction ? 'none' : 'url(#glow-amber)'}
        style={{ transition: 'r 0.15s ease, stroke 0.15s ease, stroke-width 0.15s ease' }}
      />

      {isAction ? (
        /* Action: Lightning SVG icon */
        <path
          d="M0.5,-5 L-3.5,0.5 L-0.5,0.5 L-1.5,5 L3.5,-0.5 L0.5,-0.5 Z"
          fill="#ffffff"
          stroke="#ffffff"
          strokeWidth={0.5}
          strokeLinejoin="round"
        />
      ) : (
        /* Object: White inner core */
        <circle
          cx={0}
          cy={0}
          r={isHovered ? 4.5 : 3.5}
          fill="#ffffff"
          style={{ transition: 'r 0.15s ease' }}
        />
      )}

      {/* Floating Tooltip above hotspot on hover / select */}
      {showTooltip && (
        <g pointerEvents="none" transform="translate(0, -24)">
          <rect
            x={-tooltipWidth / 2}
            y={-14}
            width={tooltipWidth}
            height={22}
            rx={6}
            fill="rgba(15, 23, 42, 0.94)"
            stroke={isAction ? '#a855f7' : '#38bdf8'}
            strokeWidth={1.2}
            filter="drop-shadow(0 4px 10px rgba(0,0,0,0.5))"
          />
          <text
            x={0}
            y={1}
            textAnchor="middle"
            fill="#ffffff"
            fontSize="11"
            fontWeight="700"
            fontFamily="Inter, ui-sans-serif, system-ui"
          >
            {tooltipText}
          </text>
        </g>
      )}
    </g>
  );
}
