# 🐂 RasyonPro - Büyükbaş Besi Hayvanları Rasyon Hazırlama & Reçete Sistemi

<p align="center">
  <img src="public/cattle-banner.jpg" alt="RasyonPro Banner" width="100%" style="border-radius: 12px;" />
</p>

RasyonPro, büyükbaş besi işletmeleri, çiftçiler, zooteknistler ve veteriner hekimler için tasarlanmış modern, NRC (National Research Council) standartlarına uygun, yapay zeka destekli bir mobil rasyon hesaplama ve sürü yönetim platformudur.

---

## ✨ Özellikler

- **NRC Besin İhtiyacı Motoru:** Canlı ağırlık, ırk tipi ve hedeflenen günlük canlı ağırlık artışına (GDCA) göre kuru madde tüketimi (DMI), ham protein (HP), net enerji (NEm / NEg), metabolik enerji (ME), Ca ve P ihtiyaçlarını bilimsel olarak hesaplar.
- **Subakut Rumen Asidozu (SARA) & Sağlık Güvenliği:** Kaba yem oranı riskli seviyeye indiğinde veya kalsiyum/fosfor dengesi bozulduğunda veterinerlik erken uyarıları verir.
- **Yapay Zeka "Oto Rasyon" Optimizasyonu:** Mevcut yem fiyatları ve hayvan gereksinimlerini tarayarak en ucuz ve en dengeli rasyon reçetesini tek tıkla oluşturur.
- **Yem Kütüphanesi & Fiyat Takibi:** Kaba yemler, dane yemler, küspeler, sanayi yemleri ve premikslerin güncel fiyat ve besin değerlerini yönetme imkanı.
- **Karma Vagonu (TMR) Reçetesi:** Padoktaki hayvan sayısına göre toplam yem karma vagonu kilo tartımlarını hazırlar.
- **PDF Rasyon Kartı Çıktısı:** Tek tıkla resmi rasyon ve dağıtım kartını PDF formatında indirip yem karma personeli ile paylaşma.
- **Tam Mobil & Çevrimdışı (Offline) Uyum:** PWA desteği ve LocalStorage veri saklama ile internet çekmeyen çiftlik/ahır ortamında kesintisiz çalışma.

---

## 🚀 Kurulum & Çalıştırma

Projeyi yerelde çalıştırmak için:

```bash
# Projeyi klonlayın
git clone https://github.com/erdalkucuk1453/rasyon-pro.git

# Proje dizinine gidin
cd rasyon-pro

# Bağımlılıkları yükleyin
npm install

# Geliştirici sunucusunu başlatın
npm run dev
```

---

## 🛠️ Kullanılan Teknolojiler

- **React 19 & Vite**
- **Tailwind CSS v4**
- **Lucide Icons**
- **jsPDF & AutoTable** (PDF Raporlama)
- **Canvas Confetti**
