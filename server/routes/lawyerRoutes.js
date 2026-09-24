const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const db = require('../config/db');
const { saveFileFromBase64 } = require('../utils/fileUtils');
const saltRounds = 10;

router.post('/lawyer/register', async (req, res) => {
    const {
        inputFirsname, inputLastname, inputEmail, inputPhone, inputPassword, inputLicNum, inputProvince,
        inputHouseNo, inputMoo, inputSoi, inputRoad, inputSubDistrict, inputDistrict, inputZipcode,
        profilePic, LicFile, categories, inputLineId, inputFacebook, inputFeeRate,
        schedules, educations, works
    } = req.body;

    try {
        if (!inputFirsname || !inputLastname || !inputEmail || !inputPhone || !inputPassword || !inputLicNum || !inputProvince) {
            return res.status(400).json({ error: "กรุณากรอกข้อมูลสำคัญให้ครบถ้วน" });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(inputEmail) || !inputEmail.endsWith('.com')) {
            return res.status(400).json({ error: "รูปแบบอีเมลไม่ถูกต้อง" });
        }

        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{8,}$/;
        if (!passwordRegex.test(inputPassword)) {
            return res.status(400).json({ error: "รหัสผ่านไม่ปลอดภัยตามเกณฑ์ที่กำหนด" });
        }

        const [existingUser] = await db.promise().query('SELECT id FROM users WHERE email = ?', [inputEmail]);
        if (existingUser.length > 0) {
            return res.status(409).json({ error: "อีเมลนี้ถูกใช้งานแล้ว กรุณาเข้าสู่ระบบ หรือใช้อีเมลอื่น" });
        }

        const hashedPassword = await bcrypt.hash(inputPassword, saltRounds);
        let dbImgePath = null;
        let dbLicFilePath = null;

        try {
            dbImgePath = await saveFileFromBase64(profilePic, 'profile');
            dbLicFilePath = await saveFileFromBase64(LicFile, 'license');
        } catch (uploadError) {
            return res.status(400).json({ error: uploadError.message });
        }

        const connection = db.promise();
        await connection.query('BEGIN');

        try {
            const [[prov]] = await connection.query('SELECT name_th as name FROM provinces WHERE id = ?', [inputProvince]);
            const [[dist]] = await connection.query('SELECT name_th FROM districts WHERE id = ?', [inputDistrict]);
            const [[subDist]] = await connection.query('SELECT name_th FROM sub_districts WHERE id = ?', [inputSubDistrict]);

            const pName = prov ? prov.name : '';
            const dName = dist ? dist.name_th : '';
            const sdName = subDist ? subDist.name_th : '';

            let formattedAddress = `${inputHouseNo}`;
            if (inputMoo) formattedAddress += ` หมู่ ${inputMoo}`;
            if (inputSoi) formattedAddress += ` ซอย ${inputSoi}`;
            if (inputRoad) formattedAddress += ` ถนน ${inputRoad}`;
            formattedAddress += ` ${sdName} ${dName} ${pName} ${inputZipcode}`;

            const [userResult] = await connection.query(
                `INSERT INTO users (first_name, last_name, email, phone, password, image_path, role) 
                VALUES (?, ?, ?, ?, ?, ?, 'lawyer')`,
                [inputFirsname, inputLastname, inputEmail, inputPhone, hashedPassword, dbImgePath || null]
            );

            const newUserId = userResult.insertId;

            await connection.query(
                `INSERT INTO lawyers (id, license_number, province_id, office_address, house_no, moo, soi, road, subdistrict_id, district_id, zipcode, license_file, line_id, facebook_url, fee_rate) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [newUserId, inputLicNum, inputProvince, formattedAddress, inputHouseNo || null, inputMoo || null, inputSoi || null, inputRoad || null, inputSubDistrict || null, inputDistrict || null, inputZipcode || null, dbLicFilePath, inputLineId || null, inputFacebook || null, inputFeeRate || null]
            );

            if (categories && categories.length > 0) {
                for (let cat of categories) {
                    let catId = cat;
                    if (isNaN(cat)) {
                        const [existing] = await connection.query(`SELECT id FROM lawyer_categories WHERE name = ?`, [cat]);
                        if (existing.length > 0) {
                            catId = existing[0].id;
                        } else {
                            const [insertCat] = await connection.query(`INSERT INTO lawyer_categories (name) VALUES (?)`, [cat]);
                            catId = insertCat.insertId;
                        }
                    }
                    await connection.query(`INSERT INTO lawyer_specialties (lawyer_id, specialty_id) VALUES (?, ?)`, [newUserId, catId]);
                }
            }

            if (schedules && Array.isArray(schedules) && schedules.length > 0) {
                for (const s of schedules) {
                    await connection.query(
                        `INSERT INTO lawyer_schedules (lawyer_id, day_of_week, time_start, time_end, is_open) VALUES (?, ?, ?, ?, ?)`,
                        [newUserId, s.day_of_week, s.time_start || null, s.time_end || null, s.is_open ? 1 : 0]
                    );
                }
            }

            if (educations && Array.isArray(educations) && educations.length > 0) {
                for (const e of educations) {
                    await connection.query(
                        `INSERT INTO lawyer_educations (lawyer_id, university, degree, year_start, year_end) VALUES (?, ?, ?, ?, ?)`,
                        [newUserId, e.university, e.degree, e.year_start || null, e.year_end || null]
                    );
                }
            }

            if (works && Array.isArray(works) && works.length > 0) {
                for (const w of works) {
                    await connection.query(
                        `INSERT INTO lawyer_works (lawyer_id, company_name, job_position, year_start, year_end) VALUES (?, ?, ?, ?, ?)`,
                        [newUserId, w.company_name, w.job_position, w.year_start || null, w.year_end || null]
                    );
                }
            }

            await connection.query('COMMIT');
            res.status(201).json({ message: "สมัครสมาชิกสำเร็จเรียบร้อยแล้ว!" });

        } catch (insertError) {
            await connection.query('ROLLBACK');
            console.error("Database Insert Error: ", insertError);
            res.status(500).json({ error: "เกิดข้อผิดพลาดในการบันทึกข้อมูลลงฐานข้อมูล" });
        }

    } catch (err) {
        console.error("Registration Error: ", err);
        res.status(500).json({ error: "เกิดข้อผิดพลาดที่เซิร์ฟเวอร์" });
    }
});

router.get('/lawyer/provinces', async (req, res) => {
    try {
        const [rows] = await db.promise().query('SELECT id, name_th as name FROM provinces ORDER BY name_th ASC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/lawyer/districts', async (req, res) => {
    const { province_id } = req.query;
    try {
        if (!province_id) return res.status(400).json({ error: "Missing province_id" });
        const [rows] = await db.promise().query('SELECT id, name_th as name FROM districts WHERE province_id = ? ORDER BY name_th ASC', [province_id]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/lawyer/subdistricts', async (req, res) => {
    const { district_id } = req.query;
    try {
        if (!district_id) return res.status(400).json({ error: "Missing district_id" });
        const [rows] = await db.promise().query('SELECT id, name_th as name, zip_code FROM sub_districts WHERE district_id = ? ORDER BY name_th ASC', [district_id]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/lawyer/categories', async (req, res) => {
    try {
        const [rows] = await db.promise().query('SELECT id, name FROM lawyer_categories ORDER BY name ASC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/lawyers/:id/edit', async (req, res) => {
    try {
        const [profile] = await db.promise().query(
            `SELECT u.first_name, u.last_name, CONCAT(u.first_name, ' ', u.last_name) AS full_name,
                u.email, u.phone, u.image_path, 
                l.license_number, l.license_file, l.line_id, l.facebook_url, 
                l.province_id, l.office_address, l.house_no, l.moo, l.soi, l.road, l.subdistrict_id, l.district_id, l.zipcode, l.fee_rate, l.status, l.reject_reason
            FROM users u JOIN lawyers l ON u.id = l.id 
            WHERE u.id = ? AND IFNULL(u.status, '') != 'deleted'`, [req.params.id]);

        const [schedules] = await db.promise().query(
            `SELECT day_of_week, time_start, time_end, is_open 
            FROM lawyer_schedules 
            WHERE lawyer_id = ?`, [req.params.id]
        );

        const [specialties] = await db.promise().query(
            `SELECT lc.id, lc.name 
            FROM lawyer_specialties ls
            JOIN lawyer_categories lc ON ls.specialty_id = lc.id 
            WHERE ls.lawyer_id = ?`, [req.params.id]);

        const [educations] = await db.promise().query(
            `SELECT university, degree, year_start, year_end  
            FROM lawyer_educations
            WHERE lawyer_id = ?`, [req.params.id]);

        const [works] = await db.promise().query(
            `SELECT company_name, job_position, year_start, year_end 
            FROM lawyer_works
            WHERE lawyer_id = ?`, [req.params.id]);

        const [achievements] = await db.promise().query(
            `SELECT title, organization, year 
            FROM lawyer_portfolios
            WHERE lawyer_id = ?`, [req.params.id]);

        res.json({ profile: profile[0], schedules, specialties, educations, works, achievements });

    } catch (err) {
        console.error("Database Error: ", err);
        res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงข้อมูลเพื่อแก้ไข' });
    }
});

router.put('/lawyer/lawyer/save-profile/:id', async (req, res) => {
    const id = req.params.id;
    const data = req.body;

    try {
        let finalImagePath = data.image_path;
        let finalLicensePath = data.license_file;

        if (finalImagePath && finalImagePath.startsWith('data:')) {
            finalImagePath = await saveFileFromBase64(finalImagePath, 'profile');
        }

        if (finalLicensePath && finalLicensePath.startsWith('data:')) {
            finalLicensePath = await saveFileFromBase64(finalLicensePath, 'license');
        }

        await db.promise().query(
            `UPDATE users SET first_name = ?, last_name = ?, email = ?, phone = ?, image_path = ? 
            WHERE id = ?`
            , [data.first_name, data.last_name, data.email, data.phone, finalImagePath, id]
        );

        await db.promise().query(
            `UPDATE lawyers SET license_number = ?, line_id = ?, facebook_url = ?, province_id = ?, office_address = ?, house_no = ?, moo = ?, soi = ?, road = ?, subdistrict_id = ?, district_id = ?, zipcode = ?, fee_rate = ?, license_file = ?, status = IF(status = 'rejected', 'pending', status) 
            WHERE id = ?`, [data.license_number, data.line_id, data.facebook_url, data.province_id || null, data.office_address, data.house_no || null, data.moo || null, data.soi || null, data.road || null, data.subdistrict_id || null, data.district_id || null, data.zipcode || null, data.fee_rate || null, finalLicensePath, id]
        );

        if (data.new_password) {
            const hash = await bcrypt.hash(data.new_password, saltRounds);
            await db.promise().query(`UPDATE users SET password = ? WHERE id = ?`, [hash, id]);
        }

        await db.promise().query(`DELETE FROM lawyer_schedules WHERE lawyer_id = ?`, [id]);
        if (data.schedules && data.schedules.length > 0) {
            const scheduleValues = data.schedules.map(s => [id, s.day_of_week, s.time_start, s.time_end, s.is_open]);
            await db.promise().query('INSERT INTO lawyer_schedules (lawyer_id, day_of_week, time_start, time_end, is_open) VALUES ?', [scheduleValues]);
        }

        await db.promise().query(`DELETE FROM lawyer_specialties WHERE lawyer_id = ?`, [id]);
        if (data.specialties && data.specialties.length > 0) {
            for (let spec of data.specialties) {
                let specId = spec.id;
                if (String(specId).startsWith('new_')) {
                    const [existing] = await db.promise().query(`SELECT id FROM lawyer_categories WHERE name = ?`, [spec.name]);
                    if (existing.length > 0) {
                        specId = existing[0].id;
                    } else {
                        const [insertRes] = await db.promise().query(`INSERT INTO lawyer_categories (name) VALUES (?)`, [spec.name]);
                        specId = insertRes.insertId;
                    }
                }
                await db.promise().query(`INSERT INTO lawyer_specialties (lawyer_id, specialty_id) VALUES (?, ?)`, [id, specId]);
            }
        }

        await db.promise().query(`DELETE FROM lawyer_educations WHERE lawyer_id = ?`, [id]);
        if (data.educations && data.educations.length > 0) {
            const eduValues = data.educations.map(e => [id, e.university, e.degree, e.year_start, e.year_end]);
            await db.promise().query(`INSERT INTO lawyer_educations (lawyer_id, university, degree, year_start, year_end) VALUES ?`, [eduValues]);
        }

        await db.promise().query(`DELETE FROM lawyer_works WHERE lawyer_id = ?`, [id]);
        if (data.works && data.works.length > 0) {
            const workValues = data.works.map(w => [id, w.company_name, w.job_position, w.year_start, w.year_end]);
            await db.promise().query(`INSERT INTO lawyer_works (lawyer_id, company_name, job_position, year_start, year_end) VALUES ?`, [workValues]);
        }

        await db.promise().query(`DELETE FROM lawyer_portfolios WHERE lawyer_id = ?`, [id]);
        if (data.achievements && data.achievements.length > 0) {
            const achValues = data.achievements.map(a => [id, a.title, a.organization, a.year]);
            await db.promise().query(`INSERT INTO lawyer_portfolios (lawyer_id, title, organization, year) VALUES ?`, [achValues]);
        }

        res.json({ message: 'บันทึกข้อมูลเรียบร้อยแล้ว' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'เกิดข้อผิดพลาดในการอัปเดตข้อมูล: ' + error.message });
    }
});

router.get('/lawyer/search/provinces', async (req, res) => {
    try {
        const [rows] = await db.promise().query('SELECT p.id, p.name_th as name, g.name as region FROM provinces p JOIN geographies g ON p.geography_id = g.id ORDER BY g.name ASC, p.name_th ASC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/lawyer/search', async (req, res) => {
    const { keyword, province, experience } = req.query;
    let queryParams = [];

    let sql = `
        WITH LawyerExperience AS (
            SELECT 
                lawyer_id, 
                SUM(IFNULL(year_end, YEAR(CURDATE())) - IFNULL(year_start, YEAR(CURDATE()))) AS total_exp
            FROM lawyer_works
            GROUP BY lawyer_id
        )
        SELECT 
            u.id, 
            CONCAT(u.first_name, ' ', u.last_name) AS full_name, 
            u.image_path, 
            p.name_th AS province_name,
            IFNULL(exp.total_exp, 0) AS total_experience,
            l.fee_rate,
            GROUP_CONCAT(DISTINCT lc.name SEPARATOR ', ') AS specialties,
            (SELECT IFNULL(AVG(rating), 0) FROM reviews r WHERE r.lawyer_id = u.id AND r.status IN ('published', 'reported')) as rating,
            (SELECT COUNT(*) FROM reviews r WHERE r.lawyer_id = u.id AND r.status IN ('published', 'reported')) as review_count
        FROM users u
        JOIN lawyers l ON u.id = l.id
        LEFT JOIN provinces p ON l.province_id = p.id
        LEFT JOIN LawyerExperience exp ON u.id = exp.lawyer_id
        LEFT JOIN lawyer_specialties ls ON l.id = ls.lawyer_id
        LEFT JOIN lawyer_categories lc ON ls.specialty_id = lc.id
        WHERE u.role = 'lawyer' AND l.status = 'approved' AND IFNULL(u.status, '') != 'deleted'
    `;

    if (province) {
        const provinceIds = province.split(',').map(Number);
        sql += ` AND l.province_id IN (?)`;
        queryParams.push(provinceIds);
    }

    if (keyword) {
        sql += ` AND (lc.name LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ?)`;
        queryParams.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }

    if (experience) {
        const [minExp, maxExp] = experience.split('-');
        sql += ` AND IFNULL(exp.total_exp, 0) BETWEEN ? AND ?`;
        queryParams.push(Number(minExp), Number(maxExp));
    }

    if (req.query.price) {
        const priceStr = req.query.price;
        if (priceStr.includes('+')) {
            const minPrice = priceStr.replace('+', '');
            sql += ` AND l.fee_rate >= ?`;
            queryParams.push(Number(minPrice));
        } else if (priceStr.includes('-')) {
            const [minPrice, maxPrice] = priceStr.split('-');
            sql += ` AND l.fee_rate BETWEEN ? AND ?`;
            queryParams.push(Number(minPrice), Number(maxPrice));
        }
    }

    sql += ` GROUP BY u.id, u.first_name, u.last_name, u.image_path, p.name_th, exp.total_exp, l.fee_rate`;

    try {
        const [rows] = await db.promise().query(sql, queryParams);
        res.json(rows);
    } catch (error) {
        console.error('Search Database Error:', error);
        res.status(500).json({ error: 'เกิดข้อผิดพลาดในการค้นหาทนายความ' });
    }
});

router.get('/lawyer/zipcode', async (req, res) => {
    const { zipcode } = req.query;
    if (!zipcode) return res.status(400).json({ error: 'Missing zipcode' });
    try {
        const sql = `
            SELECT s.id as subdistrict_id, s.name_th as subdistrict_name,
                   d.id as district_id, d.name_th as district_name,
                   p.id as province_id, p.name_th as province_name
            FROM sub_districts s
            JOIN districts d ON s.district_id = d.id
            JOIN provinces p ON d.province_id = p.id
            WHERE s.zip_code = ?
        `;
        const [rows] = await db.promise().query(sql, [zipcode]);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching location by zipcode:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

module.exports = router;
