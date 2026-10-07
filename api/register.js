import bcrypt from 'bcryptjs';
import { query, initDb } from './_db.js';
import { signToken } from './_auth.js';

export default async function handler(req, res) {
  // CORS Headers
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
    const { email, password, fullName, farmName } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ error: 'E-posta ve şifre zorunludur' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check existing
    const existing = await query('SELECT id FROM users WHERE email = $1', [cleanEmail]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Bu e-posta adresi ile kayıtlı bir kullanıcı zaten mevcut' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const result = await query(
      `INSERT INTO users (email, password_hash, full_name, farm_name)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, full_name, farm_name, created_at`,
      [cleanEmail, passwordHash, fullName || '', farmName || 'Çiftliğim']
    );

    const newUser = result.rows[0];
    const token = signToken(newUser);

    return res.status(201).json({
      message: 'Kayıt başarılı',
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        fullName: newUser.full_name,
        farmName: newUser.farm_name
      }
    });
  } catch (error) {
    console.error('Kayıt hatası:', error);
    return res.status(500).json({ error: 'Sunucu hatası: ' + (error.message || 'Veritabanına bağlanılamadı') });
  }
}
