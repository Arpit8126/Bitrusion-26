import { createContext, useContext, useEffect, useState } from 'react';
import { auth, db, googleProvider } from './firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

const AuthContext = createContext(null);

const PROFILE_CACHE_KEY = 'bitrusion_user_profile';

function cacheProfile(profile) {
  try {
    if (profile) {
      localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(profile));
    } else {
      localStorage.removeItem(PROFILE_CACHE_KEY);
    }
  } catch (e) { /* ignore */ }
}

function getCachedProfile() {
  try {
    const cached = localStorage.getItem(PROFILE_CACHE_KEY);
    return cached ? JSON.parse(cached) : null;
  } catch (e) {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (uid, retries = 3) => {
    for (let i = 0; i < retries; i++) {
      try {
        const profileRef = doc(db, 'users', uid);
        const profileSnap = await getDoc(profileRef);
        if (profileSnap.exists()) {
          const data = profileSnap.data();
          setUserProfile(data);
          cacheProfile(data);
          return data;
        } else {
          // User exists in Auth but no profile in Firestore yet
          setUserProfile(null);
          return null;
        }
      } catch (err) {
        console.warn(`Profile fetch attempt ${i + 1} failed:`, err.message);
        if (i < retries - 1) {
          // Wait before retry
          await new Promise(r => setTimeout(r, 1000 * (i + 1)));
        }
      }
    }

    // All retries failed — use cached profile as fallback
    const cached = getCachedProfile();
    if (cached && cached.uid === uid) {
      console.log('Using cached profile as fallback');
      setUserProfile(cached);
      return cached;
    }

    setUserProfile(null);
    return null;
  };

  useEffect(() => {
    let unsubscribeProfile = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      if (firebaseUser) {
        // 1. Check if user is an Admin
        const adminRef = doc(db, 'admins', firebaseUser.uid);
        getDoc(adminRef).then((adminSnap) => {
          if (adminSnap.exists()) {
            setIsAdmin(true);
            setLoading(false);
          } else {
            setIsAdmin(false);
            // 2. If not admin, proceed with regular profile reactive listener
            unsubscribeProfile = onSnapshot(doc(db, 'users', firebaseUser.uid), (docSnapshot) => {
              if (docSnapshot.exists()) {
                const data = docSnapshot.data();
                setUserProfile(data);
                cacheProfile(data);
              } else {
                setUserProfile(null);
                cacheProfile(null);
              }
              setLoading(false);
            }, (err) => {
              console.warn('Profile listener error:', err);
              setLoading(false);
            });
          }
        }).catch(err => {
          console.error("Admin check failed:", err);
          setIsAdmin(false);
          setLoading(false);
        });
      } else {
        setIsAdmin(false);
        setUserProfile(null);
        cacheProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  const signup = async (email, password) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await sendEmailVerification(cred.user);
    return cred;
  };

  const login = (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  const loginWithGoogle = () => {
    return signInWithPopup(auth, googleProvider);
  };

  const logout = () => {
    cacheProfile(null);
    return signOut(auth);
  };

  const resetPassword = (email) => {
    return sendPasswordResetEmail(auth, email);
  };

  const resendVerification = () => {
    if (auth.currentUser) {
      return sendEmailVerification(auth.currentUser);
    }
  };

  const refreshProfile = async (uidToFetch) => {
    const targetUid = uidToFetch || user?.uid;
    if (targetUid) {
      await fetchProfile(targetUid);
    }
  };

  const value = {
    user,
    userProfile,
    isAdmin,
    loading,
    signup,
    login,
    loginWithGoogle,
    logout,
    resetPassword,
    resendVerification,
    refreshProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
