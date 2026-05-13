const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

module.exports = (req, res, next) => {
  const authHeader = req.get("Authorization");
  if (!authHeader) {
    return res.status(401).json({
      message: "Not authenticated",
    });
  }

  const token = authHeader.split(" ")[1]; // Bearer TOKEN
  if (!token) {
    return res.status(401).json({
      message: "Not authenticated",
    });
  }

  try {
    const decodedToken = jwt.verify(token, JWT_SECRET);
    req.userId = decodedToken.userId;
    req.userRole = decodedToken.role;
    req.userEmail = decodedToken.email;
    next();
  } catch (error) {
    return res.status(401).json({
      message: "Token invalid",
    });
  }
};
