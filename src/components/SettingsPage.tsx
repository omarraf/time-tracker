import { useState, useEffect } from 'react';
import type { User } from 'firebase/auth';
import type { Schedule } from '../types/schedule';
import { getUserSchedules } from '../services/scheduleService';
import Footer from './Footer';

interface SettingsPageProps {
  user: User;
  timeBlocks: never[]; // Deprecated, keeping for compatibility
  currentScheduleName?: string; // Deprecated, keeping for compatibility
}

export default function SettingsPage({ user }: SettingsPageProps) {
  const [allSchedules, setAllSchedules] = useState<Schedule[]>([]);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>('');

  // Load all schedules
  useEffect(() => {
    const loadSchedules = async () => {
      try {
        const schedules = await getUserSchedules(user.uid);
        setAllSchedules(schedules);
        if (schedules.length > 0) {
          setSelectedScheduleId(schedules[0].id);
        }
      } catch (error) {
        console.error('Error loading schedules:', error);
      }
    };
    loadSchedules();
  }, [user.uid]);

  const selectedSchedule = allSchedules.find(s => s.id === selectedScheduleId);

  // Export as JSON
  const handleExportJSON = () => {
    if (!selectedSchedule) return;

    const exportData = {
      scheduleName: selectedSchedule.name,
      exportDate: new Date().toISOString().split('T')[0],
      timeBlocks: selectedSchedule.timeBlocks.map(({ label, startTime, endTime, color }) => ({
        label,
        startTime,
        endTime,
        color,
      })),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedSchedule.name}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Export as CSV
  const handleExportCSV = () => {
    if (!selectedSchedule) return;

    const headers = ['Label', 'Start Time', 'End Time', 'Duration (hours)', 'Color'];
    const rows = selectedSchedule.timeBlocks.map(block => {
      const [startHour, startMin] = block.startTime.split(':').map(Number);
      const [endHour, endMin] = block.endTime.split(':').map(Number);
      const duration = ((endHour * 60 + endMin) - (startHour * 60 + startMin)) / 60;

      return [
        block.label,
        block.startTime,
        block.endTime,
        duration.toFixed(2),
        block.color,
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedSchedule.name}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Export all schedules as JSON
  const handleExportAllJSON = () => {
    if (allSchedules.length === 0) return;

    const exportData = {
      exportDate: new Date().toISOString().split('T')[0],
      totalSchedules: allSchedules.length,
      schedules: allSchedules.map(schedule => ({
        name: schedule.name,
        timeBlocks: schedule.timeBlocks.map(({ label, startTime, endTime, color }) => ({
          label,
          startTime,
          endTime,
          color,
        })),
      })),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `all-schedules-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };


  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-8">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Profile Section */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Profile
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <div className="px-4 py-2.5 bg-gray-50 rounded-lg border border-gray-200 text-gray-900">
                {user.email}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Account Created</label>
              <div className="px-4 py-2.5 bg-gray-50 rounded-lg border border-gray-200 text-gray-900">
                {user.metadata.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString() : 'Unknown'}
              </div>
            </div>
          </div>
        </section>

        {/* Export Section */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
            </svg>
            Export Schedule
          </h3>

          <p className="text-sm text-gray-600 mb-4">
            Select a schedule to export in different formats
          </p>

          {/* Schedule Selector */}
          {allSchedules.length > 0 ? (
            <>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Choose Schedule</label>
                <select
                  value={selectedScheduleId}
                  onChange={(e) => setSelectedScheduleId(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {allSchedules.map(schedule => (
                    <option key={schedule.id} value={schedule.id}>
                      {schedule.name} ({schedule.timeBlocks.length} blocks)
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-3">
                <button
                  onClick={handleExportJSON}
                  disabled={!selectedSchedule || selectedSchedule.timeBlocks.length === 0}
                  className="w-full px-4 py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between group"
                >
                  <span className="flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Export as JSON
                  </span>
                  <span className="text-xs text-blue-600 group-hover:text-blue-700">Best for backup & re-import</span>
                </button>

                <button
                  onClick={handleExportCSV}
                  disabled={!selectedSchedule || selectedSchedule.timeBlocks.length === 0}
                  className="w-full px-4 py-3 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between group"
                >
                  <span className="flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Export as CSV
                  </span>
                  <span className="text-xs text-green-600 group-hover:text-green-700">Open in Excel/Sheets</span>
                </button>

                {/* Divider */}
                <div className="relative my-2">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200"></div>
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="px-2 bg-white text-gray-500">or export all</span>
                  </div>
                </div>

                {/* Export All Schedules */}
                <button
                  onClick={handleExportAllJSON}
                  disabled={allSchedules.length === 0}
                  className="w-full px-4 py-3 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between group"
                >
                  <span className="flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Export All Schedules
                  </span>
                  <span className="text-xs text-purple-600 group-hover:text-purple-700">
                    {allSchedules.length} schedule{allSchedules.length !== 1 ? 's' : ''}
                  </span>
                </button>

                {selectedSchedule && selectedSchedule.timeBlocks.length === 0 && (
                  <p className="text-xs text-gray-500 mt-2">
                    This schedule is empty. Add some time blocks before exporting.
                  </p>
                )}
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-500">
              No schedules available. Create a schedule to export.
            </p>
          )}
        </section>

      </div>
      <Footer />
    </div>
  );
}
