import { QuestionIntro } from "./compositions/QuestionIntro";
import { SameNameMap } from "./compositions/SameNameMap";

// 設問typeに応じて出題演出のComponentを選ぶ。専用演出が無いタイプは汎用QuestionIntroにフォールバック。
export function pickIntroComponent(question) {
  if (question.type === "same-name") return SameNameMap;
  return QuestionIntro;
}

export function introProps(question) {
  if (question.type === "same-name") {
    return { prompt: question.prompt, name: question.meta?.name, givenPref: question.meta?.givenPref };
  }
  return { prompt: question.prompt, type: question.type };
}
