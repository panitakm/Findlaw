const jwt = require('jsonwebtoken');

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

module.exports = { authenticateToken, authenticateAdmin };
