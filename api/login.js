import bcrypt from 'bcryptjs';
import { query, initDb } from './_db.js';
import { signToken } from './_auth.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Yalnızca POST istekleri desteklenir' });
  }

  try {
    await initDb();
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ error: 'E-posta ve şifre zorunludur' });
    }

    const cleanEmail = email.trim().toLowerCase();

    const result = await query('SELECT * FROM users WHERE email = $1', [cleanEmail]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'E-posta veya şifre hatalı' });
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({ error: 'E-posta veya şifre hatalı' });
    }

    const token = signToken(user);

    return res.status(200).json({
      message: 'Giriş başarılı',
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        farmName: user.farm_name
      }
    });
  } catch (error) {
    console.error('Giriş hatası:', error);
    return res.status(500).json({ error: 'Sunucu hatası: ' + (error.message || 'Giriş yapılamadı') });
  }
}
