export default function errorHandler(err, _req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  console.error(err);
  const status = err.statusCode || err.status || 500;
  const message = err.message || "Internal server error";
  res.status(status).json({ error: message });
}
