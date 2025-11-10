import { useEffect, useState } from 'react';
import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { signIn, signUp, signOutUser, googleSignIn } from '../auth';
import Modal from 'react-modal';

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
    } catch {
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
    <svg className="w-5 h-5" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );

  if (user) {
    return (
      <div className="fixed top-4 right-4 flex items-center gap-4 bg-white/95 backdrop-blur-md px-4 py-3 rounded-xl shadow-lg border border-white/80">
        <span className="text-sm text-gray-700 font-medium">{user.email}</span>
        <button
          className="bg-red-500 text-white border-none px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-all hover:bg-red-600 hover:-translate-y-0.5"
          onClick={signOutUser}
        >
          Sign Out
        </button>
      </div>
    );
  }

  const modalStyles = {
    overlay: {
      position: 'fixed' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    },
    content: {
      position: 'relative' as const,
      background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
      padding: '3rem 2.5rem',
      borderRadius: '24px',
      maxWidth: '440px',
      width: '90%',
      maxHeight: '90vh',
      overflowY: 'auto' as const,
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.8)',
      border: 'none',
      inset: 'auto',
    },
  };

  return (
    <>
      <div className="fixed top-2.5 right-2.5">
        <button
          className="bg-gradient-to-r from-blue-500 to-blue-800 text-white border-none px-6 py-3 rounded-xl text-sm font-semibold cursor-pointer transition-all shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 hover:-translate-y-0.5"
          onClick={() => setShowModal(true)}
        >
          Sign In
        </button>
      </div>

      <Modal
        isOpen={showModal}
        onRequestClose={closeModal}
        contentLabel="Authentication"
        style={modalStyles}
        closeTimeoutMS={200}
      >
        <button
          className="absolute top-6 right-6 bg-transparent border-none text-2xl text-slate-500 cursor-pointer p-2 rounded-full transition-all flex items-center justify-center w-10 h-10 hover:bg-slate-100 hover:text-slate-700 hover:scale-110"
          onClick={closeModal}
          aria-label="Close modal"
        >
          ×
        </button>

        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-slate-900 mb-2 tracking-tight">Welcome to DayChart</h2>
          <p className="text-slate-600 text-base font-normal m-0">Sign in to your account or create a new one</p>
        </div>

        <form className="flex flex-col gap-6" onSubmit={(e) => e.preventDefault()}>
          <div className="relative">
            <input
              className="w-full px-5 py-4 border-2 border-slate-200 rounded-xl text-base font-normal bg-white text-slate-900 outline-none transition-all box-border focus:border-blue-500 focus:bg-white focus:shadow-lg focus:shadow-blue-500/10 focus:-translate-y-0.5 hover:border-slate-300 placeholder:text-slate-400 placeholder:font-normal"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              autoComplete="email"
            />
          </div>

          <div className="relative">
            <input
              className="w-full px-5 py-4 border-2 border-slate-200 rounded-xl text-base font-normal bg-white text-slate-900 outline-none transition-all box-border focus:border-blue-500 focus:bg-white focus:shadow-lg focus:shadow-blue-500/10 focus:-translate-y-0.5 hover:border-slate-300 placeholder:text-slate-400 placeholder:font-normal"
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
            <div className="text-red-600 text-sm text-center p-2 bg-red-50 border border-red-200 rounded-lg">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-4 mt-2">
            <div className="flex gap-4">
              <button
                type="button"
                className="flex-1 px-6 py-4 text-base font-semibold border-none rounded-xl cursor-pointer transition-all relative overflow-hidden flex items-center justify-center min-h-12 no-underline bg-gradient-to-r from-blue-500 to-blue-800 text-white shadow-lg shadow-blue-500/40 disabled:opacity-60 disabled:cursor-not-allowed hover:from-blue-600 hover:to-blue-900 hover:shadow-xl hover:shadow-blue-500/50 hover:-translate-y-0.5 active:translate-y-0"
                onClick={handleEmailSignIn}
                disabled={isLoading}
              >
                {isLoading ? <div className="w-5 h-5 border-2 border-transparent border-t-current rounded-full animate-spin" /> : 'Sign In'}
              </button>

              <button
                type="button"
                className="flex-1 px-6 py-4 text-base font-semibold rounded-xl cursor-pointer transition-all relative overflow-hidden flex items-center justify-center min-h-12 no-underline bg-white text-gray-700 border-2 border-gray-200 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed hover:bg-gray-50 hover:border-gray-300 hover:-translate-y-0.5 hover:shadow-md"
                onClick={handleEmailSignUp}
                disabled={isLoading}
              >
                {isLoading ? <div className="w-5 h-5 border-2 border-transparent border-t-current rounded-full animate-spin" /> : 'Sign Up'}
              </button>
            </div>

            <div className="relative my-6 text-center">
              <div className="absolute top-1/2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
              <span className="bg-gradient-to-r from-white to-slate-50 px-4 text-slate-600 text-sm font-medium relative z-10">OR</span>
            </div>

            <button
              type="button"
              className="flex-1 px-6 py-4 text-base font-semibold rounded-xl cursor-pointer transition-all relative overflow-hidden flex items-center justify-center min-h-12 no-underline gap-3 bg-white text-gray-700 border-2 border-gray-200 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed hover:bg-slate-50 hover:border-gray-300 hover:-translate-y-0.5 hover:shadow-lg"
              onClick={handleGoogle}
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-transparent border-t-current rounded-full animate-spin" />
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