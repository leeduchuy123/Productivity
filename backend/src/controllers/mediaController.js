const multer = require('multer');
const path = require('path');
const { Media } = require('../models');
const FileService = require('../services/fileService');

// Configure multer storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const mediaType = req.params.type || 'image';
        const dir = path.join(FileService.getUploadDir(), FileService.getSubdir(mediaType));
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, `${uniqueSuffix}${ext}`);
    }
});

const fileFilter = (req, file, cb) => {
    const mediaType = req.params.type;
    const allowedTypes = {
        image: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
        sound: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp3'],
        music: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp3']
    };

    const allowed = allowedTypes[mediaType] || [];
    if (allowed.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error(`Invalid file type for ${mediaType}. Allowed: ${allowed.join(', ')}`), false);
    }
};

exports.upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 52428800 }
});

// Upload a media file
exports.uploadMedia = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const mediaType = req.params.type;
        const media = await Media.create({
            type: mediaType,
            filename: req.file.filename,
            originalName: req.file.originalname,
            mimeType: req.file.mimetype,
            sizeBytes: req.file.size
        });

        res.status(201).json({
            ...media.toJSON(),
            url: FileService.getFileUrl(mediaType, req.file.filename)
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Get all media by type
exports.getMedia = async (req, res) => {
    try {
        const { type } = req.query;
        const where = type ? { type } : {};
        const media = await Media.findAll({
            where,
            order: [['created_at', 'DESC']]
        });

        const mediaWithUrls = media.map(m => ({
            ...m.toJSON(),
            url: FileService.getFileUrl(m.type, m.filename)
        }));

        res.json(mediaWithUrls);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Delete a media file
exports.deleteMedia = async (req, res) => {
    try {
        const media = await Media.findByPk(req.params.id);
        if (!media) return res.status(404).json({ error: 'Media not found' });

        await FileService.deleteFile(media.type, media.filename);
        await media.destroy();

        res.json({ message: 'Media deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
