const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { saveFileFromBase64 } = require('../utils/fileUtils');
const { authenticateToken } = require('../middleware/auth');
const saltRounds = 10;

router.post('/user/register', async (req, res) => {
    const { inputFirsname, inputLastname, inputEmail, inputPhone, inputPassword, profilePic } = req.body;

    try {
        if (!inputFirsname || !inputLastname || !inputEmail || !inputPassword) {
            return res.status(400).json({ error: "กรุณากรอกข้อมูลให้ครบถ้วน" });
        }

        const [existingUser] = await db.promise().query('SELECT id FROM users WHERE email = ?', [inputEmail]);
        if (existingUser.length > 0) {
            return res.status(409).json({ error: "อีเมลนี้ถูกใช้งานแล้ว" });
        }

        const hashedPassword = await bcrypt.hash(inputPassword, saltRounds);

        let finalProfilePic = profilePic;
        if (finalProfilePic && finalProfilePic.startsWith('data:')) {
            finalProfilePic = await saveFileFromBase64(finalProfilePic, 'user_profile');
        }

        const sqlInsertUser = `
            INSERT INTO users (first_name, last_name, email, password, image_path, role) 
            VALUES (?, ?, ?, ?, ?, 'user')
        `;

        await db.promise().query(sqlInsertUser, [inputFirsname, inputLastname, inputEmail, hashedPassword, finalProfilePic]);

        res.status(201).json({ message: "สมัครสมาชิกผู้ใช้ทั่วไปสำเร็จเรียบร้อยแล้ว!" });

    } catch (err) {
        console.error("User Registration Error: ", err);
        res.status(500).json({ error: "เกิดข้อผิดพลาดในการบันทึกข้อมูลลงฐานข้อมูล" });
    }
});

router.get('/users/:id/edit', async (req, res) => {
    try {
        const userId = req.params.id;
        const [users] = await db.promise().query(
            "SELECT id, first_name, last_name, email, phone, image_path FROM users WHERE id = ? AND role = 'user'",
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({ error: 'ไม่พบข้อมูลผู้ใช้งาน' });
        }

        res.json({ profile: users[0] });
    } catch (err) {
        console.error("Fetch User Error: ", err);
        res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงข้อมูล' });
    }
});

router.put('/users/update/:id', async (req, res) => {
    const userId = req.params.id;
    const { first_name, last_name, email, phone, old_password, new_password, image_path } = req.body;

    try {
        let finalImagePath = image_path;
        if (finalImagePath && finalImagePath.startsWith('data:')) {
            finalImagePath = await saveFileFromBase64(finalImagePath, 'user_profile');
        }

        await db.promise().query(
            `UPDATE users SET first_name = ?, last_name = ?, email = ?, phone = ?, image_path = COALESCE(?, image_path) WHERE id = ?`,
            [first_name, last_name, email, phone, finalImagePath, userId]
        );

        if (new_password && old_password) {
            if (new_password === old_password) {
                return res.status(400).json({ error: 'รหัสผ่านไม่ถูกต้อง กรุณากรอกใหม่อีกครั้ง' });
            }

            const [users] = await db.promise().query('SELECT password FROM users WHERE id = ?', [userId]);
            const match = await bcrypt.compare(old_password, users[0].password);

            if (!match) {
                return res.status(400).json({ error: 'รหัสผ่านไม่ถูกต้อง กรุณากรอกใหม่อีกครั้ง' });
            }

            const hashedNewPassword = await bcrypt.hash(new_password, saltRounds);
            await db.promise().query('UPDATE users SET password = ? WHERE id = ?', [hashedNewPassword, userId]);
        }

        res.json({ message: 'บันทึกข้อมูลส่วนตัวเรียบร้อยแล้ว!' });

    } catch (err) {
        console.error("Update User Error: ", err);
        res.status(500).json({ error: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' });
    }
});

router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const ip = req.ip || req.connection.remoteAddress;

    try {
        const [users] = await db.promise().query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) {
            return res.status(401).json({ error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" });
        }

        const user = users[0];

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" });
        }

        if (user.status === 'suspended') {
            return res.status(403).json({ error: "บัญชีของคุณถูกระงับการใช้งาน" });
        }
        if (user.status === 'deleted') {
            return res.status(403).json({ error: "บัญชีของคุณถูกลบออกจากระบบ" });
        }

        const token = jwt.sign(
            { id: user.id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        res.json({
            message: "เข้าสู่ระบบสำเร็จ",
            token: token,
            user: {
                id: user.id,
                role: user.role,
                first_name: user.first_name,
                last_name: user.last_name,
                image_path: user.image_path
            }
        });

    } catch (err) {
        console.error("Login Error: ", err);
        res.status(500).json({ error: "เกิดข้อผิดพลาดในการเข้าสู่ระบบ" });
    }
});

router.get('/users/:id', async (req, res) => {
    try {
        const [users] = await db.promise().query(
            `SELECT id, first_name, last_name, email, phone, image_path, created_at FROM users WHERE id = ? AND IFNULL(status, '') != 'deleted'`,
            [req.params.id]
        );
        if (users.length === 0) return res.status(404).json({ error: 'ไม่พบผู้ใช้งาน' });
        res.json(users[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

router.get('/users/:id/favorites', async (req, res) => {
    try {
        const userId = req.params.id;
        const sql = `
            SELECT s.lawyer_id as id, 
                   CONCAT(l.first_name, ' ', l.last_name) as full_name, 
                   l.image_path, 
                   l.role,
                   lw.license_number,
                   lw.office_address as address,
                   (SELECT GROUP_CONCAT(name SEPARATOR ',') FROM lawyer_categories lc JOIN lawyer_specialties ls ON lc.id = ls.specialty_id WHERE ls.lawyer_id = l.id) as specialties,
                   (SELECT name_th FROM provinces p WHERE p.id = lw.province_id) as province_name,
                   (SELECT total_experience FROM (
                       SELECT lawyer_id, SUM(
                           IFNULL(CAST(year_end AS SIGNED), YEAR(CURDATE()) + 543) - CAST(year_start AS SIGNED)
                       ) as total_experience
                       FROM lawyer_works
                       GROUP BY lawyer_id
                   ) w WHERE w.lawyer_id = l.id) as experience,
                   (SELECT IFNULL(AVG(rating), 0) FROM reviews r WHERE r.lawyer_id = l.id AND r.status IN ('published', 'reported')) as rating,
                   (SELECT COUNT(*) FROM reviews r WHERE r.lawyer_id = l.id AND r.status IN ('published', 'reported')) as review_count,
                   s.created_at
            FROM saved_lawyers s
            JOIN users l ON s.lawyer_id = l.id
            JOIN lawyers lw ON s.lawyer_id = lw.id
            WHERE s.user_id = ? AND IFNULL(l.status, '') != 'deleted'
        `;
        const [rows] = await db.promise().query(sql, [userId]);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error fetching favorites' });
    }
});

router.post('/users/favorites', async (req, res) => {
    try {
        const { user_id, lawyer_id } = req.body;
        if (!user_id || !lawyer_id) return res.status(400).json({ error: 'Missing parameters' });

        await db.promise().query(
            'INSERT IGNORE INTO saved_lawyers (user_id, lawyer_id) VALUES (?, ?)',
            [user_id, lawyer_id]
        );
        res.json({ success: true, message: 'Saved to favorites' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error saving favorite' });
    }
});

router.delete('/users/favorites', async (req, res) => {
    try {
        const { user_id, lawyer_id } = req.body;
        if (!user_id || !lawyer_id) return res.status(400).json({ error: 'Missing parameters' });

        await db.promise().query(
            'DELETE FROM saved_lawyers WHERE user_id = ? AND lawyer_id = ?',
            [user_id, lawyer_id]
        );
        res.json({ success: true, message: 'Removed from favorites' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error removing favorite' });
    }
});

router.get('/users/:id/reviews', async (req, res) => {
    try {
        const userId = req.params.id;
        const sql = `
            SELECT r.id, r.rating, r.comment, r.status, r.created_at, r.reply, r.replied_at,
                   l.id as lawyer_id, l.first_name as lawyer_first, l.last_name as lawyer_last, l.image_path as lawyer_image
            FROM reviews r
            JOIN users l ON r.lawyer_id = l.id
            WHERE r.client_id = ? AND IFNULL(l.status, '') != 'deleted'
            ORDER BY r.created_at DESC
        `;
        const [rows] = await db.promise().query(sql, [userId]);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error fetching user reviews' });
    }
});

module.exports = router;
