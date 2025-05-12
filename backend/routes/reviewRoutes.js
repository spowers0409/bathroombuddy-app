import express from 'express';
import pool from '../db.js';

const router = express.Router();

// This will allow paid users to leave reviews
router.post('/', async (req, res) => {
    const { bathroom_id, user_id, rating, comment = '' } = req.body;

    if (!bathroom_id || !user_id || !rating) {
        return res.status(400).json({ error: 'Missing required fields'});
    }

    if (rating <1 || rating > 5) {
        return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    try {
        // Is the user a paid user
        const userRes = await pool.query('SELECT is_paid_user FROM users WHERE id = $1', [user_id]);
        if (userRes.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        if (!userRes.rows[0].is_paid_user) {
            return res.status(403).json({ error: 'Only paid users can leave reviews'});
        }

        // Check that bathroom exists and approved
        const bathroomRes = await pool.query('SELECT * FROM bathrooms WHERE id = $1 AND is_approved = TRUE', [bathroom_id]);
        if (bathroomRes.rows.length === 0) {
            return res.status(400).json({ error: 'Bathroom not found or approved' });
        }

        // This will insert the review
        const result = await pool.query(
            `INSERT INTO reviews (bathroom_id, user_id, rating, comment)
            VALUES ($1, $2, $3, $4)
            RETURNING *`,
            [bathroom_id, user_id, rating, comment]
        );
        
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Error adding review:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/:bathroomId', async (req, res) => {
    const { bathroomId } = req.params;

    try {
        const result = await pool.query(
            `SELECT * FROM reviews WHERE bathroom_id= $1 ORDER BY created_at DESC`,
            [bathroomId]
        );

        res.json(result.rows);
    } catch (err) {
        console.error('Error fetchhing reviews:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;