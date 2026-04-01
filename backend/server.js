
import express, { json } from "express";
import cors from "cors";
import { createConnection } from "mysql2";
import bcrypt from "bcryptjs";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import dotenv from "dotenv";
import nodemailer from "nodemailer";


dotenv.config();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// Serve uploaded images statically
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);
app.use("/uploads", express.static(uploadsDir));

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});
const upload = multer({ storage });

// ── DB ──────────────────────────────────────────────────────────────────────
const db = createConnection({
  host: "127.0.0.1",
  user: "root",
  password: "Mala@2006",
  database: "ShareJoe",
});

db.connect((err) => {
  if (err) console.log(err);
  else {
    console.log("MySQL Connected");
    db.query(`
      CREATE TABLE IF NOT EXISTS otps (
        email VARCHAR(100) PRIMARY KEY,
        otp VARCHAR(6) NOT NULL,
        expires_at TIMESTAMP NOT NULL
      )
    `, (err) => { if (err) console.error("Failed to create otps table", err); });

    // Add new resource columns if they don't exist
    const alterCols = [
      "ADD COLUMN availability VARCHAR(50) DEFAULT 'Available'",
      "ADD COLUMN deposit_amount DECIMAL(10,2) DEFAULT 0.00",
      "ADD COLUMN fine_per_day DECIMAL(10,2) DEFAULT 0.00",
      "ADD COLUMN pickup_method VARCHAR(255) DEFAULT NULL",
      "ADD COLUMN max_days_allowed INT DEFAULT 7",
    ];
    for (const col of alterCols) {
      db.query(`ALTER TABLE resources ${col}`, (err) => {
        if (err && !err.message.includes("Duplicate column")) {
          console.error("ALTER TABLE resources error:", err.message);
        }
      });
    }

    // Fix any existing PENDING resources so they show up
    db.query("UPDATE resources SET approval_status='APPROVED' WHERE approval_status='PENDING'", (err) => {
      if (err) console.error("Fix pending resources error:", err.message);
    });

    // Create borrow_requests table
    db.query(`
      CREATE TABLE IF NOT EXISTS borrow_requests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        resource_id INT NOT NULL,
        borrower_id INT NOT NULL,
        owner_id INT NOT NULL,
        community_id INT NOT NULL,
        borrow_from_date DATE NOT NULL,
        expected_return_date DATE NOT NULL,
        purpose TEXT,
        status ENUM('PENDING','ACCEPTED','REJECTED') DEFAULT 'PENDING',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (resource_id) REFERENCES resources(resource_id),
        FOREIGN KEY (borrower_id) REFERENCES users(user_id),
        FOREIGN KEY (owner_id) REFERENCES users(user_id),
        FOREIGN KEY (community_id) REFERENCES communities(community_id)
      )
    `, (err) => { if (err) console.error("Failed to create borrow_requests table:", err.message); });

    // Create borrow_transactions table
    db.query(`
      CREATE TABLE IF NOT EXISTS borrow_transactions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        borrower_id INT NOT NULL,
        owner_id INT NOT NULL,
        resource_id INT NOT NULL,
        community_id INT NOT NULL,
        request_date DATE,
        approved_date DATE,
        due_date DATE,
        pickup_status ENUM('PENDING','COMPLETED') DEFAULT 'PENDING',
        handover_status ENUM('PENDING','COMPLETED') DEFAULT 'PENDING',
        return_status ENUM('PENDING','RETURNED') DEFAULT 'PENDING',
        fine_status ENUM('NONE','PENDING','PAID') DEFAULT 'NONE',
        completed_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (borrower_id) REFERENCES users(user_id),
        FOREIGN KEY (owner_id) REFERENCES users(user_id),
        FOREIGN KEY (resource_id) REFERENCES resources(resource_id),
        FOREIGN KEY (community_id) REFERENCES communities(community_id)
      )
    `, (err) => { if (err) console.error("Failed to create borrow_transactions table:", err.message); });

    // Create borrow_chats table (message thread per transaction)
    db.query(`
      CREATE TABLE IF NOT EXISTS borrow_chats (
        id INT AUTO_INCREMENT PRIMARY KEY,
        transaction_id INT NOT NULL,
        sender_id INT NOT NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (transaction_id) REFERENCES borrow_transactions(id),
        FOREIGN KEY (sender_id) REFERENCES users(user_id)
      )
    `, (err) => { if (err) console.error("Failed to create borrow_chats table:", err.message); });

    // OTP Migration
    db.query(`
      ALTER TABLE borrow_transactions
      ADD COLUMN pickup_otp VARCHAR(6),
      ADD COLUMN return_otp VARCHAR(6),
      ADD COLUMN pickup_verified_at TIMESTAMP NULL,
      ADD COLUMN return_verified_at TIMESTAMP NULL;
    `, (err) => { /* ignore Duplicate column error */ });
  }
});

// Helper: promise-based query
const query = (sql, params = []) =>
  new Promise((resolve, reject) =>
    db.query(sql, params, (err, result) => (err ? reject(err) : resolve(result)))
  );

// Helper: create notification
const notify = async (user_id, message, type = "INFO") => {
  try {
    await query(
      "INSERT INTO notifications (user_id, message, type) VALUES (?,?,?)",
      [user_id, message, type]
    );
  } catch (e) {
    console.error("Notify error:", e);
  }
};

// ── MIDDLEWARE ───────────────────────────────────────────────────────────────
const requireAuth = async (req, res, next) => {
  const user_id = req.body?.user_id || req.query?.user_id || req.params?.user_id;
  if (!user_id) return res.status(401).json({ message: "Unauthorized" });
  try {
    const rows = await query("SELECT * FROM users WHERE user_id=?", [user_id]);
    if (!rows.length) return res.status(401).json({ message: "User not found" });
    if (rows[0].suspended)
      return res.status(403).json({ message: "Account suspended due to violations" });
    req.user = rows[0];
    next();
  } catch (e) {
    res.status(500).json({ message: "Auth error" });
  }
};

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: "Unauthorized" });
  if (!roles.includes(req.user.role))
    return res.status(403).json({ message: "Forbidden: insufficient role" });
  next();
};

// ── MODULE 1: AUTH ───────────────────────────────────────────────────────────

// Login
app.post("/", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.json({ message: "Email and password required" });
  try {
    const rows = await query(
      "SELECT user_id, name, email, role, trust_score, suspended FROM users WHERE email=?",
      [email]
    );
    if (!rows.length) return res.json({ message: "Account not found" });
    const user = rows[0];
    if (user.suspended) return res.json({ message: "Account suspended due to violations" });

    // Try bcrypt first, fall back to plain text (for legacy seeded users)
    const stored = await query("SELECT password FROM users WHERE user_id=?", [user.user_id]);
    const storedPwd = stored[0].password;
    let match = false;
    if (storedPwd.startsWith("$2")) {
      match = await bcrypt.compare(password, storedPwd);
    } else {
      match = storedPwd === password;
    }
    if (!match) return res.json({ message: "Invalid credentials" });
    res.json({ message: "Login success", user });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Send OTP
app.post("/send-otp", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.json({ message: "Email required" });

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return res.json({ message: "Invalid email format" });

  try {
    const existing = await query("SELECT user_id FROM users WHERE email=?", [email]);
    if (existing.length) return res.json({ message: "Account already exists with this email" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60000); // 10 mins

    await query("DELETE FROM otps WHERE email=?", [email]);
    await query("INSERT INTO otps (email, otp, expires_at) VALUES (?, ?, ?)", [email, otp, expiresAt]);

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "ShareSphere - Your Signup OTP",
      html: `<h2>Welcome to ShareSphere!</h2><p>Your OTP for signup is: <strong style="font-size:20px">${otp}</strong></p><p>This code will expire in 10 minutes.</p>`
    };

    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      transporter.sendMail(mailOptions, (err) => {
        if (err) {
          console.error("Email error:", err);
          return res.json({ message: "Failed to send OTP email" });
        }
        res.json({ message: "OTP sent successfully" });
      });
    } else {
      console.log(`[TEST MODE] OTP for ${email} is ${otp}`);
      res.json({ message: "OTP sent successfully (Check server console)" });
    }
  } catch (e) {
    res.status(500).json({ message: "Database error" });
  }
});

// Signup (Verify OTP & Create Account)
app.post("/signup", async (req, res) => {
  const { name, email, password, otp } = req.body;
  if (!name || !email || !password || !otp)
    return res.json({ message: "All fields are required" });

  try {
    const otpRows = await query("SELECT * FROM otps WHERE email=?", [email]);
    if (!otpRows.length) return res.json({ message: "No OTP requested for this email" });

    const record = otpRows[0];
    if (new Date() > new Date(record.expires_at)) {
      await query("DELETE FROM otps WHERE email=?", [email]);
      return res.json({ message: "OTP has expired. Please request a new one." });
    }
    if (record.otp !== otp) {
      return res.json({ message: "Invalid OTP" });
    }

    const existing = await query("SELECT user_id FROM users WHERE email=?", [email]);
    if (existing.length) return res.json({ message: "Account already exists with this email" });

    const hashed = await bcrypt.hash(password, 10);
    const result = await query(
      "INSERT INTO users(name,email,password,role) VALUES(?,?,?,?)",
      [name, email, hashed, "USER"]
    );

    await query("DELETE FROM otps WHERE email=?", [email]);

    const rows = await query(
      "SELECT user_id, name, email, role, trust_score, suspended FROM users WHERE user_id=?",
      [result.insertId]
    );

    res.json({ message: "User registered successfully", user: rows[0] });
  } catch (e) {
    res.status(500).json({ message: "Database error" });
  }
});

// Get profile
app.get("/profile/:user_id", async (req, res) => {
  try {
    const rows = await query(
      "SELECT user_id, name, email, role, trust_score, suspended, profile_pic, created_at FROM users WHERE user_id=?",
      [req.params.user_id]
    );
    if (!rows.length) return res.status(404).json({ message: "User not found" });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Update profile
app.put("/profile", upload.single("profile_pic"), async (req, res) => {
  const { user_id, name } = req.body;
  const profile_pic = req.file ? `/uploads/${req.file.filename}` : undefined;
  try {
    if (profile_pic) {
      await query("UPDATE users SET name=?, profile_pic=? WHERE user_id=?", [name, profile_pic, user_id]);
    } else {
      await query("UPDATE users SET name=? WHERE user_id=?", [name, user_id]);
    }
    res.json({ message: "Profile updated" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── MODULE 2: COMMUNITY ──────────────────────────────────────────────────────

app.post("/create-community", async (req, res) => {
  const { name, type, description, user_id, fine_rate, borrow_limit, join_approval } = req.body;
  const sql = `INSERT INTO communities (community_name, community_type, description, created_by, fine_rate, borrow_limit, join_approval) VALUES (?, ?, ?, ?, ?, ?, ?)`;
  try {
    const result = await query(sql, [
      name, type, description, user_id,
      fine_rate || 10.00, borrow_limit || 3, join_approval || false,
    ]);
    const communityId = result.insertId;
    await query("INSERT INTO community_members (user_id,community_id,role) VALUES (?,?,'ADMIN')", [user_id, communityId]);
    res.json({ message: "Community created successfully" });
  } catch (e) {
    res.status(500).json({ message: "Database Error" });
  }
});

app.get("/communities", async (req, res) => {
  try {
    const result = await query("SELECT community_id AS id, community_name, community_type, description FROM communities");
    res.json(result);
  } catch (e) {
    res.status(500).json({ message: "Database error" });
  }
});

// Search communities by name (strict LIKE filter)
app.get("/search-communities", async (req, res) => {
  const { query: searchQuery, user_id } = req.query;
  try {
    if (!searchQuery || !searchQuery.trim()) {
      // Empty search: return only communities user created or joined
      const result = await query(
        `SELECT c.community_id AS id, c.community_name, c.community_type, c.description,
          c.fine_rate, c.borrow_limit, c.join_approval, c.created_by,
          COUNT(cm2.user_id) AS members,
          CASE WHEN cm.user_id IS NULL THEN false ELSE true END AS joined
        FROM communities c
        LEFT JOIN community_members cm ON c.community_id = cm.community_id AND cm.user_id = ?
        LEFT JOIN community_members cm2 ON c.community_id = cm2.community_id
        WHERE cm.user_id IS NOT NULL OR c.created_by = ?
        GROUP BY c.community_id`,
        [user_id, user_id]
      );
      return res.json(result);
    }

    // Search mode: strict LIKE filter on community_name only
    const searchTerm = `%${searchQuery.trim()}%`;
    const result = await query(
      `SELECT c.community_id AS id, c.community_name, c.community_type, c.description,
        c.fine_rate, c.borrow_limit, c.join_approval, c.created_by,
        COUNT(cm2.user_id) AS members,
        CASE WHEN cm.user_id IS NULL THEN false ELSE true END AS joined
      FROM communities c
      LEFT JOIN community_members cm ON c.community_id = cm.community_id AND cm.user_id = ?
      LEFT JOIN community_members cm2 ON c.community_id = cm2.community_id
      WHERE LOWER(c.community_name) LIKE LOWER(?)
      GROUP BY c.community_id`,
      [user_id, searchTerm]
    );
    res.json(result);
  } catch (e) {
    res.status(500).json({ message: "Database error", error: e.message });
  }
});

app.get("/communities/:user_id", async (req, res) => {
  const { user_id } = req.params;
  const sql = `
    SELECT c.community_id AS id, c.community_name, c.community_type, c.description,
      c.fine_rate, c.borrow_limit, c.join_approval, c.created_by,
      COUNT(cm2.user_id) AS members,
      CASE WHEN cm.user_id IS NULL THEN false ELSE true END AS joined
    FROM communities c
    LEFT JOIN community_members cm ON c.community_id = cm.community_id AND cm.user_id = ?
    LEFT JOIN community_members cm2 ON c.community_id = cm2.community_id
    GROUP BY c.community_id`;
  try {
    const result = await query(sql, [user_id]);
    res.json(result);
  } catch (e) {
    res.status(500).json({ message: "Database error" });
  }
});

app.post("/join-community", async (req, res) => {
  const { user_id, community_id } = req.body;
  try {
    const existing = await query("SELECT * FROM community_members WHERE user_id=? AND community_id=?", [user_id, community_id]);
    if (existing.length > 0) return res.json({ message: "Already a member" });

    const comm = await query("SELECT * FROM communities WHERE community_id=?", [community_id]);
    if (!comm.length) return res.status(404).json({ message: "Community not found" });

    if (comm[0].join_approval) {
      // Check if request already pending
      const pending = await query("SELECT * FROM join_requests WHERE user_id=? AND community_id=? AND status='PENDING'", [user_id, community_id]);
      if (pending.length) return res.json({ message: "Join request already pending" });

      await query("INSERT INTO join_requests (user_id, community_id) VALUES (?,?)", [user_id, community_id]);

      // Get requester info
      const requester = await query("SELECT name, email FROM users WHERE user_id=?", [user_id]);
      const requesterName = requester[0]?.name || "Unknown";
      const requesterEmail = requester[0]?.email || "Unknown";
      const communityName = comm[0].community_name;

      // Notify the admin (community creator)
      const adminId = comm[0].created_by;
      await notify(
        adminId,
        `📩 ${requesterName} (${requesterEmail}) has requested to join "${communityName}". Go to the community to accept or reject.`,
        "JOIN"
      );

      // Send email to admin
      try {
        const adminUser = await query("SELECT email, name FROM users WHERE user_id=?", [adminId]);
        if (adminUser.length && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
          const adminEmail = adminUser[0].email;
          const adminName = adminUser[0].name || "Admin";
          const mailOptions = {
            from: process.env.EMAIL_USER,
            to: adminEmail,
            subject: `ShareSphere - New Join Request for "${communityName}"`,
            html: `
              <div style="font-family:Arial,sans-serif;max-width:500px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px;">
                <h2 style="color:#4f46e5;">New Join Request 🔔</h2>
                <p>Hi <strong>${adminName}</strong>,</p>
                <p>A new user has requested to join your community:</p>
                <table style="width:100%;border-collapse:collapse;margin:16px 0;">
                  <tr><td style="padding:8px;color:#6b7280;">Requester Name</td><td style="padding:8px;font-weight:600;">${requesterName}</td></tr>
                  <tr><td style="padding:8px;color:#6b7280;">Requester Email</td><td style="padding:8px;font-weight:600;">${requesterEmail}</td></tr>
                  <tr><td style="padding:8px;color:#6b7280;">Community</td><td style="padding:8px;font-weight:600;">${communityName}</td></tr>
                </table>
                <p>Please log in to ShareSphere to accept or reject the request.</p>
                <p style="color:#9ca3af;font-size:12px;margin-top:20px;">— ShareSphere Platform</p>
              </div>
            `,
          };
          transporter.sendMail(mailOptions, (err) => {
            if (err) console.error("Email to admin failed:", err.message);
            else console.log(`Join request email sent to ${adminEmail}`);
          });
        }
      } catch (emailErr) {
        console.error("Email sending error (non-blocking):", emailErr.message);
      }

      return res.json({ message: "Join request sent, awaiting approval" });
    }

    await query("INSERT INTO community_members (user_id,community_id) VALUES (?,?)", [user_id, community_id]);
    res.json({ message: "Joined successfully", community_id });
  } catch (e) {
    console.error("Join error:", e);
    res.status(500).json({ message: "Join failed" });
  }
});

app.post("/leave-community", async (req, res) => {
  const { user_id, community_id } = req.body;
  try {
    const comm = await query("SELECT created_by, community_name FROM communities WHERE community_id=?", [community_id]);
    if (!comm.length) return res.status(404).json({ message: "Community not found" });

    if (comm[0].created_by === parseInt(user_id)) {
      return res.status(400).json({ message: "You cannot leave a community you created. Transfer ownership or delete it." });
    }

    const user = await query("SELECT name FROM users WHERE user_id=?", [user_id]);
    const userName = user[0]?.name || "A member";

    await query("DELETE FROM community_members WHERE user_id=? AND community_id=?", [user_id, community_id]);
    
    // Broadcast message
    await query("INSERT INTO community_posts (community_id, user_id, content) VALUES (?, ?, ?)", [community_id, comm[0].created_by, `System: ${userName} left the community.`]);
    
    // Notify owner
    await notify(comm[0].created_by, `${userName} left ${comm[0].community_name}`, "INFO");

    res.json({ message: "Left community successfully" });
  } catch (e) {
    res.status(500).json({ message: "Leave failed" });
  }
});

app.get("/community/:id", async (req, res) => {
  const id = req.params.id;
  try {
    const community = await query("SELECT * FROM communities WHERE community_id=?", [id]);
    const members = await query(
      `SELECT users.user_id, users.name, community_members.role
       FROM community_members JOIN users ON users.user_id = community_members.user_id
       WHERE community_members.community_id=?`, [id]
    );
    res.json({ community: community[0], members });
  } catch (e) {
    res.status(500).json(e);
  }
});

// Community settings (admin only)
app.put("/community/:id/settings", async (req, res) => {
  const { fine_rate, borrow_limit, join_approval, user_id } = req.body;
  try {
    const adminCheck = await query(
      "SELECT role FROM community_members WHERE user_id=? AND community_id=?",
      [user_id, req.params.id]
    );
    if (!adminCheck.length || adminCheck[0].role !== "ADMIN")
      return res.status(403).json({ message: "Only community admin can change settings" });

    await query(
      "UPDATE communities SET fine_rate=?, borrow_limit=?, join_approval=? WHERE community_id=?",
      [fine_rate, borrow_limit, join_approval, req.params.id]
    );
    res.json({ message: "Settings updated" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Join requests (admin)
app.get("/join-requests/:community_id", async (req, res) => {
  try {
    const rows = await query(
      `SELECT jr.request_id, jr.user_id, u.name, u.email, jr.status, jr.created_at
       FROM join_requests jr JOIN users u ON jr.user_id = u.user_id
       WHERE jr.community_id=? AND jr.status='PENDING'`,
      [req.params.community_id]
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/approve-join", async (req, res) => {
  const { request_id, action, user_id: admin_id, community_id } = req.body;
  try {
    const req_row = await query("SELECT * FROM join_requests WHERE request_id=?", [request_id]);
    if (!req_row.length) return res.status(404).json({ message: "Request not found" });

    // Get community name for better notification
    const comm = await query("SELECT community_name FROM communities WHERE community_id=?", [community_id || req_row[0].community_id]);
    const communityName = comm[0]?.community_name || "the community";
    const effectiveCommunityId = community_id || req_row[0].community_id;

    if (action === "APPROVE") {
      // Prevent duplicate member insertion
      const alreadyMember = await query(
        "SELECT * FROM community_members WHERE user_id=? AND community_id=?",
        [req_row[0].user_id, effectiveCommunityId]
      );
      if (!alreadyMember.length) {
        await query("INSERT INTO community_members (user_id,community_id) VALUES (?,?)", [req_row[0].user_id, effectiveCommunityId]);
      }
      await notify(req_row[0].user_id, `✅ Your request to join "${communityName}" was accepted! You are now a member.`, "JOIN");
    } else {
      await notify(req_row[0].user_id, `❌ Your request to join "${communityName}" was rejected.`, "JOIN");
    }
    await query("UPDATE join_requests SET status=? WHERE request_id=?", [action === "APPROVE" ? "APPROVED" : "REJECTED", request_id]);
    res.json({ message: `Request ${action === "APPROVE" ? "approved" : "rejected"}` });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get ALL pending join requests for communities the user is admin of
app.get("/my-admin-requests/:user_id", async (req, res) => {
  try {
    const rows = await query(
      `SELECT jr.request_id, jr.user_id AS requester_id, u.name AS requester_name, u.email AS requester_email,
        c.community_id, c.community_name, jr.status, jr.created_at
       FROM join_requests jr
       JOIN users u ON jr.user_id = u.user_id
       JOIN communities c ON jr.community_id = c.community_id
       WHERE c.created_by = ? AND jr.status = 'PENDING'
       ORDER BY jr.created_at DESC`,
      [req.params.user_id]
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Community posts
app.post("/create-post", async (req, res) => {
  const { community_id, user_id, content } = req.body;
  if (!content?.trim()) return res.status(400).json({ message: "Content required" });
  try {
    await query("INSERT INTO community_posts (community_id,user_id,content) VALUES (?,?,?)", [community_id, user_id, content]);
    res.json({ message: "Post created" });
  } catch (e) {
    res.status(500).json({ message: "Post failed" });
  }
});

app.get("/community-posts/:id", async (req, res) => {
  try {
    const result = await query(
      `SELECT community_posts.post_id, community_posts.content, community_posts.created_at, users.name
       FROM community_posts JOIN users ON users.user_id = community_posts.user_id
       WHERE community_posts.community_id=? ORDER BY community_posts.created_at DESC`,
      [req.params.id]
    );
    res.json(result);
  } catch (e) {
    res.status(500).json({ message: "Error fetching posts" });
  }
});

app.get("/user-communities/:user_id", async (req, res) => {
  try {
    const result = await query(
      `SELECT communities.community_id AS id, communities.community_name, communities.community_type, communities.description
       FROM community_members JOIN communities ON community_members.community_id = communities.community_id
       WHERE community_members.user_id=?`,
      [req.params.user_id]
    );
    res.json(result);
  } catch (e) {
    res.status(500).json({ message: "Error fetching" });
  }
});

// ── MODULE 3: RESOURCES ──────────────────────────────────────────────────────

// Get resources for a community
app.get("/resources/:community_id", async (req, res) => {
  try {
    const rows = await query(
      `SELECT r.*, u.name AS owner_name
       FROM resources r JOIN users u ON r.owner_id = u.user_id
       WHERE r.community_id=? AND r.approval_status='APPROVED'
       ORDER BY r.created_at DESC`,
      [req.params.community_id]
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Add resource
app.post("/resource", upload.single("image"), async (req, res) => {
  const {
    community_id, user_id, name, description, category, quantity, item_condition,
    availability, deposit_amount, fine_per_day, pickup_method, max_days_allowed
  } = req.body;
  const image_url = req.file ? `/uploads/${req.file.filename}` : null;
  if (!name || !community_id || !user_id)
    return res.status(400).json({ message: "Name, community and user required" });
  try {
    // Check if admin (auto-approve) or regular member (pending)
    const admin = await query(
      "SELECT role FROM community_members WHERE user_id=? AND community_id=?",
      [user_id, community_id]
    );
    const approval_status = "APPROVED";
    await query(
      `INSERT INTO resources (community_id, owner_id, name, description, category, quantity, available_quantity, item_condition, image_url, approval_status, availability, deposit_amount, fine_per_day, pickup_method, max_days_allowed)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        community_id, user_id, name, description, category,
        quantity || 1, quantity || 1, item_condition || "Good",
        image_url, approval_status,
        availability || "Available",
        parseFloat(deposit_amount) || 0,
        parseFloat(fine_per_day) || 0,
        pickup_method || null,
        parseInt(max_days_allowed) || 7
      ]
    );
    res.json({ message: "Resource added", approval_status });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Edit resource
app.put("/resource/:id", async (req, res) => {
  const { name, description, category, quantity, item_condition, user_id } = req.body;
  try {
    const res_row = await query("SELECT * FROM resources WHERE resource_id=?", [req.params.id]);
    if (!res_row.length) return res.status(404).json({ message: "Resource not found" });
    if (res_row[0].owner_id !== parseInt(user_id))
      return res.status(403).json({ message: "Only owner can edit" });
    await query(
      "UPDATE resources SET name=?, description=?, category=?, quantity=?, item_condition=? WHERE resource_id=?",
      [name, description, category, quantity, item_condition, req.params.id]
    );
    res.json({ message: "Resource updated" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Delete resource
app.delete("/resource/:id", async (req, res) => {
  const { user_id } = req.body;
  try {
    const res_row = await query("SELECT * FROM resources WHERE resource_id=?", [req.params.id]);
    if (!res_row.length) return res.status(404).json({ message: "Resource not found" });
    if (res_row[0].owner_id !== parseInt(user_id))
      return res.status(403).json({ message: "Only owner can delete" });
    await query("DELETE FROM resources WHERE resource_id=?", [req.params.id]);
    res.json({ message: "Resource deleted" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Admin approve resource
app.post("/resource/:id/approve", async (req, res) => {
  const { user_id, action } = req.body;
  try {
    const res_row = await query("SELECT * FROM resources WHERE resource_id=?", [req.params.id]);
    if (!res_row.length) return res.status(404).json({ message: "Resource not found" });
    const admin = await query(
      "SELECT role FROM community_members WHERE user_id=? AND community_id=?",
      [user_id, res_row[0].community_id]
    );
    if (!admin.length || admin[0].role !== "ADMIN")
      return res.status(403).json({ message: "Admin only" });
    const status = action === "APPROVE" ? "APPROVED" : "REJECTED";
    await query("UPDATE resources SET approval_status=? WHERE resource_id=?", [status, req.params.id]);
    await notify(res_row[0].owner_id, `Your resource "${res_row[0].name}" was ${status.toLowerCase()}.`, "RESOURCE");
    res.json({ message: `Resource ${status.toLowerCase()}` });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get pending resources (admin)
app.get("/resources/:community_id/pending", async (req, res) => {
  try {
    const rows = await query(
      `SELECT r.*, u.name AS owner_name FROM resources r JOIN users u ON r.owner_id = u.user_id
       WHERE r.community_id=? AND r.approval_status='PENDING'`,
      [req.params.community_id]
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── MODULE 4: BOOKING ────────────────────────────────────────────────────────

// Create booking request
app.post("/booking", async (req, res) => {
  const { resource_id, borrower_id, community_id, start_date, end_date } = req.body;
  if (!resource_id || !borrower_id || !start_date || !end_date)
    return res.status(400).json({ message: "All fields required" });
  try {
    // Check resource exists and available
    const res_row = await query("SELECT * FROM resources WHERE resource_id=?", [resource_id]);
    if (!res_row.length) return res.status(404).json({ message: "Resource not found" });
    if (res_row[0].available_quantity < 1)
      return res.json({ message: "Resource not available. You can join the waitlist." });

    // Check borrower is member
    const member = await query(
      "SELECT * FROM community_members WHERE user_id=? AND community_id=?",
      [borrower_id, community_id]
    );
    if (!member.length) return res.status(403).json({ message: "You must be a member to borrow" });

    // Check borrow limit
    const comm = await query("SELECT borrow_limit FROM communities WHERE community_id=?", [community_id]);
    const active = await query(
      "SELECT COUNT(*) AS cnt FROM bookings WHERE borrower_id=? AND community_id=? AND status IN ('REQUESTED','APPROVED','ACTIVE')",
      [borrower_id, community_id]
    );
    if (active[0].cnt >= comm[0].borrow_limit)
      return res.json({ message: `Borrow limit (${comm[0].borrow_limit}) reached for this community` });

    // Check date conflict
    const conflict = await query(
      `SELECT * FROM bookings WHERE resource_id=?
       AND status IN ('APPROVED','ACTIVE')
       AND NOT (end_date < ? OR start_date > ?)`,
      [resource_id, start_date, end_date]
    );
    if (conflict.length)
      return res.json({ message: "Resource already booked for these dates" });

    await query(
      "INSERT INTO bookings (resource_id, borrower_id, community_id, start_date, end_date) VALUES (?,?,?,?,?)",
      [resource_id, borrower_id, community_id, start_date, end_date]
    );

    // Notify resource owner
    await notify(res_row[0].owner_id, `Someone requested to borrow your resource "${res_row[0].name}"`, "BOOKING");
    res.json({ message: "Booking requested" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get bookings for admin (community)
app.get("/bookings/community/:community_id", async (req, res) => {
  try {
    const rows = await query(
      `SELECT b.*, r.name AS resource_name, u.name AS borrower_name, u.trust_score
       FROM bookings b
       JOIN resources r ON b.resource_id = r.resource_id
       JOIN users u ON b.borrower_id = u.user_id
       WHERE b.community_id=?
       ORDER BY b.created_at DESC`,
      [req.params.community_id]
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get my bookings
app.get("/bookings/user/:user_id", async (req, res) => {
  try {
    const rows = await query(
      `SELECT b.*, r.name AS resource_name, r.image_url, c.community_name
       FROM bookings b
       JOIN resources r ON b.resource_id = r.resource_id
       JOIN communities c ON b.community_id = c.community_id
       WHERE b.borrower_id=?
       ORDER BY b.created_at DESC`,
      [req.params.user_id]
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get incoming requests for my items
app.get("/incoming-requests/:user_id", async (req, res) => {
  try {
    const rows = await query(
      `SELECT b.*, r.name AS resource_name, c.community_name, u.name AS borrower_name
       FROM bookings b
       JOIN resources r ON b.resource_id = r.resource_id
       JOIN communities c ON b.community_id = c.community_id
       JOIN users u ON b.borrower_id = u.user_id
       WHERE r.owner_id=? AND b.status='REQUESTED'
       ORDER BY b.created_at DESC`,
      [req.params.user_id]
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Approve booking
app.post("/booking/:id/approve", async (req, res) => {
  const { user_id } = req.body;
  try {
    const booking = await query("SELECT * FROM bookings WHERE booking_id=?", [req.params.id]);
    if (!booking.length) return res.status(404).json({ message: "Booking not found" });

    const res_row = await query("SELECT owner_id FROM resources WHERE resource_id=?", [booking[0].resource_id]);
    const isOwner = res_row.length > 0 && res_row[0].owner_id === parseInt(user_id);

    const admin = await query(
      "SELECT role FROM community_members WHERE user_id=? AND community_id=?",
      [user_id, booking[0].community_id]
    );
    const isAdmin = admin.length > 0 && admin[0].role === "ADMIN";

    if (!isOwner && !isAdmin)
      return res.status(403).json({ message: "Only resource owner or admin can approve" });

    await query("UPDATE bookings SET status='ACTIVE' WHERE booking_id=?", [req.params.id]);
    await query("UPDATE resources SET available_quantity = available_quantity - 1 WHERE resource_id=?", [booking[0].resource_id]);
    await notify(booking[0].borrower_id, "Your booking was approved! Pick up the item.", "BOOKING");
    res.json({ message: "Booking approved" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Reject booking
app.post("/booking/:id/reject", async (req, res) => {
  const { user_id, reason } = req.body;
  try {
    const booking = await query("SELECT * FROM bookings WHERE booking_id=?", [req.params.id]);
    if (!booking.length) return res.status(404).json({ message: "Booking not found" });

    const res_row = await query("SELECT owner_id FROM resources WHERE resource_id=?", [booking[0].resource_id]);
    const isOwner = res_row.length > 0 && res_row[0].owner_id === parseInt(user_id);

    const admin = await query(
      "SELECT role FROM community_members WHERE user_id=? AND community_id=?",
      [user_id, booking[0].community_id]
    );
    const isAdmin = admin.length > 0 && admin[0].role === "ADMIN";

    if (!isOwner && !isAdmin)
      return res.status(403).json({ message: "Only resource owner or admin can reject" });

    await query("UPDATE bookings SET status='REJECTED' WHERE booking_id=?", [req.params.id]);
    await notify(booking[0].borrower_id, `Your booking was rejected. ${reason || ""}`, "BOOKING");
    res.json({ message: "Booking rejected" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Return booking
app.post("/booking/:id/return", async (req, res) => {
  const { user_id } = req.body;
  try {
    const booking = await query("SELECT * FROM bookings WHERE booking_id=?", [req.params.id]);
    if (!booking.length) return res.status(404).json({ message: "Booking not found" });
    if (booking[0].borrower_id !== parseInt(user_id))
      return res.status(403).json({ message: "Only borrower can return" });

    await query("UPDATE bookings SET status='RETURNED' WHERE booking_id=?", [req.params.id]);
    await query("UPDATE resources SET available_quantity = available_quantity + 1 WHERE resource_id=?", [booking[0].resource_id]);

    // Check if waitlisted
    const waitlisted = await query(
      "SELECT * FROM waitlist WHERE resource_id=? ORDER BY requested_at LIMIT 1",
      [booking[0].resource_id]
    );
    if (waitlisted.length) {
      await notify(waitlisted[0].user_id, "A resource you're on the waitlist for is now available!", "WAITLIST");
    }

    // Notify for rating
    const res_row = await query("SELECT * FROM resources WHERE resource_id=?", [booking[0].resource_id]);
    await notify(res_row[0].owner_id, `"${res_row[0].name}" was returned. Please rate the borrower.`, "RATING");
    await notify(booking[0].borrower_id, "Please rate the lender for your recent borrow.", "RATING");

    res.json({ message: "Returned successfully", booking_id: booking[0].booking_id });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Extend booking request
app.post("/booking/:id/extend", async (req, res) => {
  const { user_id, days } = req.body;
  try {
    const booking = await query("SELECT * FROM bookings WHERE booking_id=?", [req.params.id]);
    if (!booking.length) return res.status(404).json({ message: "Booking not found" });
    if (booking[0].borrower_id !== parseInt(user_id))
      return res.status(403).json({ message: "Only borrower can extend" });

    // Calculate new end date: current end_date + days
    const currentEndDate = new Date(booking[0].end_date);
    currentEndDate.setDate(currentEndDate.getDate() + parseInt(days));
    const newEndDate = currentEndDate.toISOString().split('T')[0];

    await query("UPDATE bookings SET extend_requested=TRUE, end_date=? WHERE booking_id=?", [newEndDate, req.params.id]);
    await notify(booking[0].borrower_id, `Extension for ${days} days requested.`, "BOOKING");
    res.json({ message: `Extension for ${days} days requested` });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Waitlist
app.post("/waitlist", async (req, res) => {
  const { resource_id, user_id } = req.body;
  try {
    const exists = await query("SELECT * FROM waitlist WHERE resource_id=? AND user_id=?", [resource_id, user_id]);
    if (exists.length) return res.json({ message: "Already on waitlist" });
    await query("INSERT INTO waitlist (resource_id, user_id) VALUES (?,?)", [resource_id, user_id]);
    res.json({ message: "Added to waitlist" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/waitlist/:resource_id", async (req, res) => {
  try {
    const rows = await query(
      `SELECT w.*, u.name FROM waitlist w JOIN users u ON w.user_id = u.user_id
       WHERE w.resource_id=? ORDER BY w.requested_at`,
      [req.params.resource_id]
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── MODULE 5: FINES ──────────────────────────────────────────────────────────

app.get("/fines/:user_id", async (req, res) => {
  try {
    const rows = await query(
      `SELECT f.*, b.start_date, b.end_date, r.name AS resource_name
       FROM fines f
       JOIN bookings b ON f.booking_id = b.booking_id
       JOIN resources r ON b.resource_id = r.resource_id
       WHERE f.user_id=?
       ORDER BY f.created_at DESC`,
      [req.params.user_id]
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/fine/:id/pay", async (req, res) => {
  try {
    await query("UPDATE fines SET paid=TRUE WHERE fine_id=?", [req.params.id]);
    res.json({ message: "Fine paid successfully" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── MODULE 6: NOTIFICATIONS ──────────────────────────────────────────────────

app.get("/notifications/:user_id", async (req, res) => {
  try {
    const rows = await query(
      "SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 50",
      [req.params.user_id]
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/notifications/:id/read", async (req, res) => {
  try {
    await query("UPDATE notifications SET read_status=TRUE WHERE notification_id=?", [req.params.id]);
    res.json({ message: "Marked as read" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/notifications/read-all", async (req, res) => {
  const { user_id } = req.body;
  try {
    await query("UPDATE notifications SET read_status=TRUE WHERE user_id=?", [user_id]);
    res.json({ message: "All marked as read" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── MODULE 7: RATINGS ────────────────────────────────────────────────────────

app.post("/rating", async (req, res) => {
  const { booking_id, rater_id, ratee_id, score, comment } = req.body;
  if (!score || score < 1 || score > 5)
    return res.status(400).json({ message: "Score must be 1-5" });
  try {
    const exists = await query(
      "SELECT * FROM ratings WHERE booking_id=? AND rater_id=?",
      [booking_id, rater_id]
    );
    if (exists.length) return res.json({ message: "Already rated" });

    await query(
      "INSERT INTO ratings (booking_id, rater_id, ratee_id, score, comment) VALUES (?,?,?,?,?)",
      [booking_id, rater_id, ratee_id, score, comment]
    );

    // Recalculate trust score
    const scores = await query(
      "SELECT AVG(score) AS avg_score FROM ratings WHERE ratee_id=?",
      [ratee_id]
    );
    const newScore = parseFloat(scores[0].avg_score).toFixed(2);
    await query("UPDATE users SET trust_score=? WHERE user_id=?", [newScore, ratee_id]);

    res.json({ message: "Rating submitted", new_trust_score: newScore });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/trust/:user_id", async (req, res) => {
  try {
    const user = await query(
      "SELECT user_id, name, trust_score FROM users WHERE user_id=?",
      [req.params.user_id]
    );
    if (!user.length) return res.status(404).json({ message: "User not found" });

    const ratings = await query(
      `SELECT r.score, r.comment, r.created_at, u.name AS rater_name
       FROM ratings r JOIN users u ON r.rater_id = u.user_id
       WHERE r.ratee_id=? ORDER BY r.created_at DESC`,
      [req.params.user_id]
    );
    res.json({ ...user[0], ratings });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── MODULE 8: DASHBOARD & ANALYTICS ─────────────────────────────────────────

app.get("/dashboard/:community_id", async (req, res) => {
  const id = req.params.community_id;
  try {
    const [
      topResources, topBorrowers, fineTotal,
      overdueCount, activeBookings, totalMembers, totalResources,
      pendingResources, allBookings
    ] = await Promise.all([
      query(
        `SELECT r.resource_id, r.name, COUNT(b.booking_id) AS borrow_count
                 FROM bookings b JOIN resources r ON b.resource_id = r.resource_id
                 WHERE b.community_id=? GROUP BY b.resource_id ORDER BY borrow_count DESC LIMIT 5`,
        [id]
      ),
      query(
        `SELECT u.user_id, u.name, COUNT(b.booking_id) AS borrow_count
                 FROM bookings b JOIN users u ON b.borrower_id = u.user_id
                 WHERE b.community_id=? GROUP BY b.borrower_id ORDER BY borrow_count DESC LIMIT 5`,
        [id]
      ),
      query("SELECT COALESCE(SUM(amount), 0) AS total FROM fines WHERE paid=TRUE"),
      query("SELECT COUNT(*) AS cnt FROM bookings WHERE community_id=? AND status='OVERDUE'", [id]),
      query("SELECT COUNT(*) AS cnt FROM bookings WHERE community_id=? AND status='ACTIVE'", [id]),
      query("SELECT COUNT(*) AS cnt FROM community_members WHERE community_id=?", [id]),
      query("SELECT COUNT(*) AS cnt FROM resources WHERE community_id=?", [id]),
      query(
        `SELECT r.*, u.name AS owner_name FROM resources r JOIN users u ON r.owner_id = u.user_id
                 WHERE r.community_id=? AND r.approval_status='PENDING'`,
        [id]
      ),
      query(
        `SELECT b.*, r.name, u.name AS borrower_name
                 FROM bookings b JOIN resources r ON b.resource_id = r.resource_id
                 JOIN users u ON b.borrower_id = u.user_id
                 WHERE b.community_id=? ORDER BY b.created_at DESC`,
        [id]
      )
    ]);

    res.json({
      pendingResources,
      allBookings,
      topResources,
      topBorrowers,
      stats: {
        fineTotal: parseFloat(fineTotal[0].total).toFixed(2),
        finesCollected: parseFloat(fineTotal[0].total).toFixed(2),
        overdueCount: overdueCount[0].cnt,
        overdueBookings: overdueCount[0].cnt,
        activeBookings: activeBookings[0].cnt,
        totalMembers: totalMembers[0].cnt,
        totalResources: totalResources[0].cnt
      }
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── MODULE 10: SUPER ADMIN ───────────────────────────────────────────────────

app.get("/admin/communities", async (req, res) => {
  try {
    const rows = await query(
      `SELECT c.*, COUNT(cm.user_id) AS member_count
       FROM communities c LEFT JOIN community_members cm ON c.community_id = cm.community_id
       GROUP BY c.community_id ORDER BY c.created_at DESC`
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/admin/analytics", async (req, res) => {
  try {
    const [users, communities, bookings, fines, overdue] = await Promise.all([
      query("SELECT COUNT(*) AS cnt FROM users"),
      query("SELECT COUNT(*) AS cnt FROM communities"),
      query("SELECT COUNT(*) AS cnt FROM bookings"),
      query("SELECT COALESCE(SUM(amount),0) AS total FROM fines"),
      query("SELECT COUNT(*) AS cnt FROM bookings WHERE status='OVERDUE'"),
    ]);
    res.json({
      totalUsers: users[0].cnt,
      totalCommunities: communities[0].cnt,
      totalBookings: bookings[0].cnt,
      totalFines: fines[0].total,
      overdueBookings: overdue[0].cnt,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/admin/suspend-community/:id", async (req, res) => {
  try {
    await query("DELETE FROM community_members WHERE community_id=?", [req.params.id]);
    await query("DELETE FROM communities WHERE community_id=?", [req.params.id]);
    res.json({ message: "Community suspended/removed" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/admin/remove-user/:id", async (req, res) => {
  try {
    await query("UPDATE users SET suspended=TRUE WHERE user_id=?", [req.params.id]);
    res.json({ message: "User suspended" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/admin/users", async (req, res) => {
  try {
    const rows = await query(
      "SELECT user_id, name, email, role, trust_score, suspended, created_at FROM users ORDER BY created_at DESC"
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── MODULE 5 BG: OVERDUE SCANNER ─────────────────────────────────────────────
const scanOverdue = async () => {
  try {
    const overdueBookings = await query(
      `SELECT b.*, c.fine_rate FROM bookings b
       JOIN communities c ON b.community_id = c.community_id
       WHERE b.status = 'ACTIVE' AND b.end_date < CURDATE()`
    );

    for (const booking of overdueBookings) {
      const days = Math.floor((new Date() - new Date(booking.end_date)) / (1000 * 60 * 60 * 24));
      const fine_amount = days * parseFloat(booking.fine_rate);

      await query("UPDATE bookings SET status='OVERDUE', fine_amount=? WHERE booking_id=?", [fine_amount, booking.booking_id]);

      // Record fine if not already recorded
      const existingFine = await query("SELECT * FROM fines WHERE booking_id=?", [booking.booking_id]);
      if (!existingFine.length) {
        await query(
          "INSERT INTO fines (booking_id, user_id, amount, reason) VALUES (?,?,?,?)",
          [booking.booking_id, booking.borrower_id, fine_amount, `Overdue by ${days} day(s)`]
        );
        await notify(booking.borrower_id, `You have an overdue fine of ₹${fine_amount}.Please return the item and pay the fine.`, "FINE");

        // Check for suspension (3+ unpaid fines)
        const unpaidFines = await query(
          "SELECT COUNT(*) AS cnt FROM fines WHERE user_id=? AND paid=FALSE",
          [booking.borrower_id]
        );
        if (unpaidFines[0].cnt >= 3) {
          await query("UPDATE users SET suspended=TRUE WHERE user_id=?", [booking.borrower_id]);
          await notify(booking.borrower_id, "Your account has been suspended due to 3+ unpaid fines.", "SUSPENSION");
        }
      }
    }

    // Notify due-tomorrow bookings
    const dueTomorrow = await query(
      `SELECT * FROM bookings WHERE status = 'ACTIVE' AND end_date = DATE_ADD(CURDATE(), INTERVAL 1 DAY)`
    );
    for (const b of dueTomorrow) {
      await notify(b.borrower_id, "Reminder: Your borrowed item is due tomorrow!", "REMINDER");
    }
  } catch (e) {
    console.error("Overdue scanner error:", e.message);
  }
};

// Run overdue scan every hour
setInterval(scanOverdue, 60 * 60 * 1000);
// Also run once at startup
scanOverdue();

// ── MODULE 11: BORROW REQUESTS ───────────────────────────────────────────────

// Create borrow request
app.post("/borrow-request", async (req, res) => {
  const { resource_id, borrower_id, community_id, borrow_from_date, expected_return_date, purpose } = req.body;
  if (!resource_id || !borrower_id || !community_id || !borrow_from_date || !expected_return_date)
    return res.status(400).json({ message: "All fields are required" });
  try {
    // Get resource and owner
    const res_row = await query("SELECT * FROM resources WHERE resource_id=?", [resource_id]);
    if (!res_row.length) return res.status(404).json({ message: "Resource not found" });

    const owner_id = res_row[0].owner_id;

    // Can't borrow own item
    if (parseInt(borrower_id) === owner_id)
      return res.json({ message: "You cannot borrow your own resource" });

    // Check borrower is community member
    const member = await query(
      "SELECT * FROM community_members WHERE user_id=? AND community_id=?",
      [borrower_id, community_id]
    );
    if (!member.length) return res.status(403).json({ message: "You must be a community member to borrow" });

    // Check resource availability
    if (res_row[0].available_quantity < 1)
      return res.json({ message: "Resource is currently not available" });

    // Check for duplicate pending request
    const existing = await query(
      "SELECT * FROM borrow_requests WHERE resource_id=? AND borrower_id=? AND status='PENDING'",
      [resource_id, borrower_id]
    );
    if (existing.length)
      return res.json({ message: "You already have a pending request for this resource" });

    // Validate Dates
    const fromDate = new Date(borrow_from_date);
    const toDate = new Date(expected_return_date);

    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      return res.status(400).json({ error: "Invalid date format" });
    }

    const todayStr = new Date().toISOString().split("T")[0];
    const today = new Date(todayStr);

    if (fromDate < today) {
      return res.status(400).json({ error: "Borrow date cannot be in the past" });
    }

    const diffDays = Math.ceil((toDate - fromDate) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) {
      return res.status(400).json({ error: "Return date must be equal to or after borrow date" });
    }

    // Check max_days_allowed
    const maxDays = res_row[0].max_days_allowed || 7;
    if (diffDays > maxDays) {
      return res.status(400).json({ error: `Maximum borrow duration is ${maxDays} days` });
    }

    await query(
      `INSERT INTO borrow_requests (resource_id, borrower_id, owner_id, community_id, borrow_from_date, expected_return_date, purpose)
       VALUES (?,?,?,?,?,?,?)`,
      [resource_id, borrower_id, owner_id, community_id, borrow_from_date, expected_return_date, purpose || null]
    );

    // Notify owner
    const borrowerInfo = await query("SELECT name FROM users WHERE user_id=?", [borrower_id]);
    const borrowerName = borrowerInfo[0]?.name || "Someone";
    await notify(owner_id, `📩 ${borrowerName} requested to borrow "${res_row[0].name}"`, "BOOKING");

    res.json({ message: "Borrow request sent successfully" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get borrow requests for owner's resources
app.get("/owner/requests/:user_id", async (req, res) => {
  try {
    const rows = await query(
      `SELECT br.*, r.name AS resource_name, r.image_url,
              u.name AS borrower_name, u.email AS borrower_email, u.trust_score AS borrower_trust,
              c.community_name
       FROM borrow_requests br
       JOIN resources r ON br.resource_id = r.resource_id
       JOIN users u ON br.borrower_id = u.user_id
       JOIN communities c ON br.community_id = c.community_id
       WHERE br.owner_id=?
       ORDER BY br.created_at DESC`,
      [req.params.user_id]
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get borrow requests made by a user (borrower view)
app.get("/my-borrow-requests/:user_id", async (req, res) => {
  try {
    const rows = await query(
      `SELECT br.*, r.name AS resource_name, r.image_url,
              u.name AS owner_name, c.community_name
       FROM borrow_requests br
       JOIN resources r ON br.resource_id = r.resource_id
       JOIN users u ON br.owner_id = u.user_id
       JOIN communities c ON br.community_id = c.community_id
       WHERE br.borrower_id=?
       ORDER BY br.created_at DESC`,
      [req.params.user_id]
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Accept borrow request → creates borrow_transaction
app.post("/request/:id/accept", async (req, res) => {
  const { user_id } = req.body;
  try {
    const reqRow = await query("SELECT * FROM borrow_requests WHERE id=?", [req.params.id]);
    if (!reqRow.length) return res.status(404).json({ message: "Request not found" });
    if (reqRow[0].status !== "PENDING")
      return res.json({ message: `Request already ${reqRow[0].status.toLowerCase()}` });

    // Verify requester is the owner
    if (reqRow[0].owner_id !== parseInt(user_id))
      return res.status(403).json({ message: "Only the resource owner can accept" });

    // Check resource still available
    const resource = await query("SELECT * FROM resources WHERE resource_id=?", [reqRow[0].resource_id]);
    if (!resource.length || resource[0].available_quantity < 1)
      return res.json({ message: "Resource is no longer available" });

    // Update request status
    await query("UPDATE borrow_requests SET status='ACCEPTED' WHERE id=?", [req.params.id]);

    // Decrease available quantity
    await query("UPDATE resources SET available_quantity = available_quantity - 1 WHERE resource_id=?", [reqRow[0].resource_id]);

    // Create borrow_transaction (SOURCE OF TRUTH)
    const today = new Date().toISOString().split("T")[0];
    const pickup_otp = Math.floor(100000 + Math.random() * 900000).toString();

    await query(
      `INSERT INTO borrow_transactions
        (borrower_id, owner_id, resource_id, community_id, request_date, approved_date, due_date, pickup_otp)
       VALUES (?,?,?,?,?,?,?,?)`,
      [
        reqRow[0].borrower_id, reqRow[0].owner_id, reqRow[0].resource_id,
        reqRow[0].community_id, reqRow[0].borrow_from_date, today,
        reqRow[0].expected_return_date, pickup_otp
      ]
    );

    // Notify borrower
    const resourceInfo = await query("SELECT name FROM resources WHERE resource_id=?", [reqRow[0].resource_id]);
    await notify(reqRow[0].borrower_id, `✅ Your request to borrow "${resourceInfo[0]?.name}" has been accepted!`, "BOOKING");

    res.json({ message: "Request accepted and transaction created" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Reject borrow request
app.post("/request/:id/reject", async (req, res) => {
  const { user_id, reason } = req.body;
  try {
    const reqRow = await query("SELECT * FROM borrow_requests WHERE id=?", [req.params.id]);
    if (!reqRow.length) return res.status(404).json({ message: "Request not found" });
    if (reqRow[0].status !== "PENDING")
      return res.json({ message: `Request already ${reqRow[0].status.toLowerCase()}` });

    if (reqRow[0].owner_id !== parseInt(user_id))
      return res.status(403).json({ message: "Only the resource owner can reject" });

    await query("UPDATE borrow_requests SET status='REJECTED' WHERE id=?", [req.params.id]);

    const resourceInfo = await query("SELECT name FROM resources WHERE resource_id=?", [reqRow[0].resource_id]);
    await notify(
      reqRow[0].borrower_id,
      `❌ Your request to borrow "${resourceInfo[0]?.name}" was rejected. ${reason || ""}`,
      "BOOKING"
    );

    res.json({ message: "Request rejected" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get borrow transactions for a user
app.get("/my-transactions/:user_id", async (req, res) => {
  try {
    const rows = await query(
      `SELECT bt.*, r.name AS resource_name, r.image_url,
              c.community_name,
              CASE WHEN bt.borrower_id = ? THEN ow.name ELSE bw.name END AS other_party_name
       FROM borrow_transactions bt
       JOIN resources r ON bt.resource_id = r.resource_id
       JOIN communities c ON bt.community_id = c.community_id
       JOIN users ow ON bt.owner_id = ow.user_id
       JOIN users bw ON bt.borrower_id = bw.user_id
       WHERE bt.borrower_id=? OR bt.owner_id=?
       ORDER BY bt.created_at DESC`,
      [req.params.user_id, req.params.user_id, req.params.user_id]
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── MODULE 12: DELETE ACCOUNT ────────────────────────────────────────────────

// Get communities where user is admin/creator
app.get("/admin-communities/:user_id", async (req, res) => {
  try {
    const rows = await query(
      `SELECT c.community_id, c.community_name, c.created_by,
              (SELECT COUNT(*) FROM community_members WHERE community_id = c.community_id) AS member_count
       FROM communities c
       WHERE c.created_by = ?`,
      [req.params.user_id]
    );

    // For each community, also get members (for transfer dropdown)
    const result = [];
    for (const comm of rows) {
      const members = await query(
        `SELECT u.user_id, u.name, u.email FROM community_members cm
         JOIN users u ON cm.user_id = u.user_id
         WHERE cm.community_id = ? AND cm.user_id != ?`,
        [comm.community_id, req.params.user_id]
      );
      result.push({ ...comm, members });
    }
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Transfer community ownership
app.post("/transfer-ownership", async (req, res) => {
  const { community_id, current_owner_id, new_owner_id } = req.body;
  if (!community_id || !current_owner_id || !new_owner_id)
    return res.status(400).json({ message: "All fields required" });
  try {
    const comm = await query("SELECT * FROM communities WHERE community_id=?", [community_id]);
    if (!comm.length) return res.status(404).json({ message: "Community not found" });
    if (comm[0].created_by !== parseInt(current_owner_id))
      return res.status(403).json({ message: "Only the creator can transfer ownership" });

    // Update community creator
    await query("UPDATE communities SET created_by=? WHERE community_id=?", [new_owner_id, community_id]);

    // Update roles: old admin → member, new owner → admin
    await query(
      "UPDATE community_members SET role='MEMBER' WHERE user_id=? AND community_id=?",
      [current_owner_id, community_id]
    );
    await query(
      "UPDATE community_members SET role='ADMIN' WHERE user_id=? AND community_id=?",
      [new_owner_id, community_id]
    );

    const oldOwner = await query("SELECT name FROM users WHERE user_id=?", [current_owner_id]);
    const newOwner = await query("SELECT name FROM users WHERE user_id=?", [new_owner_id]);
    const oldName = oldOwner[0]?.name || "Old Owner";
    const newName = newOwner[0]?.name || "New Owner";

    // Broadcast message to community wall
    await query("INSERT INTO community_posts (community_id, user_id, content) VALUES (?, ?, ?)", [community_id, new_owner_id, `System: ${oldName} transferred ownership of ${comm[0].community_name} to ${newName}.`]);

    // Notify all members
    const members = await query("SELECT user_id FROM community_members WHERE community_id=?", [community_id]);
    for (const m of members) {
      if (m.user_id !== parseInt(current_owner_id)) {
        await notify(m.user_id, `👑 ${oldName} transferred ownership of "${comm[0].community_name}" to ${newName}`, "INFO");
      }
    }

    res.json({ message: "Ownership transferred successfully" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Delete community and all related data
app.post("/delete-community/:id", async (req, res) => {
  const { user_id } = req.body;
  const community_id = req.params.id;
  try {
    const comm = await query("SELECT * FROM communities WHERE community_id=?", [community_id]);
    if (!comm.length) return res.status(404).json({ message: "Community not found" });
    if (comm[0].created_by !== parseInt(user_id))
      return res.status(403).json({ message: "Only the creator can delete the community" });

    // Get resource IDs for this community
    const resources = await query("SELECT resource_id FROM resources WHERE community_id=?", [community_id]);
    const resourceIds = resources.map(r => r.resource_id);

    if (resourceIds.length > 0) {
      // Delete borrow_transactions for these resources
      await query(`DELETE FROM borrow_transactions WHERE resource_id IN (${resourceIds.join(",")})`);
      // Delete borrow_requests for these resources
      await query(`DELETE FROM borrow_requests WHERE resource_id IN (${resourceIds.join(",")})`);
      // Delete waitlist entries
      await query(`DELETE FROM waitlist WHERE resource_id IN (${resourceIds.join(",")})`);
      // Delete fines → bookings for these resources
      const bookings = await query(`SELECT booking_id FROM bookings WHERE resource_id IN (${resourceIds.join(",")})`);
      const bookingIds = bookings.map(b => b.booking_id);
      if (bookingIds.length > 0) {
        await query(`DELETE FROM ratings WHERE booking_id IN (${bookingIds.join(",")})`);
        await query(`DELETE FROM fines WHERE booking_id IN (${bookingIds.join(",")})`);
        await query(`DELETE FROM bookings WHERE booking_id IN (${bookingIds.join(",")})`);
      }
      // Delete resources
      await query("DELETE FROM resources WHERE community_id=?", [community_id]);
    }

    // Delete community posts
    await query("DELETE FROM community_posts WHERE community_id=?", [community_id]);
    // Delete join requests
    await query("DELETE FROM join_requests WHERE community_id=?", [community_id]);
    // Delete members
    await query("DELETE FROM community_members WHERE community_id=?", [community_id]);
    // Delete community
    await query("DELETE FROM communities WHERE community_id=?", [community_id]);

    res.json({ message: "Community deleted successfully" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Delete user account
app.delete("/account/:user_id", async (req, res) => {
  const user_id = parseInt(req.params.user_id);
  try {
    // Check user exists
    const userRow = await query("SELECT * FROM users WHERE user_id=?", [user_id]);
    if (!userRow.length) return res.status(404).json({ message: "User not found" });

    // Check if user is admin of any community (should have been handled by frontend first)
    const adminComms = await query("SELECT community_id FROM communities WHERE created_by=?", [user_id]);
    if (adminComms.length)
      return res.status(400).json({
        message: "You are admin of communities. Transfer ownership or delete them first.",
        communities: adminComms
      });

    // Get user's resources
    const userResources = await query("SELECT resource_id FROM resources WHERE owner_id=?", [user_id]);
    const resIds = userResources.map(r => r.resource_id);

    if (resIds.length > 0) {
      await query(`DELETE FROM borrow_transactions WHERE resource_id IN (${resIds.join(",")})`);
      await query(`DELETE FROM borrow_requests WHERE resource_id IN (${resIds.join(",")})`);
      await query(`DELETE FROM waitlist WHERE resource_id IN (${resIds.join(",")})`);
      const bookings = await query(`SELECT booking_id FROM bookings WHERE resource_id IN (${resIds.join(",")})`);
      const bIds = bookings.map(b => b.booking_id);
      if (bIds.length > 0) {
        await query(`DELETE FROM ratings WHERE booking_id IN (${bIds.join(",")})`);
        await query(`DELETE FROM fines WHERE booking_id IN (${bIds.join(",")})`);
        await query(`DELETE FROM bookings WHERE booking_id IN (${bIds.join(",")})`);
      }
      await query("DELETE FROM resources WHERE owner_id=?", [user_id]);
    }

    // Delete borrow requests/transactions where user is borrower
    await query("DELETE FROM borrow_transactions WHERE borrower_id=?", [user_id]);
    await query("DELETE FROM borrow_requests WHERE borrower_id=?", [user_id]);

    // Delete user's own bookings as borrower
    const userBookings = await query("SELECT booking_id FROM bookings WHERE borrower_id=?", [user_id]);
    const ubIds = userBookings.map(b => b.booking_id);
    if (ubIds.length > 0) {
      await query(`DELETE FROM ratings WHERE booking_id IN (${ubIds.join(",")}) OR rater_id=? OR ratee_id=?`, [user_id, user_id]);
      await query(`DELETE FROM fines WHERE booking_id IN (${ubIds.join(",")})`);
      await query(`DELETE FROM bookings WHERE borrower_id=?`, [user_id]);
    }

    // Delete remaining ratings
    await query("DELETE FROM ratings WHERE rater_id=? OR ratee_id=?", [user_id, user_id]);
    // Delete notifications
    await query("DELETE FROM notifications WHERE user_id=?", [user_id]);
    // Delete community posts
    await query("DELETE FROM community_posts WHERE user_id=?", [user_id]);
    // Delete waitlist entries
    await query("DELETE FROM waitlist WHERE user_id=?", [user_id]);
    // Delete join requests
    await query("DELETE FROM join_requests WHERE user_id=?", [user_id]);
    // Remove from communities
    await query("DELETE FROM community_members WHERE user_id=?", [user_id]);
    // Delete OTP
    await query("DELETE FROM otps WHERE email=?", [userRow[0].email]);
    // Delete user
    await query("DELETE FROM users WHERE user_id=?", [user_id]);

    res.json({ message: "Account deleted successfully" });
  } catch (e) {
    console.error("Delete account error:", e);
    res.status(500).json({ error: e.message });
  }
});

// ── MODULE 13: TRANSACTION CHAT & STATUS FLOW ───────────────────────────────

// Get single transaction detail
app.get("/transaction/:id", async (req, res) => {
  try {
    const rows = await query(
      `SELECT bt.*,
              r.name AS resource_name, r.image_url, r.deposit_amount, r.fine_per_day, r.pickup_method, r.max_days_allowed,
              ow.name AS owner_name, ow.email AS owner_email, ow.profile_pic AS owner_pic,
              bw.name AS borrower_name, bw.email AS borrower_email, bw.profile_pic AS borrower_pic,
              c.community_name
       FROM borrow_transactions bt
       JOIN resources r ON bt.resource_id = r.resource_id
       JOIN users ow ON bt.owner_id = ow.user_id
       JOIN users bw ON bt.borrower_id = bw.user_id
       JOIN communities c ON bt.community_id = c.community_id
       WHERE bt.id = ?`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: "Transaction not found" });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get chat messages for a transaction
app.get("/transaction/:id/chat", async (req, res) => {
  try {
    const rows = await query(
      `SELECT bc.*, u.name AS sender_name, u.profile_pic AS sender_pic
       FROM borrow_chats bc
       JOIN users u ON bc.sender_id = u.user_id
       WHERE bc.transaction_id = ?
       ORDER BY bc.created_at ASC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Send chat message (only borrower/owner of that transaction)
app.post("/transaction/:id/chat", async (req, res) => {
  const { sender_id, message } = req.body;
  if (!sender_id || !message?.trim())
    return res.status(400).json({ message: "Message cannot be empty" });
  try {
    const tx = await query("SELECT * FROM borrow_transactions WHERE id=?", [req.params.id]);
    if (!tx.length) return res.status(404).json({ message: "Transaction not found" });

    // Only borrower or owner can chat
    if (tx[0].borrower_id !== parseInt(sender_id) && tx[0].owner_id !== parseInt(sender_id))
      return res.status(403).json({ message: "You are not part of this transaction" });

    await query(
      "INSERT INTO borrow_chats (transaction_id, sender_id, message) VALUES (?,?,?)",
      [req.params.id, sender_id, message.trim()]
    );

    // Notify the other party
    const otherId = tx[0].borrower_id === parseInt(sender_id) ? tx[0].owner_id : tx[0].borrower_id;
    const senderInfo = await query("SELECT name FROM users WHERE user_id=?", [sender_id]);
    const resInfo = await query("SELECT name FROM resources WHERE resource_id=?", [tx[0].resource_id]);
    await notify(otherId, `💬 ${senderInfo[0]?.name} sent a message about "${resInfo[0]?.name}"`, "BOOKING");

    res.json({ message: "Message sent" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Update transaction status (structured handover/return flow)
app.post("/transaction/:id/status", async (req, res) => {
  const { user_id, action } = req.body;
  // Actions: mark_collected, confirm_handover, mark_returned, confirm_return, report_issue
  if (!user_id || !action)
    return res.status(400).json({ message: "user_id and action are required" });
  try {
    const tx = await query("SELECT * FROM borrow_transactions WHERE id=?", [req.params.id]);
    if (!tx.length) return res.status(404).json({ message: "Transaction not found" });

    const isBorrower = tx[0].borrower_id === parseInt(user_id);
    const isOwner = tx[0].owner_id === parseInt(user_id);
    if (!isBorrower && !isOwner)
      return res.status(403).json({ message: "You are not part of this transaction" });

    const resInfo = await query("SELECT name FROM resources WHERE resource_id=?", [tx[0].resource_id]);
    const itemName = resInfo[0]?.name || "item";

    switch (action) {
      case "verify_pickup":
        if (!isOwner) return res.status(403).json({ message: "Only owner can verify pickup OTP" });
        if (tx[0].pickup_status === "COMPLETED") return res.json({ message: "Already verified" });
        if (tx[0].pickup_otp !== req.body.otp) return res.status(400).json({ message: "Invalid Pickup OTP" });
        
        await query("UPDATE borrow_transactions SET pickup_status='COMPLETED', handover_status='COMPLETED', pickup_verified_at=NOW() WHERE id=?", [req.params.id]);
        await notify(tx[0].borrower_id, `✅ "${itemName}" pickup verified by owner. Enjoy!`, "BOOKING");
        await query("INSERT INTO borrow_chats (transaction_id, sender_id, message) VALUES (?,?,?)",
          [req.params.id, user_id, "✅ Item pickup verified via OTP."]);
        return res.json({ message: "Pickup verified successfully" });

      case "ready_return":
        if (!isBorrower) return res.status(403).json({ message: "Only borrower can mark ready to return" });
        if (tx[0].return_status === "RETURNED") return res.json({ message: "Already returned" });
        
        const return_otp = Math.floor(100000 + Math.random() * 900000).toString();
        await query("UPDATE borrow_transactions SET return_otp=? WHERE id=?", [return_otp, req.params.id]);
        await notify(tx[0].owner_id, `🔄 Borrower is ready to return "${itemName}".`, "BOOKING");
        await query("INSERT INTO borrow_chats (transaction_id, sender_id, message) VALUES (?,?,?)",
          [req.params.id, user_id, "🔄 I am ready to return the item."]);
        return res.json({ message: "Return OTP generated" });

      case "verify_return":
        if (!isOwner) return res.status(403).json({ message: "Only owner can verify return OTP" });
        if (tx[0].return_status === "RETURNED") return res.json({ message: "Already verified" });
        if (!tx[0].return_otp) return res.status(400).json({ message: "Borrower hasn't marked ready to return yet" });
        if (tx[0].return_otp !== req.body.otp) return res.status(400).json({ message: "Invalid Return OTP" });

        await query(
          "UPDATE borrow_transactions SET return_status='RETURNED', return_verified_at=NOW(), completed_at=NOW() WHERE id=?",
          [req.params.id]
        );
        // Restore available quantity
        await query("UPDATE resources SET available_quantity = available_quantity + 1 WHERE resource_id=?", [tx[0].resource_id]);
        await notify(tx[0].borrower_id, `🎉 Return of "${itemName}" verified via OTP. Transaction complete!`, "BOOKING");
        await query("INSERT INTO borrow_chats (transaction_id, sender_id, message) VALUES (?,?,?)",
          [req.params.id, user_id, "🎉 Return verified via OTP. Transaction complete!"]);
        return res.json({ message: "Return verified successfully" });

      case "report_issue":
        if (!isOwner) return res.status(403).json({ message: "Only owner can report issues" });
        await notify(tx[0].borrower_id, `⚠️ Owner reported an issue with "${itemName}". Please check the chat.`, "BOOKING");
        await query("INSERT INTO borrow_chats (transaction_id, sender_id, message) VALUES (?,?,?)",
          [req.params.id, user_id, "⚠️ I've reported an issue. Let's discuss."]);
        return res.json({ message: "Issue reported. Borrower has been notified." });

      default:
        return res.status(400).json({ message: "Invalid action" });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── START ────────────────────────────────────────────────────────────────────
app.listen(5001, () => {
  console.log("Server running on port 5001");
});
