export type ReplyMode = 'voice' | 'chat';

type PrincipleRoute = {
  pattern: RegExp;
  principles: string[];
  terms: string;
};

/**
 * Semantic aid from the production RAG router.
 * Used to expand the embedding query. It is not a rigid keyword table.
 */
const PRINCIPLE_ROUTES: PrincipleRoute[] = [
  {
    pattern: /lonely|loneliness|nobody needs|no one needs|useless|not needed|children.{0,48}(far|away|time|busy)|retirement|getting older|अकेला|अकेली|बेकार|जरूरत नहीं|बच्चे|रिटायर|बुढ़ाप/i,
    principles: ['P13', 'P10', 'P08', 'P14'],
    terms: 'purpose self-worth compassion inner stability loneliness ageing contribution connection',
  },
  {
    pattern: /anger|angry|insult|critic|offended|disrespect|गुस्सा|आलोचना|अपमान|नाराज़|नाराज/i,
    principles: ['P14', 'P10', 'P06'],
    terms: 'inner stability self-love sacred detachment criticism non-reactivity boundary self-respect',
  },
  {
    pattern: /who am i|identity|awareness|consciousness|चेतना|आत्मा|कौन हूँ|कौन हूं/i,
    principles: ['P01', 'P03', 'P18'],
    terms: 'Atmik Intelligence awareness mithyatva false identity liberation consciousness',
  },
  {
    pattern: /same (pattern|mistake)|keep repeating|life pattern|पैटर्न|बार बार|दोहरा/i,
    principles: ['P02', 'P07', 'P11'],
    terms: 'transformation begins within knowledge to experience karma clarity repeating patterns',
  },
  {
    pattern: /ego|false identity|body-mind|not the body|मिथ्या|अहंकार|पहचान/i,
    principles: ['P03', 'P01', 'P18'],
    terms: 'mithyatva false identity Atmik Intelligence liberation',
  },
  {
    pattern: /control|outcome|result|doership|responsible for everything|नियंत्रण|फल|कर्ता/i,
    principles: ['P04', 'P12', 'P11'],
    terms: 'non-doership surrender karma clarity attachment to results',
  },
  {
    pattern: /overthink|mental noise|cannot meditate|meditation|silence|चुप|ध्यान|विचार रुक/i,
    principles: ['P05', 'P14', 'P01'],
    terms: 'inner silence moun swarup inner stability Atmik Intelligence meditation',
  },
  {
    pattern: /cling|can't let go|cannot let go|attached|fear of loss|मोह|छोड़ नहीं|जुड़ाव/i,
    principles: ['P06', 'P10', 'P09'],
    terms: 'sacred detachment udasinta self-love fearlessness relationship clinging',
  },
  {
    pattern: /know but|cannot live|can't apply|understand but|theory|जानता हूँ फिर भी|समझता हूं पर/i,
    principles: ['P07', 'P02', 'P05'],
    terms: 'knowledge to experience transformation inner silence practice',
  },
  {
    pattern: /forgive|empathy|service|compassion|क्षमा|करुणा|सेवा/i,
    principles: ['P08', 'P16', 'P10'],
    terms: 'compassion unity self-love service forgiveness',
  },
  {
    pattern: /afraid|fear|anxiety|courage|scared|डर|भय|साहस|चिंता/i,
    principles: ['P09', 'P14', 'P01'],
    terms: 'fearlessness abhaya inner stability Atmik Intelligence courage',
  },
  {
    pattern: /self-worth|self worth|not good enough|validation|boundary|boundaries|आत्म सम्मान|हीन|योग्य नहीं/i,
    principles: ['P10', 'P06', 'P08'],
    terms: 'self-love sacred detachment compassion boundaries worth',
  },
  {
    pattern: /karma|deserve|punishment|why me|कर्म|सज़ा|सजा|मेरी गलती/i,
    principles: ['P11', 'P02', 'P04'],
    terms: 'karma clarity conscious action transformation non-doership not blame',
  },
  {
    pattern: /surrender|acceptance|let go|letting go|समर्पण|स्वीकार|छोड़ना/i,
    principles: ['P12', 'P04', 'P14'],
    terms: 'surrender samarpan non-doership inner stability acceptance',
  },
  {
    pattern: /purpose|meaning of life|direction|calling|what am i for|उद्देश्य|मकसद|दिशा/i,
    principles: ['P13', 'P01', 'P07'],
    terms: 'purpose Atmik Intelligence knowledge to experience meaningful contribution',
  },
  {
    pattern: /unstable|reactive|overwhelm|mood swing|स्थिर नहीं|विचलित|घबरा/i,
    principles: ['P14', 'P05', 'P06', 'P09'],
    terms: 'inner stability inner silence sacred detachment fearlessness reactivity',
  },
  {
    pattern: /healing|grief|hurt|pain|heartbreak|दुख|शोक|दर्द|घाव/i,
    principles: ['P15', 'P02', 'P05', 'P14'],
    terms: 'healing through awareness transformation inner silence inner stability grief',
  },
  {
    pattern: /oneness|everyone is one|separation|universal|एकता|सब में|अलगाव/i,
    principles: ['P16', 'P08', 'P10'],
    terms: 'unity sarva atma darshan compassion self-love',
  },
  {
    pattern: /grateful|gratitude|resentment|taken for granted|कृतज्ञ|आभार|नाराजगी/i,
    principles: ['P17', 'P08', 'P14'],
    terms: 'gratitude compassion inner stability appreciation',
  },
  {
    pattern: /liberation|moksha|freedom from suffering|self-realization|self realisation|मुक्ति|मोक्ष|आत्म साक्षात्/i,
    principles: ['P18', 'P01', 'P03', 'P04', 'P07'],
    terms: 'liberation jivan mukti Atmik Intelligence mithyatva non-doership knowledge to experience',
  },
];

export function matchingRoutes(query: string): PrincipleRoute[] {
  return PRINCIPLE_ROUTES.filter((route) => route.pattern.test(query)).slice(0, 2);
}

export function wantsKnowledgeRetrieval(query: string): boolean {
  return PRINCIPLE_ROUTES.some((route) => route.pattern.test(query));
}

/** Original utterance plus a short semantic expansion. No extra model call. */
export function expandRetrievalQuery(query: string): string {
  const hits = matchingRoutes(query);
  if (hits.length === 0) return query;
  const terms = hits.map((hit) => hit.terms).join(' ');
  return `${query}\n${terms.slice(0, 90)}`;
}
