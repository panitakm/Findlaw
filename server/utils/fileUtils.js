const fs = require('fs');
const path = require('path');

const saveFileFromBase64 = async (base64String, filePrefix) => {
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
    // ต้องถอยกลับ 1 ระดับ เพราะไฟล์นี้อยู่ในโฟลเดอร์ utils
    const filePath = path.join(__dirname, '../uploads', fileName);

    await fs.promises.writeFile(filePath, fileData, 'base64');

    return `/uploads/${fileName}`;
};

module.exports = { saveFileFromBase64 };
