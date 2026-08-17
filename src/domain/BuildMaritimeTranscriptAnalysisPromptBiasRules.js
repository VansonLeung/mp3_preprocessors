export function buildMaritimeTranscriptAnalysisPromptBiasRules() {
  return Object.freeze([
    {
      ruleName: "repetitive-maaf-may-be-mardep",
      observedTranscriptText: "maaf | ma de | 马德",
      likelyCorrectMeaning: "MARDEP",
      normalizedMeaning: "Marine Department",
      guidance:
        "If repetitive or unclear 'maaf', 'ma de', or '马德' appears in a maritime radio transcript, consider whether the speaker may be calling MARDEP, an alias of Marine Department. This hint alone proves maritime relevance, not an operational command.",
    },
    {
      ruleName: "hai-shi-may-be-hai-shi-maritime-affairs",
      observedTranscriptText: "海市",
      likelyCorrectMeaning: "海事",
      normalizedMeaning: "maritime affairs",
      guidance:
        "If '海市' appears in a maritime transcript, consider whether ASR misheard '海事'.",
    },
    {
      ruleName: "repeated-vessel-name-is-hailing-not-noise",
      observedTranscriptText: "repeated vessel or agency name",
      likelyCorrectMeaning: "maritime hailing or call test",
      normalizedMeaning: "maritime-related radio call without command",
      guidance:
        "If a transcript repeatedly names a vessel, agency, or channel but has no instruction, request, warning, berth, destination, or position report, classify it as maritime_hailing_or_call_test rather than noise_or_empty.",
    },
    {
      ruleName: "six-digit-number-is-not-mmsi",
      observedTranscriptText: "six digit spoken number",
      likelyCorrectMeaning: "numeric identifier",
      normalizedMeaning: "not MMSI unless exactly nine digits",
      guidance:
        "Only extract MMSI numbers when the transcript provides a reliable nine-digit number. Put shorter uncertain numbers in callsigns or remarks instead.",
    },
    {
      ruleName: "yao-is-mandarin-one-in-radio-numerals",
      observedTranscriptText: "幺",
      likelyCorrectMeaning: "一",
      normalizedMeaning: "1",
      guidance:
        "In Mandarin radio-style spoken numbers, 幺 often means 一 / digit 1. For numericIdentifiers, normalize sequences such as 幺八八 to 188 while preserving the raw transcript text in vesselNames or uncertainties when needed.",
    },
    {
      ruleName: "berth-location-with-identifier-is-position-report",
      observedTranscriptText: "码头 | 一号位 | berth | pier",
      likelyCorrectMeaning: "position or berth report",
      normalizedMeaning: "maritime command information",
      guidance:
        "If a transcript contains a vessel, station, callsign, or numeric identifier together with a berth, pier, wharf, anchorage, or position location, classify it as maritime_command even when the sentence is not imperative.",
    },
  ]);
}
