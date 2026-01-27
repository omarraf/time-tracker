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
  getUserSchedules,
} from '../services/scheduleService';
import type { Schedule } from '../types/schedule';
import { validateTimeBlock, sortTimeBlocks } from '../utils/timeUtils';

const availableColors = [
  '#f87171', '#60a5fa', '#34d399', '#fbbf24', '#a78bfa',
  '#fb923c', '#a3e635', '#f472b6', '#38bdf8', '#c084fc',
];

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [isGuestMode, setIsGuestMode] = useState(false);
  const [currentRoute, setCurrentRoute] = useState<NavRoute>('dashboard');
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error' | null>(null);
  const [viewMode, setViewMode] = useState<'linear' | 'circular'>('circular');
  const [showSignInPrompt, setShowSignInPrompt] = useState(false);

  // Modal state
  const [showLabelModal, setShowLabelModal] = useState(false);
  const [pendingBlock, setPendingBlock] = useState<{ startTime: string; endTime: string } | null>(null);
  const [editingBlock, setEditingBlock] = useState<TimeBlock | null>(null);

  // Current schedule
  const [currentScheduleId, setCurrentScheduleId] = useState<string | null>(null);
  const [currentScheduleName, setCurrentScheduleName] = useState<string>('My Schedule');
  const [showScheduleDropdown, setShowScheduleDropdown] = useState(false);
  const [allSchedules, setAllSchedules] = useState<Schedule[]>([]);
  const authButtonRef = useRef<HTMLDivElement>(null);

  // Ref to track if we're currently saving
  const savingRef = useRef(false);

  // Load user's default schedule on auth change
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setIsLoading(true);

      if (currentUser) {
        try {
          const [defaultSchedule, schedules] = await Promise.all([
            getDefaultSchedule(currentUser.uid),
            getUserSchedules(currentUser.uid),
          ]);

          setAllSchedules(schedules);

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
        setAllSchedules([]);
      }

      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Manual save function
  const handleSaveSchedule = async () => {
    // If guest mode, show sign-in prompt
    if (!user) {
      setShowSignInPrompt(true);
      return;
    }

    if (savingRef.current) return;

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
      if (error instanceof Error && error.message.includes('Maximum 10 schedules')) {
        alert(error.message);
      }
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
        setShowScheduleDropdown(false);
        if (currentRoute !== 'dashboard') {
          setCurrentRoute('dashboard'); // Navigate back to dashboard if not already there
        }
      }
    } catch (error) {
      console.error('Error loading schedule:', error);
      alert('Failed to load schedule');
    }
  };

  // Clear all time blocks
  const handleClearAllBlocks = () => {
    if (!confirm('Are you sure you want to clear all time blocks from this schedule? This cannot be undone.')) {
      return;
    }
    setTimeBlocks([]);
  };

  // Create new schedule
  const handleCreateNewSchedule = async () => {
    if (!user) {
      setShowSignInPrompt(true);
      return;
    }

    const scheduleName = prompt('Enter a name for the new schedule:', 'New Schedule');
    if (!scheduleName) return;

    try {
      const newId = await saveSchedule(user.uid, {
        name: scheduleName.trim(),
        timeBlocks: [],
        isDefault: false,
      });

      // Refresh schedules list
      const schedules = await getUserSchedules(user.uid);
      setAllSchedules(schedules);

      // Switch to new schedule
      setCurrentScheduleId(newId);
      setCurrentScheduleName(scheduleName.trim());
      setTimeBlocks([]);
      setShowScheduleDropdown(false);
    } catch (error) {
      console.error('Error creating schedule:', error);
      if (error instanceof Error && error.message.includes('Maximum 10 schedules')) {
        alert(error.message);
      } else {
        alert('Failed to create schedule');
      }
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
  if (!user && !isGuestMode) {
    return (
      <div className="h-screen overflow-y-auto overflow-x-hidden bg-gradient-to-br from-gray-50 via-white to-gray-50">
        <AuthButtons />
        <div className="flex items-center justify-center p-4 sm:p-8 pt-20 sm:pt-24 pb-8 min-h-screen">
          <div className="max-w-3xl w-full">
            <div className="text-center mb-8 sm:mb-12">
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-gray-900 mb-3 sm:mb-4 tracking-tight">
                DayChart
              </h1>
              <p className="text-lg sm:text-xl text-gray-600">
                Visual time management reimagined
              </p>
              {/* Mobile performance note */}
              <div className="lg:hidden mt-4 px-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                  For the best experience, we recommend using DayChart on desktop
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-8 sm:mb-12">
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

            <div className="text-center space-y-4">
              <p className="text-gray-600">Get started by signing in above</p>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-gradient-to-br from-gray-50 via-white to-gray-50 text-gray-500">or</span>
                </div>
              </div>
              <button
                onClick={() => setIsGuestMode(true)}
                className="px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm hover:shadow-md"
              >
                Try Without Signing In
              </button>
              <p className="text-xs text-gray-500">
                Try the app now, sign in later to save your schedules
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar - Desktop Only */}
      <div className="hidden lg:block">
        <Sidebar
          currentRoute={currentRoute}
          onNavigate={(route) => {
            setCurrentRoute(route);
          }}
          userEmail={user?.email}
          isGuestMode={isGuestMode}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Guest Mode Banner - Hidden on mobile */}
        {!user && isGuestMode && (
          <div className="hidden lg:flex bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-3 items-center justify-center">
            <div className="flex items-center gap-3 text-center">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-medium">
                You're in guest mode.{' '}
                <span
                  onClick={() => {
                    const button = authButtonRef.current?.querySelector('button');
                    if (button) button.click();
                  }}
                  className="underline cursor-pointer hover:text-blue-100 transition-colors"
                >
                  Sign in
                </span>{' '}
                to save your schedules!
              </span>
            </div>
          </div>
        )}

        {/* Header - Hidden on mobile */}
        <header className="hidden lg:block bg-white border-b border-gray-200 px-4 sm:px-8 py-2 sm:py-3 lg:py-4">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 sm:gap-3">
                <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">
                  {currentRoute === 'dashboard' && 'Schedule Editor'}
                  {currentRoute === 'schedules' && 'My Schedules'}
                  {currentRoute === 'settings' && 'Settings'}
                </h2>

                {/* Schedule Dropdown - only on Schedule Editor page */}
                {currentRoute === 'dashboard' && user && (
                  <div className="relative">
                    <button
                      onClick={() => setShowScheduleDropdown(!showScheduleDropdown)}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
                    >
                      <span className="truncate max-w-[150px]">{currentScheduleName}</span>
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {/* Dropdown Menu */}
                    {showScheduleDropdown && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setShowScheduleDropdown(false)} />
                        <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-200 py-1 z-20 max-h-96 overflow-y-auto">
                          {/* Current Schedules */}
                          <div className="px-2 py-1">
                            {allSchedules.map(schedule => (
                              <button
                                key={schedule.id}
                                onClick={() => handleScheduleSelect(schedule.id)}
                                className={`w-full px-3 py-2.5 text-left text-sm rounded-lg transition-colors flex items-center justify-between group ${
                                  schedule.id === currentScheduleId ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'
                                }`}
                              >
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  {schedule.id === currentScheduleId && (
                                    <svg className="w-4 h-4 text-blue-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                  )}
                                  <span className="truncate font-medium">{schedule.name}</span>
                                </div>
                                <span className="text-xs text-gray-500 ml-2 flex-shrink-0">{schedule.timeBlocks.length} blocks</span>
                              </button>
                            ))}
                          </div>

                          {/* Divider */}
                          <div className="h-px bg-gray-200 my-1" />

                          {/* Actions */}
                          <div className="px-2 py-1">
                            <button
                              onClick={handleCreateNewSchedule}
                              className="w-full px-3 py-2.5 text-left text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-2 font-medium"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                              New Schedule
                            </button>
                            <button
                              onClick={() => {
                                setShowScheduleDropdown(false);
                                handleClearAllBlocks();
                              }}
                              className="w-full px-3 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2 font-medium"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              Clear All Blocks
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

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
              <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                {/* Save Button */}
                <button
                  onClick={handleSaveSchedule}
                  disabled={savingRef.current}
                  className="px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-600 text-white text-xs sm:text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                >
                  {savingRef.current ? 'Saving...' : 'Save'}
                </button>

                {/* View Toggle */}
                <div className="inline-flex items-center gap-0.5 sm:gap-1 rounded-full border border-gray-200 bg-gray-100/80 p-0.5 sm:p-1 shadow-inner">
                  <button
                    onClick={() => setViewMode('linear')}
                    className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-full border text-xs font-medium transition-all whitespace-nowrap touch-manipulation ${
                      viewMode === 'linear'
                        ? 'bg-blue-600 text-white shadow-sm border-blue-600'
                        : 'text-gray-600 hover:text-gray-900 border-transparent hover:border-gray-200 hover:bg-white/70'
                    }`}
                  >
                    Linear
                  </button>
                  <button
                    onClick={() => setViewMode('circular')}
                    className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-full border text-xs font-medium transition-all whitespace-nowrap touch-manipulation ${
                      viewMode === 'circular'
                        ? 'bg-blue-600 text-white shadow-sm border-blue-600'
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

        {/* Content Area - Mobile shows only circular, desktop can toggle */}
        {currentRoute === 'dashboard' && (
          <>
            {/* Desktop: Show based on viewMode */}
            <div className="hidden lg:block flex-1 overflow-auto">
              {viewMode === 'linear' && (
                <Timeline
                  timeBlocks={timeBlocks}
                  onBlockCreated={handleBlockCreated}
                  onBlockClick={handleBlockClick}
                />
              )}
              {viewMode === 'circular' && (
                <CircularChart
                  timeBlocks={timeBlocks}
                  onBlockCreated={handleBlockCreated}
                  onBlockClick={handleBlockClick}
                />
              )}
            </div>

            {/* Mobile: Always show circular */}
            <div className="lg:hidden flex-1">
              <CircularChart
                timeBlocks={timeBlocks}
                onBlockCreated={handleBlockCreated}
                onBlockClick={handleBlockClick}
              />
            </div>
          </>
        )}

        {currentRoute === 'schedules' && (
          <>
            {user ? (
              <SchedulesPage
                user={user}
                currentScheduleId={currentScheduleId}
                onScheduleSelect={handleScheduleSelect}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center p-8">
                <div className="text-center max-w-md">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Sign In to View Schedules
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Create an account or{' '}
                    <span
                      onClick={() => {
                        const button = authButtonRef.current?.querySelector('button');
                        if (button) button.click();
                      }}
                      className="text-blue-600 underline cursor-pointer hover:text-blue-700 transition-colors"
                    >
                      sign in
                    </span>{' '}
                    to save and manage multiple schedules
                  </p>
                </div>
              </div>
            )}
          </>
        )}

        {currentRoute === 'settings' && (
          <>
            {user ? (
              <SettingsPage
                user={user}
                timeBlocks={[]}
                currentScheduleName=""
              />
            ) : (
              <div className="flex-1 flex items-center justify-center p-8">
                <div className="text-center max-w-md">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Sign In to Access Settings
                  </h3>
                  <p className="text-gray-600 mb-6">
                    <span
                      onClick={() => {
                        const button = authButtonRef.current?.querySelector('button');
                        if (button) button.click();
                      }}
                      className="text-blue-600 underline cursor-pointer hover:text-blue-700 transition-colors"
                    >
                      Sign in
                    </span>{' '}
                    to manage your profile, export schedules, and more
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Mobile Bottom Actions - Only on Dashboard */}
      {currentRoute === 'dashboard' && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 px-4 py-3">
          <div className="flex items-center gap-3 mb-2">
            {!user ? (
              <button
                onClick={() => {
                  const button = authButtonRef.current?.querySelector('button');
                  if (button) button.click();
                }}
                className="flex-1 bg-blue-600 text-white px-4 py-2.5 rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Sign In
              </button>
            ) : (
              <button
                onClick={handleSaveSchedule}
                disabled={savingRef.current}
                className="flex-1 bg-blue-600 text-white px-4 py-2.5 rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
                {savingRef.current ? 'Saving...' : 'Save'}
              </button>
            )}
            <button
              onClick={handleClearAllBlocks}
              className="flex-1 bg-red-50 text-red-600 px-4 py-2.5 rounded-lg font-medium text-sm hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete All
            </button>
          </div>
          <p className="text-xs text-center text-gray-500">
            {!user
              ? "Sign in on desktop to save schedules"
              : "Use desktop to manage multiple schedules"
            }
          </p>
        </div>
      )}

      {/* Mobile Save Success Toast */}
      {saveStatus && (
        <div className="lg:hidden fixed bottom-24 left-4 right-4 z-50 animate-fade-in">
          <div className={`rounded-lg px-4 py-3 shadow-lg flex items-center gap-3 ${
            saveStatus === 'saved' ? 'bg-green-50 border border-green-200' :
            saveStatus === 'saving' ? 'bg-blue-50 border border-blue-200' :
            'bg-red-50 border border-red-200'
          }`}>
            {saveStatus === 'saved' && (
              <>
                <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-medium text-green-800">Schedule saved successfully!</span>
              </>
            )}
            {saveStatus === 'saving' && (
              <>
                <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin flex-shrink-0"></div>
                <span className="text-sm font-medium text-blue-800">Saving schedule...</span>
              </>
            )}
            {saveStatus === 'error' && (
              <>
                <svg className="w-5 h-5 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-medium text-red-800">Error saving schedule</span>
              </>
            )}
          </div>
        </div>
      )}

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

      {/* Auth Buttons for Guest Mode - Hidden but functional */}
      {!user && isGuestMode && (
        <div ref={authButtonRef} className="hidden">
          <AuthButtons />
        </div>
      )}

      {/* Sign-In Prompt Modal */}
      {showSignInPrompt && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 relative">
            <button
              onClick={() => setShowSignInPrompt(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
              </div>

              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Sign In to Save
              </h3>
              <p className="text-gray-600 mb-6">
                Create a free account to save your schedules and access them from anywhere
              </p>

              <div className="space-y-3">
                <AuthButtons />
                <button
                  onClick={() => setShowSignInPrompt(false)}
                  className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Continue without saving
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
