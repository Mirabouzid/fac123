const express = require("express");
const router = express.Router();
const authController = require("../controls/auth");
const authMiddleware = require("../middleware/auth");

// GET  /api/users/profile
router.get("/profile", authMiddleware, authController.getProfile);

// PUT  /api/users/profile
router.put("/profile", authMiddleware, authController.updateProfile);

module.exports = router;
