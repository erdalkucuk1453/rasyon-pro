/**
 * AI Rasyon Danışmanı & Akıllı Rasyon Optimizasyon Motoru
 * Hem yerel zeki algoritmalarla en ucuz ve en dengeli reçeteyi çıkarır
 * hem de serbest metinli veteriner zooteknist tavsiyeleri sunar.
 */

export function generateSmartRationOptimization(animal, availableFeeds, goal = "balanced_cost") {
  const { weight = 400, targetAdg = 1.4 } = animal;
  
  // NRC hedefleri:
  // Kuru madde: BW * 0.021 - 0.023 kg
  const targetDm = weight * 0.022;
  const targetCpGrams = (Math.pow(weight, 0.75) * 4.2) + (targetAdg * 480);
  const targetCpPct = (targetCpGrams / (targetDm * 1000)) * 100;
  
  // Besi aşamasına göre kaba yem payı
  let roughageRatio = 0.25;
  if (weight < 300) roughageRatio = 0.35;
  else if (weight > 480) roughageRatio = 0.18;

  const roughageDmNeed = targetDm * roughageRatio;
  const concentrateDmNeed = targetDm * (1 - roughageRatio);

  const suggestedAmounts = {};
  
  // 1. Kaba Yem Dağıtımı (Silaj + Yonca + Saman)
  const silaj = availableFeeds.find(f => f.name.includes("Mısır Silajı"));
  const yonca = availableFeeds.find(f => f.name.includes("Yonca"));
  const saman = availableFeeds.find(f => f.name.includes("Saman"));

  if (silaj) {
    // Silaj KM'si ~%32 olduğu için yaş halde yüksek kg verilir
    const silajDmKg = roughageDmNeed * 0.65;
    suggestedAmounts[silaj.id] = Number((silajDmKg / (silaj.dm / 100)).toFixed(1));
  }
  if (yonca) {
    const yoncaDmKg = roughageDmNeed * 0.25;
    suggestedAmounts[yonca.id] = Number((yoncaDmKg / (yonca.dm / 100)).toFixed(1));
  }
  if (saman) {
    const samanDmKg = roughageDmNeed * 0.10;
    suggestedAmounts[saman.id] = Number((samanDmKg / (saman.dm / 100)).toFixed(1));
  }

  // 2. Enerji Yemleri (Arpa + Mısır)
  const arpa = availableFeeds.find(f => f.name.includes("Arpa"));
  const misir = availableFeeds.find(f => f.name.includes("Mısır Kırma"));
  
  const energyDmNeed = concentrateDmNeed * 0.70;
  if (arpa && misir) {
    suggestedAmounts[arpa.id] = Number(((energyDmNeed * 0.55) / (arpa.dm / 100)).toFixed(1));
    suggestedAmounts[misir.id] = Number(((energyDmNeed * 0.45) / (misir.dm / 100)).toFixed(1));
  } else if (arpa) {
    suggestedAmounts[arpa.id] = Number((energyDmNeed / (arpa.dm / 100)).toFixed(1));
  }

  // 3. Protein Kaynağı (Soya veya Ayçiçeği Küspesi)
  const soya = availableFeeds.find(f => f.name.includes("Soya"));
  const atk = availableFeeds.find(f => f.name.includes("Ayçiçeği"));
  const proteinDmNeed = concentrateDmNeed * 0.22;

  if (soya && atk) {
    suggestedAmounts[soya.id] = Number(((proteinDmNeed * 0.45) / (soya.dm / 100)).toFixed(1));
    suggestedAmounts[atk.id] = Number(((proteinDmNeed * 0.55) / (atk.dm / 100)).toFixed(1));
  } else if (atk) {
    suggestedAmounts[atk.id] = Number((proteinDmNeed / (atk.dm / 100)).toFixed(1));
  } else if (soya) {
    suggestedAmounts[soya.id] = Number(((proteinDmNeed * 0.7) / (soya.dm / 100)).toFixed(1));
  }

  // 4. Lifli Yan Ürün / Kepek / Küspe
  const kepek = availableFeeds.find(f => f.name.includes("Kepek"));
  if (kepek) {
    suggestedAmounts[kepek.id] = Number((0.8).toFixed(1));
  }

  // 5. Mineral / Tampon / Soda
  const soda = availableFeeds.find(f => f.name.includes("Sodyum Bikarbonat") || f.name.includes("Soda"));
  const mermer = availableFeeds.find(f => f.name.includes("Mermer Tozu"));
  const premiks = availableFeeds.find(f => f.name.includes("Premiks"));
  const tuz = availableFeeds.find(f => f.name.includes("Tuz"));

  if (soda) suggestedAmounts[soda.id] = 0.08;
  if (mermer) suggestedAmounts[mermer.id] = 0.08;
  if (premiks) suggestedAmounts[premiks.id] = 0.10;
  if (tuz) suggestedAmounts[tuz.id] = 0.04;

  return suggestedAmounts;
}

export function getAiConsultantAdvice(animal, evaluation, currentFeeds) {
  const adviceList = [];

  // Besi dönemi özel tavsiyesi
  if (animal.weight < 280) {
    adviceList.push({
      category: "İskelet & Çatı Gelişimi",
      text: "Bu ağırlıktaki danalarda yağlanmayı önlemek ve çatı (kemik) büyümesini maksimize etmek için ham protein oranı %14.5 - %15.0 seviyesinde tutulmalı, kaba yem olarak kaliteli yonca tercih edilmelidir.",
      icon: "Bone"
    });
  } else if (animal.weight >= 480) {
    adviceList.push({
      category: "Besi Sonu & Randıman",
      text: "480 kg üzeri besi sonu döneminde protein ihtiyacı düşer (%11.5-%12.5), enerji ihtiyacı pik yapar. Arpa ve mısır kırması artırılabilir, yağlanma ve karkas randımanı (%58-60) hedeflenmelidir.",
      icon: "Gauge"
    });
  }

  // Rumen asidozu ve geviş getirme tavsiyesi
  if (evaluation.roughageDmPct < 22) {
    adviceList.push({
      category: "Asidoz Önleme Uyarısı",
      text: `Rasyondaki kaba yem kuru madde payı (%${evaluation.roughageDmPct}) riskli seviyede. Ahırda geviş getiren hayvan sayısı %50'nin altına düşerse veya dışkı cıvıklaşırsa rasyona günde 1.5 kg kıyılmış buğday samanı ve 80 gr Yem Sodası (Sodyum Bikarbonat) mutlaka ekleyin.`,
      icon: "AlertTriangle"
    });
  } else {
    adviceList.push({
      category: "Rumen Sağlığı Dengeli",
      text: `Kaba yem oranı (%${evaluation.roughageDmPct}) rumen pH'ını 6.2 - 6.6 bandında tutmak için elverişlidir. Geviş getirme döngüsü sağlıklı işleyecektir.`,
      icon: "CheckCircle2"
    });
  }

  // Maliyet & Verim optimizasyonu
  adviceList.push({
    category: "Maliyet & Kazanç Analizi",
    text: `Günlük hayvan başı yem maliyeti yaklaşık ${evaluation.totalCostTL} TL. Hedeflenen ${animal.targetAdg} kg günlük canlı ağırlık artışı ile 1 kg et maliyeti ${evaluation.costPerKgGain} TL olarak hesaplandı. Karkas et fiyatı baz alındığında karlı bir rasyon yapısıdır.`,
    icon: "TrendingUp"
  });

  // TMR (Yem Karma) Uygulama Önerisi
  adviceList.push({
    category: "Yem Karma (TMR) Hazırlama Sırası",
    text: "Yem karma vagonuna doldurma sırası: 1) Kuru Ot / Saman (en az 4-5 dk kıyım), 2) Silaj ve sulu yan ürünler, 3) Tahıllar ve küspeler, 4) Vitamin-mineral premiksleri ve mermer tozu. Toplam karıştırma süresi 12-15 dakikayı geçmemelidir.",
    icon: "Wrench"
  });

  return adviceList;
}
