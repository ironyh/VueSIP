/**
 * AI Triage Question Bank
 * Maps detected key terms to suggested triage questions in Swedish
 *
 * Part of experiment: NURR-SCRIBE-001
 *
 * Coverage:
 * - Cardiovascular, Respiratory, Pain, General, GI, Skin
 * - Musculoskeletal, Mental Health, ENT, Urinary, Neurological
 * - Allergic, Pediatric
 */

export const triageQuestionBank = {
  // ============ CARDIOVASCULAR ============
  bröstsmärta: [
    'Hur länge har smärtan pågått?',
    'Var exakt känns smärtan?',
    'Strålar smärtan någonstans?',
    'Har du ont i vila eller vid ansträngning?',
    'Har du kallsvettning eller illamående?',
  ],
  bröstet: [
    'Hur länge har det pågått?',
    'Är det molnande eller skarpt?',
    'Strålar det ut i arm eller käke?',
  ],
  hjärtklappning: [
    'Hur ofta uppträder det?',
    'Slår hjärtat oregelbundet?',
    'Har du yrsel eller illamående?',
  ],
  hjärtinfarkt: [
    'Har du bröstsmärta?',
    'Strålar det till arm, käke eller rygg?',
    'Har du andnöd eller kallsvettning?',
    'Hur länge har symtomen pågått?',
  ],
  blodtryck: [
    'Vet du ditt blodtryck?',
    'Tar du blodtrycksmedicin?',
    'Har du tagit ditt blodtryck idag?',
  ],

  // ============ RESPIRATORY ============
  andningssvårighet: [
    'Har du svårt att andas i vila?',
    'Hur länge har det pågått?',
    'Har du pipande andning?',
    'Röker du eller har du rökt?',
  ],
  andnöd: [
    'När uppstod andnöden?',
    'Har du haft detta förut?',
    'Har du pipande eller väsande andning?',
    'Har du ont i bröstet när du andas?',
  ],
  hosta: [
    'Hur länge har du hostat?',
    'Är hostan torr eller med slem?',
    'Har du feber?',
    'Är slemmet gulfärgat eller blodigt?',
  ],
  astma: [
    'Använder du inhalator?',
    'Har du använt den idag?',
    'Vad utlöser astman hos dig?',
    'Har du haft fler attacker än vanligt?',
  ],
  lunginflammation: [
    'Hur länge har du varit sjuk?',
    'Har du feber och hosta?',
    'Har du ont i bröstet vid djupa andetag?',
    'Har du tagit temperatur?',
  ],

  // ============ PAIN ============
  smärta: [
    'Var sitter smärtan?',
    'Hur stark är smärtan (1-10)?',
    'Hur länge har den pågått?',
    'Vad förvärrar eller lindrar?',
  ],
  buksmärta: [
    'Var i magen känns det?',
    'Har du illamående eller kräkningar?',
    'Har du haft detta tidigare?',
    'Har du feber?',
  ],
  huvudvärk: [
    'Hur länge har det pågått?',
    'Var i huvudet sitter det?',
    'Har du feber eller nackstelhet?',
    'Är det den värsta huvudvärken du haft?',
  ],
  migrän: [
    'Hur länge brukar attacken pågå?',
    'Har du ljuskänslighet eller illamående?',
    'Har du haft detta förut?',
    'Vad brukar hjälpa?',
  ],
  ryggvärk: [
    'Hur länge har ryggvärken pågått?',
    'Strålar smärtan ut i benet?',
    'Har du domningar eller stickningar?',
    'Vad lindrar eller förvärrar?',
  ],
  nackvärk: [
    'Hur länge har det pågått?',
    'Har du huvudvärk eller yrsel?',
    'Har du stelhet i nacken?',
    'Kan du röra huvudet fritt?',
  ],
  ledvärk: [
    'Vilken eller vilka leder är drabbade?',
    'Är leden svullen eller röd?',
    'Har du morgonstelhet?',
    'Hur länge har det pågått?',
  ],

  // ============ GENERAL / VITAL SIGNS ============
  feber: [
    'Hur hög feber har du haft?',
    'Hur mätte du temperaturen?',
    'Har du tagit någon medicin?',
    'Har du frossa eller svettningar?',
  ],
  yrsel: [
    'Känns det som att du snurrar?',
    'Har du fallit eller nästan ramlat?',
    'Har du hjärtproblem?',
    'Ligga/sitta/stå — förvärras det vid lägesändring?',
    'Snurrar rummet eller känns det som du ska svimma?',
    'Har du illamående?',
    'Har du tagit några mediciner?',
  ],
  trötthet: [
    'Hur länge har du känt dig trött?',
    'Har du sovit ordentligt?',
    'Har du andra symtom?',
    'Har du gått ner i vikt utan anledning?',
  ],
  frossa: ['Har du feber?', 'Har du skakigt?', 'Hur länge har det pågått?'],
  'nattlig svettning': [
    'Har du feber på dagarna också?',
    'Har du gått ner i vikt?',
    'Hur länge har det pågått?',
  ],

  // ============ GASTROINTESTINAL ============
  illamående: ['Har du kräkts?', 'Har du diarré?', 'Har du ont i magen?'],
  kräkning: [
    'Hur många gånger har du kräkts?',
    'Är det blod i kräkningarna?',
    'Har du ont i magen?',
    'Kan du behålla vätska?',
  ],
  diarré: [
    'Hur många gånger per dag?',
    'Har du blod i avföringen?',
    'Har du feber?',
    'Hur länge har det pågått?',
  ],
  förstoppning: [
    'Hur länge sedan var sista avföringen?',
    'Har du ont i magen?',
    'Är avföringen hård och knölig?',
  ],
  'blod i avföringen': [
    'Är blodet på ytan eller blandat?',
    'Har du hemorrojder?',
    'Har du ont i magen?',
    'Hur mycket blod?',
  ],
  uppkörd: [
    'Hur länge har du känt dig uppkörd?',
    'Har du halsbränna eller sura uppstötningar?',
    'Har du provat syrabindande medicin?',
  ],

  // ============ SKIN ============
  utslag: ['Var sitter utslagen?', 'Kliar det?', 'Har du tagit något nytt?', 'Har du feber?'],
  klåda: [
    'Var kliar det mest?',
    'Har du sett utslag?',
    'Har du använt något nytt tvättmedel eller soap?',
  ],
  nässelfeber: [
    'Var sitter det?',
    'Kliar det?',
    'Hur länge har det funnits?',
    'Har du svullnad i ansiktet eller halsen?',
  ],
  svullnad: [
    'Var är det svullet?',
    'Är det nyoppkommet?',
    'Är huden varm eller rodnad över svullnaden?',
    'Tryck: försvinner svullnaden när du trycker?',
  ],

  // ============ ALLERGIC ============
  'allergisk reaktion': [
    'Har du andningsbesvär?',
    'Har du svullnad i halsen eller tungan?',
    'Har du EpiPen?',
    'Vad är du allergisk mot?',
  ],
  anafylaxi: [
    'Har du svårt att andas?',
    'Har du svullnad i halsen?',
    'Har du EpiPen?',
    'RING 112 OM DET ÄR AKUT!',
  ],
  läkemedelsreaktion: [
    'Vilken medicin tror du det är?',
    'Hur länge har du tagit medicinen?',
    'Har du utslag eller svullnad?',
  ],

  // ============ MEDICATION ============
  medicin: ['Vilken medicin tar du?', 'Hur länge har du tagit den?', 'Har du tagit för mycket?'],
  biverkning: [
    'Vilken medicin tror du ger biverkningen?',
    'Vilka symtom har du?',
    'Hur länge har det pågått?',
  ],
  läkemedel: [
    'Vilka läkemedel tar du regelbundet?',
    'Har du tagit något nytt den senaste tiden?',
    'Får du några biverkningar av dina mediciner?',
  ],

  // ============ ENT ============
  halsont: [
    'Har du feber?',
    'Har du svårt att svälja?',
    'Har du häsyn?',
    'Hur länge har det pågått?',
  ],
  öronvärk: [
    'Hur länge har det pågått?',
    'Har du flytning från örat?',
    'Har du feber?',
    'Har du haft detta förut?',
  ],
  öronont: ['Hur länge har det pågått?', 'Har du flytning från örat?', 'Har du feber?'],
  tinnitus: [
    'Hur länge har du haft öronsus?',
    'Är det i ett eller båda öronen?',
    'Har du haft detta förut?',
  ],
  hörselnedsättning: [
    'Hur länge har du märkt försämrad hörsel?',
    'Är det ett eller båda öronen?',
    'Har du haft öronvärk eller infektion?',
  ],
  sinusit: [
    'Har du ont i pannan eller kinderna?',
    'Har du täppt i näsan?',
    'Har du feber?',
    'Hur länge har det pågått?',
  ],
  näsblod: [
    'Hur länge har det blött?',
    'Slutar det när du trycker?',
    'Tar du blodförtunnande medicin?',
  ],
  rösta: ['Hur länge har du varit hes?', 'Har du ont i halsen?', 'Har du feber?', 'Röker du?'],

  // ============ URINARY ============
  urintrering: [
    'Har du smärta eller brännande vid urinering?',
    'Hur ofta behöver du kissa?',
    'Har du blod i urinen?',
    'Har du feber?',
  ],
  blåskatarr: [
    'Har du smärta eller brännande vid urinering?',
    'Har du feber eller ryggsmärta?',
    'Har du blod i urinen?',
  ],
  urinvägsinfektion: [
    'Har du smärta eller brännande vid urinering?',
    'Har du feber?',
    'Har du ont i nedre magen?',
    'Hur länge har du haft besvär?',
  ],
  'blod i urinen': [
    'Ser du synligt blod eller är det upptäckt vid prov?',
    'Har du smärta vid urinering?',
    'Har du feber?',
  ],

  // ============ NEUROLOGICAL ============
  domnad: [
    'Var känns det domnat?',
    'Är det tillfälligt eller konstant?',
    'Har du haft detta förut?',
  ],
  stickningar: [
    'Var känns det?',
    'Är det tillfälligt eller konstant?',
    'Har du yrsel eller svaghet?',
  ],
  talsvårigheter: [
    'Är det svårt att prata eller att hitta ord?',
    'När började det?',
    'Har du haft detta förut?',
  ],
  förlamning: [
    'Vilken del av kroppen är drabbad?',
    'När började det?',
    'Är det ena sidan eller båda?',
    'RING 112 OMEDELBART!',
  ],
  medvetslöshet: [
    'Reagerar personen på tilltal?',
    'Andas personen normalt?',
    'RING 112 OMEDELBART!',
  ],
  kramper: [
    'Har personen kramper just nu?',
    'Hur länge har det pågått?',
    'Har personen feber?',
    'Är det första gången?',
  ],
  stroke: [
    'Symtomdebut — när?',
    'Ena sidan drabbad?',
    'Talsvårigheter?',
    'RING 112 — TID ÄR Hjärna!',
  ],

  // ============ MENTAL HEALTH ============
  oro: [
    'Hur länge har du känt oro?',
    'Vad oroar du dig för?',
    'Har du sömnproblem?',
    'Påverkar det ditt dagliga liv?',
  ],
  ångest: [
    'Hur ofta känner du ångest?',
    'Har du panikattacker?',
    'Har du haft detta förut?',
    'Vad brukar hjälpa?',
  ],
  depression: [
    'Hur länge har du känt dig nedstämd?',
    'Har du sömnproblem?',
    'Har du minskad aptit?',
    'Har du tankar på att skada dig?',
  ],
  sömnproblem: [
    'Har du svårt att somna eller vaknar du ofta?',
    'Hur länge har det pågått?',
    'Har du tankar som håller dig vaken?',
  ],
  självmordstankar: [
    'Har du tankar på att skada dig själv?',
    'Har du en plan?',
    'Vi tar detta på allvar. Kan du prata med någon du litar på?',
  ],
  psykos: [
    'Har du sett eller hört saker som inte finns?',
    'Har du haft detta förut?',
    'Tar du antipsykotisk medicin?',
  ],

  // ============ PEDIATRIC ============
  'barn feber': [
    'Hur hög feber har barnet?',
    'Hur gammal är barnet?',
    'Har barnet kramper?',
    'Hur länge har febern pågått?',
  ],
  'barn hosta': [
    'Hur länge har barnet hostat?',
    'Är hostan torr eller med slem?',
    'Har barnet feber?',
    'Hur gammal är barnet?',
  ],
  'barn ont i magen': [
    'Var i magen har barnet ont?',
    'Har barnet kräkts eller haft diarré?',
    'Hur länge har det pågått?',
    'Hur gammal är barnet?',
  ],
  'barn utslag': [
    'Var sitter utslagen?',
    'Kliar det?',
    'Har barnet feber?',
    'Har barnet varit med om något nytt i kosten eller miljön?',
  ],
  'barn olycka': [
    'Vad har hänt?',
    'Var på kroppen är barnet skadat?',
    'Har barnet mist medvetandet?',
    'Blöder det?',
  ],

  // ============ OPHTHALMOLOGY ============
  ögonsmärta: [
    'Varför gör det ont i ögat?',
    'Har du sett blixtar eller flytande fläckar?',
    'Har du röda ögon eller flytning?',
  ],
  'röda ögon': [
    'Är det ett eller båda ögonen?',
    'Har du flytning eller varit ljuskänslig?',
    'Har du ont eller kliar det?',
  ],
  synproblem: [
    'När märkte du försämrad syn?',
    'Är det ett eller båda ögonen?',
    'Har du sett blixtar eller flytande fläckar?',
  ],
}

/**
 * Get suggested questions for detected key terms
 * @param keyTerms - Array of extracted key terms
 * @returns Unique suggested questions (max 5)
 */
export function getSuggestedQuestions(keyTerms: string[]): string[] {
  const suggestions = new Set<string>()

  for (const term of keyTerms) {
    const lowerTerm = term.toLowerCase()

    // Check for direct matches
    for (const [key, questions] of Object.entries(triageQuestionBank)) {
      if (lowerTerm.includes(key)) {
        questions.forEach((q: string) => suggestions.add(q))
      }
    }
  }

  return Array.from(suggestions).slice(0, 5)
}
