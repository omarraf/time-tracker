import { deleteUser } from 'firebase/auth';
import { collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { User } from 'firebase/auth';

export async function deleteUserAccount(user: User): Promise<void> {
  try {
    // Delete all user's schedules from Firestore
    const schedulesRef = collection(db, 'schedules');
    const q = query(schedulesRef, where('userId', '==', user.uid));
    const querySnapshot = await getDocs(q);

    const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);

    // Delete the user's Firebase Auth account
    await deleteUser(user);
  } catch (error) {
    console.error('Error deleting user account:', error);
    throw error;
  }
}
