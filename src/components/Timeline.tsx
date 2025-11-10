import { useRef, useState, useEffect, useCallback } from 'react';
import type { TimeBlock } from '../types/schedule';
import {
  minutesToTimeString,
  timeStringToMinutes,
  calculateDuration,
  formatDuration,
  snapToFiveMinutes,
  sortTimeBlocks,
  formatHourTo12Hour,
} from '../utils/timeUtils';

interface TimelineProps {
  timeBlocks: TimeBlock[];
  onBlockCreated: (startTime: string, endTime: string) => void;
  onBlockClick: (block: TimeBlock) => void;
}

export default function Timeline({
  timeBlocks,
  onBlockCreated,
  onBlockClick,
}: TimelineProps) {
  const timelineRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<number | null>(null);
  const [dragEnd, setDragEnd] = useState<number | null>(null);

  // Convert pixel position to time in minutes
  const pixelToMinutes = (pixelY: number): number => {
    if (!timelineRef.current) return 0;
    const rect = timelineRef.current.getBoundingClientRect();
    const relativeY = pixelY - rect.top;
    const percentage = relativeY / rect.height;
    const minutes = Math.max(0, Math.min(1439, percentage * (24 * 60)));
    return snapToFiveMinutes(minutes);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const minutes = pixelToMinutes(e.clientY);
    setDragStart(minutes);
    setDragEnd(minutes);
    setIsDragging(true);
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!timelineRef.current) return;
    const minutes = pixelToMinutes(e.clientY);
    setDragEnd(minutes);
  }, []);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDragStart(prev => {
      setDragEnd(end => {
        if (prev !== null && end !== null) {
          const startMinutes = Math.min(prev, end);
          const endMinutes = Math.max(prev, end);

          // Only create if dragged at least 5 minutes
          if (endMinutes - startMinutes >= 5) {
            const startTime = minutesToTimeString(startMinutes);
            const endTime = minutesToTimeString(endMinutes);
            onBlockCreated(startTime, endTime);
          }
        }
        return null;
      });
      return null;
    });
  }, [onBlockCreated]);

  // Add global mouse listeners for dragging
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Render hour markers
  const renderHourMarkers = () => {
    const markers = [];
    for (let hour = 0; hour < 24; hour++) {
      const minutes = hour * 60;
      const top = (minutes / (24 * 60)) * 100;

      markers.push(
        <div
          key={hour}
          className="absolute left-0 right-0 border-t border-gray-200"
          style={{ top: `${top}%` }}
        >
          <span className="absolute -left-14 -top-2 text-xs text-gray-500 font-medium whitespace-nowrap">
            {formatHourTo12Hour(hour)}
          </span>
        </div>
      );
    }
    return markers;
  };

  // Render existing time blocks
  const renderTimeBlocks = () => {
    return sortTimeBlocks(timeBlocks).map((block) => {
      const startMinutes = timeStringToMinutes(block.startTime);
      const duration = calculateDuration(block.startTime, block.endTime);
      const top = (startMinutes / (24 * 60)) * 100;
      const height = (duration / (24 * 60)) * 100;

      return (
        <div
          key={block.id}
          className="absolute left-14 right-4 rounded-lg cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] group"
          style={{
            top: `${top}%`,
            height: `${height}%`,
            backgroundColor: block.color,
            minHeight: '20px',
          }}
          onClick={() => onBlockClick(block)}
        >
          <div className="px-3 py-2 text-white font-medium text-sm">
            <div className="flex items-center justify-between">
              <span className="truncate">{block.label}</span>
              <span className="text-xs opacity-75">
                {formatDuration(duration)}
              </span>
            </div>
            <div className="text-xs opacity-75 mt-0.5">
              {block.startTime} - {block.endTime}
            </div>
          </div>
        </div>
      );
    });
  };

  // Render dragging preview
  const renderDragPreview = () => {
    if (!isDragging || dragStart === null || dragEnd === null) return null;

    const startMinutes = Math.min(dragStart, dragEnd);
    const endMinutes = Math.max(dragStart, dragEnd);
    const duration = endMinutes - startMinutes;
    const top = (startMinutes / (24 * 60)) * 100;
    const height = (duration / (24 * 60)) * 100;

    return (
      <div
        className="absolute left-14 right-4 rounded-lg border-2 border-dashed border-gray-400 pointer-events-none bg-gradient-to-r from-blue-100 to-purple-100"
        style={{
          top: `${top}%`,
          height: `${height}%`,
          opacity: 0.7,
        }}
      >
        <div className="px-3 py-2 text-gray-700 font-medium text-sm">
          <div className="text-xs">
            {minutesToTimeString(startMinutes)} - {minutesToTimeString(endMinutes)}
          </div>
          <div className="text-xs opacity-75">
            {formatDuration(duration)}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 bg-gray-50 p-8 overflow-auto">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Timeline View
          </h3>
          <p className="text-sm text-gray-600 mb-6">
            Drag on the timeline to create time blocks (5-minute intervals)
          </p>

          {/* Timeline Container */}
          <div className="relative pl-16">
            <div
              ref={timelineRef}
              className="relative bg-white border-2 border-gray-300 rounded-lg cursor-crosshair"
              style={{ height: '1440px' }} // 1px per minute (24hr * 60min)
              onMouseDown={handleMouseDown}
            >
              {renderHourMarkers()}
              {renderTimeBlocks()}
              {renderDragPreview()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
