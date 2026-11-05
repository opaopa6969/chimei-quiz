// #23: Wikidataを再取得せず、既存マスタに混入した自治体を出題から除外する。
// 根拠: https://github.com/opaopa6969/chimei-quiz/issues/21
const EXCLUDED_MUNICIPALITIES = [
  ["016951", "色丹村"], // 北方領土。現在人口として使えない1945年の人口値。
  ["016969", "泊村"], // 北方領土の国後郡泊村。古宇郡泊村(014036)ではない。
  ["016977", "留夜別村"], // 北方領土。現在人口として使えない1945年の人口値。
  ["016985", "留別村"], // 北方領土。現在人口として使えない1945年の人口値。
  ["016993", "紗那村"], // 北方領土。現在人口として使えない1945年の人口値。
  ["017001", "蘂取村"], // 北方領土。現在人口として使えない1945年の人口値。
  ["112046", "浦和市"], // 2001年廃止、さいたま市へ新設合併。
  ["093670", "岩舟町"], // 2014年廃止、栃木市へ編入。
  ["103055", "宮城村"], // 2004年廃止、前橋市へ編入。
  ["224839", "竜洋町"], // 2005年廃止、磐田市へ新設合併。
  ["433853", "植木町"], // 2010年廃止、熊本市へ編入。
];
const excludedValues = new Set(EXCLUDED_MUNICIPALITIES.flat());
const excludedCodes = new Set(EXCLUDED_MUNICIPALITIES.map(([code]) => code));

export function excludeMunicipalityQuestions(questions) {
  // 入力の間引きは乱数の消費順・順位グループを変えてしまうため、生成後に設問ごと除外する。
  // 合成地名の「浦和市・大宮市・与野市」も対象。赤泊村・小泊村などの部分一致は除かない。
  // 選択肢にコードが無いカテゴリは、#23の受入条件に合わせ同名の歴史的自治体も保守的に除外。
  return questions.filter((question) => {
    const values = [...question.choices, ...[question.answer].flat()];
    return !values.some((value) => value.split("・").some((part) => excludedValues.has(part)))
      && !question.source?.refs?.some((ref) => excludedCodes.has(ref));
  });
}
