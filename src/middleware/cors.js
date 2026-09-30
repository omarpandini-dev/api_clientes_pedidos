export function cors(allowedOrigins) {
  const origins = new Set(allowedOrigins.split(',').map((item) => item.trim()).filter(Boolean));

  return (req, res, next) => {
    const origin = req.get('Origin');
    if (origin && origins.has(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Accept,Content-Type,X-API-Key');
      res.setHeader('Access-Control-Max-Age', '86400');
    }
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    return next();
  };
}
