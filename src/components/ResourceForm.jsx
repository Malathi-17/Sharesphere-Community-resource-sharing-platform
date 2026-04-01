import React, { useState } from 'react';

const ResourceForm = ({ ownerId, communityId, onResourceAdded }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    condition: 'Good',
    availability: 'Available',
    deposit_amount: '',
    fine_per_day: '',
    pickup_method: '',
    max_days_allowed: '7',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const res = await fetch('http://localhost:5000/resources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          deposit_amount: parseFloat(formData.deposit_amount) || 0,
          fine_per_day: parseFloat(formData.fine_per_day) || 0,
          max_days_allowed: parseInt(formData.max_days_allowed) || 7,
          owner_id: ownerId,
          community_id: communityId,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage('Resource added successfully!');
        setFormData({
          name: '',
          description: '',
          condition: 'Good',
          availability: 'Available',
          deposit_amount: '',
          fine_per_day: '',
          pickup_method: '',
          max_days_allowed: '7',
        });
        if (onResourceAdded) onResourceAdded();
      } else {
        setMessage(data.error || 'Failed to add resource');
      }
    } catch (err) {
      setMessage('Error connecting to server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>Add a Resource</h2>

      {message && (
        <p style={{ ...styles.message, color: message.includes('success') ? '#4caf50' : '#f44336' }}>
          {message}
        </p>
      )}

      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.field}>
          <label style={styles.label}>Name *</label>
          <input
            style={styles.input}
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            placeholder="e.g. Electric Drill"
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Description</label>
          <textarea
            style={{ ...styles.input, minHeight: '80px', resize: 'vertical' }}
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Brief description of the resource"
          />
        </div>

        <div style={styles.row}>
          <div style={styles.field}>
            <label style={styles.label}>Condition</label>
            <select style={styles.input} name="condition" value={formData.condition} onChange={handleChange}>
              <option value="New">New</option>
              <option value="Like New">Like New</option>
              <option value="Good">Good</option>
              <option value="Fair">Fair</option>
              <option value="Poor">Poor</option>
            </select>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Availability</label>
            <select style={styles.input} name="availability" value={formData.availability} onChange={handleChange}>
              <option value="Available">Available</option>
              <option value="Unavailable">Unavailable</option>
            </select>
          </div>
        </div>

        <div style={styles.row}>
          <div style={styles.field}>
            <label style={styles.label}>Deposit Amount (₹)</label>
            <input
              style={styles.input}
              type="number"
              name="deposit_amount"
              value={formData.deposit_amount}
              onChange={handleChange}
              placeholder="0"
              min="0"
              step="0.01"
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Fine Per Day (₹)</label>
            <input
              style={styles.input}
              type="number"
              name="fine_per_day"
              value={formData.fine_per_day}
              onChange={handleChange}
              placeholder="0"
              min="0"
              step="0.01"
            />
          </div>
        </div>

        <div style={styles.row}>
          <div style={styles.field}>
            <label style={styles.label}>Pickup Method</label>
            <input
              style={styles.input}
              type="text"
              name="pickup_method"
              value={formData.pickup_method}
              onChange={handleChange}
              placeholder="e.g. Door pickup, Community center"
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Max Days Allowed</label>
            <input
              style={styles.input}
              type="number"
              name="max_days_allowed"
              value={formData.max_days_allowed}
              onChange={handleChange}
              min="1"
            />
          </div>
        </div>

        <button type="submit" style={styles.button} disabled={loading}>
          {loading ? 'Adding...' : 'Add Resource'}
        </button>
      </form>
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '600px',
    margin: '20px auto',
    padding: '24px',
    background: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
  },
  heading: {
    marginBottom: '20px',
    fontSize: '1.5rem',
    color: '#333',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  row: {
    display: 'flex',
    gap: '16px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
  },
  label: {
    marginBottom: '4px',
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#555',
  },
  input: {
    padding: '10px 12px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    fontSize: '0.95rem',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  button: {
    marginTop: '8px',
    padding: '12px',
    background: '#6c63ff',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  message: {
    marginBottom: '12px',
    fontWeight: 500,
  },
};

export default ResourceForm;
