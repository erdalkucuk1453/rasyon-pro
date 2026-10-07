import { query, initDb } from './_db.js';
import { verifyToken } from './_auth.js';

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

  const authUser = verifyToken(req);
  if (!authUser) {
    return res.status(401).json({ error: 'Yetkilendirme başarısız. Lütfen giriş yapın.' });
  }

  try {
    await initDb();
    const userId = authUser.userId;

    // GET: Kullanıcının kayıtlı rasyon ve yem verilerini getir
    if (req.method === 'GET') {
      const rationRes = await query(
        'SELECT * FROM user_rations WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 1',
        [userId]
      );

      const feedsRes = await query(
        'SELECT * FROM user_feeds WHERE user_id = $1',
        [userId]
      );

      return res.status(200).json({
        ration: rationRes.rows.length > 0 ? rationRes.rows[0] : null,
        feeds: feedsRes.rows.map(r => ({
          id: r.id,
          name: r.name,
          category: r.category,
          dm: Number(r.dm),
          cp: Number(r.cp),
          nel: Number(r.nel),
          nem: Number(r.nem),
          neg: Number(r.neg),
          me: Number(r.me),
          ndf: Number(r.ndf),
          ca: Number(r.ca),
          p: Number(r.p),
          price: Number(r.price),
          isRoughage: Boolean(r.is_roughage)
        }))
      });
    }

    // POST: Rasyon ve Yem verilerini veritabanına kaydet/senkronize et
    if (req.method === 'POST') {
      const { animal, rationAmounts, feedLibrary } = req.body || {};

      // 1. Save or Update Ration
      if (animal) {
        const existingRation = await query(
          'SELECT id FROM user_rations WHERE user_id = $1 LIMIT 1',
          [userId]
        );

        if (existingRation.rows.length > 0) {
          await query(
            `UPDATE user_rations 
             SET paddock_name = $1, head_count = $2, weight = $3, target_adg = $4, breed_id = $5, period_id = $6, amounts_json = $7, updated_at = CURRENT_TIMESTAMP
             WHERE id = $8`,
            [
              animal.paddockName || 'Padok',
              animal.headCount || 1,
              animal.weight || 400,
              animal.targetAdg || 1.4,
              animal.breedId || 'simmental',
              animal.periodId || 'grower',
              JSON.stringify(rationAmounts || {}),
              existingRation.rows[0].id
            ]
          );
        } else {
          await query(
            `INSERT INTO user_rations (user_id, paddock_name, head_count, weight, target_adg, breed_id, period_id, amounts_json)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              userId,
              animal.paddockName || 'Padok',
              animal.headCount || 1,
              animal.weight || 400,
              animal.targetAdg || 1.4,
              animal.breedId || 'simmental',
              animal.periodId || 'grower',
              JSON.stringify(rationAmounts || {})
            ]
          );
        }
      }

      // 2. Save Custom or Updated Feeds
      if (Array.isArray(feedLibrary)) {
        for (const feed of feedLibrary) {
          await query(
            `INSERT INTO user_feeds (id, user_id, name, category, dm, cp, nel, nem, neg, me, ndf, ca, p, price, is_roughage, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, CURRENT_TIMESTAMP)
             ON CONFLICT (user_id, id) 
             DO UPDATE SET 
               name = EXCLUDED.name,
               category = EXCLUDED.category,
               dm = EXCLUDED.dm,
               cp = EXCLUDED.cp,
               price = EXCLUDED.price,
               is_roughage = EXCLUDED.is_roughage,
               updated_at = CURRENT_TIMESTAMP`,
            [
              feed.id,
              userId,
              feed.name,
              feed.category,
              feed.dm,
              feed.cp,
              feed.nel || 0,
              feed.nem || 0,
              feed.neg || 0,
              feed.me,
              feed.ndf,
              feed.ca || 0,
              feed.p || 0,
              feed.price,
              feed.isRoughage
            ]
          );
        }
      }

      return res.status(200).json({ message: 'Veriler PostgreSQL veritabanına başarıyla kaydedildi' });
    }

    return res.status(405).json({ error: 'Desteklenmeyen metod' });
  } catch (error) {
    console.error('Senkronizasyon hatası:', error);
    return res.status(500).json({ error: 'Veritabanı hatası: ' + error.message });
  }
}
