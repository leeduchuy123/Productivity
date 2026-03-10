const express = require('express');
const router = express.Router();
const { Setting } = require('../models');

// Get a setting
router.get('/:key', async (req, res) => {
    try {
        const setting = await Setting.findByPk(req.params.key);
        res.json(setting || { key: req.params.key, value: null });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Set a setting
router.put('/:key', async (req, res) => {
    try {
        const [setting, created] = await Setting.findOrCreate({
            where: { key: req.params.key },
            defaults: { value: req.body.value }
        });
        if (!created) {
            await setting.update({ value: req.body.value });
        }
        res.json(setting);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
