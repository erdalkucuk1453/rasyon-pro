import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export function exportRationPdf(animal, requirements, evaluation, activeFeeds, batchHeadCount = 50) {
  const doc = new jsPDF();

  // Header Title
  doc.setFillColor(16, 185, 129); // Emerald-600
  doc.rect(0, 0, 210, 24, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("BESİ RASYON KARTI & YEM DAĞITIM REÇETESİ", 14, 15);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  const dateStr = new Date().toLocaleDateString("tr-TR");
  doc.text(`Tarih: ${dateStr} | RasyonPro v2.4`, 150, 15);

  // Animal info box
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("1. HAYVAN & GRUP BILGILERI", 14, 33);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  const animalInfo = [
    [`Padok / Grup:`, `${animal.paddockName || "Padok-1 (Besi Grubu)"}`, `Canli Agirlik:`, `${animal.weight} kg`],
    [`Irk / Tip:`, `${animal.breedName || "Simental Melezi"}`, `Hedef Artis (GDCA):`, `${animal.targetAdg} kg/gun`],
    [`Grup Hayvan Sayisi:`, `${batchHeadCount} Bas`, `Besi Donemi:`, `${animal.periodName || "Orta Besi (Gelisim)"}`]
  ];

  autoTable(doc, {
    startY: 36,
    body: animalInfo,
    theme: "plain",
    styles: { fontSize: 9, cellPadding: 1.5 },
    columnStyles: {
      0: { fontStyle: "bold", textColor: [100, 116, 139], cellWidth: 35 },
      1: { fontStyle: "bold", textColor: [15, 23, 42], cellWidth: 55 },
      2: { fontStyle: "bold", textColor: [100, 116, 139], cellWidth: 35 },
      3: { fontStyle: "bold", textColor: [15, 23, 42], cellWidth: 55 },
    }
  });

  // Table of Feeds
  let currentY = doc.lastAutoTable.finalY + 6;
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 41, 59);
  doc.text("2. GUNLUK YEM RECETESI (HAYVAN BASI VE TOPLAM KARISIM)", 14, currentY);

  const tableHeaders = [
    ["Yem Adi", "Kategori", "1 Hayvan (kg)", `${batchHeadCount} Bas Toplam (kg)`, "Birim Fiyat (TL)", "Toplam Maliyet (TL)"]
  ];

  const tableRows = activeFeeds
    .filter(f => f.amountKg > 0)
    .map(f => {
      const perHeadKg = Number(f.amountKg || 0);
      const totalBatchKg = (perHeadKg * batchHeadCount).toFixed(1);
      const costPerHead = (perHeadKg * f.price).toFixed(2);
      return [
        f.name,
        f.category,
        `${perHeadKg.toFixed(2)} kg`,
        `${totalBatchKg} kg`,
        `${f.price.toFixed(2)} TL`,
        `${costPerHead} TL`
      ];
    });

  // Add Summary row
  tableRows.push([
    "TOPLAM RASYON",
    "-",
    `${evaluation.totalAsFedKg} kg`,
    `${(evaluation.totalAsFedKg * batchHeadCount).toFixed(1)} kg`,
    "-",
    `${evaluation.totalCostTL} TL / Bas`
  ]);

  autoTable(doc, {
    startY: currentY + 3,
    head: tableHeaders,
    body: tableRows,
    theme: "grid",
    headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: "bold" },
    styles: { fontSize: 8.5, cellPadding: 2.5 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  // Nutritional Performance summary
  currentY = doc.lastAutoTable.finalY + 7;
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 41, 59);
  doc.text("3. RASYON BESIN MADDE DEGERLERI & ZOO-TEKNIK ANALIZ", 14, currentY);

  const summaryData = [
    ["Kuru Madde (KM)", `${evaluation.totalDmKg} kg`, `Hedef: ${requirements.dmiTarget} kg`, "Kaba Yem Orani (KM)", `%${evaluation.roughageDmPct}`, `Min %${requirements.minRoughageDmPct}`],
    ["Ham Protein (HP)", `%${evaluation.cpPct}`, `Gereken: %${requirements.cpPctMin}`, "Metabolik Enerji (ME)", `${evaluation.mePerKgDm} Mcal/kg`, `Req: ${requirements.meReq} Mcal`],
    ["Tahmini Gunluk Artis", `${evaluation.predictedAdg} kg/gun`, `Hedef: ${animal.targetAdg} kg`, "Yemden Yararlanma (FCR)", `${evaluation.fcr} kg yem/kg et`, "Ideal: 6.0 - 7.5"],
    ["Gunluk Hayvan Basi Maliyet", `${evaluation.totalCostTL} TL`, "-", "1 kg Canli Agirlik Maliyeti", `${evaluation.costPerKgGain} TL`, "-"]
  ];

  autoTable(doc, {
    startY: currentY + 3,
    body: summaryData,
    theme: "striped",
    styles: { fontSize: 8.5, cellPadding: 2.5 },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 40 },
      1: { cellWidth: 25 },
      2: { cellWidth: 30, textColor: [100, 116, 139] },
      3: { fontStyle: "bold", cellWidth: 40 },
      4: { cellWidth: 25 },
      5: { cellWidth: 30, textColor: [100, 116, 139] },
    }
  });

  // Footer / Instructions
  const finalY = doc.lastAutoTable.finalY + 8;
  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(100, 116, 139);
  doc.text(
    "* Not: Yem karmayi temiz ve homojen sekilde yapiniz. Temiz su ve kaya tuzu hayvanlarin onunde 7/24 serbest olmalidir.",
    14,
    finalY
  );
  doc.text("Hazirlayan: RasyonPro Mobil Akilli Besi Yonetim Sistemi", 14, finalY + 5);

  doc.save(`Rasyon_Recetesi_${animal.paddockName || "Padok1"}_${dateStr}.pdf`);
}
