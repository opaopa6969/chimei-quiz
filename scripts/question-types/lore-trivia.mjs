// 住所地誌トリビアクイズ（address-lore由来）。
// エントリ数が13件（quizFriendly）と少なく、payload構造もバラバラなので全自動生成はしない —
// docs/question-patterns.md の方針通り「半自動」：各エントリの中身を人手で読んで1問ずつ設問文を
// 書き起こし、正解はpayloadの実データそのものを使う（誤答だけ他エントリの値から機械的に拝借する）。
// 出典は今尾恵介『番地の謎』またはaddress-loreの実地調査（entries/human/*.md参照）。
import { makePrng, shuffle, pickN } from "../../lib/prng.mjs";

// { loreId, prompt, answer, distractors: string[] } の手作りリスト。
// distractorsは他の設問の answer から拝借しているので、他の項目を編集したらここも見直すこと。
const HANDCRAFTED = [
  {
    loreId: "address-three-types",
    prompt: "「都道府県-区-町名丁目-街区符号-住居番号」という住所構成を持つのはどのタイプ？",
    answer: "都市タイプ",
    distractors: ["郊外タイプ", "農村タイプ", "山村タイプ"],
  },
  {
    loreId: "compound-place-names",
    prompt: "「山武郡」はどの郡とどの郡が合わさってできた名前？",
    answer: "山辺郡・武射郡",
    distractors: ["山田郡・武蔵郡", "山方郡・武州郡", "山口郡・武庫郡"],
  },
  {
    loreId: "compound-place-names",
    prompt: "「津田沼」は3つの地名の合成。谷津・鷺沼と、あと一つは？",
    answer: "久々田",
    distractors: ["久留里", "久が原", "久喜"],
  },
  {
    loreId: "honrai-no-tyoume",
    prompt: "「丁目」は本来なんの区切り単位だった？",
    answer: "距離の単位（1町=約109m）ごとの区切り",
    distractors: ["世帯数ごとの区切り", "神社の氏子圏の区切り", "税率区分ごとの区切り"],
  },
  {
    loreId: "jiban-numbering-origin",
    prompt: "日本の地番の基本的な振り方（条里制の坪番号と同型）は？",
    answer: "千鳥式（北西から南へ蛇行）",
    distractors: ["時計回りの渦巻き式", "南から北への並行式", "中心から放射状に振る式"],
  },
  {
    loreId: "koaza-abolition",
    prompt: "日野市が昭和40年に一括廃止した小字はいくつ？",
    answer: "265",
    distractors: ["52", "980", "12"],
  },
  {
    loreId: "kyoto-counting-song",
    prompt: "京都の東西の通りを覚える数え歌「丸竹夷（まるたけえびす）」の次に続くのは？",
    answer: "二押御池（におしおいけ）",
    distractors: ["四五六七（しごろくしち）", "東西南北（とうざいなんぼく）", "上下中央（じょうげちゅうおう）"],
  },
  {
    loreId: "kyoto-jiban-gakku",
    prompt: "京都旧市街の地番区域は「町」ではなく何単位で通し番号が振られている？",
    answer: "番組（学区）",
    distractors: ["坊（平安京由来）", "字（あざ）", "校区連合会"],
  },
  {
    loreId: "michibannai-address",
    prompt: "軽井沢で、広大な大字だけでは位置特定できないために使われる独自の番号は？",
    answer: "別荘番号",
    distractors: ["リゾート地番", "山荘コード", "観光整理番号"],
  },
  {
    loreId: "overseas-street-numbering",
    prompt: "住所のブロックごとに番地を100ずつリセットし、北を奇数・南を偶数で振る都市は？",
    answer: "ニューヨーク",
    distractors: ["パリ", "ロンドン", "ヴェネツィア"],
  },
  {
    loreId: "overseas-street-numbering",
    prompt: "2014年に全国一斉でストリート方式の新住所を導入した国は？",
    answer: "韓国",
    distractors: ["台湾", "ドイツ", "フランス"],
  },
  {
    loreId: "segawari-vs-gaiku",
    prompt: "大阪市中央区北側で見られる、道路の両側を同じ町名にする古い区割りは？",
    answer: "背割り（両側町）",
    distractors: ["街区主義", "碁盤割り", "条坊制"],
  },
  {
    loreId: "tyoume-shinkou-houkou",
    prompt: "東京都心の丁目は何を起点に振られている（昭和38年基準）？",
    answer: "皇居",
    distractors: ["東京駅", "国会議事堂", "東京湾"],
  },
  {
    loreId: "block-jiban-odd-even",
    prompt: "東京の神田・銀座等に震災復興（昭和5年〜）で導入された、街区に親番・各筆に支号を振る地番方式は？",
    answer: "ブロック地番",
    distractors: ["飛び地地番", "街区丁目式", "坪単位地番"],
  },
  {
    loreId: "koaza-size-variance",
    prompt: "茨城県石岡市の小字の特徴は？",
    answer: "1ha未満が中心・最小1坪",
    distractors: ["500m四方に統一", "1つの小字が1つの町丁目と等しい", "全て10ha以上"],
  },
];

function triviaFor(entry) {
  // excerptは見出しと本文が改行無しで1行に繋がっている（例: "# 道案内式住所 広大な大字…"）。
  // 旧実装は /^#[^\n]*\n?/ で見出し行ごと除去しようとしたが、改行が無いため[^\n]*が
  // 本文まで食い尽くして全消しになるバグがあった（「出典だけでexcerptが空」の原因）。
  // 先頭の "# " 記号だけを取り除けば、見出し+本文がそのまま自然な文として読める。
  const body = (entry.excerpt ?? "").replace(/^#\s*/, "").trim().slice(0, 220);
  const bookRefs = entry.source?.book;
  if (!body) return bookRefs?.length ? `出典: ${bookRefs.join(" / ")}` : "";
  return bookRefs?.length ? `${body}（出典: ${bookRefs.join(" / ")}）` : body;
}

export function generate(loreEntries, seed) {
  const rng = makePrng(seed ?? "lore-trivia");
  const entryById = new Map(loreEntries.map((e) => [e.id, e]));
  const questions = [];

  for (const h of HANDCRAFTED) {
    const entry = entryById.get(h.loreId);
    if (!entry) continue; // address-loreのエントリが将来リネームされた場合はスキップ（エラーにはしない）
    const choices = shuffle([h.answer, ...h.distractors], rng);
    questions.push({
      type: "lore-trivia",
      id: `lore-trivia-${h.loreId}-${questions.length}`,
      prompt: h.prompt,
      choices,
      answer: h.answer,
      distractorStrategy: "handcrafted",
      tags: ["lore-trivia", entry.category, ...(entry.region?.pref ?? ["nationwide"])],
      difficulty: 0.5,
      source: { dataset: "address-lore", refs: [entry.id] },
      // 以前は出典ページ番号（「番地の謎 p.98 / p.99 / ...」）だけを表示していて内容が見えず、
      // ユーザーから「その内容も表示してほしい」と指摘があった。エントリの説明文(excerpt)を
      // 主に見せ、出典は末尾に添える形に変更。
      trivia: triviaFor(entry),
    });
  }
  return questions;
}
