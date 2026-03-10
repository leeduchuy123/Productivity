const path = require('path');
const fs = require('fs');

const UPLOAD_DIR = path.join(__dirname, '..', '..', process.env.UPLOAD_DIR || 'uploads');

// Ensure upload directories exist
const subdirs = ['images', 'sounds', 'music'];
subdirs.forEach(dir => {
    const fullPath = path.join(UPLOAD_DIR, dir);
    if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
    }
});

/**
 * Abstracted file service for local storage.
 * Designed for easy migration to cloud storage (S3, GCS, etc.)
 */
class FileService {
    static getUploadDir() {
        return UPLOAD_DIR;
    }

    static getSubdir(mediaType) {
        const map = { image: 'images', sound: 'sounds', music: 'music' };
        return map[mediaType] || 'misc';
    }

    static getFilePath(mediaType, filename) {
        return path.join(UPLOAD_DIR, this.getSubdir(mediaType), filename);
    }

    static getFileUrl(mediaType, filename) {
        return `/uploads/${this.getSubdir(mediaType)}/${filename}`;
    }

    static async deleteFile(mediaType, filename) {
        const filePath = this.getFilePath(mediaType, filename);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    }
}

module.exports = FileService;
