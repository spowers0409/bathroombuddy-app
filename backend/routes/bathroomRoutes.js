import express from 'express';
import pool from '../db.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM bathrooms WHERE is_approved = TRUE ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching bathrooms:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', async (req, res) => {
  const {
    name,
    latitude,
    longitude,
    address = null,
    city = null,
    state = null,
    zip_code = null,
    added_by_user_id = null
  } = req.body;

  if (!name || !latitude || !longitude) {
    return res.status(400).json({ error: 'Missing required fields: name, latitude, and longitude' });
  }

  try {

    const userResult = await pool.query(
        `SELECT is_paid_user FROM users WHERE id = $1`,
        [added_by_user_id]
    );

    if (userResult.rows.length === 0) {
        return res.status(404).json({error: 'User not found' });
    }

    const isPaidUser = userResult.rows[0].is_paid_user;

    if (!isPaidUser) {
        return res.status(403).json({ error: 'Only paid users can add bathroom locations.' });
    }

    // Insert new bathrooms
    const result = await pool.query(
      `INSERT INTO bathrooms (
        name, address, city, state, zip_code, latitude, longitude, added_by_user_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [name, address, city, state, zip_code, latitude, longitude, added_by_user_id]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error adding bathroom:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req, res) => {
    const bathroomId = req.params.id;

    try {
        const result = await pool.query(
        `SELECT * FROM bathrooms WHERE id = $1 AND is_approved = TRUE`,
        [bathroomId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Bathroom not found or approved'});
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error fetching bathrooms by ID:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.put('/:id/approve', async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query(
            `UPDATE bathrooms
            SET is_approved = TRUE
            WHERE id = $1
            RETURNING *`,
            [id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Bathroom not found' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error approving bathroom:', err);
        res.status(500).json({ error: 'Internal server error'});
    }
});

export default router;
