const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const path = require('path');
const saltRounds = 10;
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' })); 
app.use(express.urlencoded({ limit: '50mb', extended: true }))
app.use('/uploads', express.static('uploads'));


const saveFileFromBase64 = (base64String, filePrefix) => {
    if (!base64String) return null;
    const matches = base64String.match(/^data:(.+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
        throw new Error("รูปแบบไฟล์ Base64 ไม่ถูกต้อง");
    }

    const mimeType = matches[1]; 
    const fileData = matches[2]; 

    // เช็คประเภทไฟล์ให้ตรงตามที่เราอนุญาต
    let ext = '';
    if (mimeType === 'image/png') {
        ext = 'png';
    } else if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
        ext = 'jpeg';
    } else if (mimeType === 'application/pdf') {
        ext = 'pdf';
    } else {
        throw new Error("ระบบรองรับเฉพาะไฟล์ .png, .jpeg และ .pdf เท่านั้นครับ"); 
    }

    // สร้างชื่อไฟล์และบันทึกลงเซิร์ฟเวอร์
    const fileName = `${filePrefix}_${Date.now()}.${ext}`;
    const filePath = path.join(__dirname, 'uploads', fileName);
    
    const fs = require('fs'); // เผื่อไว้ดึง fs มาใช้ในสโคปนี้
    fs.writeFileSync(filePath, fileData, 'base64');
    
    return `/uploads/${fileName}`; 
};

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

db.connect((err) => {
    if (err) {
        console.error('เชื่อมต่อฐานข้อมูลล้มเหลว: ', err);
        return;
    }
    console.log('เชื่อมต่อฐานข้อมูลสำเร็จ!!!');
});

app.post('/user/register', async (req, res) => {
    // คนทั่วไปรับข้อมูลแค่นี้ ไม่ต้องมีใบอนุญาตทนาย
    const { inputFirsname, 
        inputLastname, 
        inputEmail, 
        inputPhone, 
        inputPassword 
    } = req.body;

    try {
        // 1. เช็กข้อมูลเบื้องต้น
        if (!inputFirsname || !inputLastname || !inputEmail || !inputPhone || !inputPassword) {
            return res.status(400).json({ error: "กรุณากรอกข้อมูลให้ครบถ้วน" });
        }

        // 2. เช็กอีเมลซ้ำ
        const [existingUser] = await db.promise().query('SELECT id FROM users WHERE email = ?', [inputEmail]);
        if (existingUser.length > 0) {
            return res.status(409).json({ error: "อีเมลนี้ถูกใช้งานแล้ว" });
        }

        // 3. Password Hashing (Security)
        const hashedPassword = await bcrypt.hash(inputPassword, saltRounds);

        // 4. บันทึกลงตาราง users (ระบุ role เป็น 'user' ชัดเจน)
        const sqlInsertUser = `
            INSERT INTO users (first_name, last_name, email, phone, password) 
            VALUES (?, ?, ?, ?, ?)
        `;
        
        await db.promise().query(sqlInsertUser, [inputFirsname, inputLastname, inputEmail, inputPhone, hashedPassword]);

        res.status(201).json({ message: "สมัครสมาชิกผู้ใช้ทั่วไปสำเร็จเรียบร้อยแล้ว!" });

    } catch (err) {
        console.error("User Registration Error: ", err);
        res.status(500).json({ error: "เกิดข้อผิดพลาดในการบันทึกข้อมูลลงฐานข้อมูล" });
    }
});

app.post('/lawyer/register', async (req, res) => {
    // รับข้อมูลจากหน้าบ้าน 
    const { 
        inputFirsname, 
        inputLastname, 
        inputEmail, 
        inputPhone, 
        inputPassword, 
        inputLicNum, 
        inputAddress, 
        inputProvince, 
        profilePic,
        LicFile    
    } = req.body;

    try {
        // 1. เช็กข้อมูลเบื้องต้น
        if (!inputFirsname || !inputLastname || !inputEmail || !inputPhone || !inputPassword || !inputLicNum || !inputProvince) {
            return res.status(400).json({ error: "กรุณากรอกข้อมูลสำคัญให้ครบถ้วน" });
        }

        const full_name = `${inputFirsname} ${inputLastname}`;

        // เช็กรูปแบบอีเมล
        const emailRegex = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(inputEmail) || !inputEmail.endsWith('.com')) {
            return res.status(400).json({ error: "รูปแบบอีเมลไม่ถูกต้อง" });
        }

        // เช็กความปลอดภัยรหัสผ่าน 
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{8,}$/;
        if (!passwordRegex.test(inputPassword)) {
            return res.status(400).json({ error: "รหัสผ่านไม่ปลอดภัยตามเกณฑ์ที่กำหนด" });
        }

        // เช็กอีเมลซ้ำในฐานข้อมูล
        const [existingUser] = await db.promise().query('SELECT id FROM users WHERE email = ?', [inputEmail]);
        if (existingUser.length > 0) {
            return res.status(409).json({ error: "อีเมลนี้ถูกใช้งานแล้ว กรุณาเข้าสู่ระบบ หรือใช้อีเมลอื่น" });
        }

        // 3. Password Hashing 
        const hashedPassword = await bcrypt.hash(inputPassword, saltRounds);

        let dbImgePath = null;
        let dbLicFilePath = null;

        try {
            dbImgePath = saveFileFromBase64(profilePic, 'profile');
            dbLicFilePath = saveFileFromBase64(LicFile, 'license');
        } catch (uploadError) {
            return res.status(400).json({error: uploadError.message});
        }

        const connection = db.promise();
        await connection.query('BEGIN'); 

        try {
            // 4.1 Insert ลงตาราง users ก่อน
            const [userResult] = await connection.query(
                `INSERT INTO users (first_name, last_name, email, phone, password, image_path, role) 
                VALUES (?, ?, ?, ?, ?, ?, 'lawyer')`,
                [inputFirsname,inputLastname, inputEmail, inputPhone, hashedPassword, dbImgePath || null]
            );
            
            const newUserId = userResult.insertId; // ดึง ID ที่เพิ่งสร้างใหม่

            // 4.2 Insert ข้อมูลเฉพาะของทนายลงตาราง lawyers
            await connection.query(
                `INSERT INTO lawyers (id, license_number, province_id, office_address, license_file) 
                VALUES (?, ?, ?, ?, ?)`,
                [newUserId, inputLicNum, inputProvince, inputAddress, dbLicFilePath]
            );

            await connection.query('COMMIT'); // ยืนยันการบันทึกข้อมูลทั้ง 2 ตาราง

            // 5. Response แจ้งผลลัพธ์
            res.status(201).json({ message: "สมัครสมาชิกสำเร็จเรียบร้อยแล้ว!" });

        } catch (insertError) {
            await connection.query('ROLLBACK'); // ถ้าพังตรงไหน ให้ย้อนกลับข้อมูลทั้งหมด (ไม่บันทึกเลย)
            console.error("Database Insert Error: ", insertError);
            res.status(500).json({ error: "เกิดข้อผิดพลาดในการบันทึกข้อมูลลงฐานข้อมูล" });
        }

    } catch (err) {
        console.error("Registration Error: ", err);
        res.status(500).json({ error: "เกิดข้อผิดพลาดที่เซิร์ฟเวอร์" });
    }
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const ip = req.ip || req.connection.remoteAddress;

    try {
        // 1. ตรวจสอบว่าอีเมลมีจริงไหม
        const [users] = await db.promise().query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) {
            return res.status(401).json({ error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" });
        }

        const user = users[0];

        // 2. ตรวจสอบรหัสผ่าน (ใช้ bcrypt.compare)
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" });
        }

        // 3. สร้าง JWT Token (เก็บ id และ role ไว้ในบัตรผ่านนี้)
        const token = jwt.sign(
            { id: user.id, role: user.role }, 
            process.env.JWT_SECRET, 
            { expiresIn: '1d' } // บัตรมีอายุ 1 วัน
        );

        // 4. บันทึก Log การ Login ลงตารางที่เราสร้างไว้
        await db.promise().query(
            'INSERT INTO user_activity_logs (user_id, activity_type, ip_address) VALUES (?, ?, ?)',
            [user.id, 'LOGIN', ip]
        );

        // 5. ส่งผลลัพธ์กลับไป
        res.json({
            message: "เข้าสู่ระบบสำเร็จ",
            token: token, // นี่คือบัตรผ่านที่ User ต้องเก็บไว้
            user: {
                id: user.id,
                role: user.role,
                first_name: user.first_name
            }
        });

    } catch (err) {
        console.error("Login Error: ", err);
        res.status(500).json({ error: "เกิดข้อผิดพลาดในการเข้าสู่ระบบ" });
    }
});

// ดึงจังหวัดมาเป็นตัวเลือก
app.get('/lawyer/provinces', async (req, res) => {
    try {
        const [rows] = await db.promise().query('SELECT id, name FROM provinces ORDER BY name ASC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ดึงหมวดหมู่คดีเป็นตัวเลือก
app.get('/lawyer/categories', async (req, res) => {
    try {
        const [rows] = await db.promise().query('SELECT id, name FROM lawyer_categories ORDER BY name ASC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ดึงข้อมูลทนายมาโชว์หน้าแก้ไขข้อมูลทนาย
app.get('/lawyers/:id/edit', async (req, res) => {
    try {
        const [profile] = await db.promise().query(
            `SELECT u.first_name, u.last_name, CONCAT(u.first_name, ' ', u.last_name) AS full_name,
                u.email, u.phone, u.image_path, 
                l.license_number, l.license_file, l.line_id, l.facebook_url, 
                l.province_id, l.office_address
            FROM users u JOIN lawyers l ON u.id = l.id 
            WHERE u.id = ?`, [req.params.id]);

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


        res.json({ 
            profile: profile[0], 
            schedules, 
            specialties,
            educations, 
            works });

    } catch (err) {
        console.error("Database Error: ", err);
        res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงข้อมูลเพื่อแก้ไข' });
    }
});

app.put('/lawyer/lawyer/save-profile/:id', async (req, res) => {
    const id = req.params.id;
    const data = req.body;

    try {
        let finalImagePath = data.image_path;
        let finalLicensePath = data.license_file;

        if (finalImagePath && finalImagePath.startsWith('data:')) {
            finalImagePath = saveFileFromBase64(finalImagePath, 'profile');
        }

        if (finalLicensePath && finalLicensePath.startsWith('data:')) {
            finalLicensePath = saveFileFromBase64(finalLicensePath, 'license');
        }

        await db.promise().query(
            `UPDATE users SET first_name = ?, last_name = ?, email = ?, phone = ?, image_path = ? 
            WHERE id = ?`
            , [data.first_name, data.last_name, data.email, data.phone, finalImagePath, id]
        );

        await db.promise().query(
            `UPDATE lawyers SET license_number = ?, line_id = ?, facebook_url = ?, province_id = ?, office_address = ?, license_file = ? 
            WHERE id = ?`, [data.license_number, data.line_id, data.facebook_url, data.province_id, data.office_address, finalLicensePath, id]
        );

        if (data.new_password && data.old_password) {
            const [user] = await db.promise().query('SELECT password FROM users WHERE id = ?', [id]);
            const match = await bcrypt.compare(data.old_password, user[0].password);
            if (!match) {
                return res.status(400).json({ error: 'รหัสผ่านปัจจุบันไม่ถูกต้อง' });
            }
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
                    const [insertRes] = await db.promise().query(`INSERT INTO lawyer_categories (name) VALUES (?)`, [spec.name]);
                    specId = insertRes.insertId;
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

        res.json({ message: 'บันทึกข้อมูลเรียบร้อยแล้ว' });

    } catch (err) {
        console.error("Save Error: ", err);
        res.status(500).json({ error: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' });
    }
});

app.get('/lawyer/search/provinces', async (req, res) => {
    try {
        const [rows] = await db.promise().query('SELECT id, name, region FROM provinces ORDER BY region ASC, name ASC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. ค้นหาทนายความ
app.get('/lawyer/search', async (req, res) => {
    const { keyword, province, experience } = req.query;
    let queryParams = [];

    // 1. ใช้ CTE (Common Table Expression) สร้างตารางจำลองคำนวณอายุงานรวมของทนายแต่ละคน
    let sql = `
        WITH LawyerExperience AS (
            SELECT 
                lawyer_id, 
                SUM(IFNULL(year_end, YEAR(CURDATE())) - year_start) AS total_exp
            FROM lawyer_works
            GROUP BY lawyer_id
        )
        SELECT 
            u.id, 
            CONCAT(u.first_name, ' ', u.last_name) AS full_name, 
            u.image_path, 
            p.name AS province_name,
            IFNULL(exp.total_exp, 0) AS total_experience,
            GROUP_CONCAT(DISTINCT lc.name SEPARATOR ', ') AS specialties
        FROM users u
        JOIN lawyers l ON u.id = l.id
        LEFT JOIN provinces p ON l.province_id = p.id
        LEFT JOIN LawyerExperience exp ON u.id = exp.lawyer_id
        LEFT JOIN lawyer_specialties ls ON l.id = ls.lawyer_id
        LEFT JOIN lawyer_categories lc ON ls.specialty_id = lc.id
        WHERE u.role = 'lawyer'
    `;

    // 2. เงื่อนไขกรองพื้นที่ให้บริการ
    if (province) {
        const provinceIds = province.split(',').map(Number);
        sql += ` AND l.province_id IN (?)`;
        queryParams.push(provinceIds);
    }

    // 3. เงื่อนไขกรอง Keyword (หาจากชื่อ, นามสกุล หรือ หมวดหมู่คดี)
    if (keyword) {
        sql += ` AND (lc.name LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ?)`;
        queryParams.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }

    // 4. เงื่อนไขกรองประสบการณ์ (แยก string "1-3" เป็น min=1, max=3)
    if (experience) {
        const [minExp, maxExp] = experience.split('-');
        // ใช้ BETWEEN เพื่อหาค่าที่อยู่ในช่วงนั้นๆ
        sql += ` AND IFNULL(exp.total_exp, 0) BETWEEN ? AND ?`;
        queryParams.push(Number(minExp), Number(maxExp));
    }

    // 5. จัดกลุ่มข้อมูล (Group By) เพื่อให้ข้อมูลทนาย 1 คน มีแค่ 1 แถวเสมอ
    sql += ` GROUP BY u.id, u.first_name, u.last_name, u.image_path, p.name, exp.total_exp`;

    try {
        const [rows] = await db.promise().query(sql, queryParams);
        res.json(rows);
    } catch (error) {
        console.error('Search Database Error:', error);
        res.status(500).json({ error: 'เกิดข้อผิดพลาดในการค้นหาทนายความ' });
    }
});

app.listen(process.env.PORT, () => {
    console.log(`server run at http://localhost:${process.env.PORT}`)
})