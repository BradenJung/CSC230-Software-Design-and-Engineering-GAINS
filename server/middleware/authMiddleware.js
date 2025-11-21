import jwt from "jsonwebtoken";

export function authMiddleware(jwtSecret, tokenName) {
  return (req, res, next) => {
    const bearer = req.headers.authorization;
    const token = req.cookies?.[tokenName] || (bearer && bearer.startsWith("Bearer ") ? bearer.slice(7) : null);

    if (!token) return res.status(401).json({ error: "Not authenticated" });

    try {
      const payload = jwt.verify(token, jwtSecret);
      req.user = payload;
      return next();
    } catch (err) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }
  };
}