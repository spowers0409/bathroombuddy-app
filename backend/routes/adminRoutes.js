import express from 'express';
import pool from '../db.js';
import bcrypt from 'bcrypt';

const router = express.Router();

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    // find user who is an admin
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1 AND is_admin = TRUE',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or not an admin.' });
    }

    const user = result.rows[0];

    console.log('User hash in DB:', user.password_hash);

    // compare the provided password with the stored password hash
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid password.' });
    }

    // successful login
    res.json({
      message: 'Login successful',
      adminId: user.id,
      email: user.email
    });

  } catch (err) {
    console.error('Admin login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /admin/summary
router.get('/summary', async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT 
          (SELECT COUNT(*) FROM bathrooms) AS total_bathrooms,
          (SELECT COUNT(*) FROM bathrooms WHERE is_approved = false) AS pending_bathrooms,
          (SELECT COUNT(*) FROM flags WHERE resolved = false) AS flagged_bathrooms,
          (SELECT COUNT(*) FROM reviews WHERE created_at >= NOW() - INTERVAL '7 days') AS recent_reviews
      `);
  
      res.json(result.rows[0]);
    } catch (err) {
      console.error('Error fetching admin summary:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

router.get('/bathrooms', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        b.*,
        COALESCE(r.review_count, 0) AS review_count,
        COALESCE(f.flag_count, 0) AS flag_count,
        ROUND(r.average_rating, 1) AS average_rating
      FROM bathrooms b
      LEFT JOIN (
        SELECT bathroom_id, COUNT(*) AS review_count, AVG(rating) AS average_rating
        FROM reviews
        GROUP BY bathroom_id
      ) r ON r.bathroom_id = b.id
      LEFT JOIN (
        SELECT bathroom_id, COUNT(*) AS flag_count
        FROM flags
        GROUP BY bathroom_id
      ) f ON f.bathroom_id = b.id
      ORDER BY b.created_at DESC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching bathrooms:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/bathrooms/:id/details', async (req, res) => {
  const { id } = req.params;

  try {
    const bathroomResult = await pool.query(` 
      SELECT
        b.*,
        COALESCE(r.review_count, 0) AS review_count,
        COALESCE(f.flag_count, 0) AS flag_count,
        ROUND(r.average_rating, 1) AS average_rating
      FROM bathrooms b
      LEFT JOIN (
        SELECT bathroom_id, COUNT(*) AS review_count, AVG(rating) AS average_rating
        FROM reviews
        GROUP BY bathroom_id
      ) r ON r.bathroom_id = b.id
      LEFT JOIN (
        SELECT bathroom_id, COUNT(*) AS flag_count
        FROM flags
        GROUP BY bathroom_id
      ) f ON f.bathroom_id = b.id
      WHERE b.id = $1
    `, [id]);

    if (bathroomResult.rows.length === 0) {
      return res.status(404).json({ error: 'Bathroom not found' });
    }

    const bathroom = bathroomResult.rows[0];

    const reviewResult = await pool.query(`
      SELECT id, rating, comment, created_at
      FROM reviews
      WHERE bathroom_id = $1
      ORDER BY created_at DESC
    `, [id]);

    res.json({
      ...bathroom,
      reviews: reviewResult.rows
    });
  } catch (err) {
    console.error('Error fetching bathroom details:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /admin/bathrooms/:id/approve
router.patch('/bathrooms/:id/approve', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `UPDATE bathrooms SET is_approved = TRUE WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Bathroom not found' });
    }

    res.json({
      message: 'Bathroom approved',
      bathroom: result.rows[0]
    });

  } catch (err) {
    console.error('Error approving bathroom:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /admin/bathrooms/:id
router.patch('/bathrooms/:id', async (req, res) => {
  const { id } = req.params;
  const { name, address, latitude, longitude } = req.body;

  const fields = [];
  const values = [];
  let index = 1;

  if (name !== undefined) {
    fields.push(`name = $${index++}`);
    values.push(name);
  }
  if (address !== undefined) {
    fields.push(`address = $${index++}`);
    values.push(address);
  }
  if (latitude !== undefined) {
    fields.push(`latitude = $${index++}`);
    values.push(latitude);
  }
  if (longitude !== undefined) {
    fields.push(`longitude = $${index++}`);
    values.push(longitude);
  }

  if (fields.length === 0) {
    return res.status(400).json({ error: 'No fields provided to update' });
  }

  values.push(id);

  const query = `
    UPDATE bathrooms
    SET ${fields.join(', ')}
    WHERE id = $${values.length}
    RETURNING *
  `;

  try {
    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Bathroom not found' });
    }

    res.json({
      message: 'Bathroom updated successfully',
      bathroom: result.rows[0]
    });

  } catch (err) {
    console.error('Error updating bathroom:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});



  
export default router;
