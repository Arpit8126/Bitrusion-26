import { useState, useEffect, useRef } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, updateDoc, doc, deleteDoc, writeBatch, orderBy } from 'firebase/firestore';
import { useAuth } from '../lib/AuthContext';

export default function NotificationCenter() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = [];
      snapshot.forEach((doc) => {
        msgs.push({ id: doc.id, ...doc.data() });
      });
      // Sort client-side to avoid index requirement
      msgs.sort((a, b) => new Date(b.rejectionDate) - new Date(a.rejectionDate));
      setNotifications(msgs);
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAsRead = async (id) => {
    await updateDoc(doc(db, 'notifications', id), { read: true });
  };

  const toggleDropdown = async () => {
    const nextState = !isOpen;
    setIsOpen(nextState);

    // If opening, mark all unread as read
    if (nextState) {
      const unread = notifications.filter(n => !n.read);
      if (unread.length > 0) {
        const batch = writeBatch(db);
        unread.forEach(n => {
          batch.update(doc(db, 'notifications', n.id), { read: true });
        });
        await batch.commit();
      }
    }
  };

  const deleteNotification = async (id) => {
    await deleteDoc(doc(db, 'notifications', id));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="notification-center" ref={dropdownRef}>
      <button
        className="notification-trigger"
        onClick={toggleDropdown}
        title="Notifications"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
        {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
      </button>

      {isOpen && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <h3>Notifications</h3>
          </div>

          <div className="notification-list">
            {notifications.length === 0 ? (
              <div className="notification-empty">No new notifications</div>
            ) : (
              notifications.map((n) => (
                <div key={n.id} className={`notification-item ${n.read ? 'read' : 'unread'}`} onClick={() => markAsRead(n.id)}>
                  <div className="notification-item-header">
                    <span className="notification-type" style={{ color: n.type === 'team_deleted' ? 'var(--warning)' : 'var(--danger)' }}>
                      {n.type === 'team_deleted' ? 'Team Deleted' : 'Team Rejected'}
                    </span>
                    <span className="notification-time">{new Date(n.rejectionDate).toLocaleDateString()}</span>
                  </div>
                  <div className="notification-title">{n.teamName}</div>
                  <div className="notification-msg">
                    {n.rejectionMessage}
                    <div style={{ marginTop: '0.5rem', fontSize: '0.7rem', opacity: 0.8, fontStyle: 'italic' }}>
                      For any query reach out at <span style={{ color: 'var(--primary)' }}>support@codeshastra.tech</span>
                    </div>
                  </div>

                  <div className="notification-details">
                    <div className="detail-row"><span>Submitted:</span> {new Date(n.submissionDate).toLocaleString()}</div>
                    <div className="detail-row"><span>{n.type === 'team_deleted' ? 'Deleted' : 'Rejected'}:</span> {new Date(n.rejectionDate).toLocaleString()}</div>
                    <div className="detail-members">
                      <strong>Members:</strong>
                      {n.teamDetails?.map((m, i) => (
                        <div key={i} className="member-mini">{m.name} ({m.email})</div>
                      ))}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

    </div>
  );
}
