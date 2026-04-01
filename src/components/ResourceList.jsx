import React, { useEffect, useState } from 'react';

const ResourceList = ({ communityId }) => {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchResources = async () => {
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:5000/resources/${communityId}`);
      const data = await res.json();
      if (res.ok) {
        setResources(data);
      } else {
        setError(data.error || 'Failed to load resources');
      }
    } catch (err) {
      setError('Error connecting to server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (communityId) fetchResources();
  }, [communityId]);

  if (loading) return <p style={{ textAlign: 'center', padding: '20px' }}>Loading resources...</p>;
  if (error) return <p style={{ textAlign: 'center', color: '#f44336' }}>{error}</p>;
  if (resources.length === 0)
    return <p style={{ textAlign: 'center', padding: '20px', color: '#888' }}>No resources shared yet.</p>;

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>Community Resources</h2>
      <div style={styles.grid}>
        {resources.map((r) => (
          <div key={r.id} style={styles.card}>
            <div style={styles.cardHeader}>
              <h3 style={styles.cardTitle}>{r.name}</h3>
              <span
                style={{
                  ...styles.badge,
                  background: r.availability === 'Available' ? '#e8f5e9' : '#ffebee',
                  color: r.availability === 'Available' ? '#2e7d32' : '#c62828',
                }}
              >
                {r.availability}
              </span>
            </div>

            {r.description && <p style={styles.description}>{r.description}</p>}

            <div style={styles.details}>
              <span style={styles.detailItem}>📦 {r.condition}</span>
              <span style={styles.detailItem}>💰 Deposit: ₹{r.deposit_amount}</span>
              <span style={styles.detailItem}>⏱ Fine/day: ₹{r.fine_per_day}</span>
              <span style={styles.detailItem}>📅 Max {r.max_days_allowed} days</span>
              {r.pickup_method && <span style={styles.detailItem}>📍 {r.pickup_method}</span>}
            </div>

            <button
              style={styles.lendButton}
              onClick={() => alert('Lend functionality coming soon!')}
            >
              Lend
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '900px',
    margin: '20px auto',
    padding: '0 16px',
  },
  heading: {
    fontSize: '1.5rem',
    color: '#333',
    marginBottom: '20px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '20px',
  },
  card: {
    background: '#ffffff',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardTitle: {
    margin: 0,
    fontSize: '1.1rem',
    color: '#222',
  },
  badge: {
    padding: '4px 10px',
    borderRadius: '20px',
    fontSize: '0.75rem',
    fontWeight: 600,
    whiteSpace: 'nowrap',
  },
  description: {
    margin: 0,
    fontSize: '0.9rem',
    color: '#666',
    lineHeight: 1.5,
  },
  details: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },
  detailItem: {
    fontSize: '0.8rem',
    color: '#555',
    background: '#f5f5f5',
    padding: '4px 10px',
    borderRadius: '6px',
  },
  lendButton: {
    marginTop: 'auto',
    padding: '10px',
    background: '#6c63ff',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.95rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
};

export default ResourceList;
