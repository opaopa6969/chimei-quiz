# 「ヤバい日本の住所」実例クロール生データ（未検証、要出典確認）

出典: WebSearch「日本 珍しい住所 やばい住所 構造 地番 面白い 実在」+
note記事 https://note.com/inuro/n/n7ec7cf15cf9c のWebFetch要約。2026-08-20取得。

書籍『ヤバい日本の住所』（河合太郎 著、幻冬舎）が元ネタの一つらしい:
- https://www.hanmoto.com/bd/isbn/9784344988088
- https://www.gentosha.jp/series/yabaijuusho

## parser-structure.mjsに採用済み
- 千葉県浦安市舞浜（住居表示 vs 未実施地番の混在）
- 埼玉県春日部市八丁目（連番でない固有地名）
- 長野県長野市南長野県町（「長野県」が2回出現）
- 静岡県下田市2丁目（町名なしで直接丁目）
- 鹿児島県志布志市志布志町志布志（全階層同じ言葉）

## 未採用（要検証・情報不足、将来の拡充候補）
- 大阪市中央区上町A-12（水資源機構関西吉野川支社、街区符号がアルファベット）
  → kanji-gaiku-fugou（渡辺）と統合できそうだが出典薄いので保留
- 千葉県香取市佐原ロ2127（香取市役所、イロハの「ロ」がOCRで「6」等と誤読されやすい）
  → chiba-iroha/iroha-aza-regionと統合候補
- 千葉県八街市八街は18番地2（イロハの「は」）
- 渋谷区道玄坂2-6-2（複数ビルが同一住所を共有、住居表示の仕組み上ありうる）
  → 説明がやや複雑なので4択に落としづらく保留
- 美濃市1350番地（町名がない）
- 千葉県旭市二2132番地（「二」の意味不明）
- 新潟市北区東栄町（同じ表記で読みが違う）
- 奈良県御所市1番地の3（市の下に直接番地）→ address-lore「city-name-only-then-banchi」と同型、既存カバー済み
- 東京都青ヶ島村無番地 → address-lore「muban-banshoku」と同型、既存カバー済み
- 大分県別府市風呂本5組 → address-lore「oita-kumi」と同型、既存カバー済み
- 京都府京都市中京区寺町通御池上る上本能寺前町488 → 京都通り名+町名の複合例、kyoto-tori系と統合候補

## 検索結果一覧（未読のものも含む）
- https://note.com/inuro/n/n7ec7cf15cf9c
- https://www.hanmoto.com/bd/isbn/9784344988088
- https://www.gentosha.jp/series/yabaijuusho
- https://pody.jp/player/s60s9Xfa3pLP35fPnHJO/u319IksvQbrJDcEBUpyS
- https://ameblo.jp/yukitanoyonkoma/entry-12807476026.html
- https://note.com/owlowl44/n/na422e4865bc5
- https://business.mapfan.com/blog/detail/2206
- https://blog.magnolia.tech/entry/2026/08/08/153925
- https://www.rex-it.jp/blog/blog_7kazoekata.html
- http://pinval.net/postal/
