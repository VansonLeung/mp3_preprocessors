export function buildDefaultMaritimeAsrPromptText() {
  return [
    "This is Hong Kong maritime VHF radio audio.",
    "Prefer maritime domain spellings and terms when acoustically plausible.",
    "Important terms include: 海事, MARDEP, Marine Department, 警告, 碰撞危險, 碰撞危险, 碼頭, 码头, 一号位, 一號位.",
    "If speech sounds like 海市, 我哋, or 我哋是 in a maritime warning or hailing context, transcribe it as 海事.",
    "If speech sounds like Mardeep, maaf, ma de, or 马德 in maritime radio context, transcribe it as MARDEP.",
    "Preserve vessel names, callsigns, radio numerals, English words, Cantonese, and Mandarin as accurately as possible.",
  ].join(" ");
}
