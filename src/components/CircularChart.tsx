import { useState, useRef, useCallback } from 'react';
import type { TimeBlock } from '../types/schedule';
import {
  timeStringToMinutes,
  minutesToTimeString,
  calculateDuration,
  snapToFiveMinutes,
  formatHourTo12Hour,
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
  const [dragEnd, setDragEnd] = useState<number | null>(null);

  const size = 600;
  const center = size / 2;
  const radius = 220;
  const innerRadius = 140;

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

  // Get angle from mouse position
  const getAngleFromEvent = (e: React.MouseEvent | MouseEvent): number => {
    if (!svgRef.current) return 0;
    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - center;
    const y = e.clientY - rect.top - center;
    const angle = (Math.atan2(y, x) * 180) / Math.PI + 90;
    return angle;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const angle = getAngleFromEvent(e);
    const minutes = angleToMinutes(angle);
    setDragStart(minutes);
    setDragEnd(minutes);
    setIsDragging(true);
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!svgRef.current || !isDragging) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - center;
    const y = e.clientY - rect.top - center;
    const angle = (Math.atan2(y, x) * 180) / Math.PI + 90;
    const minutes = angleToMinutes(angle);
    setDragEnd(minutes);
  }, [isDragging, center]);

  const handleMouseUp = useCallback(() => {
    if (isDragging && dragStart !== null && dragEnd !== null) {
      let startMinutes = Math.min(dragStart, dragEnd);
      let endMinutes = Math.max(dragStart, dragEnd);

      // Handle wrapping around midnight
      if (endMinutes < startMinutes) {
        [startMinutes, endMinutes] = [endMinutes, startMinutes];
      }

      // Only create if dragged at least 5 minutes
      if (endMinutes - startMinutes >= 5) {
        const startTime = minutesToTimeString(startMinutes);
        const endTime = minutesToTimeString(endMinutes);
        onBlockCreated(startTime, endTime);
      }
    }

    setIsDragging(false);
    setDragStart(null);
    setDragEnd(null);
  }, [isDragging, dragStart, dragEnd, onBlockCreated]);

  // Render hour labels (24-hour clock: 12 AM top, 6 AM right, 12 PM bottom, 6 PM left)
  const renderHourLabels = () => {
    const labels = [];
    // Key positions: 0 (12 AM), 3, 6 (6 AM), 9, 12 (12 PM), 15, 18 (6 PM), 21
    const hoursToShow = [0, 3, 6, 9, 12, 15, 18, 21];

    for (const hour of hoursToShow) {
      const angle = (hour / 24) * 360;
      const angleRad = ((angle - 90) * Math.PI) / 180;
      const labelRadius = radius + 40;
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
      const x1 = center + (radius + 5) * Math.cos(angleRad);
      const y1 = center + (radius + 5) * Math.sin(angleRad);
      const x2 = center + (radius + 15) * Math.cos(angleRad);
      const y2 = center + (radius + 15) * Math.sin(angleRad);

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

      // Calculate label position
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
    if (!isDragging || dragStart === null || dragEnd === null) return null;

    const startMinutes = Math.min(dragStart, dragEnd);
    const endMinutes = Math.max(dragStart, dragEnd);
    const duration = endMinutes - startMinutes;

    if (duration < 5) return null;

    const startAngle = minutesToAngle(startMinutes);
    const endAngle = minutesToAngle(endMinutes);

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
      </g>
    );
  };

  return (
    <div className="flex-1 bg-gray-50 p-8 overflow-auto">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 flex items-center justify-center">
          <svg
            ref={svgRef}
            width={size}
            height={size}
            className="cursor-crosshair"
            onMouseDown={handleMouseDown}
            onMouseMove={isDragging ? (e) => handleMouseMove(e.nativeEvent) : undefined}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {/* Background circle */}
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="2"
            />
            <circle
              cx={center}
              cy={center}
              r={innerRadius}
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="2"
            />

            {/* Hour ticks */}
            {renderHourTicks()}

            {/* Time blocks */}
            {renderTimeBlocks()}

            {/* Drag preview */}
            {renderDragPreview()}

            {/* Hour labels */}
            {renderHourLabels()}

            {/* Center circle */}
            <circle cx={center} cy={center} r={60} fill="#f9fafb" stroke="#e5e7eb" strokeWidth="2" />
            <text
              x={center}
              y={center}
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-sm font-bold fill-gray-700"
            >
              24 Hours
            </text>
          </svg>
        </div>
      </div>
    </div>
  );
}
