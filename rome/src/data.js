// Static game content. Geography uses real coordinates (lat, lon); history follows Caesar's Civil War, 49-44 BC.

// ---------- places ----------
// kind: urbs | city | town | camp | ruin | site | oppidum | pyramids     style: roman | greek | egypt | punic | east
export const PLACES = [
  // Italia
  { id: 'ravenna', name: 'Ravenna', lat: 44.42, lon: 12.2, kind: 'town', port: 1, region: 'Italia', desc: 'A lagoon town of Cisalpine Gaul. In January 49 BC Caesar waited here with the Thirteenth Legion while the Senate debated his fate.' },
  { id: 'rubico', name: 'Rubico', lat: 44.17, lon: 12.42, kind: 'site', region: 'Italia', desc: 'A small river marking the border between Caesar\'s province and Italy. No general could lawfully bring an army across it.' },
  { id: 'ariminum', name: 'Ariminum', lat: 44.0, lon: 12.62, kind: 'town', port: 1, region: 'Italia', desc: 'The first town of Italy proper, where the Via Flaminia from Rome meets the Via Aemilia. Caesar seized it the night he crossed the Rubicon.' },
  { id: 'roma', name: 'Roma', lat: 42.0, lon: 12.78, kind: 'urbs', region: 'Italia', desc: 'Capital of the Republic and home to perhaps a million people. The Colosseum will not exist for another century; Pompey\'s stone theatre, finished in 55 BC, is the newest wonder.' },
  { id: 'ostia', name: 'Ostia', lat: 41.72, lon: 12.2, kind: 'town', port: 1, region: 'Italia', desc: 'Rome\'s harbour at the mouth of the Tiber, where the grain ships from Sicily, Africa and Egypt unload.' },
  { id: 'capua', name: 'Capua', lat: 41.08, lon: 14.25, kind: 'city', region: 'Italia', desc: 'The rich chief city of Campania on the Via Appia, famous for its gladiator schools. Spartacus broke out of one in 73 BC, and Caesar owns one here now.' },
  { id: 'brundisium', name: 'Brundisium', lat: 40.64, lon: 17.94, kind: 'city', port: 1, region: 'Italia', desc: 'The end of the Via Appia and the gateway to Greece. Pompey slipped out of this harbour with his army in March 49 BC.' },
  { id: 'syracusae', name: 'Syracusae', lat: 37.07, lon: 15.27, kind: 'city', port: 1, style: 'greek', region: 'Sicilia', desc: 'The greatest Greek city of Sicily, taken by Rome in 212 BC. Archimedes died in the sack; Cicero later found his forgotten tomb.' },
  { id: 'caralis', name: 'Caralis', lat: 39.22, lon: 9.12, kind: 'town', port: 1, region: 'Sardinia', desc: 'Chief port of Sardinia, an old Punic harbour that sends grain to Rome.' },
  // Gallia
  { id: 'massilia', name: 'Massilia', lat: 43.3, lon: 5.37, kind: 'city', port: 1, style: 'greek', region: 'Gallia', desc: 'A Greek colony founded about 600 BC and an old ally of Rome. In 49 BC it shut its gates to Caesar and endured a six-month siege.' },
  { id: 'narbo', name: 'Narbo Martius', lat: 43.18, lon: 3.0, kind: 'town', port: 1, region: 'Gallia', desc: 'The first Roman colony in Gaul, founded in 118 BC on the Via Domitia, the road that links Italy to Hispania.' },
  { id: 'bibracte', name: 'Bibracte', lat: 46.92, lon: 4.03, kind: 'oppidum', region: 'Gallia', desc: 'Hilltop capital of the Aedui, Rome\'s oldest allies in Gaul. Caesar finished his commentaries on the Gallic War here in the winter of 52 BC.' },
  { id: 'alesia', name: 'Alesia', lat: 47.54, lon: 4.5, kind: 'ruin', region: 'Gallia', desc: 'Where Vercingetorix surrendered in 52 BC after Caesar ringed the hill with two lines of siege works, one facing in and one facing out.' },
  // Hispania
  { id: 'tarraco', name: 'Tarraco', lat: 41.12, lon: 1.25, kind: 'city', port: 1, region: 'Hispania', desc: 'Rome\'s main base in Nearer Spain since the Scipios landed here against Carthage.' },
  { id: 'ilerda', name: 'Ilerda', lat: 41.62, lon: 0.62, kind: 'camp', region: 'Hispania', desc: 'In the summer of 49 BC Caesar outmarched Pompey\'s legates Afranius and Petreius here, cut them off from water and took their surrender almost without a battle.' },
  { id: 'carthago_nova', name: 'Carthago Nova', lat: 37.6, lon: -0.98, kind: 'city', port: 1, style: 'punic', region: 'Hispania', desc: 'Founded by Hasdrubal of Carthage and captured by Scipio in 209 BC. Its silver mines and harbour are the finest in Spain.' },
  { id: 'corduba', name: 'Corduba', lat: 37.88, lon: -4.78, kind: 'city', region: 'Hispania', desc: 'Capital of Further Spain on the river Baetis.' },
  { id: 'munda', name: 'Munda', lat: 37.35, lon: -5.1, kind: 'camp', region: 'Hispania', desc: 'Site of the last battle of the civil war, 17 March 45 BC. Caesar said that elsewhere he had fought for victory, but here for his life.' },
  { id: 'gades', name: 'Gades', lat: 36.53, lon: -6.29, kind: 'city', port: 1, style: 'punic', region: 'Hispania', desc: 'An ancient Phoenician port beyond the Pillars of Hercules. As a young quaestor Caesar is said to have wept here before a statue of Alexander the Great.' },
  // Africa
  { id: 'utica', name: 'Utica', lat: 37.12, lon: 9.9, kind: 'city', port: 1, style: 'punic', region: 'Africa', desc: 'Capital of Roman Africa since Carthage fell. Cato the Younger held it for the Republic and took his own life here in 46 BC rather than accept Caesar\'s pardon.' },
  { id: 'carthago', name: 'Carthago', lat: 36.8, lon: 10.42, kind: 'ruin', style: 'punic', region: 'Africa', desc: 'Destroyed by Scipio Aemilianus in 146 BC and still in ruins. Caesar plans a new colony on the site.' },
  { id: 'thapsus', name: 'Thapsus', lat: 35.62, lon: 10.95, kind: 'camp', port: 1, region: 'Africa', desc: 'On 6 April 46 BC Caesar broke the army of Metellus Scipio and King Juba of Numidia here. The Fifth Legion earned its elephant emblem facing Juba\'s war elephants.' },
  { id: 'cyrene', name: 'Cyrene', lat: 32.82, lon: 21.86, kind: 'city', port: 1, style: 'greek', region: 'Africa', desc: 'A Greek city in Libya, grown rich on silphium, a medicinal plant found nowhere else.' },
  // Aegyptus
  { id: 'alexandria', name: 'Alexandria', lat: 31.2, lon: 29.92, kind: 'urbs', port: 1, style: 'egypt', region: 'Aegyptus', desc: 'Founded by Alexander in 331 BC and ruled by the Ptolemies, a Macedonian dynasty. Its Pharos lighthouse and Library are wonders of the world.' },
  { id: 'pelusium', name: 'Pelusium', lat: 31.04, lon: 32.55, kind: 'town', port: 1, style: 'egypt', region: 'Aegyptus', desc: 'The eastern fortress of Egypt. Pompey the Great was murdered in a small boat off this shore on 28 September 48 BC.' },
  { id: 'memphis', name: 'Memphis', lat: 29.86, lon: 31.25, kind: 'town', style: 'egypt', region: 'Aegyptus', desc: 'The ancient capital of the pharaohs, where the Ptolemies are still crowned in the old Egyptian manner.' },
  { id: 'pyramides', name: 'Pyramides', lat: 30.02, lon: 30.95, kind: 'pyramids', style: 'egypt', region: 'Aegyptus', desc: 'The pyramids of Giza were already some 2,500 years old in Caesar\'s day, as distant from him as he is from us.' },
  // Graecia and the East
  { id: 'dyrrachium', name: 'Dyrrachium', lat: 41.32, lon: 19.45, kind: 'city', port: 1, style: 'greek', region: 'Graecia', desc: 'The landing place opposite Brundisium and the start of the Via Egnatia. Pompey made it his supply base in 48 BC.' },
  { id: 'castra', name: 'Castra Caesaris', lat: 41.05, lon: 19.75, kind: 'camp', region: 'Graecia', desc: 'Caesar tried to pen Pompey against the sea with seventeen miles of earthworks here. In July 48 BC Pompey broke the line and Caesar suffered his worst defeat.' },
  { id: 'apollonia', name: 'Apollonia', lat: 40.6, lon: 19.6, kind: 'town', style: 'greek', region: 'Graecia', desc: 'A Greek city famous for its schools. Caesar\'s great-nephew Octavius was studying here when the dictator was killed.' },
  { id: 'pharsalus', name: 'Pharsalus', lat: 39.3, lon: 22.38, kind: 'camp', region: 'Graecia', desc: 'On 9 August 48 BC Caesar, outnumbered two to one, routed Pompey on this plain in Thessaly.' },
  { id: 'thessalonica', name: 'Thessalonica', lat: 40.64, lon: 22.94, kind: 'city', port: 1, style: 'greek', region: 'Graecia', desc: 'Capital of Roman Macedonia on the Via Egnatia. The senators who fled with Pompey met here as a Senate in exile.' },
  { id: 'athenae', name: 'Athenae', lat: 37.97, lon: 23.73, kind: 'city', port: 1, style: 'greek', region: 'Graecia', desc: 'No longer a power, but still the school of the world. Young Romans come to study philosophy beneath the Parthenon.' },
  { id: 'corinthus', name: 'Corinthus', lat: 37.9, lon: 22.8, kind: 'ruin', style: 'greek', region: 'Graecia', desc: 'Sacked and levelled by Mummius in 146 BC, the same year as Carthage. Caesar will refound it as a colony in 44 BC.' },
  { id: 'cnossus', name: 'Cnossus', lat: 35.3, lon: 25.16, kind: 'town', port: 1, style: 'greek', region: 'Creta', desc: 'Old city of Crete, conquered by Metellus in 67 BC. Cretan archers serve as mercenaries in every army.' },
  { id: 'rhodus', name: 'Rhodus', lat: 36.44, lon: 28.22, kind: 'city', port: 1, style: 'greek', region: 'Asia', desc: 'An island republic of sailors and orators where Caesar and Cicero both studied rhetoric. Its bronze Colossus has lain broken since the earthquake of 226 BC.' },
  { id: 'ephesus', name: 'Ephesus', lat: 37.94, lon: 27.34, kind: 'city', port: 1, style: 'greek', region: 'Asia', desc: 'Chief city of the province of Asia, home to the Temple of Artemis, one of the seven wonders.' },
  { id: 'byzantium', name: 'Byzantium', lat: 41.01, lon: 28.98, kind: 'town', port: 1, style: 'greek', region: 'Thracia', desc: 'A Greek town guarding the strait to the Black Sea. Four centuries from now it will be renamed Constantinople.' },
  { id: 'tarsus', name: 'Tarsus', lat: 36.92, lon: 34.89, kind: 'town', port: 1, style: 'east', region: 'Cilicia', desc: 'Capital of Cilicia. Caesar held court here in 47 BC on his way to fight Pharnaces of Pontus.' },
  { id: 'zela', name: 'Zela', lat: 40.3, lon: 35.89, kind: 'camp', region: 'Pontus', desc: 'On 2 August 47 BC Caesar destroyed the army of Pharnaces II here in a battle so short that he reported it in three words.' },
  { id: 'antiochia', name: 'Antiochia', lat: 36.2, lon: 36.16, kind: 'city', style: 'east', region: 'Syria', desc: 'Once the Seleucid capital, now the seat of the Roman governor of Syria since Pompey annexed it in 64 BC.' },
  { id: 'tyrus', name: 'Tyrus', lat: 33.27, lon: 35.2, kind: 'town', port: 1, style: 'punic', region: 'Syria', desc: 'The Phoenician mother city of Carthage, renowned for purple dye made from sea snails.' },
  { id: 'hierosolyma', name: 'Hierosolyma', lat: 31.78, lon: 35.23, kind: 'city', style: 'east', region: 'Iudaea', desc: 'Jerusalem. Pompey took the city in 63 BC and walked into the Temple\'s inner sanctuary, but left its treasure untouched.' },
];

// ---------- roads (lists of place ids or [lat, lon] waypoints) ----------
export const ROADS = [
  { name: 'Via Popilia', pts: ['ravenna', 'rubico', 'ariminum'] },
  { name: 'Via Flaminia', pts: ['ariminum', [43.45, 12.6], [42.75, 12.55], 'roma'] },
  { name: 'Via Aemilia', pts: ['ariminum', [44.5, 11.35], [44.8, 10.33], [45.05, 9.7]] },
  { name: 'Via Ostiensis', pts: ['roma', 'ostia'] },
  { name: 'Via Appia', pts: ['roma', [41.35, 13.3], 'capua', [41.13, 14.78], [40.75, 16.0], [40.5, 17.2], 'brundisium'] },
  { name: 'Via Aurelia', pts: ['roma', [42.45, 11.35], [43.5, 10.55], [44.2, 9.6], [44.35, 8.6], [43.75, 7.3], 'massilia'] },
  { name: 'Via Domitia', pts: ['massilia', [43.84, 4.36], 'narbo', [42.5, 2.85], [41.95, 2.6], 'tarraco'] },
  { name: 'Via Herculea', pts: ['tarraco', [40.3, 0.3], [39.47, -0.4], [38.4, -0.6], 'carthago_nova', [37.6, -2.6], [37.75, -3.8], 'corduba', 'munda', 'gades'] },
  { name: 'Iter Ilerdense', pts: ['tarraco', 'ilerda'] },
  { name: 'Iter Gallicum', pts: ['massilia', [44.5, 4.8], [45.75, 4.83], 'bibracte', 'alesia'] },
  { name: 'Via Egnatia', pts: ['dyrrachium', [41.1, 20.5], [40.9, 21.6], 'thessalonica', [40.9, 24.4], [40.95, 26.3], 'byzantium'] },
  { name: 'Iter Epiroticum', pts: ['dyrrachium', 'castra', 'apollonia'] },
  { name: 'Iter Thessalicum', pts: ['thessalonica', [39.9, 22.5], 'pharsalus', [38.6, 22.9], [38.15, 23.5], 'athenae'] },
  { name: 'Iter Isthmicum', pts: ['athenae', [37.95, 23.2], 'corinthus'] },
  { name: 'Iter Africanum', pts: ['utica', 'carthago', [36.2, 10.4], 'thapsus'] },
  { name: 'Iter Aegyptium', pts: ['alexandria', [30.6, 30.6], 'pyramides', 'memphis'] },
  { name: 'Via Maris', pts: ['alexandria', [31.25, 31.2], 'pelusium', [31.3, 34.2], 'hierosolyma'] },
  { name: 'Iter Syriacum', pts: ['hierosolyma', [32.6, 35.3], 'tyrus', [34.8, 35.95], 'antiochia', [36.75, 36.0], 'tarsus'] },
  { name: 'Iter Ponticum', pts: ['tarsus', [38.0, 34.9], [39.3, 35.5], 'zela'] },
];

// ---------- mountain ranges: [lat, lon] polylines, peak height, half-width (world units) ----------
export const RANGES = [
  { h: 120, w: 260, pts: [[44.2, 7.0], [45.3, 6.9], [46.0, 7.8], [46.5, 9.8], [46.7, 11.8], [46.5, 13.6]] },   // Alpes
  { h: 52, w: 130, pts: [[44.4, 8.9], [44.25, 10.8], [43.4, 12.0], [42.4, 13.3], [41.4, 14.5], [40.5, 15.8], [39.4, 16.4], [38.3, 16.1]] }, // Appenninus
  { h: 95, w: 170, pts: [[43.0, -1.5], [42.7, 0.3], [42.5, 1.9]] },                                              // Pyrenaei
  { h: 78, w: 240, pts: [[31.5, -7.5], [33.0, -4.5], [34.6, -1.5], [35.6, 2.5], [36.0, 6.0], [35.4, 8.5]] },    // Atlas
  { h: 62, w: 170, pts: [[45.6, 14.4], [44.4, 15.9], [43.3, 17.6], [42.3, 19.4], [41.2, 20.6], [40.0, 21.2], [38.9, 21.7]] }, // Dinaric / Pindus
  { h: 60, w: 170, pts: [[43.2, 22.5], [42.7, 24.5], [42.6, 26.5]] },                                            // Haemus
  { h: 88, w: 220, pts: [[36.9, 29.5], [37.2, 31.5], [37.3, 33.5], [37.6, 35.3], [38.4, 36.8]] },               // Taurus
  { h: 62, w: 200, pts: [[40.8, 31.0], [41.0, 33.5], [40.7, 36.0]] },                                            // Pontic mountains
  { h: 58, w: 130, pts: [[37.1, -3.9], [37.1, -2.6]] },                                                          // Sierra Nevada
  { h: 44, w: 210, pts: [[40.8, -5.5], [40.4, -3.2], [40.9, -1.6]] },                                            // Iberian central ranges
  { h: 46, w: 180, pts: [[44.4, 2.6], [45.4, 2.9]] },                                                            // Massif Central
  { h: 86, w: 70, pts: [[37.75, 14.99], [37.76, 15.0]] },                                                        // Aetna
  { h: 34, w: 46, pts: [[40.82, 14.43], [40.825, 14.435]] },                                                     // Vesuvius (dormant and green in 49 BC)
  { h: 50, w: 110, pts: [[35.3, 23.9], [35.2, 25.0]] },                                                          // Cretan Ida
  { h: 55, w: 110, pts: [[34.3, 36.0], [33.5, 35.8]] },                                                          // Libanus
  { h: 40, w: 100, pts: [[40.1, 9.3], [39.9, 9.3]] },                                                            // Sardinia
];

export const RIVERS = [
  { name: 'Rubico', w: 5, pts: [[44.02, 11.9], [44.14, 12.25], [44.19, 12.44], [44.21, 12.52]] },
  { name: 'Tiberis', w: 8, pts: [[43.3, 12.25], [42.5, 12.42], [42.12, 12.62], [41.93, 12.52], [41.8, 12.3], [41.74, 12.16]] },
  { name: 'Padus', w: 9, pts: [[45.0, 7.7], [45.1, 9.0], [45.05, 10.4], [44.95, 11.6], [44.95, 12.4]] },
  { name: 'Rhodanus', w: 9, pts: [[46.2, 6.1], [45.75, 4.83], [44.9, 4.85], [43.95, 4.75], [43.4, 4.75]] },
  { name: 'Iberus', w: 8, pts: [[42.5, -2.2], [41.65, -0.9], [41.25, 0.2], [40.72, 0.72]] },
  { name: 'Baetis', w: 8, pts: [[38.0, -3.0], [37.88, -4.7], [37.4, -5.95], [36.85, -6.35]] },
  { name: 'Nilus', w: 12, pts: [[29.5, 31.2], [29.9, 31.22], [30.2, 31.12], [30.8, 30.8], [31.25, 30.35]] },
  { name: 'Nilus Pelusiacus', w: 9, pts: [[30.2, 31.12], [30.7, 31.8], [31.05, 32.45]] },
];

// ---------- gear ----------
export const ITEMS = {
  // weapons: dmg, spd (animation speed multiplier), reach
  pugio: { slot: 'weapon', name: 'Pugio', dmg: 9, spd: 1.35, reach: 2.1, price: 0, desc: 'The broad-bladed dagger every legionary carries on his belt. Very fast, short reach.' },
  gladius: { slot: 'weapon', name: 'Gladius Hispaniensis', dmg: 15, spd: 1.0, reach: 2.5, price: 180, desc: 'The "Spanish sword" Rome copied from Iberian mercenaries: a short cut-and-thrust blade made for close formation fighting.' },
  hasta: { slot: 'weapon', name: 'Hasta', dmg: 18, spd: 0.8, reach: 3.5, price: 260, desc: 'A thrusting spear. Slower than a sword, but it keeps an enemy at a distance.' },
  kopis: { slot: 'weapon', name: 'Kopis', dmg: 19, spd: 1.05, reach: 2.4, price: 420, desc: 'A forward-curving Greek sabre that chops like an axe.' },
  gallic: { slot: 'weapon', name: 'Gallic Longsword', dmg: 25, spd: 0.74, reach: 3.0, price: 520, desc: 'The long iron slashing sword of the Celtic nobility. Heavy and slow, but it hits very hard.' },
  falcata: { slot: 'weapon', name: 'Falcata', dmg: 22, spd: 0.95, reach: 2.5, price: 640, desc: 'An Iberian blade of superb steel. Roman writers claimed it could cut through shield and helmet alike.' },
  sica: { slot: 'weapon', name: 'Sica', dmg: 17, spd: 1.25, reach: 2.2, price: 0, desc: 'The curved short sword of the Thracian gladiator, made to hook around a shield.' },
  decima: { slot: 'weapon', name: 'Gladius of the Tenth', dmg: 30, spd: 1.05, reach: 2.6, price: 0, desc: 'A centurion\'s sword from the Tenth Legion, Caesar\'s favourite, with a silvered hilt.' },
  // shields: block = share of frontal damage stopped
  noshield: { slot: 'shield', name: 'No shield', block: 0.3, price: 0, desc: 'Parrying with the blade alone stops little.' },
  parma: { slot: 'shield', name: 'Parma', block: 0.6, price: 120, desc: 'A small round shield used by cavalry and light troops.' },
  aspis: { slot: 'shield', name: 'Aspis', block: 0.72, price: 300, desc: 'The round bronze-faced shield of the Greek hoplite.' },
  scutum: { slot: 'shield', name: 'Scutum', block: 0.82, price: 380, desc: 'The legionary\'s shield. In Caesar\'s day it is a tall curved oval of plywood and hide, not yet the rectangle of the later Empire.' },
  scutum13: { slot: 'shield', name: 'Scutum of the Thirteenth', block: 0.9, price: 0, desc: 'A veteran\'s shield from the legion that crossed the Rubicon, its boss dented by years of war in Gaul.' },
  // armour: def = share of all damage removed
  tunica: { slot: 'armor', name: 'Tunica', def: 0, price: 0, desc: 'A plain wool tunic. Comfortable, and no protection at all.' },
  linothorax: { slot: 'armor', name: 'Linothorax', def: 0.14, price: 240, desc: 'A Greek cuirass of glued linen layers, light and surprisingly tough.' },
  hamata: { slot: 'armor', name: 'Lorica Hamata', def: 0.22, price: 420, desc: 'A mail shirt of some 30,000 iron rings, the standard armour of Caesar\'s legions. The plate "lorica segmentata" has not been invented yet.' },
  squamata: { slot: 'armor', name: 'Lorica Squamata', def: 0.27, price: 700, desc: 'Bronze scales sewn to a fabric backing, favoured by officers and standard bearers.' },
  musculata: { slot: 'armor', name: 'Lorica Musculata', def: 0.33, price: 0, desc: 'A bronze cuirass shaped like a muscled torso, worn by generals and tribunes.' },
  // helmets
  nohelm: { slot: 'helmet', name: 'Bare head', def: 0, price: 0, desc: 'Nothing but your hair.' },
  montefortino: { slot: 'helmet', name: 'Montefortino Helmet', def: 0.07, price: 170, desc: 'A simple bronze bowl with a topknob and cheek pieces, a Celtic design the legions have worn for three centuries.' },
  coolus: { slot: 'helmet', name: 'Coolus Helmet', def: 0.1, price: 320, desc: 'A newer Gallic pattern with a neck guard, spreading through the legions after Caesar\'s wars in Gaul.' },
  agen: { slot: 'helmet', name: 'Gallic Iron Helmet', def: 0.12, price: 460, desc: 'Forged iron with a wide brim, the work of Gallic smiths. Roman helmets of the next century will copy it.' },
  attic: { slot: 'helmet', name: 'Crested Attic Helmet', def: 0.14, price: 0, desc: 'An officer\'s helmet in the Greek style with a horsehair crest.' },
};
// what the merchant sells, by region
export const STOCK = {
  Italia: ['gladius', 'hasta', 'parma', 'scutum', 'hamata', 'montefortino', 'coolus'],
  Sicilia: ['gladius', 'kopis', 'aspis', 'linothorax', 'montefortino'],
  Sardinia: ['gladius', 'parma', 'montefortino'],
  Gallia: ['gladius', 'gallic', 'parma', 'hamata', 'agen', 'coolus'],
  Hispania: ['gladius', 'falcata', 'parma', 'scutum', 'squamata', 'coolus'],
  Africa: ['gladius', 'hasta', 'parma', 'squamata', 'montefortino'],
  Aegyptus: ['kopis', 'hasta', 'aspis', 'linothorax', 'squamata'],
  Graecia: ['kopis', 'hasta', 'aspis', 'linothorax', 'hamata', 'coolus'],
  Creta: ['kopis', 'aspis', 'linothorax'],
  Asia: ['kopis', 'hasta', 'aspis', 'squamata', 'coolus'],
  Thracia: ['kopis', 'hasta', 'aspis', 'linothorax'],
  Cilicia: ['kopis', 'hasta', 'aspis', 'squamata'],
  Syria: ['kopis', 'hasta', 'aspis', 'squamata'],
  Iudaea: ['kopis', 'hasta', 'parma', 'squamata'],
  Pontus: [],
};
export const PRICE = { panis: 8, pilum: 14 };

// ---------- characters (look is consumed by models.js) ----------
export const NPCS = {
  caesar: { name: 'Gaius Iulius Caesar', look: { tunic: 0xf2ead8, armor: 'musculata', cloak: 0xa01818, hair: 0x6a5a48, bald: 1, wreath: 1, weapon: 'gladius' } },
  antonius: { name: 'Marcus Antonius', look: { tunic: 0x9a2a22, armor: 'musculata', cloak: 0x5a1a14, hair: 0x2a1c12, beard: 1, weapon: 'gladius' } },
  cicero: { name: 'Marcus Tullius Cicero', look: { toga: 1, stripe: 0x6a1b4d, hair: 0x9a9388, bald: 1 } },
  decimus: { name: 'Decimus Iunius Brutus Albinus', look: { tunic: 0xe8e0cc, armor: 'hamata', cloak: 0x2f4a7a, hair: 0x4a3420, weapon: 'gladius' } },
  crastinus: { name: 'Gaius Crastinus', look: { tunic: 0x9a2a22, armor: 'hamata', helmet: 'montefortino', crest: 'trans', hair: 0x555048, weapon: 'gladius', shield: 'scutum' } },
  cleopatra: { name: 'Cleopatra VII Philopator', look: { female: 1, tunic: 0xf4efe2, stripe: 0xd4a84b, hair: 0x1a120c, diadem: 1, skin: 0xd9a77e } },
  apollodorus: { name: 'Apollodorus the Sicilian', look: { tunic: 0x4a6a8a, hair: 0x221810, beard: 1, skin: 0xc9966a } },
  artemidorus: { name: 'Artemidorus of Cnidus', look: { tunic: 0xd8d0b8, cloak: 0x6a5a3a, hair: 0x8a8378, beard: 1 } },
  calpurnia: { name: 'Calpurnia', look: { female: 1, tunic: 0x7a3a5a, stripe: 0xd4a84b, hair: 0x3a2618 } },
  octavius: { name: 'Gaius Octavius', look: { toga: 1, hair: 0xb89a5a } },
  centurion: { name: 'Centurion', look: { tunic: 0x9a2a22, armor: 'hamata', helmet: 'montefortino', crest: 'trans', weapon: 'gladius', shield: 'scutum' } },
  lanista: { name: 'Scaurus the Lanista', look: { tunic: 0x6a4a2a, hair: 0x2a2018, beard: 1 } },
  frumentarius: { name: 'Quintus the Grain Factor', look: { tunic: 0xb8a070, hair: 0x4a3a28 } },
  scholar: { name: 'Demetrios the Geometer', look: { tunic: 0xe6e0d0, cloak: 0x3a5a6a, hair: 0x9a9388, beard: 1, skin: 0xc9966a } },
  cratippus: { name: 'Cratippus of Pergamon', look: { tunic: 0xe6e0d0, cloak: 0x7a6a4a, hair: 0xb0aaa0, beard: 1, skin: 0xc9966a } },
  rhetor: { name: 'Menekles the Rhetor', look: { tunic: 0xd0c8e0, hair: 0x3a2a1a, beard: 1, skin: 0xc9966a } },
  antiquarian: { name: 'Lucius Sittius', look: { tunic: 0xa08a60, hair: 0x7a7468 } },
  brennos: { name: 'Brennos of the Aedui', look: { tunic: 0x4a6a3a, cloak: 0x7a3a2a, hair: 0xb08a4a, beard: 1, pants: 0x5a4a6a } },
  jailer: { name: 'Keeper of the Tullianum', look: { tunic: 0x5a5048, armor: 'hamata', hair: 0x2a2018 } },
  librarian: { name: 'Sosigenes of Alexandria', look: { tunic: 0xf0e8d0, cloak: 0x2a6a6a, hair: 0x2a2018, beard: 1, skin: 0xc08a5a } },
  priest: { name: 'Priest of Hercules', look: { tunic: 0xf4f0e6, hair: 0x1a120c, bald: 1, skin: 0xb8865a } },
  viator: { name: 'Publius the Carter', look: { tunic: 0x8a6a4a, hair: 0x3a2a1a } },
  guide: { name: 'Petosiris the Guide', look: { tunic: 0xf0e8d0, hair: 0x1a120c, bald: 1, skin: 0xb07a4a } },
};

// ---------- enemies ----------
export const FOES = {
  latro: { name: 'Bandit', hp: 38, dmg: 8, spd: 5.0, xp: 12, den: [2, 7], look: { tunic: 0x6a5238, hair: 0x2a2018, weapon: 'club', beard: 1 } },
  pirata: { name: 'Pirate', hp: 44, dmg: 10, spd: 5.2, xp: 16, den: [4, 10], look: { tunic: 0x3a5a6a, hair: 0x1a120c, weapon: 'kopis', shield: 'parma', skin: 0xc08a5a } },
  miles: { name: 'Pompeian Legionary', hp: 70, dmg: 13, spd: 4.7, xp: 26, den: [5, 12], guard: 0.35, look: { tunic: 0x2f4a7a, armor: 'hamata', helmet: 'montefortino', weapon: 'gladius', shield: 'scutum', shieldCol: 0x2f4a7a } },
  sagittarius: { name: 'Cretan Archer', hp: 34, dmg: 10, spd: 4.6, xp: 20, den: [3, 9], ranged: 1, look: { tunic: 0x7a8a5a, hair: 0x1a120c, weapon: 'bow', skin: 0xc9966a } },
  numida: { name: 'Numidian Skirmisher', hp: 40, dmg: 12, spd: 5.6, xp: 22, den: [3, 9], ranged: 1, look: { tunic: 0xe8dcc0, hair: 0x120c08, weapon: 'javelin', shield: 'parma', skin: 0x7a5236 } },
  gallus: { name: 'Gallic Raider', hp: 62, dmg: 17, spd: 4.8, xp: 24, den: [4, 11], slow: 1, look: { tunic: 0x4a6a3a, pants: 0x6a4a5a, hair: 0xb08a4a, beard: 1, weapon: 'gallic', shield: 'parma', shieldCol: 0x8a2a22 } },
  iber: { name: 'Iberian Brigand', hp: 52, dmg: 14, spd: 5.2, xp: 22, den: [4, 11], look: { tunic: 0x8a2a22, hair: 0x1a120c, weapon: 'falcata', shield: 'parma', skin: 0xc9966a } },
  aegyptius: { name: 'Gabinian Soldier', hp: 64, dmg: 14, spd: 4.8, xp: 26, den: [5, 12], guard: 0.3, look: { tunic: 0xe8dcc0, armor: 'lino', helmet: 'attic', weapon: 'kopis', shield: 'aspis', skin: 0xb8865a } },
  ponticus: { name: 'Pontic Warrior', hp: 60, dmg: 15, spd: 5.0, xp: 26, den: [5, 12], look: { tunic: 0x7a2a5a, pants: 0x3a3a5a, armor: 'squamata', helmet: 'attic', weapon: 'hasta', shield: 'parma', skin: 0xc9966a } },
  gladiator: { name: 'Gladiator', hp: 80, dmg: 15, spd: 5.0, xp: 30, den: [0, 0], guard: 0.25, look: { tunic: 0x5a3a2a, helmet: 'coolus', crest: 'red', weapon: 'sica', shield: 'parma', bare: 1 } },
  centurio: { name: 'Centurion', hp: 150, dmg: 19, spd: 4.8, xp: 70, den: [15, 30], guard: 0.45, elite: 1, look: { tunic: 0x2f4a7a, armor: 'hamata', helmet: 'montefortino', crest: 'trans', weapon: 'gladius', shield: 'scutum', shieldCol: 0x2f4a7a, scale: 1.08 } },
  lupus: { name: 'Wolf', hp: 26, dmg: 8, spd: 8.2, xp: 10, den: [0, 0], beast: 1 },
  labienus: { name: 'Titus Labienus', hp: 520, dmg: 24, spd: 5.0, xp: 400, den: [120, 120], guard: 0.5, elite: 1, boss: 1, look: { tunic: 0x2f4a7a, armor: 'musculata', helmet: 'attic', crest: 'red', cloak: 0x2f4a7a, weapon: 'gladius', shield: 'scutum', shieldCol: 0x2f4a7a, scale: 1.15 } },
  achillas: { name: 'Achillas', hp: 300, dmg: 20, spd: 5.0, xp: 220, den: [80, 80], guard: 0.4, elite: 1, boss: 1, look: { tunic: 0xe8dcc0, armor: 'squamata', helmet: 'attic', crest: 'red', cloak: 0x1a6a6a, weapon: 'kopis', shield: 'aspis', skin: 0xb8865a, scale: 1.12 } },
};
// wilderness encounters by region
export const WILD = {
  Italia: ['latro', 'latro', 'lupus'], Sicilia: ['latro', 'pirata'], Sardinia: ['latro', 'pirata'], Gallia: ['gallus', 'lupus', 'latro'],
  Hispania: ['iber', 'latro', 'lupus'], Africa: ['numida', 'latro'], Aegyptus: ['latro', 'numida'], Graecia: ['latro', 'sagittarius', 'lupus'],
  Creta: ['sagittarius', 'pirata'], Asia: ['latro', 'pirata'], Thracia: ['latro', 'lupus'], Cilicia: ['pirata', 'latro'], Syria: ['latro', 'numida'], Iudaea: ['latro'], Pontus: ['ponticus', 'lupus'],
};

// bandit camps with a strongbox: [lat, lon, level, reward item or null, denarii]
export const CAMPS = [
  [43.6, 11.4, 2, 'parma', 60], [41.25, 15.5, 3, null, 110], [38.6, 16.3, 4, 'montefortino', 90], [37.6, 14.0, 5, null, 160],
  [44.3, 5.9, 5, 'agen', 100], [45.9, 2.2, 6, null, 200], [40.4, -1.2, 6, 'coolus', 120], [38.6, -3.4, 7, null, 240],
  [36.2, 8.6, 7, 'squamata', 150], [32.3, 20.6, 8, null, 280], [30.9, 28.2, 8, 'aspis', 180], [39.6, 21.2, 6, 'linothorax', 120],
  [41.6, 24.6, 7, null, 240], [37.6, 29.6, 8, null, 260], [35.2, 36.4, 9, null, 320], [38.9, 33.4, 9, 'scutum', 200],
];

// ---------- quests ----------
const C = 'Caesar', A = 'Antonius', Y = 'You';
export const QUESTS = [
  {
    id: 'm1', main: 1, name: 'The Die Is Cast', date: 'January, 49 BC', lvl: 1, reward: { xp: 80, den: 40 },
    steps: [
      { t: 'talk', npc: 'caesar', at: 'ravenna', obj: 'Report to Caesar in Ravenna', give: { items: ['gladius'] }, say: [
        [C, 'So you are the speculator the Thirteenth speaks of. Good. I need a rider who can keep his mouth shut.'],
        [C, 'The Senate has passed its final decree against me. Lay down my command, they say, or be named an enemy of Rome. The tribunes who spoke for me have been driven from the city.'],
        [C, 'Nine years I gave them in Gaul. If I go home as a private citizen, my enemies will have me in court within the month.'],
        [C, 'Take this sword, it is better than that dagger. Go south to the Rubicon and wait at the ford. I will come after dark.'],
      ] },
      { t: 'goto', at: 'rubico', r: 16, obj: 'Go south to the ford on the Rubicon', say: [
        ['', 'The river is narrow enough to wade. On the far bank lies Italy, where no governor may lead an army.'],
        [C, 'We can still turn back. Once we cross that little bridge, everything must be settled by the sword.'],
        [C, 'Let the die be cast.'],
        ['', 'Suetonius gives the words as "Iacta alea est". Plutarch says Caesar spoke them in Greek, quoting the playwright Menander.'],
      ] },
      { t: 'kill', at: 'rubico', off: [18, 46], lvl: 1, foes: [['latro', 3]], obj: 'Clear the bandits watching the road to Ariminum', say: [['', 'Men with clubs step out of the reeds. Civil war is good weather for robbers.']] },
      { t: 'talk', npc: 'antonius', at: 'ariminum', obj: 'Find Marcus Antonius in Ariminum', give: { horse: 1 }, say: [
        [A, 'Caesar\'s rider? You took your time. I left Rome dressed as a slave in a hired cart, so do not expect me to be cheerful.'],
        [A, 'They threatened a tribune of the plebs on the floor of the Senate. A tribune! Caesar could not have asked for a better grievance.'],
        [A, 'Ariminum opened its gates without a blow. Now we move fast, before Pompeius can gather his legions.'],
        [A, 'You will need a horse. Take the bay from the courier stable. Ride the Via Flaminia to Rome and see what is waiting for us there.'],
      ] },
    ],
  },
  {
    id: 'm2', main: 1, name: 'A City Abandoned', date: 'February to March, 49 BC', lvl: 2, reward: { xp: 160, den: 80 },
    steps: [
      { t: 'goto', at: 'roma', r: 40, obj: 'Ride the Via Flaminia to Rome', say: [
        ['', 'The Forum is half empty. Pompeius declared that anyone who stayed in Rome would be treated as Caesar\'s friend, then left with both consuls.'],
        ['', 'In their hurry they forgot the state treasury in the Temple of Saturn. Caesar will not forget it.'],
      ] },
      { t: 'talk', npc: 'cicero', at: 'capua', obj: 'Carry Caesar\'s letter to Cicero at Capua', say: [
        ['Cicero', 'From Caesar? He writes charmingly. He always has. "Stay out of it," he says, "and remain my friend."'],
        ['Cicero', 'Pompeius has the better cause and the worse plan. Caesar has no cause at all and never makes a mistake. What is an honest man to do?'],
        [Y, 'Caesar asks only that you stay neutral.'],
        ['Cicero', 'Neutral. Tell him I know whom to flee, but not whom to follow. Pompeius is marching for Brundisium and the ships. If you want to see the end of the Republic, ride the Appian Way.'],
      ] },
      { t: 'kill', at: 'brundisium', off: [-46, -40], lvl: 3, foes: [['miles', 3], ['sagittarius', 1]], obj: 'Break through Pompey\'s rearguard at Brundisium', say: [['', 'Pompeius has walled up the streets and dug pits behind him. A rearguard holds the road while the last ships load.']], after: [['', 'Too late. The transports are standing out to sea, and Caesar has no fleet to chase them.']] },
      { t: 'talk', npc: 'caesar', at: 'brundisium', obj: 'Report to Caesar in Brundisium', give: { ship: 1, items: ['hamata'] }, say: [
        [C, 'Sixty days, and all Italy is mine without a battle. Yet Pompeius still has the fleet, the East, and seven legions in Spain.'],
        [C, 'I cannot follow him without ships. So I go to Spain first, to fight an army without a general. Afterwards I will deal with the general without an army.'],
        [C, 'I have requisitioned a liburnian galley for my dispatches. She is yours. Put on a mail shirt, and sail for Massilia. Decimus Brutus commands my ships there.'],
      ] },
    ],
  },
  {
    id: 'm3', main: 1, name: 'An Army Without a General', date: 'April to August, 49 BC', lvl: 4, reward: { xp: 260, den: 140 },
    steps: [
      { t: 'talk', npc: 'decimus', at: 'massilia', off: [-70, 30], obj: 'Sail to Massilia and find Decimus Brutus', say: [
        ['Decimus', 'Dispatches from Caesar? Welcome to the siege. Massilia swore it was neutral, then let Domitius Ahenobarbus sail in and take command.'],
        ['Decimus', 'I built twelve ships at Arelate in thirty days, from green timber. They handle like barges. But my marines are picked men from the legions, and when we grapple, we win.'],
        ['Decimus', 'Their raiders sortie at dusk to burn our siege works. Help my men hold the ramp, and I will see that Caesar hears of it.'],
      ] },
      { t: 'kill', at: 'massilia', off: [-90, 10], lvl: 4, foes: [['miles', 2], ['sagittarius', 2], ['pirata', 2]], obj: 'Drive off the Massiliot raiders', after: [['Decimus', 'Well fought. Caesar is in Spain, near Ilerda. Take the Via Domitia over the Pyrenees.']] },
      { t: 'kill', at: 'ilerda', off: [40, 46], lvl: 5, foes: [['miles', 4], ['centurio', 1]], obj: 'At Ilerda, stop the Pompeian water carriers reaching the river', say: [['', 'Caesar has dug a trench between the enemy and the river Sicoris. Thirst will do what swords need not. A column tries to force its way to the water.']] },
      { t: 'talk', npc: 'caesar', at: 'ilerda', obj: 'Report to Caesar at Ilerda', give: { items: ['coolus'] }, say: [
        [C, 'Afranius and Petreius have surrendered. Five legions, and I did not have to slaughter them.'],
        [C, 'I have sent every man home unharmed. Let Pompeius\' friends call it weakness. Mercy is a new way of conquering.'],
        [C, 'Spain is settled. Now for the general. Sail to Epirus, to my camp south of Dyrrachium. Antonius is bringing the rest of the army across the Adriatic.'],
      ] },
    ],
  },
  {
    id: 'm4', main: 1, name: 'A General Without an Army', date: 'January to August, 48 BC', lvl: 6, reward: { xp: 420, den: 220 },
    steps: [
      { t: 'talk', npc: 'antonius', at: 'castra', obj: 'Sail to Epirus and find Antonius at Caesar\'s camp', say: [
        [A, 'You made it past Bibulus\' blockade? He sleeps on his flagship in midwinter to keep us out. The man hates Caesar more than he loves living.'],
        [A, 'We have Pompeius penned against the sea with seventeen miles of earthworks. It is madness. He has more men inside than we have outside, and his fleet feeds him while we eat roots.'],
        [A, 'Two Gallic deserters have shown him the unfinished stretch by the shore. He is coming through tonight. Get to the south wall.'],
      ] },
      { t: 'kill', at: 'castra', off: [-36, 50], lvl: 6, foes: [['miles', 4], ['sagittarius', 2], ['centurio', 1]], obj: 'Hold the breach in the siege line', after: [
        ['', 'You hold your stretch of wall, but the line breaks elsewhere and the army runs. Nearly a thousand men and thirty-two standards are lost.'],
        [C, 'Today the victory would have been theirs, if they had a general who knew how to win.'],
        [C, 'We march inland to Thessaly. Pompeius will follow. His senators will give him no peace until he fights.'],
      ] },
      { t: 'talk', npc: 'crastinus', at: 'pharsalus', obj: 'Ride to the plain of Pharsalus', say: [
        ['Crastinus', 'Gaius Crastinus, lately first spear of the Tenth. I came back as a volunteer for this one battle.'],
        ['Crastinus', 'Pompeius has twice our infantry and seven times our horse. Labienus leads the cavalry. He was Caesar\'s right hand in Gaul, and now he has sworn not to return to camp except as victor.'],
        ['Crastinus', 'Caesar has hidden a fourth line behind our right, with orders to thrust their javelins at the riders\' faces. Follow me. I shall earn the general\'s thanks today, alive or dead.'],
      ] },
      { t: 'kill', at: 'pharsalus', off: [50, -44], lvl: 7, foes: [['miles', 5], ['sagittarius', 2], ['centurio', 2]], obj: 'Fight in the front line at Pharsalus', after: [
        ['', 'The cavalry breaks against the hidden cohorts and the whole Pompeian left folds. Crastinus dies in the first charge, a sword through the mouth. Caesar orders him a hero\'s burial.'],
      ] },
      { t: 'talk', npc: 'caesar', at: 'pharsalus', obj: 'Find Caesar in the captured camp', give: { items: ['scutum13'] }, say: [
        [C, 'Look at their tents. Tables laid with silver, floors of fresh turf, ivy on the poles. They were dividing my offices among themselves last night.'],
        [C, 'They would have it so. After all I had done, I, Gaius Caesar, would have been condemned if I had not asked my army for help.'],
        [C, 'Pompeius rode off before the camp fell. He will run to Egypt, where the boy king owes him a throne. Take your ship to Alexandria. I follow with the galleys.'],
      ] },
    ],
  },
  {
    id: 'm5', main: 1, name: 'The Nile', date: 'October, 48 BC to March, 47 BC', lvl: 8, reward: { xp: 600, den: 300 },
    steps: [
      { t: 'talk', npc: 'caesar', at: 'alexandria', off: [20, -10], obj: 'Sail to Alexandria', say: [
        ['', 'You arrive to find Caesar already in the royal quarter, his face grey.'],
        [C, 'They brought me his head. Pompeius Magnus, three times a triumphator, stabbed in a rowing boat off Pelusium by a Roman who once served under him. They thought it would please me.'],
        [C, 'I turned away. I kept only his signet ring, a lion holding a sword. He was my enemy. He was also my son-in-law, and a Roman.'],
        [C, 'The boy Ptolemy and his sister are at war over the throne. I mean to settle it, and to collect what their father owed me. Go to the harbour. A Sicilian named Apollodorus has a delivery for the palace.'],
      ] },
      { t: 'talk', npc: 'apollodorus', at: 'alexandria', off: [-52, 34], obj: 'Meet Apollodorus by the harbour at Alexandria', say: [
        ['Apollodorus', 'Quietly, Roman. The king\'s soldiers watch every gate, and my mistress has been shut out of her own city.'],
        ['Apollodorus', 'So she comes in as baggage. A sack for bedclothes, tied with a strap, and me to carry it over my shoulder past the guards.'],
        ['', 'Plutarch tells the story this way, with a bedding sack. The rolled carpet is a later invention.'],
      ] },
      { t: 'talk', npc: 'cleopatra', at: 'alexandria', off: [26, -18], obj: 'Go to the palace', say: [
        ['Cleopatra', 'So this is how Caesar\'s messengers look. Stand up straight. I have just been carried through my own gate like laundry, and I still have better posture.'],
        ['Cleopatra', 'I am the first of my house in three hundred years to learn the Egyptian tongue. I speak nine languages. My brother speaks through his eunuch.'],
        ['Cleopatra', 'That eunuch, Pothinus, has sent for the army. Twenty thousand men under Achillas, many of them Roman soldiers who stayed here and forgot they were Roman. They will be at the palace by nightfall.'],
      ] },
      { t: 'kill', at: 'alexandria', off: [-18, 44], lvl: 8, foes: [['aegyptius', 5], ['sagittarius', 2]], obj: 'Defend the palace quarter', say: [['', 'Caesar orders the ships in the harbour burned to keep them from Achillas. The fire leaps to the dockside warehouses, and scrolls stored for the Library burn with them.']] },
      { t: 'kill', at: 'alexandria', off: [-78, -30], lvl: 9, foes: [['aegyptius', 4], ['achillas', 1]], obj: 'Seize the causeway to the Pharos', say: [['', 'Who holds the lighthouse island holds the harbour mouth. The fight for the causeway goes badly, and Caesar has to swim for it, holding his papers above the water in one hand.']] },
      { t: 'talk', npc: 'caesar', at: 'alexandria', off: [20, -10], obj: 'Return to Caesar', give: { items: ['squamata'] }, say: [
        [C, 'The relief army has come through Pelusium. The king\'s forces broke on the Nile, and the boy drowned in his golden armour when his boat capsized.'],
        [C, 'Cleopatra reigns, with her youngest brother beside her for form\'s sake. Egypt will pay its debts.'],
        [C, 'I have stayed too long. Pharnaces of Pontus has overrun Asia Minor, and the Pompeians are gathering in Africa. Meet me at Tarsus in Cilicia.'],
      ] },
    ],
  },
  {
    id: 'm6', main: 1, name: 'Veni, Vidi, Vici', date: 'August, 47 BC to April, 46 BC', lvl: 10, reward: { xp: 800, den: 380 },
    steps: [
      { t: 'goto', at: 'tarsus', r: 34, obj: 'Sail to Tarsus in Cilicia', say: [['', 'Caesar has already held his assembly here and marched north. Pharnaces, son of the great Mithridates, is camped at Zela in Pontus.']] },
      { t: 'kill', at: 'zela', off: [44, 40], lvl: 10, foes: [['ponticus', 6], ['sagittarius', 2]], obj: 'Ride north to Zela and join the battle', say: [['', 'Pharnaces does something no one expects. He charges uphill at the Roman camp while the legions are still digging.']] },
      { t: 'talk', npc: 'caesar', at: 'zela', obj: 'Speak with Caesar at Zela', say: [
        [C, 'Four hours. Five days after I arrived. Pompeius made his name beating such armies.'],
        [C, 'Take a letter to my friend Matius in Rome. It need only say three words: Veni, vidi, vici.'],
        [C, 'But first, Africa. Scipio and Cato have ten legions there, and King Juba brings elephants. Meet my fleet at Thapsus.'],
      ] },
      { t: 'kill', at: 'thapsus', off: [-44, -42], lvl: 11, foes: [['numida', 4], ['miles', 4], ['centurio', 1]], obj: 'Sail to Thapsus and fight in the line', say: [['', 'The veterans do not wait for orders. A trumpeter of the Tenth sounds the charge on his own, and Caesar gives the word "Good fortune" and rides with them. Slingers turn the elephants back on their own army.']] },
      { t: 'goto', at: 'utica', r: 34, obj: 'Ride to Utica', say: [
        ['', 'The town is in mourning. Cato read Plato\'s dialogue on the soul twice through, asked for his sword, and died by his own hand rather than owe his life to Caesar.'],
        [C, 'Cato, I grudge you your death, as you grudged me the chance to spare you.'],
        ['', 'The Republic\'s last armies gather in Spain under Pompey\'s sons and Labienus.'],
      ] },
    ],
  },
  {
    id: 'm7', main: 1, name: 'For His Life', date: 'March, 45 BC', lvl: 12, reward: { xp: 1000, den: 450, items: ['decima'] },
    steps: [
      { t: 'talk', npc: 'centurion', at: 'munda', obj: 'Travel to Caesar\'s camp before Munda', say: [
        ['Centurion', 'Thirteen legions on that ridge under young Gnaeus Pompeius, and they hold the high ground. We must attack uphill.'],
        ['Centurion', 'Labienus is with them. He knows every trick Caesar has, because he helped invent half of them.'],
        ['Centurion', 'The password today is "Venus". Stay close to the Tenth on the right.'],
      ] },
      { t: 'kill', at: 'munda', off: [46, 44], lvl: 12, foes: [['miles', 5], ['iber', 3], ['centurio', 2]], obj: 'Fight up the slope at Munda', say: [['', 'The line wavers. Caesar snatches a shield, runs out ahead of the standards and shouts at his men: "Are you going to hand me over to these boys?"']] },
      { t: 'kill', at: 'munda', off: [70, 70], lvl: 13, foes: [['labienus', 1], ['miles', 3]], obj: 'Face Titus Labienus', say: [['Labienus', 'Caesar\'s errand boy. I conquered Gaul while he wrote the book about it. Come, then.']], after: [
        ['', 'Labienus falls, and thirty thousand with him. Caesar grants his old lieutenant an honourable burial.'],
        [C, 'I have often fought for victory. Today, for the first time, I fought for my life.'],
        [C, 'It is finished. Come to Rome. There is a great deal to put in order, and not much time.'],
      ] },
    ],
  },
  {
    id: 'm8', main: 1, name: 'The Ides of March', date: 'March, 44 BC', lvl: 13, reward: { xp: 1500, den: 600, items: ['musculata', 'attic'] },
    steps: [
      { t: 'talk', npc: 'caesar', at: 'roma', off: [6, 14], obj: 'Return to Rome and find Caesar in the Forum', say: [
        [C, 'There you are. I have reformed the calendar, did you hear? Three hundred and sixty-five days, and a leap day every fourth year. Sosigenes of Alexandria did the sums.'],
        [C, 'They have named me dictator for life. They vote me honours faster than I can refuse them, and resent me for each one.'],
        [C, 'In three days I leave for Parthia, to bring back the eagles Crassus lost. I have dismissed my Spanish bodyguard. It is better to die once than to live always in fear of death.'],
        [C, 'Go and rest. The Senate meets on the Ides in Pompeius\' theatre.'],
      ] },
      { t: 'talk', npc: 'artemidorus', at: 'roma', off: [-30, -26], obj: 'A Greek teacher is asking for you near the Forum', say: [
        ['Artemidorus', 'You are Caesar\'s man? Thank the gods. I teach Greek in the house of Brutus, and I hear things.'],
        ['Artemidorus', 'There are sixty of them. Cassius, Casca, Trebonius, Marcus Brutus. And Decimus Brutus, who dines at Caesar\'s table and is named in his will.'],
        ['Artemidorus', 'I have written it all in this scroll. He must read it himself, at once, alone. Go to his house before he leaves for the Senate.'],
      ] },
      { t: 'talk', npc: 'calpurnia', at: 'roma', off: [34, 20], obj: 'Hurry to Caesar\'s house', say: [
        ['Calpurnia', 'You have missed him. I begged him to stay. I dreamed I held him in my arms, covered in wounds, and the soothsayer found no heart in the sacrifice.'],
        ['Calpurnia', 'He had agreed to send word that he was unwell. Then Decimus Brutus came, laughing, and asked what the Senate would say if told to come back when Calpurnia has better dreams.'],
        ['Calpurnia', 'Decimus led him out by the hand. Run. The Senate meets at the theatre of Pompeius.'],
      ] },
      { t: 'goto', at: 'roma', off: [-44, 30], r: 12, obj: 'Run to the Theatre of Pompey', say: [
        ['', 'You push through the crowd as the litter sets down. Artemidorus is there before you and presses the scroll into Caesar\'s own hand.'],
        ['', 'Caesar tries several times to read it, but petitioners crowd around him. He is still holding it, unread, when he goes in.'],
        ['', 'Trebonius keeps Antonius talking at the door. Inside, Tillius Cimber pulls the toga from Caesar\'s shoulder. That is the signal.'],
        ['', 'Twenty-three wounds. He falls at the foot of Pompey\'s statue, having drawn his toga over his face.'],
      ] },
      { t: 'kill', at: 'roma', off: [-30, 44], lvl: 14, foes: [['gladiator', 6]], obj: 'Fight your way clear of Decimus Brutus\' gladiators', say: [['', 'The killers march to the Capitol behind a troop of gladiators Decimus had waiting near the theatre. They take you for one of Antonius\' men.']] },
      { t: 'talk', npc: 'antonius', at: 'roma', off: [6, 14], obj: 'Find Antonius in the Forum', say: [
        [A, 'I read them his will. Three hundred sesterces to every citizen, and his gardens across the Tiber to the people. Then I held up the toga and showed them the holes.'],
        [A, 'They are burning his body in the Forum itself, on a pyre of benches. Brutus and Cassius will not sleep in Rome tonight.'],
        [A, 'One more thing was in that will. He adopted his sister\'s grandson and left him three quarters of everything. A boy of eighteen, studying in Apollonia. He is said to have landed near Brundisium.'],
      ] },
      { t: 'talk', npc: 'octavius', at: 'brundisium', off: [12, 16], obj: 'Meet Caesar\'s heir at Brundisium', say: [
        ['Octavius', 'You served my great-uncle from the Rubicon to the end. Then you know what was done to him, and by whom.'],
        ['Octavius', 'My mother writes that I should refuse the inheritance. My stepfather says the name will get me killed. The legions here have already hailed me by it.'],
        ['Octavius', 'I will take the name, and the debt that comes with it. From today I am Gaius Iulius Caesar.'],
        ['', 'Thirteen years of war lie ahead. When they end, the young man will be Augustus, and the Republic you were born in will be a memory.'],
        ['', 'Your part in the story is told. The whole Roman world is still yours to explore.'],
      ] },
    ],
  },
  // ---------------- side quests ----------------
  {
    id: 's_arena', name: 'Blood and Sand', lvl: 3, giver: { npc: 'lanista', at: 'capua', off: [30, -24] }, reward: { xp: 220, den: 150, items: ['sica'] },
    steps: [
      { t: 'talk', npc: 'lanista', at: 'capua', off: [30, -24], obj: 'Speak with the lanista in Capua', say: [
        ['Scaurus', 'This school belongs to Caesar himself. Five thousand shields in the armoury, they say in Rome, as if it were a private army.'],
        ['Scaurus', 'With the master at war, the crowds are thin and my men are bored. You have a soldier\'s shoulders. Three bouts on the sand, wooden rules, real blades. Interested?'],
        ['', 'Most gladiator fights did not end in death. A trained man was far too expensive to waste.'],
      ] },
      { t: 'kill', at: 'capua', off: [44, -34], lvl: 3, foes: [['gladiator', 1]], obj: 'First bout: defeat the Thracian' },
      { t: 'kill', at: 'capua', off: [44, -34], lvl: 4, foes: [['gladiator', 2]], obj: 'Second bout: defeat the pair' },
      { t: 'kill', at: 'capua', off: [44, -34], lvl: 5, foes: [['gladiator', 3]], obj: 'Final bout: defeat three at once' },
      { t: 'talk', npc: 'lanista', at: 'capua', off: [30, -24], obj: 'Collect your winnings from Scaurus', say: [['Scaurus', 'The crowd will talk of that for a month. Your purse, and a Thracian\'s sica to remember us by.']] },
    ],
  },
  {
    id: 's_grain', name: 'The Grain Fleet', lvl: 2, giver: { npc: 'frumentarius', at: 'ostia', off: [-10, 14] }, reward: { xp: 150, den: 120 },
    steps: [
      { t: 'talk', npc: 'frumentarius', at: 'ostia', off: [-10, 14], obj: 'Speak with the grain factor in Ostia', say: [
        ['Quintus', 'Rome eats two hundred thousand tons of wheat a year, and every grain of it comes through this harbour.'],
        ['Quintus', 'Pompeius swept the pirates off the sea in three months, eighteen years ago. Now he has taken the fleet east, and the rats are back. A crew has beached down the coast with one of my barges.'],
      ] },
      { t: 'kill', stealth: 1, at: 'ostia', off: [20, 80], lvl: 2, foes: [['pirata', 4]], obj: 'Deal with the pirates on the shore south of Ostia' },
      { t: 'talk', npc: 'frumentarius', at: 'ostia', off: [-10, 14], obj: 'Return to Quintus', say: [['Quintus', 'The barge is back and the price of bread will hold another week. Rome has rioted over less. Here is your share.']] },
    ],
  },
  {
    id: 's_appia', name: 'Robbers on the Queen of Roads', lvl: 3, giver: { npc: 'viator', at: 'brundisium', off: [-20, -22] }, reward: { xp: 200, den: 130, items: ['scutum'] },
    steps: [
      { t: 'talk', npc: 'viator', at: 'brundisium', off: [-20, -22], obj: 'Speak with the carter in Brundisium', say: [
        ['Publius', 'Three hundred and sixty miles of fitted stone from here to Rome, and Appius Claudius built the first of it two and a half centuries ago. They call it the queen of roads.'],
        ['Publius', 'A queen with fleas. Deserters from both armies have made a camp in the hills past the fourth waystation and they stop every cart. They took my load, and a good legion shield I was carrying for my brother.'],
      ] },
      { t: 'kill', stealth: 1, at: [40.72, 16.55], lvl: 3, foes: [['latro', 4], ['miles', 1]], obj: 'Clear the deserters\' camp beside the Via Appia' },
      { t: 'talk', npc: 'viator', at: 'brundisium', off: [-20, -22], obj: 'Return to Publius', say: [['Publius', 'My brother is dead at Dyrrachium, I heard this morning. Keep the shield. It should belong to someone who will use it.']] },
    ],
  },
  {
    id: 's_tomb', name: 'The Sphere and the Cylinder', lvl: 4, giver: { npc: 'scholar', at: 'syracusae', off: [-16, 20] }, reward: { xp: 260, den: 100 },
    steps: [
      { t: 'talk', npc: 'scholar', at: 'syracusae', off: [-16, 20], obj: 'Speak with the geometer in Syracuse', say: [
        ['Demetrios', 'Archimedes held off the Roman fleet for two years with his machines. When the city fell, a soldier cut him down over his diagrams.'],
        ['Demetrios', 'He asked for one thing on his tomb: a sphere inside a cylinder, for he had proved the one is exactly two thirds of the other.'],
        ['Demetrios', 'Cicero found the grave thirty years ago, choked with brambles, when our own magistrates denied it existed. They have let it vanish again. It lies outside the gate toward Agrigentum. Will you look?'],
      ] },
      { t: 'find', at: 'syracusae', off: [-84, -40], obj: 'Search the thickets west of Syracuse for the tomb', say: [['', 'A small column rises above the thorns. On top, worn but clear: a sphere set inside a cylinder, and half a line of verse.']] },
      { t: 'talk', npc: 'scholar', at: 'syracusae', off: [-16, 20], obj: 'Tell Demetrios what you found', say: [['Demetrios', 'Then it stands. The greatest mind of the Greeks, and a Roman soldier has to show us where he lies. I will have the brambles cut. Thank you.']] },
    ],
  },
  {
    id: 's_carthage', name: 'Delenda Est', lvl: 6, giver: { npc: 'antiquarian', at: 'utica', off: [16, 18] }, reward: { xp: 320, den: 200 },
    steps: [
      { t: 'talk', npc: 'antiquarian', at: 'utica', off: [16, 18], obj: 'Speak with the old settler in Utica', say: [
        ['Sittius', 'My grandfather watched Carthage burn for seventeen days. Old Cato ended every speech with it: Carthage must be destroyed. Well, it was.'],
        ['Sittius', 'The tale that the fields were sown with salt is nonsense, by the way. The land was parcelled out and farmed. I farm some of it.'],
        ['Sittius', 'Grave robbers are digging in the old sanctuary for Punic gold. There is a carved stone there with the sign of Tanit that I would see kept safe. Bring it to me.'],
      ] },
      { t: 'kill', stealth: 1, at: 'carthago', off: [10, 10], lvl: 6, foes: [['latro', 3], ['numida', 2]], obj: 'Drive the grave robbers out of the ruins of Carthage' },
      { t: 'find', at: 'carthago', off: [-14, -8], obj: 'Recover the stele of Tanit from the sanctuary', say: [['', 'A limestone slab with a triangle, a bar and a circle: the goddess of a city that once ruled the western sea.']] },
      { t: 'talk', npc: 'antiquarian', at: 'utica', off: [16, 18], obj: 'Bring the stele to Sittius', say: [['Sittius', 'Caesar means to plant a colony there, I hear. Roman houses on Punic foundations. Someone should remember what lay underneath.']] },
    ],
  },
  {
    id: 's_vercingetorix', name: 'The King in the Dark', lvl: 5, giver: { npc: 'brennos', at: 'bibracte', off: [10, 14] }, reward: { xp: 300, den: 120 },
    steps: [
      { t: 'talk', npc: 'brennos', at: 'bibracte', off: [10, 14], obj: 'Speak with the Aeduan elder at Bibracte', say: [
        ['Brennos', 'In this town all Gaul chose Vercingetorix of the Arverni to lead it. One summer later he rode out of Alesia in his best armour, circled Caesar\'s chair, and threw down his weapons at his feet.'],
        ['Brennos', 'That was three years ago. He sits in a pit under your Capitol, waiting to be walked in Caesar\'s triumph and strangled after.'],
        ['Brennos', 'We fought beside him, and we fought against him. Carry this torc to his keeper. Let him know that Gaul has not forgotten his name.'],
      ] },
      { t: 'talk', npc: 'jailer', at: 'roma', off: [-16, -40], obj: 'Take the torc to the Tullianum prison in Rome', say: [
        ['Keeper', 'The Gaul? Twelve feet down, through a hole in the floor. Jugurtha of Numidia starved in the same cell.'],
        ['Keeper', 'He does not speak. He will be kept until Caesar has time for his triumph. I will lower the gold down to him. I promise nothing more.'],
        ['', 'Vercingetorix was held for six years and executed after Caesar\'s triumph in 46 BC.'],
      ] },
    ],
  },
  {
    id: 's_rhodes', name: 'Scrolls for Rhodes', lvl: 7, giver: { npc: 'cratippus', at: 'athenae', off: [-14, 22] }, reward: { xp: 380, den: 220 },
    steps: [
      { t: 'talk', npc: 'cratippus', at: 'athenae', off: [-14, 22], obj: 'Speak with the philosopher in Athens', say: [
        ['Cratippus', 'A Roman who listens! Usually they come to Athens to be seen listening. Cicero wants to send me his son, and I fear the boy prefers wine to Aristotle.'],
        ['Cratippus', 'I have copies of my lectures promised to the school at Rhodes. No captain will carry them while two Roman fleets hunt each other. You have a ship.'],
      ] },
      { t: 'talk', npc: 'rhetor', at: 'rhodus', off: [14, 16], obj: 'Deliver the scrolls to the school of rhetoric at Rhodes', say: [
        ['Menekles', 'From Cratippus? Excellent. Your Caesar studied in this very colonnade under Apollonius Molon. On the way here he was captured by pirates, joked that he would crucify them, and later did.'],
        ['Menekles', 'You will have seen our Colossus on the way in. A hundred feet of bronze, and it stood only fifty-four years before the earthquake. The oracle forbade us to raise it again, so there it lies. Few men can get their arms around the thumb.'],
      ] },
    ],
  },
  {
    id: 's_library', name: 'What the Fire Spared', lvl: 9, req: 'm5', giver: { npc: 'librarian', at: 'alexandria', off: [40, 26] }, reward: { xp: 500, den: 260, items: ['aspis'] },
    steps: [
      { t: 'talk', npc: 'librarian', at: 'alexandria', off: [40, 26], obj: 'Speak with the scholar near the Library', say: [
        ['Sosigenes', 'Every ship that enters this harbour is searched for books. We copy them, keep the originals, and return the copies. That is how one builds the greatest library in the world.'],
        ['Sosigenes', 'The fire your general lit has burned the dockside stores. Some say forty thousand scrolls were in them, waiting to be shelved. A few crates were dragged clear. Find them before the looters do.'],
      ] },
      { t: 'find', at: 'alexandria', off: [-62, 52], obj: 'Search the burned warehouses for scroll crates', say: [['', 'A cedar crate, scorched on one side. Inside, wound tight in linen: works on the motion of the stars.']] },
      { t: 'kill', stealth: 1, at: 'alexandria', off: [-84, 30], lvl: 9, foes: [['latro', 4], ['aegyptius', 1]], obj: 'Stop the looters at the next warehouse' },
      { t: 'talk', npc: 'librarian', at: 'alexandria', off: [40, 26], obj: 'Return to Sosigenes', say: [['Sosigenes', 'Astronomy. Then I can finish the sums I owe your Caesar: a year of three hundred and sixty-five days and a quarter. Rome\'s calendar has drifted three months out of step with the sun.']] },
    ],
  },
  {
    id: 's_gades', name: 'The Statue of Alexander', lvl: 10, giver: { npc: 'priest', at: 'gades', off: [-12, 18] }, reward: { xp: 520, den: 240, items: ['falcata'] },
    steps: [
      { t: 'talk', npc: 'priest', at: 'gades', off: [-12, 18], obj: 'Speak with the priest of Hercules at Gades', say: [
        ['Priest', 'This temple is older than Rome. The Tyrians built it for Melqart, whom you call Hercules, when they first sailed through the Pillars.'],
        ['Priest', 'Twenty years ago a young quaestor stood before our statue of Alexander and wept. Alexander had conquered the world at his age, he said, and he had done nothing. His name was Caesar.'],
        ['Priest', 'Men who call themselves Pompeians have robbed the offerings and fled up the Corduba road. The god will reward whoever returns them.'],
      ] },
      { t: 'kill', stealth: 1, at: [36.95, -5.75], lvl: 10, foes: [['iber', 4], ['miles', 2]], obj: 'Catch the temple robbers on the road to Corduba' },
      { t: 'talk', npc: 'priest', at: 'gades', off: [-12, 18], obj: 'Return the offerings to the temple', say: [['Priest', 'The god is satisfied. Take this blade from the armoury, Iberian steel, buried in the ground for two years so that only the best of it survives.']] },
    ],
  },
  {
    id: 's_pyramids', name: 'Older Than Rome', lvl: 8, giver: { npc: 'guide', at: 'memphis', off: [12, 16] }, reward: { xp: 400, den: 150 },
    steps: [
      { t: 'talk', npc: 'guide', at: 'memphis', off: [12, 16], obj: 'Speak with the guide in Memphis', say: [
        ['Petosiris', 'Greek visitors have been coming to see them for four hundred years, and scratching their names on the stones. Herodotus was told a hundred thousand men built the great one.'],
        ['Petosiris', 'When your city was a few huts on a hill, they were already two thousand years old. Go and stand beneath them. Then tell me again about Roman greatness.'],
      ] },
      { t: 'goto', at: 'pyramides', r: 30, obj: 'Travel to the pyramids', say: [['', 'The casing stones still gleam white in the sun. The oldest of these tombs was built about 2560 BC, further in time from Caesar than Caesar is from the modern world.']] },
    ],
  },
];
