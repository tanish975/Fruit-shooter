// English, Hindi and Gujarati. Each entry is [en, hi, gu]; {n} style tokens are filled in by t().
import { store } from './store.js';

export const LANGS = [['en', 'English'], ['hi', 'हिन्दी'], ['gu', 'ગુજરાતી']];

const S = {
  // buttons & navigation
  play: ['PLAY', 'खेलें', 'રમો'],
  resume: ['RESUME', 'जारी रखें', 'ચાલુ રાખો'],
  restart: ['Restart', 'फिर से', 'ફરીથી'],
  quit: ['Quit', 'छोड़ें', 'છોડો'],
  home: ['Home', 'होम', 'હોમ'],
  shop: ['Shop', 'दुकान', 'દુકાન'],
  missions: ['Missions', 'मिशन', 'મિશન'],
  stats: ['Stats', 'आँकड़े', 'આંકડા'],
  settings: ['Settings', 'सेटिंग्स', 'સેટિંગ્સ'],
  paused: ['Paused', 'रुका हुआ', 'થોભેલું'],
  playAgain: ['PLAY AGAIN', 'फिर खेलें', 'ફરી રમો'],
  next: ['NEXT STAGE', 'अगला स्टेज', 'આગળનું સ્ટેજ'],
  retry: ['TRY AGAIN', 'फिर कोशिश करें', 'ફરી પ્રયાસ કરો'],
  map: ['Map', 'नक्शा', 'નકશો'],
  share: ['Share', 'शेयर', 'શેર'],
  upgrades: ['Upgrades', 'अपग्रेड', 'અપગ્રેડ'],
  bows: ['Bows', 'धनुष', 'ધનુષ'],
  arrows: ['Arrows', 'तीर', 'તીર'],
  weekly: ['Weekly', 'साप्ताहिक', 'સાપ્તાહિક'],
  career: ['Career', 'करियर', 'કારકિર્દી'],
  season: ['Season', 'सीज़न', 'સીઝન'],
  equip: ['EQUIP', 'चुनें', 'પસંદ કરો'],
  inUse: ['IN USE', 'चालू', 'ચાલુ'],
  owned: ['Owned', 'आपका', 'તમારું'],
  equipped: ['Equipped', 'चुना हुआ', 'પસંદ કરેલું'],
  max: ['MAX', 'पूर्ण', 'પૂર્ણ'],
  done: ['DONE', 'पूरा', 'પૂર્ણ'],
  cancel: ['Cancel', 'रद्द करें', 'રદ કરો'],
  ok: ['OK', 'ठीक है', 'બરાબર'],

  // results
  best: ['Best {n}', 'सर्वश्रेष्ठ {n}', 'શ્રેષ્ઠ {n}'],
  prevBest: ['Previous best {n}', 'पिछला सर्वश्रेष्ठ {n}', 'અગાઉનો શ્રેષ્ઠ {n}'],
  newBest: ['NEW BEST!', 'नया रिकॉर्ड!', 'નવો રેકોર્ડ!'],
  fruit: ['Fruit', 'फल', 'ફળ'],
  accuracy: ['Accuracy', 'सटीकता', 'ચોકસાઈ'],
  maxCombo: ['Max combo', 'अधिकतम कॉम्बो', 'મહત્તમ કોમ્બો'],
  perfects: ['Perfects', 'परफेक्ट', 'પરફેક્ટ'],
  needCoins: ['You need {n} more coins', '{n} सिक्के और चाहिए', 'હજી {n} સિક્કા જોઈએ'],
  missionReady: ['{n} mission reward(s) ready to claim', '{n} मिशन इनाम तैयार है', '{n} મિશન ઇનામ તૈયાર છે'],
  stageClear: ['STAGE CLEAR!', 'स्टेज पूरा!', 'સ્ટેજ પૂર્ણ!'],
  stageFail: ['SO CLOSE!', 'बस थोड़ा और!', 'બસ થોડું બાકી!'],
  shareText: ['I scored {n} in Fruit Archer! Can you beat it?', 'मैंने Fruit Archer में {n} अंक बनाए! क्या आप हरा सकते हैं?', 'મેં Fruit Archer માં {n} પોઇન્ટ કર્યા! તમે હરાવી શકો?'],
  seasonXp: ['+{n} season XP', '+{n} सीज़न XP', '+{n} સીઝન XP'],
  tierUp: ['Season tier {n} reached!', 'सीज़न टियर {n} मिला!', 'સીઝન ટિયર {n} મળ્યું!'],

  // modes
  mode_stage: ['Adventure', 'एडवेंचर', 'એડવેન્ચર'],
  mode_daily: ['Daily', 'दैनिक', 'દૈનિક'],
  mode_classic: ['Time Attack', 'टाइम अटैक', 'ટાઇમ એટેક'],
  mode_survival: ['Survival', 'सर्वाइवल', 'સર્વાઇવલ'],
  mode_precision: ['Precision', 'निशानेबाज़', 'નિશાનબાજ'],
  d_stage: ['40 stages, 4 worlds, 4 bosses. Earn up to 3 stars on each.', '40 स्टेज, 4 दुनिया, 4 बॉस। हर स्टेज में 3 स्टार तक जीतें।', '40 સ્ટેજ, 4 દુનિયા, 4 બોસ. દરેક સ્ટેજમાં 3 સ્ટાર સુધી જીતો.'],
  d_daily: ['The same fruit for everyone today. You get one attempt.', 'आज सबके लिए एक जैसे फल। सिर्फ़ एक मौका।', 'આજે બધા માટે એકસરખાં ફળ. ફક્ત એક તક.'],
  d_classic: ['Score as much as you can before the clock runs out.', 'समय खत्म होने से पहले ज़्यादा से ज़्यादा अंक बनाएँ।', 'સમય પૂરો થાય તે પહેલાં વધુમાં વધુ પોઇન્ટ કરો.'],
  d_survival: ['Every fruit that falls costs a life. How long can you last?', 'हर गिरा हुआ फल एक जान लेता है। कब तक टिकेंगे?', 'દરેક પડેલું ફળ એક જીવ લે છે. ક્યાં સુધી ટકશો?'],
  d_precision: ['Limited quiver. Perfect hits and skewers win arrows back.', 'तीर सीमित हैं। परफेक्ट हिट और स्क्यूअर से तीर वापस मिलते हैं।', 'તીર મર્યાદિત છે. પરફેક્ટ હિટ અને સ્ક્યુઅરથી તીર પાછાં મળે.'],
  tag_classic: ['60 seconds', '60 सेकंड', '60 સેકન્ડ'],
  tag_survival: ['3 lives', '3 जान', '3 જીવ'],
  tag_precision: ['15 arrows', '15 तीर', '15 તીર'],
  tag_daily: ['One try a day', 'रोज़ एक मौका', 'રોજ એક તક'],
  tag_dailyDone: ['Today: {n}', 'आज: {n}', 'આજે: {n}'],
  tag_stage: ['{n} / 120 stars', '{n} / 120 स्टार', '{n} / 120 સ્ટાર'],
  dailyDone: ["Today's score: {n}. A new challenge arrives tomorrow.", 'आज का स्कोर: {n}। कल नई चुनौती आएगी।', 'આજનો સ્કોર: {n}. કાલે નવો પડકાર આવશે.'],

  // daily bonus
  dailyBonus: ['Daily bonus', 'दैनिक बोनस', 'દૈનિક બોનસ'],
  dailyBonusText: ['Come back every day to grow the reward.', 'इनाम बढ़ाने के लिए रोज़ आएँ।', 'ઇનામ વધારવા રોજ આવો.'],
  day: ['Day {n}', 'दिन {n}', 'દિવસ {n}'],
  claimN: ['CLAIM {n}', '{n} लें', '{n} લો'],

  // settings
  sfx: ['Sound effects', 'ध्वनि प्रभाव', 'ધ્વનિ અસરો'],
  music: ['Music', 'संगीत', 'સંગીત'],
  vibration: ['Vibration', 'कंपन', 'વાઇબ્રેશન'],
  language: ['Language', 'भाषा', 'ભાષા'],
  howto: ['How to play', 'कैसे खेलें', 'કેવી રીતે રમવું'],
  how1: ['Drag down anywhere, like a slingshot. The dotted guide shows the arrow\'s path.', 'गुलेल की तरह कहीं भी नीचे खींचें। बिंदीदार रेखा तीर का रास्ता दिखाती है।', 'ગોફણની જેમ ગમે ત્યાં નીચે ખેંચો. ટપકાંવાળી રેખા તીરનો રસ્તો બતાવે છે.'],
  how2: ['Release to shoot. Hit a fruit dead centre for a PERFECT (double points).', 'छोड़ते ही तीर चलेगा। फल के ठीक बीच में लगे तो PERFECT (दोगुने अंक)।', 'છોડતાં જ તીર છૂટશે. ફળની બરાબર વચ્ચે વાગે તો PERFECT (બમણા પોઇન્ટ).'],
  how3: ['Arrows fly through fruit: line several up for a SKEWER multiplier.', 'तीर फल के आर-पार जाता है: कई फल एक लाइन में हों तो SKEWER बोनस।', 'તીર ફળની આરપાર જાય છે: ઘણાં ફળ એક લાઇનમાં હોય તો SKEWER બોનસ.'],
  how4: ['Keep hitting to build your combo and fill the FEVER bar.', 'लगातार निशाना लगाकर कॉम्बो बढ़ाएँ और FEVER बार भरें।', 'સતત નિશાન લગાવી કોમ્બો વધારો અને FEVER બાર ભરો.'],
  how5: ['Never shoot bombs or birds. Do shoot the floating power-up bubbles.', 'बम या पक्षी पर तीर न चलाएँ। तैरते पावर-अप बुलबुलों पर ज़रूर चलाएँ।', 'બોમ્બ કે પક્ષી પર તીર ન ચલાવો. તરતા પાવર-અપ પરપોટા પર જરૂર ચલાવો.'],
  replayTut: ['Replay tutorial', 'ट्यूटोरियल फिर देखें', 'ટ્યુટોરિયલ ફરી જુઓ'],
  backup: ['Backup & restore', 'बैकअप और रिस्टोर', 'બેકઅપ અને રિસ્ટોર'],
  backupText: ['Copy this code and keep it safe. Paste a code here to restore progress on a new install.', 'यह कोड कॉपी करके सुरक्षित रखें। नए इंस्टॉल पर प्रगति वापस लाने के लिए कोड यहाँ पेस्ट करें।', 'આ કોડ કૉપિ કરીને સાચવી રાખો. નવા ઇન્સ્ટોલ પર પ્રગતિ પાછી લાવવા કોડ અહીં પેસ્ટ કરો.'],
  copy: ['Copy code', 'कोड कॉपी करें', 'કોડ કૉપિ કરો'],
  copied: ['Copied', 'कॉपी हो गया', 'કૉપિ થયું'],
  restore: ['Restore', 'रिस्टोर', 'રિસ્ટોર'],
  restoreBad: ["That code isn't valid", 'यह कोड सही नहीं है', 'આ કોડ સાચો નથી'],
  restoreOk: ['Progress restored', 'प्रगति वापस आ गई', 'પ્રગતિ પાછી આવી'],
  reset: ['Reset all progress', 'सारी प्रगति मिटाएँ', 'બધી પ્રગતિ ભૂંસો'],
  resetQ: ['Reset progress?', 'प्रगति मिटाएँ?', 'પ્રગતિ ભૂંસવી?'],
  resetText: ["Coins, upgrades, bows, stars and high scores will be erased. This can't be undone.", 'सिक्के, अपग्रेड, धनुष, स्टार और रिकॉर्ड मिट जाएँगे। यह वापस नहीं होगा।', 'સિક્કા, અપગ્રેડ, ધનુષ, સ્ટાર અને રેકોર્ડ ભૂંસાઈ જશે. આ પાછું નહીં આવે.'],
  erase: ['Erase', 'मिटाएँ', 'ભૂંસો'],
  resetDone: ['Progress reset', 'प्रगति मिट गई', 'પ્રગતિ ભૂંસાઈ'],

  // stats
  highScores: ['High scores', 'सर्वोच्च स्कोर', 'સર્વોચ્ચ સ્કોર'],
  lifetime: ['Lifetime', 'कुल', 'કુલ'],
  gamesPlayed: ['Games played', 'खेले गए खेल', 'રમેલી રમતો'],
  fruitHit: ['Fruit hit', 'फल गिराए', 'ફળ વીંધ્યાં'],
  perfectHits: ['Perfect hits', 'परफेक्ट हिट', 'પરફેક્ટ હિટ'],
  bestCombo: ['Best combo', 'सर्वश्रेष्ठ कॉम्बो', 'શ્રેષ્ઠ કોમ્બો'],
  bigSkewer: ['Biggest skewer', 'सबसे बड़ा स्क्यूअर', 'સૌથી મોટો સ્ક્યુઅર'],
  bossesSmashed: ['Bosses smashed', 'बॉस हराए', 'બોસ હરાવ્યા'],
  feversN: ['Fevers', 'फीवर', 'ફીવર'],
  coinsEarned: ['Coins earned', 'कमाए सिक्के', 'કમાયેલા સિક્કા'],
  starsEarned: ['Stars earned', 'जीते स्टार', 'જીતેલા સ્ટાર'],

  // shop
  u_power: ['Arrows fly faster and flatter', 'तीर तेज़ और सीधा उड़ता है', 'તીર ઝડપી અને સીધું ઊડે'],
  u_tips: ['Wider arrowheads hit more easily', 'चौड़ी नोक से निशाना आसान', 'પહોળી અણીથી નિશાન સહેલું'],
  u_sight: ['Longer aiming guide', 'लंबी निशाना-रेखा', 'લાંબી નિશાન-રેખા'],
  u_surge: ['Power-ups last longer', 'पावर-अप ज़्यादा देर चलते हैं', 'પાવર-અપ વધુ સમય ચાલે'],
  u_lucky: ['More power-ups and golden stars', 'ज़्यादा पावर-अप और सुनहरे स्टार', 'વધુ પાવર-અપ અને સોનેરી સ્ટાર'],
  u_purse: ['Earn more coins every run', 'हर खेल में ज़्यादा सिक्के', 'દરેક રમતમાં વધુ સિક્કા'],
  u_head: ['+1 life, +5 seconds, +2 arrows', '+1 जान, +5 सेकंड, +2 तीर', '+1 જીવ, +5 સેકન્ડ, +2 તીર'],
  a_std: ['Flies straight through fruit. No weakness.', 'फल के आर-पार जाता है। कोई कमी नहीं।', 'ફળની આરપાર જાય. કોઈ ખામી નહીં.'],
  a_fire: ['Explodes on the first hit. Cannot skewer.', 'पहली चोट पर फटता है। स्क्यूअर नहीं होता।', 'પહેલી ચોટે ફાટે. સ્ક્યુઅર ન થાય.'],
  a_ice: ['Each hit slows time. Flies 12% slower.', 'हर हिट समय धीमा करती है। 12% धीमा उड़ता है।', 'દરેક હિટ સમય ધીમો કરે. 12% ધીમું ઊડે.'],
  a_split: ['Splits into three in flight. Smaller hit area.', 'उड़ते हुए तीन में बँटता है। निशाना छोटा।', 'ઊડતાં ત્રણમાં વહેંચાય. નિશાન નાનું.'],
  a_bounce: ['Bounces off the walls three times. No perfect hits.', 'दीवारों से तीन बार टकराकर लौटता है। परफेक्ट नहीं मिलता।', 'દીવાલોથી ત્રણ વાર ઊછળે. પરફેક્ટ ન મળે.'],
  skinDesc: ['Bow and arrow-trail skin', 'धनुष और तीर का रंग-रूप', 'ધનુષ અને તીરનો દેખાવ'],
  seasonOnly: ['Season tier 10 reward', 'सीज़न टियर 10 का इनाम', 'સીઝન ટિયર 10 નું ઇનામ'],
  locked: ['LOCKED', 'बंद', 'બંધ'],

  // career missions
  m_fruit1: ['Hit 100 fruits', '100 फल गिराएँ', '100 ફળ વીંધો'],
  m_fruit2: ['Hit 1,000 fruits', '1,000 फल गिराएँ', '1,000 ફળ વીંધો'],
  m_perf: ['Land 50 perfect hits', '50 परफेक्ट हिट लगाएँ', '50 પરફેક્ટ હિટ લગાવો'],
  m_combo1: ['Reach a 15 combo', '15 का कॉम्बो बनाएँ', '15 નો કોમ્બો બનાવો'],
  m_combo2: ['Reach a 40 combo', '40 का कॉम्बो बनाएँ', '40 નો કોમ્બો બનાવો'],
  m_skew1: ['Skewer 3 fruits with one arrow', 'एक तीर से 3 फल बींधें', 'એક તીરથી 3 ફળ વીંધો'],
  m_skew2: ['Skewer 5 fruits with one arrow', 'एक तीर से 5 फल बींधें', 'એક તીરથી 5 ફળ વીંધો'],
  m_boss: ['Defeat a boss', 'एक बॉस को हराएँ', 'એક બોસને હરાવો'],
  m_fever: ['Trigger Fever 10 times', '10 बार फीवर चालू करें', '10 વાર ફીવર ચાલુ કરો'],
  m_classic: ['Score 1,500 in Time Attack', 'टाइम अटैक में 1,500 अंक', 'ટાઇમ એટેકમાં 1,500 પોઇન્ટ'],
  m_survival: ['Score 2,500 in Survival', 'सर्वाइवल में 2,500 अंक', 'સર્વાઇવલમાં 2,500 પોઇન્ટ'],
  m_precision: ['Score 1,200 in Precision', 'निशानेबाज़ में 1,200 अंक', 'નિશાનબાજમાં 1,200 પોઇન્ટ'],
  m_stars: ['Earn 30 Adventure stars', 'एडवेंचर में 30 स्टार जीतें', 'એડવેન્ચરમાં 30 સ્ટાર જીતો'],
  m_allboss: ['Defeat 10 bosses', '10 बॉस हराएँ', '10 બોસ હરાવો'],
  // weekly missions
  w_fruits: ['Hit {n} fruits this week', 'इस हफ़्ते {n} फल गिराएँ', 'આ અઠવાડિયે {n} ફળ વીંધો'],
  w_perf: ['Land {n} perfect hits', '{n} परफेक्ट हिट लगाएँ', '{n} પરફેક્ટ હિટ લગાવો'],
  w_skew: ['Make {n} skewers', '{n} स्क्यूअर बनाएँ', '{n} સ્ક્યુઅર બનાવો'],
  w_boss: ['Defeat {n} bosses', '{n} बॉस हराएँ', '{n} બોસ હરાવો'],
  w_fever: ['Trigger Fever {n} times', '{n} बार फीवर चालू करें', '{n} વાર ફીવર ચાલુ કરો'],
  w_stars: ['Earn {n} new stars', '{n} नए स्टार जीतें', '{n} નવા સ્ટાર જીતો'],
  w_games: ['Play {n} games', '{n} खेल खेलें', '{n} રમત રમો'],
  w_score: ['Score {n} points in total', 'कुल {n} अंक बनाएँ', 'કુલ {n} પોઇન્ટ કરો'],
  resetsIn: ['Resets in {n} days', '{n} दिन में रीसेट', '{n} દિવસમાં રીસેટ'],
  tier: ['Tier {n}', 'टियर {n}', 'ટિયર {n}'],
  seasonHelp: ['Every run earns season XP. Each tier pays out automatically.', 'हर खेल से सीज़न XP मिलता है। हर टियर का इनाम अपने आप मिलता है।', 'દરેક રમતથી સીઝન XP મળે. દરેક ટિયરનું ઇનામ આપોઆપ મળે.'],

  // adventure
  stage: ['Stage {n}', 'स्टेज {n}', 'સ્ટેજ {n}'],
  goal_fruits: ['Hit {n} fruits', '{n} फल गिराएँ', '{n} ફળ વીંધો'],
  goal_score: ['Score {n} points', '{n} अंक बनाएँ', '{n} પોઇન્ટ કરો'],
  goal_perfect: ['Land {n} perfect hits', '{n} परफेक्ट हिट लगाएँ', '{n} પરફેક્ટ હિટ લગાવો'],
  goal_skewer: ['Make {n} skewers', '{n} स्क्यूअर बनाएँ', '{n} સ્ક્યુઅર બનાવો'],
  goal_combo: ['Reach a {n} combo', '{n} का कॉम्बो बनाएँ', '{n} નો કોમ્બો બનાવો'],
  goal_boss: ['Defeat the boss', 'बॉस को हराएँ', 'બોસને હરાવો'],
  lim_time: ['{n} seconds', '{n} सेकंड', '{n} સેકન્ડ'],
  lim_arrows: ['{n} arrows', '{n} तीर', '{n} તીર'],
  starGoal: ['Goal', 'लक्ष्य', 'લક્ષ્ય'],
  starPts: ['Goal + {n} pts', 'लक्ष्य + {n} अंक', 'લક્ષ્ય + {n} પોઇન્ટ'],
  stageLocked: ['Finish the previous stage first', 'पहले पिछला स्टेज पूरा करें', 'પહેલાં અગાઉનું સ્ટેજ પૂર્ણ કરો'],
  mod_wind: ['Wind', 'हवा', 'પવન'], mod_bird: ['Birds', 'पक्षी', 'પક્ષી'], mod_shield: ['Shields', 'ढाल', 'ઢાલ'],
  mod_dodge: ['Dodgers', 'चकमा देने वाले', 'છટકનારાં'], mod_balloon: ['Balloons', 'गुब्बारे', 'ફુગ્ગા'], mod_bombs: ['Bomb storm', 'बमों की बारिश', 'બોમ્બનો વરસાદ'],

  // in-game callouts (PERFECT!, SKEWER, FEVER!, BOOM! stay as brand words)
  ready: ['READY?', 'तैयार?', 'તૈયાર?'],
  readySub: ['Pull back, aim, release', 'खींचें, निशाना लगाएँ, छोड़ें', 'ખેંચો, નિશાન લો, છોડો'],
  level: ['LEVEL {n}', 'लेवल {n}', 'લેવલ {n}'],
  levelSub: ['Faster fruit', 'फल और तेज़', 'ફળ વધુ ઝડપી'],
  timesUp: ["TIME'S UP!", 'समय समाप्त!', 'સમય પૂરો!'],
  gameOver: ['GAME OVER', 'खेल खत्म', 'રમત પૂરી'],
  outArrows: ['OUT OF ARROWS', 'तीर खत्म', 'તીર ખલાસ'],
  missed: ['MISSED!', 'छूट गया!', 'ચૂકી ગયા!'],
  comboLost: ['COMBO LOST', 'कॉम्बो टूटा', 'કોમ્બો તૂટ્યો'],
  plusArrow: ['+1 ARROW', '+1 तीर', '+1 તીર'],
  bossSub: ['Smash it before it escapes', 'भागने से पहले हराएँ', 'ભાગે તે પહેલાં હરાવો'],
  escaped: ['IT ESCAPED!', 'भाग गया!', 'ભાગી ગયો!'],
  feverSub: ['Double points', 'दोगुने अंक', 'બમણા પોઇન્ટ'],
  goalDone: ['GOAL COMPLETE!', 'लक्ष्य पूरा!', 'લક્ષ્ય પૂર્ણ!'],
  poorBird: ['POOR BIRD!', 'बेचारा पक्षी!', 'બિચારું પક્ષી!'],
  p_triple: ['TRIPLE SHOT', 'तीन तीर', 'ત્રણ તીર'], p_freeze: ['FREEZE', 'फ़्रीज़', 'ફ્રીઝ'], p_fire: ['BLAST ARROWS', 'धमाका तीर', 'ધડાકા તીર'],
  p_double: ['DOUBLE POINTS', 'दोगुने अंक', 'બમણા પોઇન્ટ'], p_magnet: ['MAGNET ARROWS', 'चुंबक तीर', 'ચુંબક તીર'],
  p_heart: ['+1 LIFE', '+1 जान', '+1 જીવ'], p_time: ['+6 SECONDS', '+6 सेकंड', '+6 સેકન્ડ'], p_quiver: ['+3 ARROWS', '+3 तीर', '+3 તીર'],
  pen_time: ['-8 seconds', '-8 सेकंड', '-8 સેકન્ડ'], pen_life: ['-1 life', '-1 जान', '-1 જીવ'], pen_arrows: ['-2 arrows', '-2 तीर', '-2 તીર'],
  rew_time: ['+12 seconds', '+12 सेकंड', '+12 સેકન્ડ'], rew_life: ['+1 life', '+1 जान', '+1 જીવ'], rew_arrows: ['+4 arrows', '+4 तीर', '+4 તીર'],
  // tutorial
  tut0: ['Drag down anywhere, then let go', 'कहीं भी नीचे खींचें, फिर छोड़ दें', 'ગમે ત્યાં નીચે ખેંચો, પછી છોડી દો'],
  tut1: ['Hit the very centre for a PERFECT', 'PERFECT के लिए ठीक बीच में मारें', 'PERFECT માટે બરાબર વચ્ચે મારો'],
  tut2: ['Line them up and SKEWER them', 'एक लाइन में लाकर सबको बींधें', 'એક લાઇનમાં લાવી બધાંને વીંધો'],
  tut3: ['Never shoot bombs. Grab the star!', 'बम पर कभी तीर न चलाएँ। स्टार लें!', 'બોમ્બ પર કદી તીર ન ચલાવો. સ્ટાર લો!'],
  tutTry: ['Almost! Try again', 'लगभग! फिर कोशिश करें', 'લગભગ! ફરી પ્રયાસ કરો'],
  tutDone: ["YOU'RE READY!", 'आप तैयार हैं!', 'તમે તૈયાર છો!'],
  tutorial: ['Training', 'प्रशिक्षण', 'તાલીમ'],
  skip: ['Skip', 'छोड़ें', 'છોડો'],
  // v9 extras
  adventure: ['Adventure', 'एडवेंचर', 'એડવેન્ચર'],
  go: ['GO!', 'चलो!', 'ચાલો!'],
  loadout: ['Arrow', 'तीर', 'તીર'],
  world: ['World {n}', 'दुनिया {n}', 'દુનિયા {n}'],
  stars3: ['3 stars', '3 स्टार', '3 સ્ટાર'],
  claim: ['CLAIM', 'लें', 'લો'],
  coinsN: ['+{n} coins', '+{n} सिक्के', '+{n} સિક્કા'],
  welcome: ['Welcome, archer!', 'स्वागत है, तीरंदाज़!', 'સ્વાગત છે, તીરંદાજ!'],
  welcomeText: ['A 30 second training round will teach you everything. You earn 100 coins for finishing it.', '30 सेकंड का प्रशिक्षण आपको सब सिखा देगा। पूरा करने पर 100 सिक्के मिलेंगे।', '30 સેકન્ડની તાલીમ તમને બધું શીખવી દેશે. પૂરી કરવા પર 100 સિક્કા મળશે.'],
  startTut: ['START TRAINING', 'प्रशिक्षण शुरू करें', 'તાલીમ શરૂ કરો'],
  tutReward: ['Training complete! +100 coins', 'प्रशिक्षण पूरा! +100 सिक्के', 'તાલીમ પૂર્ણ! +100 સિક્કા'],
  saved: ['Image saved', 'चित्र सेव हुआ', 'ચિત્ર સેવ થયું'],
  pasteHere: ['Paste backup code here', 'बैकअप कोड यहाँ पेस्ट करें', 'બેકઅપ કોડ અહીં પેસ્ટ કરો'],
  bossStage: ['BOSS', 'बॉस', 'બોસ'],
  score: ['Score', 'स्कोर', 'સ્કોર'],
  stageN: ['Stage', 'स्टेज', 'સ્ટેજ'],
  combo: ['COMBO', 'कॉम्बो', 'કોમ્બો'],
  fever: ['FEVER', 'फीवर', 'ફીવર'],
  dailyTitle: ['Daily Challenge', 'दैनिक चुनौती', 'દૈનિક પડકાર'],
  skinNew: ['New bow unlocked: Harvest Moon', 'नया धनुष मिला: Harvest Moon', 'નવું ધનુષ મળ્યું: Harvest Moon'],};

let li = 0;
export function setLang(code) {
  li = Math.max(0, LANGS.findIndex(l => l[0] === code));
  document.documentElement.lang = LANGS[li][0];
}
export function initLang() {
  let code = store.data.settings.lang;
  if (!code) { const n = (navigator.language || 'en').slice(0, 2); code = LANGS.some(l => l[0] === n) ? n : 'en'; }
  setLang(code);
  return LANGS[li][0];
}
export const lang = () => LANGS[li][0];

export function t(key, vars) {
  const e = S[key];
  let s = e ? e[li] || e[0] : key;
  if (vars) for (const k in vars) s = s.replace('{' + k + '}', vars[k]);
  return s;
}
