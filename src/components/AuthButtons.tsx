import { useEffect, useState } from 'react';
import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { signIn, signUp, signOutUser, googleSignIn } from '../auth';
import Modal from 'react-modal';
import styles from './AuthModal.module.css';

Modal.setAppElement('#root');

export default function AuthButtons() {
  const [user, setUser] = useState(auth.currentUser);
  const [showModal, setShowModal] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  const clearForm = () => {
    setEmail('');
    setPassword('');
    setError('');
  };

  const closeModal = () => {
    setShowModal(false);
    clearForm();
    setIsLoading(false);
  };

  const handleEmailSignIn = async () => {
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      await signIn(email, password);
      closeModal();
    } catch (error: unknown) {
      setError(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailSignUp = async () => {
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }
    
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      await signUp(email, password);
      closeModal();
    } catch (error: unknown) {
      setError(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogle = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      await googleSignIn();
      closeModal();
    } catch (error: unknown) {
      setError('Google sign-in failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getErrorMessage = (error: unknown): string => {
    // Type guard to check if error has the expected Firebase auth error structure
    if (error && typeof error === 'object' && 'code' in error) {
      const firebaseError = error as { code: string };
      switch (firebaseError.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
          return 'Invalid email or password';
        case 'auth/email-already-in-use':
          return 'Email is already registered';
        case 'auth/weak-password':
          return 'Password is too weak';
        case 'auth/invalid-email':
          return 'Invalid email address';
        case 'auth/too-many-requests':
          return 'Too many attempts. Please try again later.';
        default:
          return 'An error occurred. Please try again.';
      }
    }
    return 'An error occurred. Please try again.';
  };

  const handleKeyDown = (event: { key: string; }) => {
    if (event.key === 'Enter' && !isLoading) {
      handleEmailSignIn();
    }
  };

  const GoogleIcon = () => (
    <svg className={styles.googleIcon} viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );

  if (user) {
    return (
      <div className={styles.userInfo}>
        <span className={styles.userEmail}>{user.email}</span>
        <button className={styles.signOutButton} onClick={signOutUser}>
          Sign Out
        </button>
      </div>
    );
  }

  return (
    <>
      <div style={{ position: "absolute", top: 10, right: 10 }}>
        <button 
          className={styles.signInTrigger}
          onClick={() => setShowModal(true)}
        >
          Sign In
        </button>
      </div>

      <Modal
        isOpen={showModal}
        onRequestClose={closeModal}
        contentLabel="Authentication"
        className={styles.modalContainer}
        overlayClassName={styles.overlay}
        closeTimeoutMS={200}
      >
        <button 
          className={styles.closeButton}
          onClick={closeModal}
          aria-label="Close modal"
        >
          ×
        </button>
        
        <div className={styles.header}>
          <h2 className={styles.title}>Welcome to DayChart</h2>
          <p className={styles.subtitle}>Sign in to your account or create a new one</p>
        </div>

        <form className={styles.form} onSubmit={(e) => e.preventDefault()}>
          <div className={styles.inputGroup}>
            <input
              className={styles.input}
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              autoComplete="email"
            />
          </div>
          
          <div className={styles.inputGroup}>
            <input
              className={styles.input}
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div style={{ 
              color: '#ef4444', 
              fontSize: '0.875rem', 
              textAlign: 'center',
              padding: '0.5rem',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px'
            }}>
              {error}
            </div>
          )}

          <div className={styles.buttonGroup}>
            <div className={styles.buttonRow}>
              <button 
                type="button"
                className={`${styles.button} ${styles.primaryButton}`}
                onClick={handleEmailSignIn}
                disabled={isLoading}
              >
                {isLoading ? <div className={styles.loadingSpinner} /> : 'Sign In'}
              </button>
              
              <button 
                type="button"
                className={`${styles.button} ${styles.secondaryButton}`}
                onClick={handleEmailSignUp}
                disabled={isLoading}
              >
                {isLoading ? <div className={styles.loadingSpinner} /> : 'Sign Up'}
              </button>
            </div>

            <div className={styles.divider}>
              <span className={styles.dividerText}>OR</span>
            </div>

            <button 
              type="button"
              className={`${styles.button} ${styles.googleButton}`}
              onClick={handleGoogle}
              disabled={isLoading}
            >
              {isLoading ? (
                <div className={styles.loadingSpinner} />
              ) : (
                <>
                  <GoogleIcon />
                  Sign in with Google
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}