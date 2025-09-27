const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "http:"],
      scriptSrc: ["'self'", "'unsafe-inline'"]
    }
  }
}));

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Strict rate limiting for admin endpoints
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20
});
app.use('/api/admin/', adminLimiter);

// Database setup
const db = new sqlite3.Database('prompts.db');

// Initialize database
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS prompts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL,
    image_url TEXT NOT NULL,
    prompt_text TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Create default admin user if it doesn't exist
  const defaultPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const defaultUsername = process.env.ADMIN_USERNAME || 'admin';
  
  bcrypt.hash(defaultPassword, 10, (err, hash) => {
    if (err) {
      console.error('Error hashing password:', err);
      return;
    }
    
    db.run(`INSERT OR IGNORE INTO admins (username, password_hash) VALUES (?, ?)`,
      [defaultUsername, hash],
      function(err) {
        if (err) {
          console.error('Error creating admin user:', err);
        } else if (this.changes > 0) {
          console.log('Default admin user created');
        }
      }
    );
  });

  // Insert sample data if prompts table is empty
  db.get("SELECT COUNT(*) as count FROM prompts", (err, row) => {
    if (err) {
      console.error(err);
      return;
    }
    
    if (row.count === 0) {
      const samplePrompts = [
        {
          category: 'Men',
          image_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face',
          prompt_text: 'Professional portrait of a confident business person in modern office setting, wearing a tailored navy suit, crisp lighting, contemporary style, photorealistic'
        },
        {
          category: 'Women',
          image_url: 'https://images.unsplash.com/photo-1494790108755-2616b612b1dd?w=400&h=400&fit=crop&crop=face',
          prompt_text: 'Elegant professional woman in modern urban setting, sophisticated casual attire, warm natural lighting, confident expression, lifestyle portrait'
        },
        {
          category: 'Couple',
          image_url: 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=400&h=400&fit=crop',
          prompt_text: 'Happy couple walking together in modern urban setting, stylish casual attire, warm natural lighting, candid lifestyle moment, photorealistic'
        },
        {
          category: 'Kids',
          image_url: 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=400&h=400&fit=crop&crop=face',
          prompt_text: 'Cheerful children playing in modern playground, bright colorful clothing, soft natural lighting, joyful expressions, outdoor lifestyle photography'
        }
      ];

      samplePrompts.forEach(prompt => {
        db.run(
          `INSERT INTO prompts (category, image_url, prompt_text) VALUES (?, ?, ?)`,
          [prompt.category, prompt.image_url, prompt.prompt_text]
        );
      });
      
      console.log('Sample prompts added to database');
    }
  });
});

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret', (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Input validation middleware
const validatePrompt = [
  body('category').trim().isLength({ min: 1 }).escape(),
  body('image_url').isURL().withMessage('Must be a valid URL'),
  body('prompt_text').trim().isLength({ min: 10 }).escape()
];

const validateLogin = [
  body('username').trim().isLength({ min: 1 }).escape(),
  body('password').isLength({ min: 1 })
];

// Public API endpoints
app.get('/api/prompts', (req, res) => {
  const category = req.query.category;
  let query = 'SELECT * FROM prompts ORDER BY created_at DESC';
  let params = [];

  if (category && category !== 'All') {
    query = 'SELECT * FROM prompts WHERE category = ? ORDER BY created_at DESC';
    params = [category];
  }

  db.all(query, params, (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

app.get('/api/prompts/count', (req, res) => {
  db.get('SELECT COUNT(*) as count FROM prompts', (err, row) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ count: row.count });
  });
});

app.get('/api/categories', (req, res) => {
  db.all('SELECT DISTINCT category FROM prompts ORDER BY category', (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Database error' });
    }
    const categories = ['All', ...rows.map(row => row.category)];
    res.json(categories);
  });
});

// Admin authentication
app.post('/api/admin/login', validateLogin, (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, password } = req.body;

  db.get('SELECT * FROM admins WHERE username = ?', [username], (err, admin) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Database error' });
    }

    if (!admin) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    bcrypt.compare(password, admin.password_hash, (err, isMatch) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Server error' });
      }

      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = jwt.sign(
        { id: admin.id, username: admin.username },
        process.env.JWT_SECRET || 'fallback-secret',
        { expiresIn: '24h' }
      );

      res.json({ token, username: admin.username });
    });
  });
});

// Protected admin endpoints
app.post('/api/admin/prompts', authenticateToken, validatePrompt, (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { category, image_url, prompt_text } = req.body;

  db.run(
    'INSERT INTO prompts (category, image_url, prompt_text) VALUES (?, ?, ?)',
    [category, image_url, prompt_text],
    function(err) {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Database error' });
      }

      db.get('SELECT * FROM prompts WHERE id = ?', [this.lastID], (err, prompt) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ error: 'Database error' });
        }
        res.status(201).json(prompt);
      });
    }
  );
});

app.get('/api/admin/prompts', authenticateToken, (req, res) => {
  db.all('SELECT * FROM prompts ORDER BY created_at DESC', (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

app.put('/api/admin/prompts/:id', authenticateToken, validatePrompt, (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { id } = req.params;
  const { category, image_url, prompt_text } = req.body;

  db.run(
    'UPDATE prompts SET category = ?, image_url = ?, prompt_text = ? WHERE id = ?',
    [category, image_url, prompt_text, id],
    function(err) {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Database error' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Prompt not found' });
      }

      db.get('SELECT * FROM prompts WHERE id = ?', [id], (err, prompt) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ error: 'Database error' });
        }
        res.json(prompt);
      });
    }
  );
});

app.delete('/api/admin/prompts/:id', authenticateToken, (req, res) => {
  const { id } = req.params;

  db.run('DELETE FROM prompts WHERE id = ?', [id], function(err) {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Database error' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Prompt not found' });
    }

    res.json({ message: 'Prompt deleted successfully' });
  });
});

// Serve static files
app.use('/admin', express.static(path.join(__dirname, 'admin')));
app.use('/', express.static(path.join(__dirname, 'public')));

// Fallback routes
app.get('/admin*', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'index.html'));
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Public gallery: http://localhost:${PORT}`);
  console.log(`Admin panel: http://localhost:${PORT}/admin`);
  console.log(`Default admin credentials: ${process.env.ADMIN_USERNAME || 'admin'} / ${process.env.ADMIN_PASSWORD || 'admin123'}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down gracefully...');
  db.close((err) => {
    if (err) {
      console.error(err.message);
    }
    console.log('Database connection closed.');
    process.exit(0);
  });
});