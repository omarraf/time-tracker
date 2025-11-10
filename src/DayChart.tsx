import { useRef, useState, useEffect, useCallback } from 'react';
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
import { auth, isFirebaseConfigured } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import type { User } from 'firebase/auth';
import {
  saveSchedule,
  updateSchedule,
  getDefaultSchedule,
  getUserSchedules,
  deleteSchedule,
  setDefaultSchedule,
  type Slice as FirestoreSlice,
  type Schedule,
} from './firestore';

ChartJS.register(ArcElement, Tooltip, Legend, PieController);
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

  // Firebase state
  const [user, setUser] = useState<User | null>(null);
  const [currentScheduleId, setCurrentScheduleId] = useState<string | null>(null);
  const [userSchedules, setUserSchedules] = useState<Schedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error' | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [newScheduleName, setNewScheduleName] = useState('');

  // Load user's schedules on auth change
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setIsLoading(true);

      if (currentUser) {
        try {
          // Load all user schedules
          const schedules = await getUserSchedules(currentUser.uid);
          setUserSchedules(schedules);

          // Load default schedule
          const defaultSchedule = await getDefaultSchedule(currentUser.uid);
          if (defaultSchedule) {
            setSlices(defaultSchedule.slices as Slice[]);
            setCurrentScheduleId(defaultSchedule.id);
          }
        } catch (error) {
          console.error('Error loading schedules:', error);
        }
      } else {
        // User logged out - reset to empty schedule
        setSlices(Array(24).fill({ color: '#e0e0e0', label: '' }));
        setCurrentScheduleId(null);
        setUserSchedules([]);
      }

      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Auto-save function with debouncing
  const saveCurrentSchedule = useCallback(async (slicesToSave: Slice[]) => {
    if (!user || isSaving) return;

    setIsSaving(true);
    setSaveStatus('saving');

    try {
      const scheduleData = {
        name: 'My Schedule',
        slices: slicesToSave as FirestoreSlice[],
        isDefault: true,
      };

      if (currentScheduleId) {
        // Update existing schedule
        await updateSchedule(currentScheduleId, user.uid, scheduleData);
      } else {
        // Create new schedule
        const newId = await saveSchedule(user.uid, scheduleData);
        setCurrentScheduleId(newId);
      }

      setSaveStatus('saved');
      setTimeout(() => setSaveStatus(null), 2000);
    } catch (error) {
      console.error('Error saving schedule:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus(null), 3000);
    } finally {
      setIsSaving(false);
    }
  }, [user, currentScheduleId, isSaving]);

  // Auto-save when slices change (with debounce)
  useEffect(() => {
    if (!user || isLoading) return;

    const timeoutId = setTimeout(() => {
      saveCurrentSchedule(slices);
    }, 1000); // 1 second debounce

    return () => clearTimeout(timeoutId);
  }, [slices, user, isLoading, saveCurrentSchedule]);

  // Schedule management functions
  const createNewSchedule = async () => {
    if (!user || !newScheduleName.trim()) return;

    try {
      const scheduleData = {
        name: newScheduleName.trim(),
        slices: Array(24).fill({ color: '#e0e0e0', label: '' }),
        isDefault: false,
      };

      await saveSchedule(user.uid, scheduleData);
      const updatedSchedules = await getUserSchedules(user.uid);
      setUserSchedules(updatedSchedules);
      setNewScheduleName('');
      setShowScheduleModal(false);
    } catch (error) {
      console.error('Error creating schedule:', error);
    }
  };

  const switchSchedule = async (scheduleId: string) => {
    if (!user) return;

    const schedule = userSchedules.find(s => s.id === scheduleId);
    if (schedule) {
      setSlices(schedule.slices as Slice[]);
      setCurrentScheduleId(schedule.id);

      // Set as default
      try {
        await setDefaultSchedule(scheduleId, user.uid);
        const updatedSchedules = await getUserSchedules(user.uid);
        setUserSchedules(updatedSchedules);
      } catch (error) {
        console.error('Error setting default schedule:', error);
      }
    }
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    if (!user) return;

    if (!confirm('Are you sure you want to delete this schedule?')) return;

    try {
      await deleteSchedule(scheduleId, user.uid);
      const updatedSchedules = await getUserSchedules(user.uid);
      setUserSchedules(updatedSchedules);

      // If we deleted the current schedule, load another one
      if (scheduleId === currentScheduleId) {
        if (updatedSchedules.length > 0) {
          const firstSchedule = updatedSchedules[0];
          setSlices(firstSchedule.slices as Slice[]);
          setCurrentScheduleId(firstSchedule.id);
          await setDefaultSchedule(firstSchedule.id, user.uid);
        } else {
          // No schedules left - reset
          setSlices(Array(24).fill({ color: '#e0e0e0', label: '' }));
          setCurrentScheduleId(null);
        }
      }
    } catch (error) {
      console.error('Error deleting schedule:', error);
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
      return Array.from({ length: 24 - startIndex + endIndex + 1 }, (_, i) => (startIndex + i) % 24);
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

  const mergedGroupedLabels = () => {
    const rawGroups: { label: string; color: string; start: number; end: number }[] = [];
    for (let i = 0; i < 24; i++) {
      const curr = slices[i];
      if (!curr.label) continue;
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
      // Convert to sorted list of hours
      const allHours = new Set<number>();
      for (const [start, end] of ranges) {
        if (start <= end) {
          for (let h = start; h <= end; h++) allHours.add(h);
        } else {
          for (let h = start; h < 24; h++) allHours.add(h);
          for (let h = 0; h <= end; h++) allHours.add(h);
        }
      }
  
      const sortedHours = [...allHours].sort((a, b) => a - b);
  
      // Group contiguous hours into new ranges
      const mergedRanges: [number, number][] = [];

for (let i = 0; i < sortedHours.length; ) {
  const start = sortedHours[i];
  let end = start;
  while (i + 1 < sortedHours.length && sortedHours[i + 1] === (end + 1) % 24) {
    end = sortedHours[++i];
  }
  mergedRanges.push([start, end]);
  i++;
}

// SPECIAL CASE PATCH: if first = 0 and last = 23 and contiguous, merge
if (
  mergedRanges.length >= 2 &&
  mergedRanges[0][0] === 0 &&
  mergedRanges[mergedRanges.length - 1][1] === 23 &&
  (mergedRanges[0][0] === (mergedRanges[mergedRanges.length - 1][1] + 1) % 24)
) {
  const [startA] = mergedRanges.pop()!;
  const [, endB] = mergedRanges.shift()!;
  mergedRanges.unshift([startA, endB]);
}
  
      return { label, color, ranges: mergedRanges };
    });
  
    return mergedWithCombining;
  };  
  
  
  if (isLoading) {
    return (
      <div className="main-grid">
        <div className="chart-and-summary">
          <h2>🕒 DayChart</h2>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="main-grid">
      <div className="chart-and-summary" onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}>
        {!isFirebaseConfigured && (
          <div className="mb-6 px-6 py-4 bg-amber-50 border-2 border-amber-300 rounded-xl text-center">
            <p className="text-amber-900 font-semibold mb-2">⚠️ Firebase Not Configured</p>
            <p className="text-sm text-amber-800 mb-2">
              Your schedules won't be saved. To enable authentication and data persistence:
            </p>
            <ol className="text-xs text-left text-amber-800 max-w-lg mx-auto space-y-1">
              <li>1. Copy <code className="bg-amber-100 px-1 rounded">.env.example</code> to <code className="bg-amber-100 px-1 rounded">.env</code></li>
              <li>2. Get Firebase credentials from <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Firebase Console</a></li>
              <li>3. Add your credentials to <code className="bg-amber-100 px-1 rounded">.env</code></li>
              <li>4. Restart the dev server</li>
            </ol>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
          <h2>🕒 DayChart</h2>
          {user && saveStatus && (
            <span style={{
              fontSize: '0.875rem',
              padding: '0.25rem 0.75rem',
              borderRadius: '12px',
              backgroundColor: saveStatus === 'saved' ? '#d1fae5' : saveStatus === 'saving' ? '#dbeafe' : '#fee2e2',
              color: saveStatus === 'saved' ? '#065f46' : saveStatus === 'saving' ? '#1e40af' : '#991b1b',
              fontWeight: 500,
            }}>
              {saveStatus === 'saved' ? '✓ Saved' : saveStatus === 'saving' ? '↻ Saving...' : '✕ Error'}
            </span>
          )}
        </div>
        <p style={{ marginTop: '-0.5rem', marginBottom: '1.5rem' }}>
          Choose a color, drag across the clock, and label your time
          {user && <span style={{ display: 'block', fontSize: '0.75rem', color: '#666', marginTop: '0.25rem' }}>
            Auto-save enabled
          </span>}
        </p>

        {user && userSchedules.length > 0 && (
          <div className="mb-6 flex flex-col items-center gap-3">
            <div className="flex items-center gap-2 flex-wrap justify-center">
              {userSchedules.map((schedule) => (
                <div key={schedule.id} className="flex items-center gap-1">
                  <button
                    onClick={() => switchSchedule(schedule.id)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      schedule.id === currentScheduleId
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {schedule.name} {schedule.isDefault && '⭐'}
                  </button>
                  {userSchedules.length > 1 && (
                    <button
                      onClick={() => handleDeleteSchedule(schedule.id)}
                      className="px-2 py-2 bg-red-100 text-red-600 rounded-lg text-xs hover:bg-red-200 transition-colors"
                      title="Delete schedule"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={() => setShowScheduleModal(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
              >
                + New Schedule
              </button>
            </div>
          </div>
        )}

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
        {mergedGroupedLabels().map(({ label, color, ranges }, i) => (
          <div key={i} style={{ marginBottom: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ backgroundColor: color, width: 16, height: 16, borderRadius: 4 }}></div>
              <span>{label}:</span>
            </div>
            <ul style={{ marginLeft: '1.5rem', marginTop: '0.25rem' }}>
              {ranges.map(([start, end], j) => {
                const duration = start <= end ? end - start + 1 : 24 - start + end + 1;
                return (
                  <li key={j}>
                    {hours[start]} – {hours[(end + 1) % 24]} ({duration} hour{duration > 1 ? 's' : ''})
                  </li>
        );
      })}
    </ul>
  </div>
))}

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

      <Modal
        isOpen={showScheduleModal}
        onRequestClose={() => {
          setShowScheduleModal(false);
          setNewScheduleName('');
        }}
        contentLabel="Create New Schedule"
        style={{
          content: {
            maxWidth: '400px',
            margin: 'auto',
            padding: '2rem',
            borderRadius: '16px',
            height: 'auto',
            border: 'none',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
          },
        }}
      >
        <h3 className="text-xl font-bold text-gray-900 mb-4">Create New Schedule</h3>
        <input
          type="text"
          value={newScheduleName}
          onChange={(e) => setNewScheduleName(e.target.value)}
          placeholder="Schedule name (e.g., Weekday, Weekend)"
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg mb-4 focus:border-blue-500 focus:outline-none transition-colors"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && newScheduleName.trim()) {
              createNewSchedule();
            }
          }}
        />
        <div className="flex gap-2">
          <button
            onClick={createNewSchedule}
            disabled={!newScheduleName.trim()}
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Create
          </button>
          <button
            onClick={() => {
              setShowScheduleModal(false);
              setNewScheduleName('');
            }}
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
        </div>
      </Modal>
    </div>
  );
}
