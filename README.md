# 📈 Forex Signal Pro

Application de signaux de trading Forex en temps réel.

## 🚀 Déploiement Vercel

### 1. Cloner et installer
```bash
npm install
```

### 2. Variables d'environnement
Créez un fichier `.env.local` :
```
TWELVE_DATA_API_KEY=votre_clé_ici
```

Obtenez votre clé GRATUITE sur : https://twelvedata.com/register

### 3. Déployer sur Vercel
```bash
npx vercel
```
Ou connectez votre repo GitHub à Vercel et ajoutez la variable d'environnement `TWELVE_DATA_API_KEY` dans les settings Vercel.

## 🔧 Stack Technique
- **Framework**: Next.js 14 (App Router)
- **API Données**: Twelve Data (gratuit, 800 req/jour)
- **Stockage**: localStorage (persistance historique)
- **Style**: CSS Modules + animations custom
- **Déploiement**: Vercel

## 📊 Indicateurs utilisés
- RSI (14) - Surachat/Survente
- MACD (12/26/9) - Momentum
- EMA 50 / EMA 200 - Tendance long terme
- Bollinger Bands (20,2) - Volatilité
- ATR (14) - Amplitude moyenne
- Stochastique (14,3) - Momentum court terme
- ADX (14) - Force de tendance

## 💱 Paires surveillées
EUR/USD, GBP/USD, USD/JPY, USD/CHF, AUD/USD, NZD/USD, USD/CAD, EUR/GBP, EUR/JPY, GBP/JPY, EUR/CHF, AUD/JPY, USD/MXN, USD/TRY, USD/ZAR

## ⚙️ Fonctionnement
- Actualisation toutes les **10 minutes**
- Ratio TP/SL : **1:1.5**
- Signaux sur **1 à 4 jours**
- Paires avec signal actif mises en **pause**
- Historique complet **gains/pertes**
