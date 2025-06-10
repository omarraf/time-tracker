import { useRef, useState } from 'react';
import {
  Chart as ReactChart,
} from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import Modal from 'react-modal';
import type { ChartOptions, TooltipItem } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);
Modal.setAppElement('#root');

const hours = Array.from({ length: 24 }, (_, i) => {
  const hour = i % 12 === 0 ? 12 : i % 12;
  const suffix = i < 12 ? 'AM' : 'PM';
  return `${hour}${suffix}`;
});

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

    for (let i = 0; i < 24; i++) {
      const angle = (i / 24) * (2 * Math.PI) - Math.PI / 2;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      ctx.fillText(hours[i], x, y);
    }

    ctx.restore();
  },
};

const availableColors = [
  '#f87171', '#60a5fa', '#34d399', '#fbbf24', '#a78bfa',
  '#fb923c', '#a3e635', '#f472b6', '#38bdf8', '#c084fc',
];

const emojiOptions = ['😴', '🎧', '💻', '🏋️‍♂️', '🏀', '📚'];

export default function DayChart() {
  const chartRef = useRef<ChartJS<'pie'> | null>(null);

  type Slice = { color: string; label: string };
  const [slices, setSlices] = useState<Slice[]>(Array(24).fill({ color: '#e0e0e0', label: '' }));
  const [selectedColor, setSelectedColor] = useState(availableColors[0]);

  const [isDragging, setIsDragging] = useState(false);
  const [startIndex, setStartIndex] = useState<number | null>(null);
  const [endIndex, setEndIndex] = useState<number | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [labelInput, setLabelInput] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('');


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
      // Wrap around midnight
      return [
        ...Array.from({ length: 24 - startIndex }, (_, i) => startIndex + i),
        ...Array.from({ length: endIndex + 1 }, (_, i) => i),
      ];
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
    labels: hours,
    datasets: [
      {
        data: Array(24).fill(1),
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
            return label ? `${label} (${hours[ctx.dataIndex]})` : hours[ctx.dataIndex];
          },
        },
      },
    },
    layout: {
      padding: 40,
    },
  };

  const groupedLabels = () => {
    const result: { label: string; color: string; start: number; end: number }[] = [];
    for (let i = 0; i < 24; i++) {
      const curr = slices[i];
      if (!curr.label) continue;
      if (
        result.length > 0 &&
        result[result.length - 1].label === curr.label &&
        result[result.length - 1].color === curr.color &&
        result[result.length - 1].end === i - 1
      ) {
        result[result.length - 1].end = i;
      } else {
        result.push({ label: curr.label, color: curr.color, start: i, end: i });
      }
    }
    return result;
  };
  const getHourDuration = (start: number, end: number) => {
    if (start <= end) {
      return end - start + 1; // inclusive range
    } else {
      return 24 - start + end + 1;
    }
  };
  
  return (
    <div className="main-grid">
      <div className="chart-and-summary" onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}>
        <h2>🕒 Daily Time Tracker</h2>
        <p style={{ marginTop: '-0.5rem', marginBottom: '1.5rem' }}>Choose a color, drag across the clock, and label your time</p>

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
        {groupedLabels().map(({ label, color, start, end }, i) => {
          const duration = getHourDuration(start, end);
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <div style={{ backgroundColor: color, width: 16, height: 16, borderRadius: 4 }}></div>
              <span>{label}: {hours[start]} – {hours[end]} ({duration} hour{duration > 1 ? 's' : ''})</span>
            </div>
          );
          })}
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
