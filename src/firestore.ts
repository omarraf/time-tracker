import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';

// Type definitions
export interface Slice {
  color: string;
  label: string;
}

export interface Schedule {
  id: string;
  name: string;
  slices: Slice[];
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  isDefault?: boolean;
}

export interface ScheduleInput {
  name: string;
  slices: Slice[];
  isDefault?: boolean;
}

// Firestore collection names
const SCHEDULES_COLLECTION = 'schedules';

// Helper function to convert Firestore timestamp to Date
const timestampToDate = (timestamp: Timestamp | undefined): Date => {
  return timestamp ? timestamp.toDate() : new Date();
};

/**
 * Save a new schedule to Firestore
 */
export const saveSchedule = async (
  userId: string,
  scheduleData: ScheduleInput
): Promise<string> => {
  try {
    const scheduleRef = doc(collection(db, SCHEDULES_COLLECTION));
    const scheduleId = scheduleRef.id;

    await setDoc(scheduleRef, {
      ...scheduleData,
      userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return scheduleId;
  } catch (error) {
    console.error('Error saving schedule:', error);
    throw new Error('Failed to save schedule');
  }
};

/**
 * Update an existing schedule
 */
export const updateSchedule = async (
  scheduleId: string,
  userId: string,
  updates: Partial<ScheduleInput>
): Promise<void> => {
  try {
    const scheduleRef = doc(db, SCHEDULES_COLLECTION, scheduleId);
    const scheduleDoc = await getDoc(scheduleRef);

    if (!scheduleDoc.exists()) {
      throw new Error('Schedule not found');
    }

    if (scheduleDoc.data().userId !== userId) {
      throw new Error('Unauthorized');
    }

    await updateDoc(scheduleRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating schedule:', error);
    throw new Error('Failed to update schedule');
  }
};

/**
 * Get a single schedule by ID
 */
export const getSchedule = async (
  scheduleId: string,
  userId: string
): Promise<Schedule | null> => {
  try {
    const scheduleRef = doc(db, SCHEDULES_COLLECTION, scheduleId);
    const scheduleDoc = await getDoc(scheduleRef);

    if (!scheduleDoc.exists()) {
      return null;
    }

    const data = scheduleDoc.data();

    if (data.userId !== userId) {
      throw new Error('Unauthorized');
    }

    return {
      id: scheduleDoc.id,
      name: data.name,
      slices: data.slices,
      userId: data.userId,
      createdAt: timestampToDate(data.createdAt),
      updatedAt: timestampToDate(data.updatedAt),
      isDefault: data.isDefault || false,
    };
  } catch (error) {
    console.error('Error getting schedule:', error);
    throw new Error('Failed to get schedule');
  }
};

/**
 * Get all schedules for a user
 */
export const getUserSchedules = async (userId: string): Promise<Schedule[]> => {
  try {
    const schedulesQuery = query(
      collection(db, SCHEDULES_COLLECTION),
      where('userId', '==', userId)
    );

    const querySnapshot = await getDocs(schedulesQuery);
    const schedules: Schedule[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      schedules.push({
        id: doc.id,
        name: data.name,
        slices: data.slices,
        userId: data.userId,
        createdAt: timestampToDate(data.createdAt),
        updatedAt: timestampToDate(data.updatedAt),
        isDefault: data.isDefault || false,
      });
    });

    // Sort by updatedAt descending (most recent first)
    return schedules.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  } catch (error) {
    console.error('Error getting user schedules:', error);
    throw new Error('Failed to get schedules');
  }
};

/**
 * Get the default schedule for a user
 */
export const getDefaultSchedule = async (userId: string): Promise<Schedule | null> => {
  try {
    const schedules = await getUserSchedules(userId);
    const defaultSchedule = schedules.find(s => s.isDefault);

    // If no default schedule, return the most recently updated one
    return defaultSchedule || schedules[0] || null;
  } catch (error) {
    console.error('Error getting default schedule:', error);
    return null;
  }
};

/**
 * Delete a schedule
 */
export const deleteSchedule = async (
  scheduleId: string,
  userId: string
): Promise<void> => {
  try {
    const scheduleRef = doc(db, SCHEDULES_COLLECTION, scheduleId);
    const scheduleDoc = await getDoc(scheduleRef);

    if (!scheduleDoc.exists()) {
      throw new Error('Schedule not found');
    }

    if (scheduleDoc.data().userId !== userId) {
      throw new Error('Unauthorized');
    }

    await deleteDoc(scheduleRef);
  } catch (error) {
    console.error('Error deleting schedule:', error);
    throw new Error('Failed to delete schedule');
  }
};

/**
 * Set a schedule as the default for a user
 */
export const setDefaultSchedule = async (
  scheduleId: string,
  userId: string
): Promise<void> => {
  try {
    // First, get all user schedules and unset any existing default
    const schedules = await getUserSchedules(userId);

    for (const schedule of schedules) {
      if (schedule.isDefault && schedule.id !== scheduleId) {
        await updateDoc(doc(db, SCHEDULES_COLLECTION, schedule.id), {
          isDefault: false,
          updatedAt: serverTimestamp(),
        });
      }
    }

    // Set the new default
    await updateDoc(doc(db, SCHEDULES_COLLECTION, scheduleId), {
      isDefault: true,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error setting default schedule:', error);
    throw new Error('Failed to set default schedule');
  }
};
