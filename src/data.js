/* Rythu Mitra — knowledge base
 * All agronomy content is a general advisory compiled for demonstration.
 * Doses are per litre of water unless stated; ~200 L spray volume per acre.
 * Farmers must read the product label and confirm with the local AEO / Rythu Vedika.
 */
(function (root) {
  const CROPS = {
    paddy:   { en: "Paddy",     te: "వరి" },
    cotton:  { en: "Cotton",    te: "పత్తి" },
    maize:   { en: "Maize",     te: "మొక్కజొన్న" },
    chilli:  { en: "Chilli",    te: "మిరప" },
    redgram: { en: "Red gram",  te: "కంది" }
  };

  const DISTRICTS = {
    warangal:    { en: "Warangal",    te: "వరంగల్",    market: "Warangal (Enumamula)" },
    khammam:     { en: "Khammam",     te: "ఖమ్మం",      market: "Khammam" },
    nizamabad:   { en: "Nizamabad",   te: "నిజామాబాద్", market: "Nizamabad" },
    suryapet:    { en: "Suryapet",    te: "సూర్యాపేట",  market: "Suryapet" },
    mahabubnagar:{ en: "Mahabubnagar",te: "మహబూబ్‌నగర్", market: "Jadcherla" },
    karimnagar:  { en: "Karimnagar",  te: "కరీంనగర్",   market: "Karimnagar" }
  };

  /* Approximate road distance in km between district market towns */
  const DIST_KM = {
    warangal:    { warangal: 5,   khammam: 120, nizamabad: 230, suryapet: 110, mahabubnagar: 230, karimnagar: 70 },
    khammam:     { warangal: 120, khammam: 5,   nizamabad: 330, suryapet: 60,  mahabubnagar: 260, karimnagar: 190 },
    nizamabad:   { warangal: 230, khammam: 330, nizamabad: 5,   suryapet: 280, mahabubnagar: 250, karimnagar: 120 },
    suryapet:    { warangal: 110, khammam: 60,  nizamabad: 280, suryapet: 5,   mahabubnagar: 210, karimnagar: 180 },
    mahabubnagar:{ warangal: 230, khammam: 260, nizamabad: 250, suryapet: 210, mahabubnagar: 5,   karimnagar: 240 },
    karimnagar:  { warangal: 70,  khammam: 190, nizamabad: 120, suryapet: 180, mahabubnagar: 240, karimnagar: 5 }
  };

  /* ---------- Crop Doctor: symptoms ---------- */
  const SYMPTOMS = {
    paddy: [
      { id: "p_spindle",    en: "Eye-shaped spots on leaves with grey centre and brown border", te: "ఆకులపై కంటి ఆకారపు మచ్చలు, మధ్యలో బూడిద రంగు" },
      { id: "p_neck",       en: "Neck of the panicle turns black and breaks",                   te: "కంకి మెడ నల్లబడి విరిగిపోవడం" },
      { id: "p_tipyellow",  en: "Leaves dry yellow from the tip down, with wavy edges",         te: "ఆకు కొన నుండి పసుపుగా ఎండిపోవడం" },
      { id: "p_ooze",       en: "Yellowish droplets on leaves in the early morning",            te: "ఉదయం ఆకులపై పసుపు బిందువులు" },
      { id: "p_hopperburn", en: "Round patches of crop drying and falling in the field",        te: "పొలంలో గుండ్రంగా పంట ఎండి పడిపోవడం" },
      { id: "p_basebugs",   en: "Brown insects crowded at the base of plants",                  te: "మొక్క అడుగున గోధుమ రంగు పురుగులు" },
      { id: "p_deadheart",  en: "Central shoot dries and pulls out easily",                     te: "మొవ్వు ఎండిపోయి సులభంగా ఊడి రావడం" },
      { id: "p_whiteear",   en: "White, empty panicles",                                        te: "తెల్లని తాలు కంకులు" },
      { id: "p_sheathspot", en: "Grey-green oval patches on the stem sheath near water level",  te: "నీటి మట్టం దగ్గర కాండంపై బూడిద రంగు మచ్చలు" },
      { id: "humid",        en: "Humid, cloudy weather for several days",                       te: "కొన్ని రోజులుగా తేమ, మబ్బు వాతావరణం" },
      { id: "highN",        en: "Applied a lot of urea recently",                               te: "ఇటీవల ఎక్కువ యూరియా వేశారు" }
    ],
    cotton: [
      { id: "c_rosette",    en: "Flowers stay twisted shut like a rosette",          te: "పూలు గులాబీ మొగ్గలా ముడుచుకుపోవడం" },
      { id: "c_pinklarva",  en: "Pink caterpillars inside bolls, seeds eaten",       te: "కాయల లోపల గులాబీ రంగు పురుగు" },
      { id: "c_bollrot",    en: "Bolls open badly, lint is stained",                 te: "కాయలు సరిగా పగలకపోవడం, దూదికి మరకలు" },
      { id: "c_sticky",     en: "Leaves sticky with a black sooty coating",          te: "ఆకులు జిగటగా, నల్లని బూజు" },
      { id: "c_whiteflies", en: "Tiny white flies rise when the plant is shaken",    te: "మొక్క కదిలిస్తే తెల్ల దోమలు ఎగరడం" },
      { id: "c_edgecurl",   en: "Leaf edges turn yellow, then red, and curl down",   te: "ఆకు అంచులు పసుపు, ఎరుపుగా మారి కిందకు ముడుచుకోవడం" },
      { id: "c_greenhopper",en: "Small green insects walk sideways under leaves",    te: "ఆకు అడుగున పక్కకు నడిచే పచ్చ పురుగులు" },
      { id: "c_wilt",       en: "Whole plant wilts suddenly",                        te: "మొక్క మొత్తం ఒక్కసారిగా వడలిపోవడం" },
      { id: "c_stemstreak", en: "Brown streaks inside the stem when cut",            te: "కాండం కోస్తే లోపల గోధుమ రంగు గీతలు" },
      { id: "dryhot",       en: "Dry, hot spell",                                    te: "పొడి, వేడి వాతావరణం" }
    ],
    maize: [
      { id: "m_whorlholes", en: "Ragged holes in the young leaves of the whorl",          te: "మొవ్వు ఆకుల్లో చిరిగిన రంధ్రాలు" },
      { id: "m_frass",      en: "Sawdust-like waste inside the whorl",                    te: "మొవ్వులో రంపపు పొట్టు లాంటి విసర్జన" },
      { id: "m_ylarva",     en: "Caterpillar with an upside-down Y mark on its head",     te: "తలపై తిరగబడిన Y గుర్తు ఉన్న గొంగళి పురుగు" },
      { id: "m_cigar",      en: "Long, cigar-shaped grey-green spots on leaves",          te: "ఆకులపై పొడవైన సిగార్ ఆకారపు మచ్చలు" },
      { id: "m_lowerfirst", en: "Spots start on lower leaves and move upward",            te: "మచ్చలు కింది ఆకుల నుండి పైకి పాకడం" },
      { id: "m_stalkrot",   en: "Stem base soft and water-soaked, plant falls over",      te: "కాండం అడుగు మెత్తబడి మొక్క పడిపోవడం" },
      { id: "m_smell",      en: "Rotten smell from the stem base",                        te: "కాండం అడుగు నుండి కుళ్ళిన వాసన" },
      { id: "humid",        en: "Humid, cloudy weather for several days",                 te: "కొన్ని రోజులుగా తేమ, మబ్బు వాతావరణం" }
    ],
    chilli: [
      { id: "ch_upcurl",    en: "Leaves curl upward like a boat",                         te: "ఆకులు పైకి పడవలా ముడుచుకోవడం" },
      { id: "ch_downcurl",  en: "Leaves curl downward, narrow and leathery",              te: "ఆకులు కిందకు ముడుచుకుని సన్నగా, గట్టిగా మారడం" },
      { id: "ch_flower",    en: "Flowers turn brown and drop; tiny dark insects inside",  te: "పూలు గోధుమ రంగుకు మారి రాలడం, లోపల నల్ల పురుగులు" },
      { id: "ch_whitefly",  en: "Tiny white flies under the leaves",                      te: "ఆకుల అడుగున తెల్ల దోమలు" },
      { id: "ch_stunt",     en: "Plant stunted, leaves small and crinkled",               te: "మొక్క గిడసబారి, ఆకులు చిన్నగా ముడతలు" },
      { id: "ch_fruitspot", en: "Sunken dark spots with rings on ripe fruits",            te: "పండు కాయలపై గుంట పడిన నల్ల మచ్చలు" },
      { id: "ch_dieback",   en: "Twigs dry from the tip backward",                        te: "కొమ్మలు కొన నుండి ఎండిపోవడం" },
      { id: "humid",        en: "Humid, cloudy weather for several days",                 te: "కొన్ని రోజులుగా తేమ, మబ్బు వాతావరణం" }
    ],
    redgram: [
      { id: "r_podholes",   en: "Round holes in pods, caterpillar half outside",          te: "కాయలకు గుండ్రని రంధ్రాలు, పురుగు సగం బయట" },
      { id: "r_webbing",    en: "Flowers and pods webbed together",                       te: "పూత, కాయలు గూడులా అల్లుకుపోవడం" },
      { id: "r_wiltpatch",  en: "Plants wilt in patches, dry leaves stay attached",       te: "మొక్కలు గుంపులుగా వడలిపోవడం" },
      { id: "r_blackstem",  en: "Dark band inside the stem near the ground",              te: "నేల దగ్గర కాండం లోపల నల్లని గీత" }
    ]
  };

  /* ---------- Crop Doctor: diseases & pests ---------- */
  const DISEASES = {
    paddy: [
      { id: "blast", type: "fungus", en: "Blast", te: "అగ్గి తెగులు",
        w: { p_spindle: 3, p_neck: 3, humid: 1, highN: 1 },
        act: ["Spray Tricyclazole 75 WP at 0.6 g per litre (about 120 g per acre).",
              "Or Isoprothiolane 40 EC at 1.5 ml per litre.",
              "Stop urea for now; apply the rest in smaller splits later."],
        organic: "Pseudomonas fluorescens 10 g per litre as a spray.",
        prevent: "Treat seed with Tricyclazole 2 g per kg. Avoid excess nitrogen." },
      { id: "blb", type: "bacteria", en: "Bacterial leaf blight", te: "ఎండాకు తెగులు",
        w: { p_tipyellow: 3, p_ooze: 3, highN: 1, humid: 1 },
        act: ["Drain the field for 3–4 days and stop urea.",
              "Spray Copper hydroxide 77 WP at 2 g per litre.",
              "Top-dress potash (MOP 15 kg per acre) to harden the crop."],
        organic: "Spray 20% fresh cow-dung extract (filtered).",
        prevent: "Do not move water from infected to healthy fields. Use balanced fertilizer." },
      { id: "bph", type: "insect", en: "Brown planthopper", te: "సుడిదోమ",
        w: { p_hopperburn: 3, p_basebugs: 3, highN: 1 },
        act: ["Drain the field and leave 20 cm walking alleys every 2 m.",
              "Spray Pymetrozine 50 WG at 0.6 g per litre, aimed at the plant base.",
              "Or Dinotefuran 20 SG at 0.4 g per litre."],
        organic: "Avoid synthetic pyrethroids; they cause hopper resurgence.",
        prevent: "Check plant bases weekly from 40 days. Limit nitrogen." },
      { id: "stemborer", type: "insect", en: "Yellow stem borer", te: "కాండం తొలుచు పురుగు",
        w: { p_deadheart: 3, p_whiteear: 3 },
        act: ["Apply Chlorantraniliprole 0.4 G at 4 kg per acre in standing water.",
              "Or Cartap hydrochloride 4 G at 8 kg per acre.",
              "Pull out and destroy dead hearts."],
        organic: "Set 3 pheromone traps per acre; release Trichogramma egg cards.",
        prevent: "Clip seedling tips before transplanting to remove egg masses." },
      { id: "sheath", type: "fungus", en: "Sheath blight", te: "పాముపొడ తెగులు",
        w: { p_sheathspot: 3, humid: 1, highN: 1 },
        act: ["Spray Hexaconazole 5 EC at 2 ml per litre, aimed at the stem base.",
              "Or Validamycin 3 L at 2 ml per litre."],
        organic: "Trichoderma viride with farmyard manure before transplanting.",
        prevent: "Do not plant too densely. Avoid excess nitrogen." }
    ],
    cotton: [
      { id: "pbw", type: "insect", en: "Pink bollworm", te: "గులాబీ రంగు పురుగు",
        w: { c_rosette: 3, c_pinklarva: 3, c_bollrot: 2 },
        act: ["Pick and destroy rosette flowers.",
              "When traps catch 8 moths a night for 3 nights, spray Emamectin benzoate 5 SG at 0.4 g per litre or Profenofos 50 EC at 2 ml per litre.",
              "Do not keep the crop beyond January."],
        organic: "8 pheromone traps per acre for mass trapping.",
        prevent: "Destroy stalks after harvest; do not store seed cotton at home." },
      { id: "whitefly", type: "insect", en: "Whitefly", te: "తెల్లదోమ",
        w: { c_sticky: 3, c_whiteflies: 3, dryhot: 1 },
        act: ["Put up 10 yellow sticky traps per acre.",
              "Spray Diafenthiuron 50 WP at 1.2 g per litre.",
              "Rotate chemicals; never spray the same one twice in a row."],
        organic: "Neem oil 1500 ppm at 5 ml per litre.",
        prevent: "Avoid synthetic pyrethroids early in the season." },
      { id: "jassid", type: "insect", en: "Jassid (leafhopper)", te: "పచ్చదోమ",
        w: { c_edgecurl: 3, c_greenhopper: 3, dryhot: 1 },
        act: ["Spray Flonicamid 50 WG at 0.3 g per litre.",
              "Or Acetamiprid 20 SP at 0.2 g per litre."],
        organic: "Neem oil 1500 ppm at 5 ml per litre at early stage.",
        prevent: "Prefer hairy-leaf varieties; scout twice a week." },
      { id: "wilt", type: "fungus", en: "Wilt / root rot", te: "వేరుకుళ్ళు / ఎండు తెగులు",
        w: { c_wilt: 3, c_stemstreak: 3 },
        act: ["Drench the root zone with Carbendazim 50 WP at 1 g per litre.",
              "Or Copper oxychloride 50 WP at 3 g per litre.",
              "Improve drainage; remove dead plants."],
        organic: "Trichoderma viride 2 kg per acre mixed in 100 kg farmyard manure.",
        prevent: "Rotate with jowar or maize; avoid waterlogging." }
    ],
    maize: [
      { id: "faw", type: "insect", en: "Fall armyworm", te: "కత్తెర పురుగు",
        w: { m_whorlholes: 3, m_frass: 3, m_ylarva: 3 },
        act: ["Spray Emamectin benzoate 5 SG at 0.4 g per litre into the whorl.",
              "Or Spinetoram 11.7 SC at 0.5 ml per litre.",
              "Spray early morning or evening when larvae feed."],
        organic: "Put sand mixed with lime (9:1) into the whorl; 5 pheromone traps per acre.",
        prevent: "Sow at the same time as neighbours; check whorls from day 10." },
      { id: "tlb", type: "fungus", en: "Turcicum leaf blight", te: "ఆకు ఎండు తెగులు",
        w: { m_cigar: 3, m_lowerfirst: 2, humid: 1 },
        act: ["Spray Mancozeb 75 WP at 2.5 g per litre.",
              "Or Propiconazole 25 EC at 1 ml per litre."],
        organic: "Remove and burn badly infected lower leaves.",
        prevent: "Use resistant hybrids; rotate crops." },
      { id: "stalkrot", type: "bacteria", en: "Bacterial stalk rot", te: "కాండం కుళ్ళు తెగులు",
        w: { m_stalkrot: 3, m_smell: 3, humid: 1 },
        act: ["Apply bleaching powder (33% chlorine) 4 kg per acre near the plant base.",
              "Drain standing water immediately."],
        organic: "Remove and destroy rotten plants.",
        prevent: "Avoid waterlogging; ensure good field drainage." }
    ],
    chilli: [
      { id: "thrips", type: "insect", en: "Thrips (leaf curl)", te: "తామర పురుగు",
        w: { ch_upcurl: 3, ch_flower: 1 },
        act: ["Spray Fipronil 5 SC at 2 ml per litre.",
              "Or Spinetoram 11.7 SC at 0.9 ml per litre."],
        organic: "25 blue sticky traps per acre; neem oil 5 ml per litre.",
        prevent: "Grow 2 rows of maize or jowar as a border crop." },
      { id: "blackthrips", type: "insect", en: "Black thrips (flower thrips)", te: "నల్ల తామర పురుగు",
        w: { ch_flower: 3, ch_upcurl: 1 },
        act: ["Spray Cyantraniliprole 10.26 OD at 1.2 ml per litre.",
              "Rotate with Spinetoram 11.7 SC at 0.9 ml per litre after 7 days.",
              "Report the outbreak to your AEO."],
        organic: "Blue sticky traps; spray neem oil at flowering.",
        prevent: "Scout flowers twice a week from 45 days." },
      { id: "mites", type: "insect", en: "Yellow mite", te: "నల్లి",
        w: { ch_downcurl: 3 },
        act: ["Spray Spiromesifen 22.9 SC at 0.8 ml per litre.",
              "Or wettable sulphur 80 WP at 3 g per litre."],
        organic: "Spray the underside of leaves thoroughly.",
        prevent: "Remove weeds that host mites." },
      { id: "lcv", type: "virus", en: "Leaf curl virus", te: "ఆకు ముడత వైరస్",
        w: { ch_whitefly: 3, ch_stunt: 3, ch_upcurl: 1 },
        act: ["There is no cure. Uproot and bury infected plants.",
              "Control whitefly with Diafenthiuron 50 WP at 1.2 g per litre.",
              "Put up 10 yellow sticky traps per acre."],
        organic: "Raise nursery under insect-proof net.",
        prevent: "Use tolerant varieties; maize border crop." },
      { id: "anthracnose", type: "fungus", en: "Fruit rot and dieback", te: "కాయకుళ్ళు, కొమ్మ ఎండు తెగులు",
        w: { ch_fruitspot: 3, ch_dieback: 3, humid: 1 },
        act: ["Spray Propiconazole 25 EC at 1 ml per litre.",
              "Or Azoxystrobin 23 SC at 1 ml per litre.",
              "Pick and destroy infected fruits."],
        organic: "Seed treatment with Trichoderma 4 g per kg.",
        prevent: "Harvest ripe fruits on time; dry on clean tarpaulins." }
    ],
    redgram: [
      { id: "podborer", type: "insect", en: "Pod borer (Helicoverpa)", te: "శనగపచ్చ పురుగు",
        w: { r_podholes: 3 },
        act: ["Spray Chlorantraniliprole 18.5 SC at 0.3 ml per litre.",
              "Or Emamectin benzoate 5 SG at 0.4 g per litre."],
        organic: "20 bird perches per acre; HaNPV 200 LE per acre in the evening.",
        prevent: "Spray at 50% flowering if larvae are seen." },
      { id: "maruca", type: "insect", en: "Spotted pod borer (Maruca)", te: "మారుకా మచ్చల పురుగు",
        w: { r_webbing: 3, r_podholes: 1 },
        act: ["Spray Chlorantraniliprole 18.5 SC at 0.3 ml per litre.",
              "Or Spinosad 45 SC at 0.3 ml per litre."],
        organic: "Shake plants over a cloth to collect larvae.",
        prevent: "Scout webbed flowers from bud stage." },
      { id: "fwilt", type: "fungus", en: "Fusarium wilt", te: "ఎండు తెగులు",
        w: { r_wiltpatch: 3, r_blackstem: 3 },
        act: ["Remove and burn wilted plants.",
              "Drench Carbendazim 50 WP at 1 g per litre around nearby plants."],
        organic: "Seed treatment with Trichoderma viride 10 g per kg.",
        prevent: "Grow wilt-resistant varieties; rotate with jowar for 2–3 years." }
    ]
  };

  /* ---------- Fertilizer: general recommendation, kg per hectare ---------- */
  const NPK_HA = {
    paddy:   { n: 120, p: 60, k: 40, splits: "N: ⅓ at transplanting, ⅓ at tillering, ⅓ at panicle initiation. P full at transplanting. K: ½ basal, ½ at panicle initiation." },
    cotton:  { n: 120, p: 60, k: 60, splits: "N: in 3 equal splits at 20, 40 and 60 days. P full at sowing. K: ½ at sowing, ½ at 60 days." },
    maize:   { n: 180, p: 60, k: 50, splits: "N: ⅓ at sowing, ⅓ at knee-high stage, ⅓ at tasseling. P full at sowing. K: ½ basal, ½ at knee-high." },
    chilli:  { n: 180, p: 60, k: 60, splits: "N: in 4 splits at transplanting, 30, 60 and 90 days. P full basal. K: ½ basal, ½ at 60 days." },
    redgram: { n: 20,  p: 50, k: 0,  splits: "All N and P as basal at sowing. Seed treatment with Rhizobium culture." }
  };

  /* Fertilizer products: nutrient fractions, bag size kg, approx price per bag (₹) */
  const PRODUCTS = {
    urea: { n: 0.46, p: 0,    k: 0,    bag: 45, price: 266.5 },
    dap:  { n: 0.18, p: 0.46, k: 0,    bag: 50, price: 1350 },
    mop:  { n: 0,    p: 0,    k: 0.60, bag: 50, price: 1700 }
  };

  /* ---------- Mandi ---------- */
  /* MSP for Kharif Marketing Season 2026-27 (₹ per quintal), Government of India, May 2026.
     Cotton = medium staple. Chilli has no MSP. */
  const MSP = { paddy: 2441, cotton: 8267, maize: 2410, redgram: 8450, chilli: null };
  const PROCURER = {
    paddy:   { en: "PACS / IKP paddy procurement centre", te: "PACS / IKP కొనుగోలు కేంద్రం" },
    cotton:  { en: "CCI cotton purchase centre",          te: "CCI పత్తి కొనుగోలు కేంద్రం" },
    maize:   { en: "Markfed procurement centre",          te: "మార్క్‌ఫెడ్ కొనుగోలు కేంద్రం" },
    redgram: { en: "Markfed / NAFED procurement centre",  te: "మార్క్‌ఫెడ్ / నాఫెడ్ కేంద్రం" }
  };
  /* Sample base modal prices (₹/quintal) and which markets trade the crop */
  const MANDI_BASE = {
    paddy:   { base: 2290,  markets: ["warangal", "khammam", "nizamabad", "suryapet", "mahabubnagar", "karimnagar"] },
    cotton:  { base: 7680,  markets: ["warangal", "khammam", "suryapet", "mahabubnagar", "karimnagar"] },
    maize:   { base: 2240,  markets: ["warangal", "nizamabad", "mahabubnagar", "karimnagar"] },
    redgram: { base: 7900,  markets: ["warangal", "khammam", "nizamabad", "mahabubnagar"] },
    chilli:  { base: 14600, markets: ["warangal", "khammam"] }
  };

  /* Sample 7-day weather pattern for early Rabi (November) in Telangana */
  const WEATHER_BASE = [
    { tmax: 30, tmin: 19, rain: 0,  prob: 10, wind: 8,  rh: 62 },
    { tmax: 29, tmin: 20, rain: 2,  prob: 35, wind: 10, rh: 74 },
    { tmax: 27, tmin: 21, rain: 18, prob: 80, wind: 14, rh: 90 },
    { tmax: 28, tmin: 20, rain: 4,  prob: 55, wind: 18, rh: 86 },
    { tmax: 30, tmin: 18, rain: 0,  prob: 15, wind: 9,  rh: 66 },
    { tmax: 31, tmin: 17, rain: 0,  prob: 5,  wind: 7,  rh: 58 },
    { tmax: 31, tmin: 16, rain: 0,  prob: 5,  wind: 12, rh: 55 }
  ];

  const KB = { CROPS, DISTRICTS, DIST_KM, SYMPTOMS, DISEASES, NPK_HA, PRODUCTS, MSP, PROCURER, MANDI_BASE, WEATHER_BASE };
  if (typeof module !== "undefined" && module.exports) module.exports = KB;
  else root.KB = KB;
})(this);
