import { Onkun } from "onkun";
import { JKAT } from "@marmooo/kanji";

function getYomis(kanji, grade) {
  const onkun = onkunDict.get(kanji);
  if (grade <= 5) {
    return onkun["小学"];
  } else if (grade <= 7) {
    const yomis = [];
    yomis.push(...onkun["小学"]);
    yomis.push(...onkun["中学"]);
    return yomis;
  } else if (grade <= 9) {
    const yomis = [];
    yomis.push(...onkun["小学"]);
    yomis.push(...onkun["中学"]);
    yomis.push(...onkun["高校"]);
    return yomis;
  } else if (onkun) {
    return onkun["Unihan"];
  } else {
    console.log(`warning: ${kanji} onkun is undefined`);
    return [];
  }
}

const onkunDict = new Onkun();
await onkunDict.loadJoyo("onkun/data/joyo-2017.csv");

const result = [];
for (let g = 0; g < 10; g++) {
  JKAT[g].forEach((kanji) => {
    result.push(`${kanji}\t${getYomis(kanji, g).join(",")}`);
  });
}
Deno.writeTextFileSync("src/yomi.tsv", result.join("\n"));
