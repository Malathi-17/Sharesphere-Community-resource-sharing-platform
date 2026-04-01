// ============================================================
// Resource Routes — paste these into your server.js
// or require this file and use: app.use(resourceRoutes(db));
// ============================================================

// --- Option A: Copy‑paste these two route handlers into server.js ---
//
// Make sure your server.js already has:
//   const express = require('express');
//   const app = express();
//   app.use(express.json());
//   const db = <your mysql connection/pool>;

// ─── POST /resources ────────────────────────────────────────
// Adds a new resource
/*
app.post('/resources', (req, res) => {
  const {
    name, description, condition, availability,
    deposit_amount, fine_per_day, pickup_method,
    max_days_allowed, owner_id, community_id
  } = req.body;

  const sql = `INSERT INTO resources
    (name, description, \`condition\`, availability, deposit_amount,
     fine_per_day, pickup_method, max_days_allowed, owner_id, community_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  db.query(sql, [
    name, description, condition, availability || 'Available',
    deposit_amount || 0, fine_per_day || 0, pickup_method,
    max_days_allowed || 7, owner_id, community_id
  ], (err, result) => {
    if (err) {
      console.error('Error adding resource:', err);
      return res.status(500).json({ error: 'Failed to add resource' });
    }
    res.status(201).json({ message: 'Resource added successfully', resourceId: result.insertId });
  });
});
*/

// ─── GET /resources/:communityId ────────────────────────────
// Fetches all resources for a given community
/*
app.get('/resources/:communityId', (req, res) => {
  const { communityId } = req.params;

  const sql = `SELECT * FROM resources WHERE community_id = ? ORDER BY created_at DESC`;

  db.query(sql, [communityId], (err, results) => {
    if (err) {
      console.error('Error fetching resources:', err);
      return res.status(500).json({ error: 'Failed to fetch resources' });
    }
    res.json(results);
  });
});
*/


// --- Option B: Use as a module ---
// In server.js: const resourceRoutes = require('./resourceRoutes'); resourceRoutes(app, db);

module.exports = function (app, db) {

  // POST /resources — add a new resource
  app.post('/resources', (req, res) => {
    const {
      name, description, condition, availability,
      deposit_amount, fine_per_day, pickup_method,
      max_days_allowed, owner_id, community_id
    } = req.body;

    const sql = `INSERT INTO resources
      (name, description, \`condition\`, availability, deposit_amount,
       fine_per_day, pickup_method, max_days_allowed, owner_id, community_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    db.query(sql, [
      name, description, condition, availability || 'Available',
      deposit_amount || 0, fine_per_day || 0, pickup_method,
      max_days_allowed || 7, owner_id, community_id
    ], (err, result) => {
      if (err) {
        console.error('Error adding resource:', err);
        return res.status(500).json({ error: 'Failed to add resource' });
      }
      res.status(201).json({ message: 'Resource added successfully', resourceId: result.insertId });
    });
  });

  // GET /resources/:communityId — fetch resources for a community
  app.get('/resources/:communityId', (req, res) => {
    const { communityId } = req.params;

    const sql = `SELECT * FROM resources WHERE community_id = ? ORDER BY created_at DESC`;

    db.query(sql, [communityId], (err, results) => {
      if (err) {
        console.error('Error fetching resources:', err);
        return res.status(500).json({ error: 'Failed to fetch resources' });
      }
      res.json(results);
    });
  });

};
