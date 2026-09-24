const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const path = require('path');
const fs = require('fs');
const saltRounds = 10;
require('dotenv').config({ path: path.join(__dirname, '.env') });


const app = express();
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }))
app.use('/uploads', express.static('uploads'));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));
app.use(express.static(path.join(__dirname, '..')));

// Web Page Routes
app.get('/sign_in', (req, res) => { res.render('sign_in'); });
app.get('/sign_up', (req, res) => { res.render('sign_up'); });
app.get('/lawyers', (req, res) => { res.render('lawyers'); });
app.get('/lawyer_profile', (req, res) => { res.render('lawyer/lawyer_profile'); });
app.get('/admin_dashboard', (req, res) => { res.render('admin/admin_dashboard'); });
app.get('/lawyer_dashboard', (req, res) => { res.render('lawyer/lawyer_dashboard'); });
app.get('/lawyer_edit', (req, res) => { res.render('lawyer/lawyer_edit'); });
app.get('/lawyer_reviews', (req, res) => { res.render('lawyer/lawyer_reviews'); });
app.get('/lawyer_signup', (req, res) => { res.render('lawyer/lawyer_signup'); });
app.get('/favorites', (req, res) => { res.render('user/favorites'); });
app.get('/user_reviews', (req, res) => { res.render('user/user_reviews'); });
app.get('/profile', (req, res) => { res.render('user/profile'); });


const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) return res.status(401).json({ error: "กรุณาเข้าสู่ระบบก่อนใช้งาน" });

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: "เซสชันหมดอายุหรือไม่ถูกต้อง" });
        req.user = user;
        next();
    });
};

const authenticateAdmin = (req, res, next) => {
    authenticateToken(req, res, () => {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: "ไม่มีสิทธิ์เข้าถึง (สำหรับ Admin เท่านั้น)" });
        }
        next();
    });
};

app.get('/', (req, res) => {
    res.render('index');
});


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
        inputPassword,
        profilePic
    } = req.body;

    try {
        // 1. เช็กข้อมูลเบื้องต้น
        if (!inputFirsname || !inputLastname || !inputEmail || !inputPassword) {
            return res.status(400).json({ error: "กรุณากรอกข้อมูลให้ครบถ้วน" });
        }

        // 2. เช็กอีเมลซ้ำ
        const [existingUser] = await db.promise().query('SELECT id FROM users WHERE email = ?', [inputEmail]);
        if (existingUser.length > 0) {
            return res.status(409).json({ error: "อีเมลนี้ถูกใช้งานแล้ว" });
        }

        // 3. Password Hashing (Security)
        const hashedPassword = await bcrypt.hash(inputPassword, saltRounds);

        // Save image to file if provided
        let finalProfilePic = profilePic;
        if (finalProfilePic && finalProfilePic.startsWith('data:')) {
            finalProfilePic = saveFileFromBase64(finalProfilePic, 'user_profile');
        }

        // 4. บันทึกลงตาราง users (ระบุ role เป็น 'user' ชัดเจน)
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

// 1. API สำหรับดึงข้อมูล User มาแสดงที่หน้าแก้ไขโปรไฟล์
app.get('/users/:id/edit', async (req, res) => {
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

// 2. API สำหรับอัปเดตข้อมูล User เมื่อกดบันทึก
app.put('/users/update/:id', async (req, res) => {
    const userId = req.params.id;
    const { first_name, last_name, email, phone, old_password, new_password, image_path } = req.body;

    try {
        let finalImagePath = image_path;
        if (finalImagePath && finalImagePath.startsWith('data:')) {
            finalImagePath = saveFileFromBase64(finalImagePath, 'user_profile');
        }

        // อัปเดตข้อมูลพื้นฐาน
        await db.promise().query(
            `UPDATE users SET first_name = ?, last_name = ?, email = ?, phone = ?, image_path = COALESCE(?, image_path) WHERE id = ?`,
            [first_name, last_name, email, phone, finalImagePath, userId]
        );

        // ถ้ามีการกรอกรหัสผ่านใหม่ ให้ตรวจสอบและอัปเดตด้วย
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

app.post('/lawyer/register', async (req, res) => {
    // รับข้อมูลจากหน้าบ้าน 
    const {
        inputFirsname,
        inputLastname,
        inputEmail,
        inputPhone,
        inputPassword,
        inputLicNum,
        inputProvince,
        inputHouseNo,
        inputMoo,
        inputSoi,
        inputRoad,
        inputSubDistrict,
        inputDistrict,
        inputZipcode,
        profilePic,
        LicFile,
        categories,
        inputLineId,
        inputFacebook,
        inputFeeRate,
        schedules,
        educations,
        works
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
            return res.status(400).json({ error: uploadError.message });
        }

        const connection = db.promise();
        await connection.query('BEGIN');

        try {
            // ดึงชื่อของจังหวัด อำเภอ และตำบลจาก database เพื่อจัดฟอร์แมตที่อยู่
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

            // 4.1 Insert ลงตาราง users ก่อน
            const [userResult] = await connection.query(
                `INSERT INTO users (first_name, last_name, email, phone, password, image_path, role) 
                VALUES (?, ?, ?, ?, ?, ?, 'lawyer')`,
                [inputFirsname, inputLastname, inputEmail, inputPhone, hashedPassword, dbImgePath || null]
            );

            const newUserId = userResult.insertId; // ดึง ID ที่เพิ่งสร้างใหม่

            // 4.2 Insert ข้อมูลเฉพาะของทนายลงตาราง lawyers
            await connection.query(
                `INSERT INTO lawyers (id, license_number, province_id, office_address, house_no, moo, soi, road, subdistrict_id, district_id, zipcode, license_file, line_id, facebook_url, fee_rate) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [newUserId, inputLicNum, inputProvince, formattedAddress, inputHouseNo || null, inputMoo || null, inputSoi || null, inputRoad || null, inputSubDistrict || null, inputDistrict || null, inputZipcode || null, dbLicFilePath, inputLineId || null, inputFacebook || null, inputFeeRate || null]
            );

            // 4.3 Insert หมวดหมู่คดี (Categories)
            if (categories && categories.length > 0) {
                for (let cat of categories) {
                    let catId = cat;
                    // ถ้าชื่อหมวดหมู่ไม่มีตัวเลข (ไม่ใช่ ID เดิม) ถือว่าเป็นหมวดหมู่ใหม่
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

            // 4.4 Insert ตารางเวลา (Schedules)
            if (schedules && Array.isArray(schedules) && schedules.length > 0) {
                for (const s of schedules) {
                    await connection.query(
                        `INSERT INTO lawyer_schedules (lawyer_id, day_of_week, time_start, time_end, is_open) VALUES (?, ?, ?, ?, ?)`,
                        [newUserId, s.day_of_week, s.time_start || null, s.time_end || null, s.is_open ? 1 : 0]
                    );
                }
            }

            // 4.5 Insert ประวัติการศึกษา (Educations)
            if (educations && Array.isArray(educations) && educations.length > 0) {
                for (const e of educations) {
                    await connection.query(
                        `INSERT INTO lawyer_educations (lawyer_id, university, degree, year_start, year_end) VALUES (?, ?, ?, ?, ?)`,
                        [newUserId, e.university, e.degree, e.year_start || null, e.year_end || null]
                    );
                }
            }

            // 4.6 Insert ประวัติการทำงาน (Works)
            if (works && Array.isArray(works) && works.length > 0) {
                for (const w of works) {
                    await connection.query(
                        `INSERT INTO lawyer_works (lawyer_id, company_name, job_position, year_start, year_end) VALUES (?, ?, ?, ?, ?)`,
                        [newUserId, w.company_name, w.job_position, w.year_start || null, w.year_end || null]
                    );
                }
            }

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

        // ตรวจสอบสถานะบัญชี
        if (user.status === 'suspended') {
            return res.status(403).json({ error: "บัญชีของคุณถูกระงับการใช้งาน" });
        }
        if (user.status === 'deleted') {
            return res.status(403).json({ error: "บัญชีของคุณถูกลบออกจากระบบ" });
        }

        // 3. สร้าง JWT Token (เก็บ id และ role ไว้ในบัตรผ่านนี้)
        const token = jwt.sign(
            { id: user.id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '1d' } // บัตรมีอายุ 1 วัน
        );



        // 5. ส่งผลลัพธ์กลับไป
        res.json({
            message: "เข้าสู่ระบบสำเร็จ",
            token: token, // นี่คือบัตรผ่านที่ User ต้องเก็บไว้
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

// ดึงจังหวัดมาเป็นตัวเลือก
app.get('/lawyer/provinces', async (req, res) => {
    try {
        const [rows] = await db.promise().query('SELECT id, name_th as name FROM provinces ORDER BY name_th ASC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ดึงอำเภอมาเป็นตัวเลือก
app.get('/lawyer/districts', async (req, res) => {
    const { province_id } = req.query;
    try {
        if (!province_id) return res.status(400).json({ error: "Missing province_id" });
        const [rows] = await db.promise().query('SELECT id, name_th as name FROM districts WHERE province_id = ? ORDER BY name_th ASC', [province_id]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ดึงตำบลและรหัสไปรษณีย์มาเป็นตัวเลือก
app.get('/lawyer/subdistricts', async (req, res) => {
    const { district_id } = req.query;
    try {
        if (!district_id) return res.status(400).json({ error: "Missing district_id" });
        const [rows] = await db.promise().query('SELECT id, name_th as name, zip_code FROM sub_districts WHERE district_id = ? ORDER BY name_th ASC', [district_id]);
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


        res.json({
            profile: profile[0],
            schedules,
            specialties,
            educations,
            works,
            achievements
        });

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

app.get('/lawyer/search/provinces', async (req, res) => {
    try {
        const [rows] = await db.promise().query('SELECT p.id, p.name_th as name, g.name as region FROM provinces p JOIN geographies g ON p.geography_id = g.id ORDER BY g.name ASC, p.name_th ASC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// 2. API สำหรับดึงข้อมูล User ปัจจุบัน
app.get('/users/:id', async (req, res) => {
    try {
        const [users] = await db.promise().query(
            'SELECT id, first_name, last_name, email, phone, image_path, created_at FROM users WHERE id = ? AND IFNULL(status, "") != "deleted"',
            [req.params.id]
        );
        if (users.length === 0) return res.status(404).json({ error: 'ไม่พบผู้ใช้งาน' });
        res.json(users[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
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

    // 5. เงื่อนไขราคากรองค่าบริการ
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

    // 6. จัดกลุ่มข้อมูล (Group By) เพื่อให้ข้อมูลทนาย 1 คน มีแค่ 1 แถวเสมอ
    sql += ` GROUP BY u.id, u.first_name, u.last_name, u.image_path, p.name_th, exp.total_exp, l.fee_rate`;

    try {
        const [rows] = await db.promise().query(sql, queryParams);
        res.json(rows);
    } catch (error) {
        console.error('Search Database Error:', error);
        res.status(500).json({ error: 'เกิดข้อผิดพลาดในการค้นหาทนายความ' });
    }
});

// ========================================================
// API: ADMIN DASHBOARD (Protected by authenticateAdmin)
// ========================================================

// 0. Dashboard Overview
app.get('/admin/dashboard/overview', authenticateAdmin, async (req, res) => {
    try {
        const stats = {};

        // Count pending lawyers
        const [pendingLawyers] = await db.promise().query("SELECT COUNT(*) as count FROM lawyers WHERE status = 'pending'");
        stats.pendingLawyers = pendingLawyers[0].count;

        // Count reported reviews
        const [reportedReviews] = await db.promise().query("SELECT COUNT(*) as count FROM reviews WHERE status = 'reported'");
        stats.reportedReviews = reportedReviews[0].count;

        // Count ALL lawyers
        const [allLawyers] = await db.promise().query("SELECT COUNT(*) as count FROM lawyers");
        stats.totalLawyers = allLawyers[0].count;

        // Count normal users (role = 'user')
        const [clients] = await db.promise().query("SELECT COUNT(*) as count FROM users WHERE role = 'user'");
        stats.totalUsers = clients[0].count;

        // Get 5 recent pending lawyers
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

        // Get 5 recent reported reviews
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

// 1. จัดการผู้ใช้งาน
app.get('/admin/users', authenticateAdmin, async (req, res) => {
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

app.put('/admin/users/:id', authenticateAdmin, async (req, res) => {
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

app.delete('/admin/users/:id', authenticateAdmin, async (req, res) => {
    const userId = req.params.id;
    try {
        await db.promise().query("UPDATE users SET status = 'deleted' WHERE id=?", [userId]);
        res.json({ success: true, message: 'User deleted' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Database error' });
    }
});

app.put('/admin/users/:id/suspend', authenticateAdmin, async (req, res) => {
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


app.put('/admin/users/:id/restore', authenticateAdmin, async (req, res) => {
    const userId = req.params.id;
    try {
        await db.promise().query("UPDATE users SET status = 'active' WHERE id=?", [userId]);
        res.json({ success: true, message: 'User restored' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Database error' });
    }
});


// 2. Lawyer Verification
app.get('/admin/lawyers/pending', authenticateAdmin, async (req, res) => {
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

app.get('/admin/lawyers/history', authenticateAdmin, async (req, res) => {
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

app.put('/admin/lawyers/:id/approve', authenticateAdmin, async (req, res) => {
    const lawyerId = req.params.id;
    try {
        await db.promise().query('UPDATE lawyers SET status="approved" WHERE id=?', [lawyerId]);
        res.json({ success: true, message: 'Lawyer approved' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Database error' });
    }
});

app.put('/admin/lawyers/:id/reject', authenticateAdmin, async (req, res) => {
    const lawyerId = req.params.id;
    const { reason } = req.body;
    try {
        await db.promise().query('UPDATE lawyers SET status="rejected", reject_reason=? WHERE id=?', [reason, lawyerId]);
        res.json({ success: true, message: 'Lawyer rejected' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Database error' });
    }
});

// 3. Review Moderation
app.get('/admin/reviews/all', authenticateAdmin, async (req, res) => {
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

app.get('/admin/reviews/reported', authenticateAdmin, async (req, res) => {
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

app.get('/admin/reviews/history', authenticateAdmin, async (req, res) => {
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

app.put('/admin/reviews/:id/approve', authenticateAdmin, async (req, res) => {
    const reviewId = req.params.id;
    try {
        await db.promise().query('UPDATE reviews SET status="published", is_hidden=0 WHERE id=?', [reviewId]);
        res.json({ success: true, message: 'Review approved' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Database error' });
    }
});

app.put('/admin/reviews/:id/report', authenticateAdmin, async (req, res) => {
    const reviewId = req.params.id;
    try {
        await db.promise().query('UPDATE reviews SET status="reported", is_hidden=0 WHERE id=?', [reviewId]);
        res.json({ success: true, message: 'Review marked as reported' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Database error' });
    }
});

app.delete('/admin/reviews/:id', authenticateAdmin, async (req, res) => {
    const reviewId = req.params.id;
    try {
        await db.promise().query('UPDATE reviews SET status="hidden", is_hidden=1 WHERE id=?', [reviewId]);
        res.json({ success: true, message: 'Review deleted/hidden' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Database error' });
    }
});

// Initialize saved_lawyers table
(async () => {
    try {
        await db.promise().query(`
            CREATE TABLE IF NOT EXISTS saved_lawyers (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                lawyer_id INT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY unique_save (user_id, lawyer_id),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (lawyer_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);
    } catch (err) {
        console.error("Error creating saved_lawyers table:", err);
    }
})();

// User Profile APIs
// 1. Get user's favorites
app.get('/users/:id/favorites', async (req, res) => {
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

// 2. Add to favorites
app.post('/users/favorites', async (req, res) => {
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

// 3. Remove from favorites
app.delete('/users/favorites', async (req, res) => {
    try {
        const { user_id, lawyer_id } = req.body; // or req.query depending on client
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

// 4. Get user's reviews
app.get('/users/:id/reviews', async (req, res) => {
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

// 5. Get a specific lawyer's reviews
app.get('/lawyers/:id/reviews', async (req, res) => {
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

// 6. Submit a review for a lawyer
app.post('/lawyers/:id/reviews', async (req, res) => {
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

// 7. Update a review
app.put('/reviews/:id', async (req, res) => {
    try {
        const reviewId = req.params.id;
        const { rating, comment, title } = req.body;
        // In the future, we could save 'title' to DB if we add a column for it. 
        // For now, we update rating and comment.
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

// 7.5 Submit a reply to a review
app.put('/lawyers/:lawyerId/reviews/:id/reply', authenticateToken, async (req, res) => {
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

// 7.6 Report a review or reply
app.post('/reviews/:id/report', authenticateToken, async (req, res) => {
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

// 8. Delete a review
app.delete('/reviews/:id', async (req, res) => {
    try {
        const reviewId = req.params.id;
        await db.promise().query('DELETE FROM reviews WHERE id = ?', [reviewId]);
        res.json({ success: true, message: 'Review deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error deleting review' });
    }
});

// 9. Location by Zipcode
app.get('/lawyer/zipcode', async (req, res) => {
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

app.listen(process.env.PORT, () => {
    console.log(`Server is running at: http://localhost:${process.env.PORT}/`);
})



