// src/TrustKey.tsx
import React, { useState } from 'react';
import axios from 'axios';

interface TrustKeyProps {
  apiKey: string;
  userIdentifier: string;
  purpose: string;
  onSuccess: (logId: string) => void;
  onDeny: () => void;
}

export const TrustKeyModal: React.FC<TrustKeyProps> = ({ 
  apiKey, userIdentifier, purpose, onSuccess, onDeny 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Function to open the modal
  const trigger = () => setIsOpen(true);

  const handleAgree = async () => {
    setLoading(true);
    try {
      // 1. Call YOUR Backend (Running on port 3000)
      const response = await axios.post('http://localhost:3000/v1/consent', {
        userIdentifier: userIdentifier,
        purpose: purpose,
        action: "GRANTED"
      }, {
        headers: { 'x-api-key': apiKey }
      });

      // 2. Success! Close modal and tell the parent app
      if (response.data.success) {
        setIsOpen(false);
        onSuccess(response.data.log_id);
      }
    } catch (err) {
      console.error("Consent Failed", err);
      alert("Error: Could not verify consent with TrustKey server.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return <button onClick={trigger} style={styles.triggerBtn}>🛡️ Verify with TrustKey</button>;
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.card}>
        <h3 style={styles.header}>🔒 Data Permission</h3>
        <p style={styles.text}>
          <strong>KreditBee Clone</strong> is requesting access to your data for:
        </p>
        <div style={styles.purposeTag}>{purpose}</div>
        
        <p style={styles.legal}>
          Secured by <strong>TrustKey</strong>. Your consent is cryptographically logged.
        </p>

        <div style={styles.actions}>
          <button onClick={() => { setIsOpen(false); onDeny(); }} style={styles.denyBtn}>
            Deny
          </button>
          <button onClick={handleAgree} style={styles.agreeBtn} disabled={loading}>
            {loading ? "Verifying..." : "Allow Access"}
          </button>
        </div>
      </div>
    </div>
  );
};

// Simple Styles
const styles: any = {
  triggerBtn: { padding: '12px 24px', fontSize: '16px', background: '#000', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' },
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  card: { background: 'white', padding: '24px', borderRadius: '16px', width: '320px', boxShadow: '0 20px 50px rgba(0,0,0,0.2)', fontFamily: 'sans-serif', textAlign: 'center' },
  header: { margin: '0 0 16px 0', color: '#333' },
  text: { color: '#666', fontSize: '14px', marginBottom: '16px' },
  purposeTag: { background: '#e0f2fe', color: '#0284c7', padding: '8px', borderRadius: '6px', fontWeight: 'bold', marginBottom: '24px', display: 'inline-block' },
  legal: { fontSize: '11px', color: '#999', marginBottom: '20px' },
  actions: { display: 'flex', gap: '12px' },
  denyBtn: { flex: 1, padding: '12px', border: '1px solid #ddd', background: 'white', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' },
  agreeBtn: { flex: 1, padding: '12px', border: 'none', background: '#22c55e', color: 'white', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }
};