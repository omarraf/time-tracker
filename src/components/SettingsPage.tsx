import { useState } from 'react';
import type { User } from 'firebase/auth';
import type { TimeBlock } from '../types/schedule';
import { deleteUserAccount } from '../services/userService';

interface SettingsPageProps {
  user: User;
  timeBlocks: TimeBlock[];
  currentScheduleName?: string;
}

export default function SettingsPage({ user, timeBlocks, currentScheduleName }: SettingsPageProps) {
  const [deleteConfirmation, setDeleteConfirmation] = useState('');

  // Export as JSON
  const handleExportJSON = () => {
    const exportData = {
      scheduleName: currentScheduleName || 'My Schedule',
      exportDate: new Date().toISOString().split('T')[0],
      timeBlocks: timeBlocks.map(({ label, startTime, endTime, color }) => ({
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
    a.download = `${currentScheduleName || 'schedule'}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Export as CSV
  const handleExportCSV = () => {
    const headers = ['Label', 'Start Time', 'End Time', 'Duration (hours)', 'Color'];
    const rows = timeBlocks.map(block => {
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
    a.download = `${currentScheduleName || 'schedule'}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Handle account deletion
  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'DELETE') {
      alert('Please type DELETE to confirm account deletion');
      return;
    }

    if (!confirm('This will permanently delete your account and all your schedules. This action cannot be undone. Continue?')) {
      return;
    }

    try {
      await deleteUserAccount(user);
      // User will be signed out automatically
    } catch (error) {
      console.error('Error deleting account:', error);
      alert('Failed to delete account. Please try again or contact support.');
    }
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
              <label className="block text-sm font-medium text-gray-700 mb-1">User ID</label>
              <div className="px-4 py-2.5 bg-gray-50 rounded-lg border border-gray-200 text-gray-600 font-mono text-xs break-all">
                {user.uid}
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
            Download your current schedule in different formats
          </p>

          <div className="space-y-3">
            <button
              onClick={handleExportJSON}
              disabled={timeBlocks.length === 0}
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
              disabled={timeBlocks.length === 0}
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

            {timeBlocks.length === 0 && (
              <p className="text-xs text-gray-500 mt-2">
                Add some time blocks to your schedule before exporting
              </p>
            )}
          </div>
        </section>

        {/* Privacy & Data Section */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Privacy & Data
          </h3>

          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h4 className="font-medium text-gray-900 mb-2 text-sm">Your Data</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">✓</span>
                  <span>All schedules are stored securely in Firebase</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">✓</span>
                  <span>Your data is private and only accessible to you</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">✓</span>
                  <span>We don't share your data with third parties</span>
                </li>
              </ul>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <h4 className="font-medium text-gray-900 mb-2 text-sm">Delete Account</h4>
              <p className="text-sm text-gray-600 mb-3">
                Permanently delete your account and all associated schedules. This action cannot be undone.
              </p>

              <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                <label className="block text-sm font-medium text-red-900 mb-2">
                  Type <span className="font-mono font-bold">DELETE</span> to confirm:
                </label>
                <input
                  type="text"
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  placeholder="DELETE"
                  className="w-full px-3 py-2 border border-red-300 rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirmation !== 'DELETE'}
                  className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Delete My Account
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
