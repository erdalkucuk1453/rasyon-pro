/**
 * Beef Cattle Rumen & Nutrient Requirements Calculator
 * Based on NRC (National Research Council) Beef Cattle Requirements & CNCPS models
 */

export function calculateRequirements(animal) {
  const { weight = 400, targetAdg = 1.35, breed = "simmental", daysOnFeed = 90 } = animal;
  
  // 1. Kuru Madde Tüketim Kapasitesi (DMI - Dry Matter Intake)
  // NRC formülü yaklaşık: Canlı ağırlığın %1.9 - %2.5'i arası
  // Enerji yoğunluğuna ve canlı ağırlığa göre hesaplanır:
  // DMI (kg/gün) = BW^0.75 * (0.0968 + 0.0384 * ADG - ...)
  const metabolicWeight = Math.pow(weight, 0.75);
  
  // Yaklaşık pratik DMI NRC modeli:
  let dmi = metabolicWeight * (0.0968 + 0.035 * targetAdg);
  // Güvenlik sınırları (%2.0 ile %2.4 arası canlı ağırlık)
  const minDmi = weight * 0.019;
  const maxDmi = weight * 0.025;
  dmi = Math.max(minDmi, Math.min(maxDmi, dmi));

  // 2. Net Enerji İhtiyaçları (NRC Beef Cattle)
  // NEm (Net Energy for Maintenance - Yaşama Payı Net Enerjisi):
  // NEm req (Mcal/gün) = 0.077 * (BW)^0.75
  const nemReq = 0.077 * metabolicWeight;

  // NEg (Net Energy for Gain - Canlı Ağırlık Artışı Net Enerjisi):
  // NEg req (Mcal/gün) = 0.0557 * (BW)^0.75 * (ADG)^1.097 (Erkek tosunlar için)
  const negReq = 0.0557 * metabolicWeight * Math.pow(targetAdg, 1.097);

  // Toplam Metabolik Enerji İhtiyacı tahmini (ME):
  // ME = NEm / 0.65 + NEg / 0.45
  const meReq = (nemReq / 0.65) + (negReq / 0.45);

  // 3. Ham Protein İhtiyacı (Crude Protein - CP)
  // Yaşama payı proteini + Büyüme proteini:
  // Besi tosununda g/gün:
  // MP maintenance ~ 3.8 * BW^0.75
  // MP gain ~ ADG * (268 - 29.4 * (NEg / ADG))
  // Pratik rasyon CP ihtiyacı (g/gün):
  let cpReqGrams = (metabolicWeight * 4.2) + (targetAdg * 480);
  // Dönem ağırlığına göre ayarlama (Ağır hayvanlarda protein ihtiyacı % bazında düşer)
  if (weight > 480) {
    cpReqGrams *= 0.92;
  }
  const cpReqKg = cpReqGrams / 1000;
  const cpPctMin = (cpReqKg / dmi) * 100;

  // 4. Kalsiyum (Ca) ve Fosfor (P)
  // Ca req (g/gün) = 0.0154 * BW + 0.071 * (ADG * 1000 * 0.18)
  const caReqGrams = (0.016 * weight) + (targetAdg * 16.5);
  // P req (g/gün) = 0.012 * BW + (targetAdg * 10.5)
  const pReqGrams = (0.011 * weight) + (targetAdg * 10.5);

  // 5. Minimum NDF & Kaba Yem Oranı (Rumen Sağlığı ve Asidoz Riski)
  // Sağlıklı rumen ve geviş getirme için minimum rasyon NDF oranı en az %28 - %32 olmalı.
  const minNdfPct = 28.0;
  const minRoughageDmPct = weight < 300 ? 30 : (weight < 450 ? 20 : 15);

  return {
    dmiTarget: Number(dmi.toFixed(2)),
    nemReq: Number(nemReq.toFixed(2)),
    negReq: Number(negReq.toFixed(2)),
    meReq: Number(meReq.toFixed(2)),
    cpReqGrams: Number(cpReqGrams.toFixed(0)),
    cpReqKg: Number(cpReqKg.toFixed(2)),
    cpPctMin: Number(cpPctMin.toFixed(1)),
    caReqGrams: Number(caReqGrams.toFixed(1)),
    pReqGrams: Number(pReqGrams.toFixed(1)),
    minNdfPct,
    minRoughageDmPct
  };
}

/**
 * Calculates current supplied nutritional values from active feed list and amounts
 */
export function evaluateRation(rationFeeds, requirements) {
  let totalAsFedKg = 0;
  let totalDmKg = 0;
  let totalCostTL = 0;
  let totalCpGrams = 0;
  let totalMeMcal = 0;
  let totalNemMcal = 0;
  let totalNegMcal = 0;
  let totalNdfKg = 0;
  let totalCaGrams = 0;
  let totalPGrams = 0;
  let totalRoughageDmKg = 0;

  const feedsBreakdown = rationFeeds.map(feed => {
    const asFedKg = Number(feed.amountKg || 0);
    const dmKg = asFedKg * (feed.dm / 100);
    const costTL = asFedKg * feed.price;
    const cpGrams = dmKg * (feed.cp / 100) * 1000;
    const meMcal = dmKg * feed.me;
    const nemMcal = dmKg * feed.nem;
    const negMcal = dmKg * feed.neg;
    const ndfKg = dmKg * (feed.ndf / 100);
    const caGrams = dmKg * (feed.ca / 100) * 1000;
    const pGrams = dmKg * (feed.p / 100) * 1000;

    totalAsFedKg += asFedKg;
    totalDmKg += dmKg;
    totalCostTL += costTL;
    totalCpGrams += cpGrams;
    totalMeMcal += meMcal;
    totalNemMcal += nemMcal;
    totalNegMcal += negMcal;
    totalNdfKg += ndfKg;
    totalCaGrams += caGrams;
    totalPGrams += pGrams;

    if (feed.isRoughage) {
      totalRoughageDmKg += dmKg;
    }

    return {
      ...feed,
      asFedKg,
      dmKg,
      costTL,
      cpGrams,
      meMcal,
      nemMcal,
      negMcal
    };
  });

  // Calculate percentages on dry matter basis (KM bazında %)
  const cpPct = totalDmKg > 0 ? (totalCpGrams / 10 / totalDmKg) : 0;
  const mePerKgDm = totalDmKg > 0 ? (totalMeMcal / totalDmKg) : 0;
  const ndfPct = totalDmKg > 0 ? ((totalNdfKg / totalDmKg) * 100) : 0;
  const roughageDmPct = totalDmKg > 0 ? ((totalRoughageDmKg / totalDmKg) * 100) : 0;
  const caTotalGrams = totalCaGrams;
  const pTotalGrams = totalPGrams;
  const caPRatio = pTotalGrams > 0 ? (caTotalGrams / pTotalGrams) : 0;

  // Potential ADG (Tahmini Günlük Canlı Ağırlık Artışı) calculation from NEg supplied
  // ADG = ((Total NEg available - NEg maintenance remainder) / const)
  let predictedAdg = 0;
  if (totalNemMcal >= requirements.nemReq) {
    const surplusNem = totalNemMcal - requirements.nemReq;
    // Surplus energy converted to gain (approximate NRC growth function)
    const availableNegForGain = totalNegMcal * (surplusNem / (totalNemMcal || 1));
    predictedAdg = Math.min(2.1, Math.max(0.2, (totalNegMcal / (requirements.negReq || 1)) * 1.35));
  } else {
    // Negatif veya çok düşük büyüme
    predictedAdg = (totalNemMcal / requirements.nemReq) * 0.5;
  }

  // FCR (Feed Conversion Ratio - Yemden Yararlanma Oranı: kg KM yem / kg canlı ağırlık artışı)
  const fcr = predictedAdg > 0 ? (totalDmKg / predictedAdg) : 0;

  // Canlı ağırlık artışı başına yem maliyeti (TL / kg et)
  const costPerKgGain = predictedAdg > 0 ? (totalCostTL / predictedAdg) : 0;

  // Analysis Alerts & Health warnings
  const alerts = [];
  if (totalDmKg < requirements.dmiTarget * 0.90) {
    alerts.push({
      type: "warning",
      title: "Kuru Madde Tüketimi Yetersiz",
      text: `Hayvanın iştah kapasitesi ${requirements.dmiTarget} kg KM iken verilen ${totalDmKg.toFixed(1)} kg KM. Hayvan aç kalabilir veya potansiyeline ulaşamaz.`
    });
  } else if (totalDmKg > requirements.dmiTarget * 1.12) {
    alerts.push({
      type: "info",
      title: "Kuru Madde Fazlalığı",
      text: `Verilen yem kuru maddesi (${totalDmKg.toFixed(1)} kg) hayvanın fiziksel mide kapasitesinin üzerinde olabilir. Yemlikte artık kalabilir.`
    });
  }

  if (cpPct < requirements.cpPctMin - 0.5) {
    alerts.push({
      type: "danger",
      title: "Protein Açığı Var",
      text: `Rasyon ham proteini %${cpPct.toFixed(1)}, gereken minimum %${requirements.cpPctMin.toFixed(1)}. Kas gelişimi yavaşlar, Soya veya ATK ekleyin.`
    });
  }

  if (roughageDmPct < requirements.minRoughageDmPct) {
    alerts.push({
      type: "danger",
      title: "Subakut Rumen Asidozu (SARA) Riski!",
      text: `Kaba yem oranı %${roughageDmPct.toFixed(1)} (Min. %${requirements.minRoughageDmPct} olmalı). Yüksek kesif yem rumen asitliğini tehlikeli seviyeye çıkarabilir. Saman/yonca artırın veya yem sodası ekleyin.`
    });
  }

  if (caPRatio < 1.3) {
    alerts.push({
      type: "warning",
      title: "Kalsiyum / Fosfor Dengesi Bozuk (İdrar Taşı Riski)",
      text: `Ca:P oranı ${caPRatio.toFixed(2)}:1 (İdeal: 1.5 - 2.0 : 1). Yüksek tahıl içeren rasyonlarda tosunlarda idrar kesesi taşlarına yol açabilir. Mermer tozu ekleyin.`
    });
  }

  return {
    totalAsFedKg: Number(totalAsFedKg.toFixed(2)),
    totalDmKg: Number(totalDmKg.toFixed(2)),
    totalCostTL: Number(totalCostTL.toFixed(2)),
    cpPct: Number(cpPct.toFixed(1)),
    totalCpGrams: Number(totalCpGrams.toFixed(0)),
    mePerKgDm: Number(mePerKgDm.toFixed(2)),
    totalMeMcal: Number(totalMeMcal.toFixed(2)),
    ndfPct: Number(ndfPct.toFixed(1)),
    roughageDmPct: Number(roughageDmPct.toFixed(1)),
    caTotalGrams: Number(caTotalGrams.toFixed(1)),
    pTotalGrams: Number(pTotalGrams.toFixed(1)),
    caPRatio: Number(caPRatio.toFixed(2)),
    predictedAdg: Number(predictedAdg.toFixed(2)),
    fcr: Number(fcr.toFixed(2)),
    costPerKgGain: Number(costPerKgGain.toFixed(2)),
    alerts,
    feedsBreakdown
  };
}
