const cloudinary = require('cloudinary').v2;

// Auto-configures using CLOUDINARY_URL from env
cloudinary.config({
  secure: true
});

const uploadBase64ToCloudinary = async (base64String, folderName) => {
    try {
        const result = await cloudinary.uploader.upload(base64String, {
            folder: `findlaw/${folderName}`,
        });
        return result.secure_url;
    } catch (error) {
        console.error("Cloudinary Upload Error:", error);
        throw error;
    }
};

module.exports = { uploadBase64ToCloudinary };
