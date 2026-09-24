const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

// Get a specific lawyer's reviews
router.get('/lawyers/:id/reviews', async (req, res) => {
    try {
        const lawyerId = req.params.id;
        const sql = `
              SELECT r.id, r.rating, r.comment, r.status, r.created_at, r.reply, r.replied_at,
                     c.first_name as user_first, c.last_name as user_last, c.image_path as user_image
              FROM reviews r
              JOIN users c ON r.client_id = c.id
              WHERE r.lawyer_id = ? AND r.status IN ('published', 'reported') AND IFNULL(c.status, '') != 'deleted'
            ORDER BY r.created_at DESC
        `;
        const [rows] = await db.promise().query(sql, [lawyerId]);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error fetching lawyer reviews' });
    }
});

// Submit a review for a lawyer
router.post('/lawyers/:id/reviews', async (req, res) => {
    try {
        const lawyerId = req.params.id;
        const { client_id, rating, comment } = req.body;

        if (!client_id || !rating) {
            return res.status(400).json({ error: 'Missing parameters' });
        }

        await db.promise().query(
            'INSERT INTO reviews (lawyer_id, client_id, rating, comment, status) VALUES (?, ?, ?, ?, "published")',
            [lawyerId, client_id, rating, comment || null]
        );
        res.json({ success: true, message: 'Review submitted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error submitting review' });
    }
});

// Update a review
router.put('/reviews/:id', async (req, res) => {
    try {
        const reviewId = req.params.id;
        const { rating, comment, title } = req.body;
        await db.promise().query(
            'UPDATE reviews SET rating = ?, comment = ? WHERE id = ?',
            [rating, comment || null, reviewId]
        );
        res.json({ success: true, message: 'Review updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error updating review' });
    }
});

// Submit a reply to a review
router.put('/lawyers/:lawyerId/reviews/:id/reply', authenticateToken, async (req, res) => {
    try {
        const lawyerId = req.params.lawyerId;
        const reviewId = req.params.id;
        const { reply } = req.body;

        if (req.user.id != lawyerId) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        await db.promise().query(
            'UPDATE reviews SET reply = ?, replied_at = NOW() WHERE id = ? AND lawyer_id = ?',
            [reply, reviewId, lawyerId]
        );
        res.json({ success: true, message: 'Reply saved successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error saving reply' });
    }
});

// Report a review or reply
router.post('/reviews/:id/report', authenticateToken, async (req, res) => {
    try {
        const reviewId = req.params.id;
        const { target, flagReason } = req.body;

        let prefix = '[รีพอร์ตรีวิว] ';
        if (target === 'reply') {
            prefix = '[รีพอร์ตการตอบกลับ] ';
        }
        const fullReason = prefix + flagReason;

        await db.promise().query(
            'UPDATE reviews SET status = "reported", is_hidden = 0, flag_reason = ?, reporter_id = ? WHERE id = ?',
            [fullReason, req.user.id, reviewId]
        );
        res.json({ success: true, message: 'Report submitted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error submitting report' });
    }
});

// Delete a review
router.delete('/reviews/:id', async (req, res) => {
    try {
        const reviewId = req.params.id;
        await db.promise().query('DELETE FROM reviews WHERE id = ?', [reviewId]);
        res.json({ success: true, message: 'Review deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error deleting review' });
    }
});

module.exports = router;
