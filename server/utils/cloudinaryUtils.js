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

const uploadBufferToCloudinary = (buffer, folderName) => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            { folder: `findlaw/${folderName}` },
            (error, result) => {
                if (result) {
                    resolve(result.secure_url);
                } else {
                    reject(error);
                }
            }
        );
        uploadStream.end(buffer);
    });
};

module.exports = { uploadBase64ToCloudinary, uploadBufferToCloudinary };
