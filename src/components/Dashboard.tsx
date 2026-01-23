import { useState, useEffect, useRef } from 'react';
import { auth, isFirebaseConfigured } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import type { User } from 'firebase/auth';
import Sidebar from './Sidebar';
import Timeline from './Timeline';
import CircularChart from './CircularChart';
import LabelModal from './LabelModal';
import SchedulesPage from './SchedulesPage';
import SettingsPage from './SettingsPage';
import AuthButtons from './AuthButtons';
import type { NavRoute, TimeBlock } from '../types/schedule';
import {
  saveSchedule,
  updateSchedule,
  getDefaultSchedule,
  getSchedule,
} from '../services/scheduleService';
import { validateTimeBlock, sortTimeBlocks } from '../utils/timeUtils';

const availableColors = [
  '#f87171', '#60a5fa', '#34d399', '#fbbf24', '#a78bfa',
  '#fb923c', '#a3e635', '#f472b6', '#38bdf8', '#c084fc',
];

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [currentRoute, setCurrentRoute] = useState<NavRoute>('dashboard');
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error' | null>(null);
  const [viewMode, setViewMode] = useState<'linear' | 'circular'>('linear');

  // Modal state
  const [showLabelModal, setShowLabelModal] = useState(false);
  const [pendingBlock, setPendingBlock] = useState<{ startTime: string; endTime: string } | null>(null);
  const [editingBlock, setEditingBlock] = useState<TimeBlock | null>(null);

  // Current schedule
  const [currentScheduleId, setCurrentScheduleId] = useState<string | null>(null);
  const [currentScheduleName, setCurrentScheduleName] = useState<string>('My Schedule');

  // Ref to track if we're currently saving
  const savingRef = useRef(false);

  // Load user's default schedule on auth change
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setIsLoading(true);

      if (currentUser) {
        try {
          const defaultSchedule = await getDefaultSchedule(currentUser.uid);
          if (defaultSchedule) {
            setTimeBlocks(defaultSchedule.timeBlocks);
            setCurrentScheduleId(defaultSchedule.id);
            setCurrentScheduleName(defaultSchedule.name);
          }
        } catch (error) {
          console.error('Error loading schedules:', error);
        }
      } else {
        setTimeBlocks([]);
        setCurrentScheduleId(null);
        setCurrentScheduleName('My Schedule');
      }

      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Manual save function
  const handleSaveSchedule = async () => {
    if (!user || savingRef.current) return;

    // Prompt for schedule title
    const scheduleName = prompt('Enter a title for this schedule:', 'My Schedule');

    // If user cancels, don't save
    if (!scheduleName) return;

    savingRef.current = true;
    setSaveStatus('saving');

    try {
      const scheduleData = {
        name: scheduleName.trim() || 'My Schedule',
        timeBlocks: timeBlocks,
        isDefault: true,
      };

      if (currentScheduleId) {
        await updateSchedule(currentScheduleId, user.uid, scheduleData);
      } else {
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
      savingRef.current = false;
    }
  };

  // Handle block creation from timeline
  const handleBlockCreated = (startTime: string, endTime: string) => {
    // Validate no overlaps
    const validation = validateTimeBlock({ startTime, endTime }, timeBlocks);

    if (!validation.valid) {
      alert(validation.message);
      return;
    }

    setPendingBlock({ startTime, endTime });
    setShowLabelModal(true);
  };

  // Save the labeled block (create or edit)
  const handleSaveBlock = (label: string, color: string) => {
    if (editingBlock) {
      // Edit existing block
      setTimeBlocks(prev =>
        prev.map(b =>
          b.id === editingBlock.id
            ? { ...b, label, color }
            : b
        )
      );
      setEditingBlock(null);
    } else if (pendingBlock) {
      // Create new block
      const newBlock: TimeBlock = {
        id: crypto.randomUUID(),
        startTime: pendingBlock.startTime,
        endTime: pendingBlock.endTime,
        label,
        color,
        order: timeBlocks.length,
      };
      setTimeBlocks(prev => sortTimeBlocks([...prev, newBlock]));
      setPendingBlock(null);
    }
    setShowLabelModal(false);
  };

  // Handle block deletion
  const handleDeleteBlock = () => {
    if (editingBlock) {
      setTimeBlocks(prev => prev.filter(b => b.id !== editingBlock.id));
      setEditingBlock(null);
      setShowLabelModal(false);
    }
  };

  // Handle block click (for editing)
  const handleBlockClick = (block: TimeBlock) => {
    setEditingBlock(block);
    setShowLabelModal(true);
  };

  // Handle schedule switching
  const handleScheduleSelect = async (scheduleId: string) => {
    if (!user) return;

    try {
      const schedule = await getSchedule(scheduleId, user.uid);
      if (schedule) {
        setTimeBlocks(schedule.timeBlocks);
        setCurrentScheduleId(schedule.id);
        setCurrentScheduleName(schedule.name);
        setCurrentRoute('dashboard'); // Navigate back to dashboard
      }
    } catch (error) {
      console.error('Error loading schedule:', error);
      alert('Failed to load schedule');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Landing page for non-authenticated users
  if (!user) {
    return (
      <div className="flex h-screen overflow-hidden bg-gradient-to-br from-gray-50 via-white to-gray-50">
        <AuthButtons />
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="max-w-3xl">
            <div className="text-center mb-12">
              <h1 className="text-7xl font-black text-gray-900 mb-4 tracking-tight">
                DayChart
              </h1>
              <p className="text-xl text-gray-600">
                Visual time management reimagined
              </p>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-12">
              <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Flexible Views</h3>
                <p className="text-sm text-gray-600">Linear or circular timeline with customizable start times</p>
              </div>

              <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Drag to Create</h3>
                <p className="text-sm text-gray-600">Simply drag on the timeline to create time blocks instantly</p>
              </div>

              <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Multiple Schedules</h3>
                <p className="text-sm text-gray-600">Create and manage different schedules for work, personal, and more</p>
              </div>

              <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Auto-Save</h3>
                <p className="text-sm text-gray-600">Your schedules automatically sync across all your devices</p>
              </div>
            </div>

            {!isFirebaseConfigured && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 text-center">
                <p className="text-sm text-amber-800">
                  Firebase not configured. Add your config to enable authentication.
                </p>
              </div>
            )}

            <div className="text-center">
              <p className="text-gray-600">Get started by signing in above</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <Sidebar
        currentRoute={currentRoute}
        onNavigate={setCurrentRoute}
        userEmail={user?.email}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-4 sm:px-8 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                {currentRoute === 'dashboard' && 'Analytics'}
                {currentRoute === 'schedules' && 'My Schedules'}
                {currentRoute === 'settings' && 'Settings'}
              </h2>
              {user && saveStatus && (
                <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                  {saveStatus === 'saved' && (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                      <span className="text-green-600 font-medium">Saved</span>
                    </>
                  )}
                  {saveStatus === 'saving' && (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                      <span className="text-blue-600 font-medium">Saving...</span>
                    </>
                  )}
                  {saveStatus === 'error' && (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                      <span className="text-red-600 font-medium">Error saving</span>
                    </>
                  )}
                </p>
              )}
            </div>

            {/* Controls */}
            {currentRoute === 'dashboard' && (
              <div className="flex items-center gap-3 flex-shrink-0">
                {/* Save Button */}
                <button
                  onClick={handleSaveSchedule}
                  disabled={savingRef.current}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savingRef.current ? 'Saving...' : 'Save'}
                </button>

                {/* View Toggle */}
                <div className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-100/80 p-1 shadow-inner">
                  <button
                    onClick={() => setViewMode('linear')}
                    className={`px-3 py-1.5 rounded-full border text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                      viewMode === 'linear'
                        ? 'bg-white text-gray-900 shadow-sm border-gray-200'
                        : 'text-gray-600 hover:text-gray-900 border-transparent hover:border-gray-200 hover:bg-white/70'
                    }`}
                  >
                    Linear
                  </button>
                  <button
                    onClick={() => setViewMode('circular')}
                    className={`px-3 py-1.5 rounded-full border text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                      viewMode === 'circular'
                        ? 'bg-white text-gray-900 shadow-sm border-gray-200'
                        : 'text-gray-600 hover:text-gray-900 border-transparent hover:border-gray-200 hover:bg-white/70'
                    }`}
                  >
                    Circular
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Content Area */}
        {currentRoute === 'dashboard' && viewMode === 'linear' && (
          <Timeline
            timeBlocks={timeBlocks}
            onBlockCreated={handleBlockCreated}
            onBlockClick={handleBlockClick}
          />
        )}

        {currentRoute === 'dashboard' && viewMode === 'circular' && (
          <CircularChart
            timeBlocks={timeBlocks}
            onBlockCreated={handleBlockCreated}
            onBlockClick={handleBlockClick}
          />
        )}

        {currentRoute === 'schedules' && user && (
          <SchedulesPage
            user={user}
            currentScheduleId={currentScheduleId}
            onScheduleSelect={handleScheduleSelect}
          />
        )}

        {currentRoute === 'settings' && user && (
          <SettingsPage
            user={user}
            timeBlocks={timeBlocks}
            currentScheduleName={currentScheduleName}
          />
        )}
      </div>

      {/* Label Modal */}
      {(pendingBlock || editingBlock) && (
        <LabelModal
          isOpen={showLabelModal}
          startTime={editingBlock?.startTime || pendingBlock?.startTime || '00:00'}
          endTime={editingBlock?.endTime || pendingBlock?.endTime || '00:00'}
          onClose={() => {
            setShowLabelModal(false);
            setPendingBlock(null);
            setEditingBlock(null);
          }}
          onSave={handleSaveBlock}
          onDelete={editingBlock ? handleDeleteBlock : undefined}
          availableColors={availableColors}
          mode={editingBlock ? 'edit' : 'create'}
          initialLabel={editingBlock?.label}
          initialColor={editingBlock?.color}
        />
      )}
    </div>
  );
}
