import React, { useRef, useState } from 'react';
import {
  Chart as ReactChart,
} from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  PieController,
} from 'chart.js';
import Modal from 'react-modal';
import type { ChartOptions, TooltipItem } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend, PieController);
Modal.setAppElement('#root');

const generateTimeLabels = (increment: 15 | 30 | 60) => {
  const totalSlices = 24 * (60 / increment);
  return Array.from({ length: totalSlices }, (_, i) => {
    const totalMinutes = i * increment;
    const hours = Math.floor(totalMinutes / 60) % 24;
    const minutes = totalMinutes % 60;
    const hour12 = hours % 12 === 0 ? 12 : hours % 12;
    const suffix = hours < 12 ? 'AM' : 'PM';
    
    if (increment === 60) {
      return `${hour12}${suffix}`;
    } else {
      const minuteStr = minutes.toString().padStart(2, '0');
      return `${hour12}:${minuteStr}${suffix}`;
    }
  });
};

const ClockLabelsPlugin = {
  id: 'clockLabels',
  afterDraw(chart: ChartJS) {
    const { ctx, chartArea, width, height } = chart;
    const radius = Math.min(width, height) / 2.2;
    const centerX = chartArea.left + chartArea.width / 2;
    const centerY = chartArea.top + chartArea.height / 2;

    ctx.save();
    ctx.font = '12px sans-serif';
    ctx.fillStyle = 'black';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Always show 24 hour markers regardless of increment
    for (let i = 0; i < 24; i++) {
      const angle = (i / 24) * (2 * Math.PI) - Math.PI / 2;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      const hour = i % 12 === 0 ? 12 : i % 12;
      const suffix = i < 12 ? 'AM' : 'PM';
      ctx.fillText(`${hour}${suffix}`, x, y);
    }

    ctx.restore();
  },
};

const availableColors = [
  '#f87171', '#60a5fa', '#34d399', '#fbbf24', '#a78bfa',
  '#fb923c', '#a3e635', '#f472b6', '#38bdf8', '#c084fc',
];



export default function DayChart() {
  const chartRef = useRef<ChartJS<'pie'> | null>(null);

  type Slice = { color: string; label: string };
  const [timeIncrement, setTimeIncrement] = useState<15 | 30 | 60>(60); // minutes
  const totalSlices = 24 * (60 / timeIncrement); // 24, 48, or 96 slices
  const [slices, setSlices] = useState<Slice[]>(() => Array(totalSlices).fill(0).map(() => ({ color: '#e0e0e0', label: '' })));
  const [selectedColor, setSelectedColor] = useState(availableColors[0]);

  const [isDragging, setIsDragging] = useState(false);
  const [startIndex, setStartIndex] = useState<number | null>(null);
  const [endIndex, setEndIndex] = useState<number | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [labelInput, setLabelInput] = useState('');

  // Generate labels based on current increment
  const timeLabels = generateTimeLabels(timeIncrement);

  // Reset slices when increment changes
  React.useEffect(() => {
    const newTotalSlices = 24 * (60 / timeIncrement);
    setSlices(Array(newTotalSlices).fill(0).map(() => ({ color: '#e0e0e0', label: '' })));
    setStartIndex(null);
    setEndIndex(null);
  }, [timeIncrement]);

  // Helper function to convert slice index to time display
  const getTimeFromIndex = (index: number) => {
    const totalMinutes = index * timeIncrement;
    const hours = Math.floor(totalMinutes / 60) % 24;
    const minutes = totalMinutes % 60;
    const hour12 = hours % 12 === 0 ? 12 : hours % 12;
    const suffix = hours < 12 ? 'AM' : 'PM';
    
    if (minutes === 0) {
      return `${hour12}${suffix}`;
    } else {
      const minuteStr = minutes.toString().padStart(2, '0');
      return `${hour12}:${minuteStr}${suffix}`;
    }
  };

  // Helper function to calculate duration in a human-readable format
  const getDurationString = (sliceCount: number) => {
    const totalMinutes = sliceCount * timeIncrement;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    if (hours === 0) {
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    } else if (minutes === 0) {
      return `${hours} hour${hours !== 1 ? 's' : ''}`;
    } else {
      return `${hours} hour${hours !== 1 ? 's' : ''} ${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }
  };


  const getIndexFromEvent = (e: React.MouseEvent) => {
    if (!chartRef.current) return null;
    const nativeEvent = e.nativeEvent;
    const elements = chartRef.current.getElementsAtEventForMode(
      nativeEvent,
      'nearest',
      { intersect: true },
      false
    );
    return elements.length > 0 ? elements[0].index : null;
  };

  const getSelectedIndexes = () => {
    if (startIndex === null || endIndex === null) return [];
    if (startIndex <= endIndex) {
      return Array.from({ length: endIndex - startIndex + 1 }, (_, i) => startIndex + i);
    } else {
      return Array.from({ length: totalSlices - startIndex + endIndex + 1 }, (_, i) => (startIndex + i) % totalSlices);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const index = getIndexFromEvent(e);
    if (index !== null) {
      setIsDragging(true);
      setStartIndex(index);
      setEndIndex(index);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || startIndex === null) return;
    const index = getIndexFromEvent(e);
    if (index !== null && index !== endIndex) setEndIndex(index);
  };

  const handleMouseUp = () => {
    if (isDragging && startIndex !== null && endIndex !== null) {
      setIsDragging(false);
      setShowModal(true);
    }
  };

  const applyLabel = () => {
    const updated = [...slices];
    getSelectedIndexes().forEach((i) => {
      updated[i] = { color: selectedColor, label: labelInput };
    });
    setSlices(updated);
    setLabelInput('');
    setStartIndex(null);
    setEndIndex(null);
    setShowModal(false);
  };

  const currentColors = () => {
    const temp = [...slices];
    if (isDragging && startIndex !== null && endIndex !== null) {
      getSelectedIndexes().forEach((i) => {
        temp[i] = { ...temp[i], color: selectedColor };
      });
    }
    return temp.map((s) => s.color);
  };

  const data = {
    labels: timeLabels,
    datasets: [
      {
        data: Array(totalSlices).fill(1),
        backgroundColor: currentColors(),
        borderColor: '#ffffff',
        borderWidth: 1,
      },
    ],
  };

  const options: ChartOptions<'pie'> = {
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: TooltipItem<'pie'>) => {
            const label = slices[ctx.dataIndex].label;
            return label ? `${label} (${timeLabels[ctx.dataIndex]})` : timeLabels[ctx.dataIndex];
          },
        },
      },
    },
    layout: {
      padding: 40,
    },
  };

  const mergedGroupedLabels = () => {
    const rawGroups: { label: string; color: string; start: number; end: number }[] = [];
    for (let i = 0; i < totalSlices; i++) {
      const curr = slices[i];
      if (!curr || !curr.label) continue;
      if (
        rawGroups.length > 0 &&
        rawGroups[rawGroups.length - 1].label === curr.label &&
        rawGroups[rawGroups.length - 1].color === curr.color &&
        rawGroups[rawGroups.length - 1].end === i - 1
      ) {
        rawGroups[rawGroups.length - 1].end = i;
      } else {
        rawGroups.push({ label: curr.label, color: curr.color, start: i, end: i });
      }
    }
  
    const merged: Record<string, { label: string; color: string; ranges: [number, number][] }> = {};
  
    for (const group of rawGroups) {
      const key = `${group.label}__${group.color}`;
      if (!merged[key]) {
        merged[key] = { label: group.label, color: group.color, ranges: [] };
      }
      merged[key].ranges.push([group.start, group.end]);
    }
  
    // Merge adjacent/overlapping ranges
    const mergedWithCombining = Object.values(merged).map(({ label, color, ranges }) => {
      // Convert to sorted list of slice indices
      const allIndices = new Set<number>();
      for (const [start, end] of ranges) {
        if (start <= end) {
          for (let h = start; h <= end; h++) allIndices.add(h);
        } else {
          for (let h = start; h < totalSlices; h++) allIndices.add(h);
          for (let h = 0; h <= end; h++) allIndices.add(h);
        }
      }

      const sortedIndices = [...allIndices].sort((a, b) => a - b);
  
      // Group contiguous indices into new ranges
      const mergedRanges: [number, number][] = [];

      for (let i = 0; i < sortedIndices.length; ) {
        const start = sortedIndices[i];
        let end = start;
        while (i + 1 < sortedIndices.length && sortedIndices[i + 1] === (end + 1) % totalSlices) {
          end = sortedIndices[++i];
        }
        mergedRanges.push([start, end]);
        i++;
      }

      // SPECIAL CASE PATCH: if first = 0 and last = totalSlices-1 and contiguous, merge
      if (
        mergedRanges.length >= 2 &&
        mergedRanges[0][0] === 0 &&
        mergedRanges[mergedRanges.length - 1][1] === totalSlices - 1 &&
        (mergedRanges[0][0] === (mergedRanges[mergedRanges.length - 1][1] + 1) % totalSlices)
      ) {
        const [startA] = mergedRanges.pop()!;
        const [, endB] = mergedRanges.shift()!;
        mergedRanges.unshift([startA, endB]);
      }
  
      return { label, color, ranges: mergedRanges };
    });
  
    return mergedWithCombining;
  };  
  
  
  return (
    <div className="main-grid">
      <div className="chart-and-summary" onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}>
        <h2>🕒 DayChart</h2>
        <p style={{ marginTop: '-0.5rem', marginBottom: '1rem' }}>Choose a color, drag across the clock, and label your time</p>

        <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
          <span>Time increment:</span>
          <select 
            value={timeIncrement} 
            onChange={(e) => setTimeIncrement(parseInt(e.target.value) as 15 | 30 | 60)}
            style={{ padding: '0.25rem', fontSize: '1rem', borderRadius: '4px', border: '1px solid #ccc' }}
          >
            <option value={60}>1 hour</option>
            <option value={30}>30 minutes</option>
            <option value={15}>15 minutes</option>
          </select>
        </div>

        <div className="chart-container" onMouseDown={handleMouseDown}>
          <ReactChart
            type="pie"
            data={data}
            options={options}
            ref={chartRef}
            plugins={[ClockLabelsPlugin]}
          />
        </div>

        

        <div className="color-picker-column" >
          <h4>🎨 Select Color</h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center' }}>
            {availableColors.map((color) => (
              <button
                key={color}
                onClick={() => setSelectedColor(color)}
                style={{
                  backgroundColor: color,
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  border: selectedColor === color ? '3px solid black' : '1px solid #ccc',
                  cursor: 'pointer',
                }}
              />
            ))}
          </div>
        </div>

        <div className="legend" style={{ marginTop: '2rem' }}>
        {slices.length === totalSlices ? mergedGroupedLabels().map(({ label, color, ranges }, i) => (
          <div key={i} style={{ marginBottom: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ backgroundColor: color, width: 16, height: 16, borderRadius: 4 }}></div>
              <span>{label}:</span>
            </div>
            <ul style={{ marginLeft: '1.5rem', marginTop: '0.25rem' }}>
              {ranges.map(([start, end], j) => {
                const duration = start <= end ? end - start + 1 : totalSlices - start + end + 1;
                const endIndex = (end + 1) % totalSlices;
                return (
                  <li key={j}>
                    {getTimeFromIndex(start)} – {getTimeFromIndex(endIndex)} ({getDurationString(duration)})
                  </li>
        );
      })}
    </ul>
  </div>
)) : null}

        </div>
      </div>

      <Modal
        isOpen={showModal}
        onRequestClose={() => setShowModal(false)}
        contentLabel="Add Label"
        style={{ content: { maxWidth: '400px', margin: 'auto', padding: '2rem', borderRadius: '10px', height: '150px' } }}
      >
        <h3>Label selected hours</h3>
        <input
          type="text"
          value={labelInput}
          onChange={(e) => setLabelInput(e.target.value)}
          placeholder="e.g. Work, Gym, Nap"
        />
        <button onClick={applyLabel}>Save</button>
        <button onClick={() => setShowModal(false)} style={{ marginLeft: '1rem' }}>Cancel</button>
      </Modal>
    </div>
  );
}
