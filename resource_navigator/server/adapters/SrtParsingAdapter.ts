export interface ParsedSrtItemModel {
  index: number;
  startTimestamp: string;
  endTimestamp: string;
  text: string;
}

export class SrtParsingAdapter {
  parseSrtContents(srtContents: string): ParsedSrtItemModel[] {
    return srtContents
      .trim()
      .split(/\n\s*\n/g)
      .map((block) => this.parseSrtBlock(block))
      .filter((item): item is ParsedSrtItemModel => item !== null);
  }

  private parseSrtBlock(block: string): ParsedSrtItemModel | null {
    const lines = block.split(/\r?\n/);
    if (lines.length < 3) {
      return null;
    }

    const index = Number(lines[0]);
    const timestampMatch = lines[1].match(
      /^(?<start>\d{2}:\d{2}:\d{2},\d{3})\s+-->\s+(?<end>\d{2}:\d{2}:\d{2},\d{3})$/,
    );

    if (!Number.isInteger(index) || !timestampMatch?.groups) {
      return null;
    }

    return {
      index,
      startTimestamp: timestampMatch.groups.start,
      endTimestamp: timestampMatch.groups.end,
      text: lines.slice(2).join("\n"),
    };
  }
}
