# Rythu Mitra (రైతు మిత్ర)

A bilingual (Telugu / English) farm advisory web app for small and marginal farmers in Telangana.
Built as a rural problem-statement project, CBIT AI&DS.

## Problem
Most Telangana farmers hold less than 1 hectare and rely on input dealers and neighbours for advice.
They lose crop to pests identified too late, waste money spraying before rain, buy the wrong amount
of fertilizer, and often sell below the Minimum Support Price because they don't compare markets.

## Features
| Module | What it does | Method |
|---|---|---|
| Crop Doctor | Farmer taps visible symptoms; app ranks likely pests/diseases with % match, treatment, organic option, prevention | Weighted rule-based expert system (coverage × focus score) |
| Weather & Spray | 7-day planner marks each day *Spray OK / Careful / Don't spray*, plus weekly field tips | Rule engine on rain, rain probability, wind, humidity, temperature |
| Fertilizer | Converts N-P-K need (state recommendation or Soil Health Card) into kg and bags of Urea, DAP, MOP, with cost and split schedule | Nutrient balance: DAP for P, urea for remaining N, MOP for K |
| Mandi Prices | Ranks nearby markets by net price after transport; warns when open-market price is below MSP 2026–27 and points to the right procurement centre | Net = modal price − distance × transport rate |

Covers 5 crops (paddy, cotton, maize, chilli, red gram), 20 pests and diseases, 6 districts.

## Run it
Open `dist/rythu-mitra.html` in any browser. No server, no install, works offline after first load.

## Project structure
```
src/
  index.html   page shell
  styles.css   phone-first design, light + dark themes
  data.js      knowledge base: symptoms, diseases, NPK, MSP, markets, distances
  i18n.js      all interface text in English and Telugu
  engine.js    decision engines (pure functions, testable in Node)
  app.js       user interface and state
build.py       bundles src/ into dist/rythu-mitra.html
dist/rythu-mitra.html   ready-to-open single file
```

## Rebuild
```
python3 build.py
```

## Test the engines
```
cd src && node -e 'const E=require("./engine.js"); console.log(E.diagnose("paddy",["p_spindle","p_neck"]))'
```

## Data sources
- MSP Kharif Marketing Season 2026–27: Government of India (CCEA), May 2026
- Pest/disease management: standard ICAR / PJTSAU (Professor Jayashankar Telangana Agricultural University) recommendations
- Mandi prices and weather in the demo are **sample data**; the production version would use the Agmarknet API (data.gov.in) and IMD / Open-Meteo forecasts.

## Disclaimer
Advisory only. Farmers should read product labels and confirm with their Agriculture Extension Officer or the Kisan Call Centre (1800-180-1551).
