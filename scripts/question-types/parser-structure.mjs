// 住所構造クイズ。address-lore の parser-token / coordinate-system エントリ
// （onigiri-parser が実際の住所パースで使っている地域特殊な区切り語彙・座標系）から出題する。
// lore-triviaと同じ理由で半自動（HANDCRAFTED）: エントリ数は多いがpayload構造がバラバラで
// 全自動生成には向かない。「知ってると住所パーサ設計に役立つ」豆知識をクイズ化する。
import { makePrng, shuffle } from "../../lib/prng.mjs";

// { loreId, prompt, answer, distractors, trivia }
const HANDCRAFTED = [
  {
    loreId: "nagasaki-men",
    prompt: "長崎県（旧平戸藩・大村藩域）で「○○町××免△△番地」のように、町名の後・番地の前に入る「字」相当の言葉は？",
    answer: "免（めん）",
    distractors: ["組（くみ）", "地割（じわり）", "郷（ごう）"],
    trivia: "同様の長崎系区分に「触（ふれ）」「郷（ごう）」「浦（うら）」「名（みょう）」もある。藩ごとに異なる行政区分の名残とされる。",
  },
  {
    loreId: "oita-kumi",
    prompt: "大分県の一部で、住所中に字相当として残る「隣保班（近所の助け合い組織）」の名残は？",
    answer: "組（くみ）",
    distractors: ["免（めん）", "触（ふれ）", "地割（じわり）"],
    trivia: "「○○組」の形で町名/番地の境界に来る。一般語の「組」との衝突に注意が必要（地域を限定して判定する）。",
  },
  {
    loreId: "iwate-jiwari",
    prompt: "岩手県（一部青森県）で「紫波郡矢巾町大字南矢幅第13地割123」のように、大字の下・番地の上に入る単位は？",
    answer: "地割（じわり）",
    distractors: ["条（じょう）", "免（めん）", "線（せん）"],
    trivia: "「第N地割」という形で地番ブロックを表す。明治期の開墾・区画整理に由来するとされる。",
  },
  {
    loreId: "chiba-iroha",
    prompt: "千葉県の一部で、字名相当として「イ・ロ・ハ・ニ・ホ…」のように使われるのは？",
    answer: "イロハ順のカナ",
    distractors: ["十干（甲乙丙）", "十二支（子丑寅）", "いろは支号"],
    trivia: "単独カナ「イ/ロ/ハ…」の直後に番地が来る文脈で字相当として認識できる。石川・島根・高知にも同系統の「イロハ字」がある。",
  },
  {
    loreId: "kouotsuhei",
    prompt: "石川県・長崎県（雲仙・島原等）・香川県・徳島県などで、字名の代わりに使われる「甲乙丙丁…」は何と呼ばれる？",
    answer: "十干（じっかん）",
    distractors: ["十二支", "いろは", "五十音"],
    trivia: "「○○町甲123番地」のように使う。イロハや子丑寅（十二支）と同じ「記号列で字を区分する」パターンの一種。",
  },
  {
    loreId: "hokkaido-jojome",
    prompt: "札幌市の住所「北5条西3丁目」。南北の位置（大通・創成川を起点とするグリッド座標）を示すのは「条」と「丁目」のどちら？",
    answer: "条",
    distractors: ["丁目", "どちらも東西を示す", "どちらも同じ軸"],
    trivia: "条＝南北軸、丁目＝東西軸の2次元グリッド座標。帯広市は札幌と軸が逆（条＝南北・丁目＝東西で同じだが起点が違う）、旭川市は南北を付けず1〜26丁目と表記が異なる。",
  },
  {
    loreId: "hokkaido-sen-gou",
    prompt: "北海道の屯田兵村起源の道路基準番地で使われる、条丁目とは別系統の単位は？",
    answer: "線・号",
    distractors: ["条・丁目", "免・組", "大字・小字"],
    trivia: "「基線」「原野」など開拓時代の区画に由来する言葉も残る。郊外の農村部でよく見られる。",
  },
  {
    loreId: "kyoto-tori",
    prompt: "京都市中心部の住所「烏丸通四条上る」。丁目・番地とは別系統の、交差点を起点にした方向表記は？",
    answer: "上ル/下ル/東入/西入",
    distractors: ["条/丁目", "免/組", "甲/乙"],
    trivia: "2本の通りの交差点を起点にした相対方向の座標系。木構造（都道府県→市区町村→字→番地）に収まらない、京都独自の別系統。",
  },
  {
    loreId: "kanji-gaiku-fugou",
    prompt: "大阪市中央区・鶴見区で、通常は数字である街区符号（番）に例外的に使われる漢字は？",
    answer: "渡辺",
    distractors: ["大手", "本町", "難波"],
    trivia: "「久太郎町四丁目渡辺」「諸口五丁目浜N番」「焼野 南1・南4」など、漢字や漢字+数字の街区符号が実在する。",
  },
  {
    loreId: "sakai-cho-honrai",
    prompt: "堺市の住所で「東二丁」「茶山台一丁」のように使われる、「丁目」と紛らわしい独自の単位は？",
    answer: "丁（ちょう）",
    distractors: ["条（じょう）", "免（めん）", "組（くみ）"],
    trivia: "「丁目」ではなく「丁」だけで使われる堺市独特の表記。パーサでは「丁目」と誤認しないよう区別が必要。",
  },
  {
    loreId: "okinawa-aza",
    prompt: "沖縄県の住所は、他都道府県でよく見る「丁目」がほとんど無く、代わりに何と番地の組み合わせが基本？",
    answer: "字（あざ）",
    distractors: ["条（じょう）", "組（くみ）", "免（めん）"],
    trivia: "「字○○＋番地」が基本形。丁目という区画整理の単位自体が沖縄では一般的でない。",
  },
  {
    loreId: "muban-banshoku",
    prompt: "地番が付いていない土地（登記すれば地番が付くため実質国有地）を指す言葉は？",
    answer: "無番地",
    distractors: ["飛び地", "字外地", "無住地"],
    trivia: "「番外地」「無地番地」「官有無番地」なども同じ意味で使われる。民法239条2項が関係する。",
  },
  {
    loreId: "ooaza-aza-suffix-position",
    prompt: "「大字長倉」「字長瀞」のように、大字・字は地名の前後どちらに置くのが基本？",
    answer: "前（接頭辞として置く）",
    distractors: ["後（接尾辞として置く）", "市区町村名の前", "番地の後"],
    trivia: "旧島根県温泉津町は例外的に「〇〇大字」と後置していた（2005年の大田市合併で解消）。市・県は逆に地名の後に置く。",
  },
  {
    loreId: "city-name-only-then-banchi",
    prompt: "茨城県龍ケ崎市・長野県の一部で見られる、町名・大字を経ずに市区町村名の直後に来るものは？",
    answer: "番地（例: 龍ケ崎市3710番地）",
    distractors: ["字名", "郡名", "丁目"],
    trivia: "通常は「市区町村→大字・町名→番地」の順だが、これらの地域では大字・町名を省略した表記が正式住所として使われる。",
  },
  {
    loreId: "gobi-machimura-igai",
    prompt: "「宿」「駅」「新田」「浦」など、市区町村名の語尾に付く全国的な地名パターンに共通するのは？",
    answer: "旧街道・旧開墾地由来の地名語尾",
    distractors: ["方角を示す接尾辞", "行政区画のランク", "海抜を示す言葉"],
    trivia: "「新田」は江戸期の新規開墾地、「宿」「駅」は街道の宿場町に由来することが多い。「竈」「搦」（佐賀）、「領家」「地頭」（荘園制由来）など地域色豊かな語尾もある。",
  },
  // 実在する「ヤバい住所」の事例（書籍『ヤバい日本の住所』河合太郎 著、note記事等より。
  // address-loreのエントリに紐付かないスタンドアロン設問なので loreId は無し）
  {
    id: "maihama-jukyo-hyoji",
    prompt: "千葉県浦安市舞浜には「舞浜2-1-1」と「舞浜2-11」という似た表記の住所が両方実在し、指す場所も別々。この違いは何による？",
    answer: "住居表示実施地域（丁目+番+号）と未実施地域（番地）の違い",
    distractors: ["単なる誤字がそのまま定着した", "同じ場所を新旧の住所で呼んでいるだけ", "郵便番号の違いによる表記差"],
    prefectures: ["千葉県"],
    trivia: "「舞浜2丁目1番1号」（浦安市立舞浜小学校、住居表示実施済み）と「舞浜2番地11」（ディズニーアンバサダーホテル、住居表示未実施）が、首都高湾岸線を挟んでほぼ同じ地区に存在する。",
    sourceUrls: ["https://note.com/inuro/n/n7ec7cf15cf9c"],
  },
  {
    id: "kasukabe-hatchome",
    prompt: "埼玉県春日部市には「八丁目」という地名があるが、「一丁目」〜「七丁目」は存在しない。なぜ？",
    answer: "「八丁目」は連番の8番目ではなく、独立した固有の地名（大字名）だから",
    distractors: ["1〜7丁目は過去に廃止されたから", "8丁目だけ先に住居表示を実施したから", "測量ミスで欠番になったから"],
    prefectures: ["埼玉県"],
    trivia: "「丁目」という文字列を含むが数字の連番体系とは無関係。住所パーサが「丁目システムの一部」と誤解釈しやすい罠の実例。",
    sourceUrls: ["https://note.com/inuro/n/n7ec7cf15cf9c"],
  },
  {
    id: "nagano-ken-machi",
    prompt: "長野県長野市には「長野県」という文字列が2回登場する住所がある。何という町名？",
    answer: "南長野県町",
    distractors: ["北長野県町", "長野県町", "新長野県町"],
    prefectures: ["長野県"],
    trivia: "「長野県長野市南長野県町」で「長野県」が2度出現する。都道府県名で文字列を分割するような安易なパーサ実装だと誤爆しやすい実例。",
    sourceUrls: ["https://note.com/inuro/n/n7ec7cf15cf9c"],
  },
  {
    id: "shimoda-chome-no-omachi",
    prompt: "静岡県下田市の住所「下田市2丁目4-26」。通常「町名→丁目」の順だが、ここでは何が省略されている？",
    answer: "町名（大字・字）",
    distractors: ["番地", "号", "都道府県名"],
    prefectures: ["静岡県"],
    trivia: "市区町村の直下にいきなり丁目が来る珍しいパターン。city-name-only-then-banchi（市名直後に番地）の丁目版といえる例。",
    sourceUrls: ["https://note.com/inuro/n/n7ec7cf15cf9c"],
  },
  {
    id: "shibushi-all-same",
    prompt: "鹿児島県志布志市には、市区町村名・町名・字名のすべてに同じ言葉が入る住所がある。それは何？",
    answer: "志布志（志布志市志布志町志布志）",
    distractors: ["日南（日南市日南町日南）", "薩摩（薩摩市薩摩町薩摩）", "大隅（大隅市大隅町大隅）"],
    prefectures: ["鹿児島県"],
    trivia: "市町村合併と旧町名の継承の結果、「志布志市志布志町志布志」と全階層が同じ言葉になった。パーサにとっては「同じ文字列の繰り返し＝誤入力」と誤判定しやすい罠。",
    sourceUrls: ["https://note.com/inuro/n/n7ec7cf15cf9c"],
  },
];

export function generate(loreEntries, seed) {
  const rng = makePrng(seed ?? "parser-structure");
  const entryById = new Map(loreEntries.map((e) => [e.id, e]));
  const questions = [];

  for (const h of HANDCRAFTED) {
    // address-loreのエントリに紐付くもの（loreId必須）と、書籍/Web記事由来の実例ネタ
    // （STANDALONE_EXAMPLES、loreId無し）の両方をサポートする。
    const entry = h.loreId ? entryById.get(h.loreId) : null;
    if (h.loreId && !entry) continue; // address-loreのエントリが将来リネームされた場合はスキップ
    const choices = shuffle([h.answer, ...h.distractors], rng);
    questions.push({
      type: "parser-structure",
      id: `parser-structure-${h.loreId ?? h.id}`,
      prompt: h.prompt,
      choices,
      answer: h.answer,
      distractorStrategy: "handcrafted",
      tags: ["parser-structure", entry?.category ?? "real-example", ...(entry?.region?.pref ?? h.prefectures ?? ["nationwide"])],
      difficulty: 0.65,
      source: entry
        ? { dataset: "address-lore (onigiri-parser設計知見)", refs: [entry.id] }
        : { dataset: "実在住所の事例（『ヤバい日本の住所』河合太郎 著、Web記事）", refs: h.sourceUrls ?? [] },
      trivia: h.trivia,
    });
  }
  return questions;
}
