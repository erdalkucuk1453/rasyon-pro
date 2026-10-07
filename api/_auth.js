import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'rasyon-pro-secret-super-secure-key-2026';

export function signToken(user) {
  return jwt.sign(
    { 
      userId: user.id, 
      email: user.email, 
      fullName: user.full_name,
      farmName: user.farm_name 
    }, 
    JWT_SECRET, 
    { expiresIn: '30d' }
  );
}

export function verifyToken(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  try {
    return jwt.verify(parts[1], JWT_SECRET);
  } catch (err) {
    return null;
  }
}
