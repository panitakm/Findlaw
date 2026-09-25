const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticateAdmin } = require('../middleware/auth');

// Dashboard Overview
router.get('/admin/dashboard/overview', authenticateAdmin, async (req, res) => {
    try {
        const stats = {};

        const [pendingLawyers] = await db.promise().query("SELECT COUNT(*) as count FROM lawyers WHERE status = 'pending'");
        stats.pendingLawyers = pendingLawyers[0].count;

        const [reportedReviews] = await db.promise().query("SELECT COUNT(*) as count FROM reviews WHERE status = 'reported'");
        stats.reportedReviews = reportedReviews[0].count;

        const [allLawyers] = await db.promise().query("SELECT COUNT(*) as count FROM lawyers");
        stats.totalLawyers = allLawyers[0].count;

        const [clients] = await db.promise().query("SELECT COUNT(*) as count FROM users WHERE role = 'user'");
        stats.totalUsers = clients[0].count;

        const [recentLawyers] = await db.promise().query(`
            SELECT l.id, l.license_number, l.status, u.created_at, l.license_file,
                   u.first_name, u.last_name, u.email
            FROM lawyers l
            JOIN users u ON l.id = u.id
            WHERE l.status = 'pending'
            ORDER BY u.created_at DESC
            LIMIT 5
        `);
        stats.recentPendingLawyers = recentLawyers;

        const [recentReviews] = await db.promise().query(`
            SELECT r.id, r.rating, r.comment as text, r.flag_reason as flagReason, r.status, r.created_at,
                   CONCAT(c.first_name, ' ', c.last_name) as reviewer,
                   CONCAT(l.first_name, ' ', l.last_name) as lawyer
            FROM reviews r
            JOIN users c ON r.client_id = c.id
            JOIN users l ON r.lawyer_id = l.id
            WHERE r.status = 'reported'
            ORDER BY r.created_at DESC
            LIMIT 5
        `);
        stats.recentReportedReviews = recentReviews;

        res.json(stats);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Database error' });
    }
});

// Users
router.get('/admin/users', authenticateAdmin, async (req, res) => {
    try {
        const [rows] = await db.promise().query(`
            SELECT u.id, u.first_name, u.last_name, u.email, u.role, u.status as user_status, l.status as lawyer_status 
            FROM users u 
            LEFT JOIN lawyers l ON u.id = l.id 
            ORDER BY u.created_at DESC
        `);
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Database error' });
    }
});

router.put('/admin/users/:id', authenticateAdmin, async (req, res) => {
    const userId = req.params.id;
    const { first_name, last_name, email, role, status } = req.body;
    try {
        await db.promise().query(
            'UPDATE users SET first_name=?, last_name=?, email=?, role=?, status=? WHERE id=?',
            [first_name, last_name, email, role, status, userId]
        );
        res.json({ success: true, message: 'User updated' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Database error' });
    }
});

router.delete('/admin/users/:id', authenticateAdmin, async (req, res) => {
    const userId = req.params.id;
    try {
        await db.promise().query("UPDATE users SET status = 'deleted' WHERE id=?", [userId]);
        res.json({ success: true, message: 'User deleted' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Database error' });
    }
});

router.put('/admin/users/:id/suspend', authenticateAdmin, async (req, res) => {
    const userId = req.params.id;
    const { reason } = req.body;
    try {
        await db.promise().query("UPDATE users SET status = 'suspended', suspend_reason = ? WHERE id=?", [reason || null, userId]);
        res.json({ success: true, message: 'User suspended' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Database error' });
    }
});

router.put('/admin/users/:id/restore', authenticateAdmin, async (req, res) => {
    const userId = req.params.id;
    try {
        await db.promise().query("UPDATE users SET status = 'active' WHERE id=?", [userId]);
        res.json({ success: true, message: 'User restored' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Database error' });
    }
});

// Lawyers Verification
router.get('/admin/lawyers/pending', authenticateAdmin, async (req, res) => {
    try {
        const sql = `
            SELECT l.id, l.license_number as license, l.license_file as file, l.reject_reason as rejectReason,
                   CONCAT(u.first_name, ' ', u.last_name) as name, 
                   u.created_at as created_at
            FROM lawyers l 
            JOIN users u ON l.id = u.id 
            WHERE l.status = 'pending'
            ORDER BY u.created_at DESC
        `;
        const [rows] = await db.promise().query(sql);
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Database error' });
    }
});

router.get('/admin/lawyers/history', authenticateAdmin, async (req, res) => {
    try {
        const sql = `
            SELECT l.id, l.license_number as license, l.license_file as file, l.status, l.reject_reason as rejectReason,
                   CONCAT(u.first_name, ' ', u.last_name) as name, 
                   l.updated_at as created_at 
            FROM lawyers l 
            JOIN users u ON l.id = u.id 
            WHERE l.status IN ('approved', 'rejected')
            ORDER BY l.updated_at DESC
        `;
        const [rows] = await db.promise().query(sql);
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Database error' });
    }
});

router.put('/admin/lawyers/:id/approve', authenticateAdmin, async (req, res) => {
    const lawyerId = req.params.id;
    try {
        await db.promise().query("UPDATE lawyers SET status='approved' WHERE id=?", [lawyerId]);
        res.json({ success: true, message: 'Lawyer approved' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Database error' });
    }
});

router.put('/admin/lawyers/:id/reject', authenticateAdmin, async (req, res) => {
    const lawyerId = req.params.id;
    const { reason } = req.body;
    try {
        await db.promise().query("UPDATE lawyers SET status='rejected', reject_reason=? WHERE id=?", [reason, lawyerId]);
        res.json({ success: true, message: 'Lawyer rejected' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Database error' });
    }
});

// Reviews Moderation
router.get('/admin/reviews/all', authenticateAdmin, async (req, res) => {
    try {
        const sql = `
            SELECT r.id, r.rating, r.comment as text, r.flag_reason as flagReason, r.status, r.reply,
                   CONCAT(c.first_name, ' ', c.last_name) as reviewer,
                   CONCAT(l.first_name, ' ', l.last_name) as lawyer
            FROM reviews r
            JOIN users c ON r.client_id = c.id
            JOIN users l ON r.lawyer_id = l.id
            WHERE r.status != 'reported'
            ORDER BY r.created_at DESC
        `;
        const [rows] = await db.promise().query(sql);
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Database error' });
    }
});

router.get('/admin/reviews/reported', authenticateAdmin, async (req, res) => {
    try {
        const sql = `
            SELECT r.id, r.rating, r.comment as text, r.flag_reason as flagReason, r.reply,
                   CONCAT(c.first_name, ' ', c.last_name) as reviewer,
                   CONCAT(l.first_name, ' ', l.last_name) as lawyer,
                   CONCAT(rpt.first_name, ' ', rpt.last_name) as reporter
            FROM reviews r
            JOIN users c ON r.client_id = c.id
            JOIN users l ON r.lawyer_id = l.id
            LEFT JOIN users rpt ON r.reporter_id = rpt.id
            WHERE r.status = 'reported'
            ORDER BY r.created_at DESC
        `;
        const [rows] = await db.promise().query(sql);
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Database error' });
    }
});

router.get('/admin/reviews/history', authenticateAdmin, async (req, res) => {
    try {
        const sql = `
            SELECT r.id, r.rating, r.comment as text, r.status, r.reply, r.flag_reason as flagReason,
                   CONCAT(c.first_name, ' ', c.last_name) as reviewer,
                   CONCAT(l.first_name, ' ', l.last_name) as lawyer,
                   CONCAT(rpt.first_name, ' ', rpt.last_name) as reporter
            FROM reviews r
            JOIN users c ON r.client_id = c.id
            JOIN users l ON r.lawyer_id = l.id
            LEFT JOIN users rpt ON r.reporter_id = rpt.id
            WHERE r.status IN ('published', 'hidden') AND (r.flag_reason IS NOT NULL OR r.is_hidden = 1)
            ORDER BY r.created_at DESC
        `;
        const [rows] = await db.promise().query(sql);
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Database error' });
    }
});

router.put('/admin/reviews/:id/approve', authenticateAdmin, async (req, res) => {
    const reviewId = req.params.id;
    try {
        await db.promise().query("UPDATE reviews SET status='published', is_hidden=0 WHERE id=?", [reviewId]);
        res.json({ success: true, message: 'Review approved' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Database error' });
    }
});

router.put('/admin/reviews/:id/report', authenticateAdmin, async (req, res) => {
    const reviewId = req.params.id;
    try {
        await db.promise().query("UPDATE reviews SET status='reported', is_hidden=0 WHERE id=?", [reviewId]);
        res.json({ success: true, message: 'Review marked as reported' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Database error' });
    }
});

router.delete('/admin/reviews/:id', authenticateAdmin, async (req, res) => {
    const reviewId = req.params.id;
    try {
        await db.promise().query("UPDATE reviews SET status='hidden', is_hidden=1 WHERE id=?", [reviewId]);
        res.json({ success: true, message: 'Review deleted/hidden' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Database error' });
    }
});

module.exports = router;
