import { useState, useRef, useCallback, useEffect } from 'react';
import type { TimeBlock } from '../types/schedule';
import {
  timeStringToMinutes,
  minutesToTimeString,
  calculateDuration,
  snapToFiveMinutes,
  formatHourTo12Hour,
  formatTo12Hour,
  formatDuration,
} from '../utils/timeUtils';

interface CircularChartProps {
  timeBlocks: TimeBlock[];
  onBlockCreated: (startTime: string, endTime: string) => void;
  onBlockClick: (block: TimeBlock) => void;
}

export default function CircularChart({
  timeBlocks,
  onBlockCreated,
  onBlockClick,
}: CircularChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<number | null>(null);
  const [dragProgress, setDragProgress] = useState(0);
  const [hasMovedEnough, setHasMovedEnough] = useState(false);
  const [hoveredBlock, setHoveredBlock] = useState<TimeBlock | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const [viewport, setViewport] = useState(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  }));
  const lastDragMinutesRef = useRef<number | null>(null);

  const DRAG_THRESHOLD_MINUTES = 5; // minutes to rotate before starting drag

  useEffect(() => {
    const handleResize = () => {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const defaultSize = 720;
  const heightBound = viewport.height ? viewport.height - 220 : defaultSize;
  // Responsive width calculation: less offset on mobile (no sidebar), more on desktop
  const isDesktop = viewport.width >= 1024;
  const sideOffset = isDesktop ? 280 : 48; // 48px for mobile padding + margins (24px each side)
  const widthBound = viewport.width ? viewport.width - sideOffset : defaultSize;
  const boundedSize = Math.min(Math.max(Math.min(heightBound, widthBound), 380), 900);
  const chartSize = Number.isFinite(boundedSize) ? boundedSize : defaultSize;

  const labelMargin = Math.max(48, chartSize * 0.085);
  const canvasSize = chartSize + labelMargin * 2;
  const center = canvasSize / 2;
  const radius = chartSize * 0.39;
  const innerRadius = radius * 0.62;
  const labelRadiusOffset = chartSize * 0.1;
  const tickInnerOffset = chartSize * 0.01;
  const tickOuterOffset = chartSize * 0.03;

  // Convert angle to time in minutes (0° = top = midnight)
  const angleToMinutes = (angle: number): number => {
    // Normalize angle to 0-360
    const normalizedAngle = ((angle % 360) + 360) % 360;

    // Convert to minutes (0 degrees at top = midnight)
    const minutes = (normalizedAngle / 360) * (24 * 60);

    return snapToFiveMinutes(minutes);
  };

  // Convert minutes to angle (0 = top = midnight)
  const minutesToAngle = (minutes: number): number => {
    return (minutes / (24 * 60)) * 360;
  };

  // Check if a point is within the draggable annulus area
  const isPointInDraggableArea = (e: React.MouseEvent | React.TouchEvent): boolean => {
    if (!svgRef.current) return false;
    const rect = svgRef.current.getBoundingClientRect();
    let clientX: number, clientY: number;

    if ('touches' in e) {
      const touch = e.touches[0];
      if (!touch) return false;
      clientX = touch.clientX;
      clientY = touch.clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = clientX - rect.left - center;
    const y = clientY - rect.top - center;
    const distance = Math.sqrt(x * x + y * y);

    // Allow dragging within the annulus (between innerRadius and radius)
    // Add a small buffer (10px) outside radius for easier interaction
    return distance >= innerRadius * 0.9 && distance <= radius + 10;
  };

  // Get angle from mouse or touch position
  const getAngleFromEvent = (e: React.MouseEvent | MouseEvent | React.TouchEvent | TouchEvent): number => {
    if (!svgRef.current) return 0;
    const rect = svgRef.current.getBoundingClientRect();
    let clientX: number, clientY: number;

    if ('touches' in e) {
      const touch = e.touches[0] || e.changedTouches?.[0];
      if (!touch) return 0;
      clientX = touch.clientX;
      clientY = touch.clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = clientX - rect.left - center;
    const y = clientY - rect.top - center;
    const angle = (Math.atan2(y, x) * 180) / Math.PI + 90;
    return angle;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only start dragging if click is within the draggable annulus area
    if (!isPointInDraggableArea(e)) return;

    const angle = getAngleFromEvent(e);
    const minutes = angleToMinutes(angle);
    setDragStart(minutes);
    setDragProgress(0);
    setHasMovedEnough(false);
    lastDragMinutesRef.current = minutes;
    setIsDragging(true);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    // Only start dragging if touch is within the draggable annulus area
    if (!isPointInDraggableArea(e)) return;

    // Don't prevent default initially - allow scrolling until threshold is met
    const angle = getAngleFromEvent(e);
    const minutes = angleToMinutes(angle);
    setDragStart(minutes);
    setDragProgress(0);
    setHasMovedEnough(false);
    lastDragMinutesRef.current = minutes;
    setIsDragging(true);
  };

  const handleMouseMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!svgRef.current || !isDragging || dragStart === null) return;

    const rect = svgRef.current.getBoundingClientRect();
    let clientX: number, clientY: number;

    if ('touches' in e) {
      const touch = e.touches[0];
      if (!touch) return;
      clientX = touch.clientX;
      clientY = touch.clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = clientX - rect.left - center;
    const y = clientY - rect.top - center;
    const angle = (Math.atan2(y, x) * 180) / Math.PI + 90;
    const minutes = angleToMinutes(angle);

    const lastMinutes = lastDragMinutesRef.current ?? minutes;
    let diff = minutes - lastMinutes;
    if (diff > 720) diff -= 1440;
    if (diff < -720) diff += 1440;

    setDragProgress(prev => {
      const next = Math.max(0, Math.min(24 * 60, prev + diff));

      // Check if we've moved enough to start dragging
      if (!hasMovedEnough && next >= DRAG_THRESHOLD_MINUTES) {
        setHasMovedEnough(true);
        if ('touches' in e) {
          e.preventDefault(); // Now prevent scrolling since we're dragging
        }
      }

      // Only prevent default on touch if we've moved enough
      if (hasMovedEnough && 'touches' in e) {
        e.preventDefault();
      }

      return next;
    });

    lastDragMinutesRef.current = minutes;
  }, [isDragging, dragStart, center, hasMovedEnough, DRAG_THRESHOLD_MINUTES]);

  const handleMouseUp = useCallback(() => {
    // Only create block if we moved enough to start dragging
    if (isDragging && hasMovedEnough && dragStart !== null && dragProgress >= 5) {
      const startTime = minutesToTimeString(dragStart);
      const endTime = minutesToTimeString((dragStart + dragProgress) % (24 * 60));
      onBlockCreated(startTime, endTime);

      // Haptic feedback on mobile
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }
    }

    lastDragMinutesRef.current = null;
    setIsDragging(false);
    setDragStart(null);
    setDragProgress(0);
    setHasMovedEnough(false);
  }, [isDragging, hasMovedEnough, dragStart, dragProgress, onBlockCreated]);

  // Add global mouse and touch listeners for dragging
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleMouseMove, { passive: false });
      document.addEventListener('touchend', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleMouseMove);
        document.removeEventListener('touchend', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Render hour labels (24-hour clock: 12 AM top, 6 AM right, 12 PM bottom, 6 PM left)
  const renderHourLabels = () => {
    const labels = [];
    // Key positions: 0 (12 AM), 3, 6 (6 AM), 9, 12 (12 PM), 15, 18 (6 PM), 21
    const hoursToShow = [0, 3, 6, 9, 12, 15, 18, 21];

    for (const hour of hoursToShow) {
      const angle = (hour / 24) * 360;
      const angleRad = ((angle - 90) * Math.PI) / 180;
      const labelRadius = radius + labelRadiusOffset;
      const x = center + labelRadius * Math.cos(angleRad);
      const y = center + labelRadius * Math.sin(angleRad);

      labels.push(
        <text
          key={`hour-${hour}`}
          x={x}
          y={y}
          textAnchor="middle"
          dominantBaseline="middle"
          className="text-xs font-semibold fill-gray-700"
        >
          {formatHourTo12Hour(hour)}
        </text>
      );
    }

    return labels;
  };

  // Render hour tick marks
  const renderHourTicks = () => {
    const ticks = [];
    for (let i = 0; i < 24; i++) {
      const angle = (i / 24) * 360;
      const angleRad = ((angle - 90) * Math.PI) / 180;
      const x1 = center + (radius + tickInnerOffset) * Math.cos(angleRad);
      const y1 = center + (radius + tickInnerOffset) * Math.sin(angleRad);
      const x2 = center + (radius + tickOuterOffset) * Math.cos(angleRad);
      const y2 = center + (radius + tickOuterOffset) * Math.sin(angleRad);

      ticks.push(
        <line
          key={`tick-${i}`}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke="#9ca3af"
          strokeWidth="2"
        />
      );
    }
    return ticks;
  };

  const renderHourSegments = () => {
    const segments = [];
    for (let hour = 0; hour < 24; hour++) {
      const startAngle = (hour / 24) * 360;
      const endAngle = ((hour + 1) / 24) * 360;
      const startAngleRad = ((startAngle - 90) * Math.PI) / 180;
      const endAngleRad = ((endAngle - 90) * Math.PI) / 180;

      const x1 = center + innerRadius * Math.cos(startAngleRad);
      const y1 = center + innerRadius * Math.sin(startAngleRad);
      const x2 = center + radius * Math.cos(startAngleRad);
      const y2 = center + radius * Math.sin(startAngleRad);
      const x3 = center + radius * Math.cos(endAngleRad);
      const y3 = center + radius * Math.sin(endAngleRad);
      const x4 = center + innerRadius * Math.cos(endAngleRad);
      const y4 = center + innerRadius * Math.sin(endAngleRad);

      const path = `
        M ${x1} ${y1}
        L ${x2} ${y2}
        A ${radius} ${radius} 0 0 1 ${x3} ${y3}
        L ${x4} ${y4}
        A ${innerRadius} ${innerRadius} 0 0 0 ${x1} ${y1}
        Z
      `;

      segments.push(
        <path
          key={`segment-${hour}`}
          d={path}
          fill="rgba(243, 244, 246, 0.9)" // subtle gray fill
          stroke="none"
        />
      );
    }
    return segments;
  };

  const renderHourDividers = () => {
    const dividers = [];
    for (let i = 0; i < 24; i++) {
      const angle = (i / 24) * 360;
      const angleRad = ((angle - 90) * Math.PI) / 180;
      const x1 = center + innerRadius * Math.cos(angleRad);
      const y1 = center + innerRadius * Math.sin(angleRad);
      const x2 = center + radius * Math.cos(angleRad);
      const y2 = center + radius * Math.sin(angleRad);

      dividers.push(
        <line
          key={`divider-${i}`}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke="rgba(209, 213, 219, 0.9)" // gray-300
          strokeWidth="1.5"
        />
      );
    }
    return dividers;
  };

  // Render time blocks
  const renderTimeBlocks = () => {
    return timeBlocks.map((block) => {
      const startMinutes = timeStringToMinutes(block.startTime);
      const duration = calculateDuration(block.startTime, block.endTime);

      const startAngle = minutesToAngle(startMinutes);
      const endAngle = minutesToAngle(startMinutes + duration);

      const startAngleRad = ((startAngle - 90) * Math.PI) / 180;
      const endAngleRad = ((endAngle - 90) * Math.PI) / 180;

      const largeArc = endAngle - startAngle > 180 ? 1 : 0;

      const x1 = center + innerRadius * Math.cos(startAngleRad);
      const y1 = center + innerRadius * Math.sin(startAngleRad);
      const x2 = center + radius * Math.cos(startAngleRad);
      const y2 = center + radius * Math.sin(startAngleRad);
      const x3 = center + radius * Math.cos(endAngleRad);
      const y3 = center + radius * Math.sin(endAngleRad);
      const x4 = center + innerRadius * Math.cos(endAngleRad);
      const y4 = center + innerRadius * Math.sin(endAngleRad);

      const path = `
        M ${x1} ${y1}
        L ${x2} ${y2}
        A ${radius} ${radius} 0 ${largeArc} 1 ${x3} ${y3}
        L ${x4} ${y4}
        A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x1} ${y1}
        Z
      `;

      // Calculate label position (center of arc)
      const midAngle = (startAngle + endAngle) / 2;
      const midAngleRad = ((midAngle - 90) * Math.PI) / 180;
      const labelRadius = (radius + innerRadius) / 2;
      const labelX = center + labelRadius * Math.cos(midAngleRad);
      const labelY = center + labelRadius * Math.sin(midAngleRad);

      return (
        <g key={block.id}>
          <path
            d={path}
            fill={block.color}
            stroke="white"
            strokeWidth="2"
            className="cursor-pointer transition-opacity hover:opacity-80"
            onClick={() => onBlockClick(block)}
            onMouseEnter={(e) => {
              setHoveredBlock(block);
              const rect = svgRef.current?.getBoundingClientRect();
              if (rect) {
                setTooltipPos({
                  x: e.clientX - rect.left,
                  y: e.clientY - rect.top,
                });
              }
            }}
            onMouseMove={(e) => {
              const rect = svgRef.current?.getBoundingClientRect();
              if (rect) {
                setTooltipPos({
                  x: e.clientX - rect.left,
                  y: e.clientY - rect.top,
                });
              }
            }}
            onMouseLeave={() => {
              setHoveredBlock(null);
              setTooltipPos(null);
            }}
          />
          {duration >= 30 && (
            <text
              x={labelX}
              y={labelY}
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-xs font-semibold fill-white pointer-events-none"
            >
              {block.label}
            </text>
          )}
        </g>
      );
    });
  };

  // Render drag preview
  const renderDragPreview = () => {
    if (!isDragging || !hasMovedEnough || dragStart === null || dragProgress < 5) return null;

    const startMinutes = dragStart;
    const duration = dragProgress;
    const endMinutesAbsolute = dragStart + duration;

    const startAngle = minutesToAngle(startMinutes);
    const endAngle = minutesToAngle(endMinutesAbsolute);

    const startAngleRad = ((startAngle - 90) * Math.PI) / 180;
    const endAngleRad = ((endAngle - 90) * Math.PI) / 180;

    const largeArc = endAngle - startAngle > 180 ? 1 : 0;

    const x1 = center + innerRadius * Math.cos(startAngleRad);
    const y1 = center + innerRadius * Math.sin(startAngleRad);
    const x2 = center + radius * Math.cos(startAngleRad);
    const y2 = center + radius * Math.sin(startAngleRad);
    const x3 = center + radius * Math.cos(endAngleRad);
    const y3 = center + radius * Math.sin(endAngleRad);
    const x4 = center + innerRadius * Math.cos(endAngleRad);
    const y4 = center + innerRadius * Math.sin(endAngleRad);

    const path = `
      M ${x1} ${y1}
      L ${x2} ${y2}
      A ${radius} ${radius} 0 ${largeArc} 1 ${x3} ${y3}
      L ${x4} ${y4}
      A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x1} ${y1}
      Z
    `;

    return (
      <g className="pointer-events-none">
        <defs>
          <linearGradient id="dragGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#DBEAFE" />
            <stop offset="100%" stopColor="#E9D5FF" />
          </linearGradient>
        </defs>
        <path
          d={path}
          fill="url(#dragGradient)"
          opacity="0.7"
          stroke="#9CA3AF"
          strokeWidth="2"
          strokeDasharray="5,5"
        />
        {/* Show drag times in center */}
        <text
          x={center}
          y={center}
          textAnchor="middle"
          dominantBaseline="middle"
          className="fill-gray-700"
        >
          <tspan className="text-xs font-medium fill-blue-600">
            {formatTo12Hour(minutesToTimeString(startMinutes))}
          </tspan>
          <tspan className="text-xs font-medium fill-gray-500" dx="6">→</tspan>
          <tspan className="text-xs font-semibold fill-purple-600" dx="6">
            {formatTo12Hour(minutesToTimeString((startMinutes + duration) % (24 * 60)))}
          </tspan>
        </text>
      </g>
    );
  };

  return (
    <div className="flex-1 overflow-auto bg-gray-50 flex items-center justify-center">
      <div className="mx-auto max-w-5xl px-2 sm:px-4 lg:px-6 py-2 sm:py-4 lg:py-8 w-full">
        <div className="mb-2 sm:mb-4 lg:mb-6 text-center hidden lg:block">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900">
            Circular Overview
          </h3>
          <p className="text-xs sm:text-sm text-gray-600 mt-1 sm:mt-2">
            Drag around the dial to create time blocks or tap an existing block to edit.
          </p>
        </div>
        <div className="flex items-center justify-center w-full">
          <svg
            ref={svgRef}
            width={canvasSize}
            height={canvasSize}
            className="cursor-crosshair block"
            style={{ maxWidth: '100%', height: 'auto', margin: '0 auto' }}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {/* Background circle */}
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke="#d1d5db"
              strokeWidth="2"
            />
            <circle
              cx={center}
              cy={center}
              r={innerRadius}
              fill="none"
              stroke="#e9d5ff"
              strokeWidth="2"
            />

            {/* Subtle hour segments */}
            {renderHourSegments()}

            {/* Hour dividing lines */}
            {renderHourDividers()}

            {/* Hour ticks */}
            {renderHourTicks()}

            {/* Time blocks */}
            {renderTimeBlocks()}

            {/* Drag preview */}
            {renderDragPreview()}

            {/* Hour labels */}
            {renderHourLabels()}

            {/* Tooltip */}
            {hoveredBlock && tooltipPos && (
              <g style={{ pointerEvents: 'none' }}>
                <foreignObject
                  x={tooltipPos.x + 10}
                  y={tooltipPos.y - 40}
                  width="200"
                  height="80"
                >
                  <div
                    style={{
                      backgroundColor: 'rgba(0, 0, 0, 0.9)',
                      color: 'white',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: '500',
                      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                      {hoveredBlock.label}
                    </div>
                    <div style={{ fontSize: '11px', opacity: 0.9 }}>
                      {formatTo12Hour(hoveredBlock.startTime)} - {formatTo12Hour(hoveredBlock.endTime)}
                    </div>
                    <div style={{ fontSize: '10px', opacity: 0.7, marginTop: '2px' }}>
                      {formatDuration(calculateDuration(hoveredBlock.startTime, hoveredBlock.endTime))}
                    </div>
                  </div>
                </foreignObject>
              </g>
            )}
          </svg>
        </div>
      </div>
    </div>
  );
}
