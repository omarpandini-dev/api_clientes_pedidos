import { createHash, timingSafeEqual } from 'node:crypto';

function digest(value) {
  return createHash('sha256').update(value, 'utf8').digest();
}

export function apiKeyAuth(expectedKey) {
  const expectedDigest = digest(expectedKey);

  return (req, res, next) => {
    const providedKey = req.get('X-API-Key');
    if (!providedKey) {
      return res.status(401).json({ erro: 'Chave de API não informada' });
    }

    const valid = timingSafeEqual(digest(providedKey), expectedDigest);
    if (!valid) {
      return res.status(401).json({ erro: 'Chave de API inválida' });
    }

    return next();
  };
}
