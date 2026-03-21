# 🔮 ForexSignal Pro

Application de trading Forex avec signaux d'achat/vente haute probabilité, fonctionnant 24h/24 7j/7 sur Vercel.

## ✨ Fonctionnalités

- **23 paires Forex** surveillées en continu (majeures + exotiques)
- **8 indicateurs combinés** : RSI, MACD, EMA 20/50/200, Bollinger Bands, ATR, Stochastique, ADX, CCI
- **Signaux haute probabilité** uniquement (seuil ≥ 10/18 points)
- **SL/TP automatiques** basés sur ATR avec ratio 1:1.5
- **% de fiabilité** calculé pour chaque signal
- **Actualisation toutes les 10 minutes**
- **Historique complet** avec taux de réussite
- **Interface dark mode** premium
- **API 100% gratuite** (Twelve Data)

## 🚀 Déploiement en 5 minutes

### 1. Clé API Gratuite (Twelve Data)
1. Créez un compte sur **https://twelvedata.com** (gratuit)
2. Allez dans votre dashboard → copiez votre **API Key**
3. Plan gratuit = **800 requêtes/jour** (largement suffisant)

### 2. GitHub
```bash
git init
git add .
git commit -m "Initial commit - ForexSignal Pro"
git remote add origin https://github.com/VOTRE_USER/VOTRE_REPO.git
git push -u origin main
```

### 3. Vercel
1. Allez sur **https://vercel.com**
2. Cliquez **"New Project"** → importez votre repo GitHub
3. Dans **"Environment Variables"**, ajoutez :
   - Key : `TWELVE_DATA_API_KEY`
   - Value : `votre_clé_api_twelve_data`
4. Cliquez **"Deploy"** ✓

### 4. Vercel tourne 24h/24 automatiquement ! 🎉

## 📁 Structure du projet

```
forex-signals/
├── pages/
│   ├── index.js          # Interface principale
│   └── api/
│       └── forex.js      # Backend API + logique signaux
├── lib/
│   ├── indicators.js     # Calcul des indicateurs techniques
│   └── signals.js        # Moteur de génération de signaux
├── .env.local.example    # Template variables d'environnement
├── next.config.js
└── package.json
```

## 📊 Indicateurs utilisés

| Indicateur | Paramètres | Poids |
|-----------|-----------|-------|
| RSI | Période 14 | 2 pts |
| MACD | 12/26/9 | 3 pts |
| EMA | 20, 50, 200 | 3 pts |
| Bollinger | 20, 2σ | 2 pts |
| Stochastique | 14, 3 | 2 pts |
| ADX | Période 14 | 2 pts |
| CCI | Période 20 | 2 pts |

**Seuil signal** : ≥ 10/18 points + domination claire (différence ≥ 5 pts)

## ⚙️ Configuration locale

```bash
npm install
cp .env.local.example .env.local
# Editez .env.local avec votre clé API
npm run dev
```

## 📝 Notes importantes

- Les signaux sont **conservatifs** : mieux vaut peu de signaux très fiables
- Le ratio TP/SL est fixé à **1:1.5** (TP = SL × 1.5)
- Timeframe **4h** → horizon de trading **1 à 4 jours**
- Les trades actifs sont **surveillés automatiquement** jusqu'à SL/TP touché
- **Avertissement** : Le trading comporte des risques. Cet outil est informatif.
