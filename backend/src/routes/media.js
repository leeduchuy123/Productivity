const express = require('express');
const router = express.Router();
const mediaController = require('../controllers/mediaController');

router.post('/upload/:type', mediaController.upload.single('file'), mediaController.uploadMedia);
router.get('/', mediaController.getMedia);
router.delete('/:id', mediaController.deleteMedia);

module.exports = router;
