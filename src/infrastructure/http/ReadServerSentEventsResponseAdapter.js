function parseServerSentEventBlock(serverSentEventBlock) {
  const event = { eventName: "message", dataLines: [] };

  for (const line of serverSentEventBlock.split(/\r?\n/)) {
    if (line.startsWith("event:")) {
      event.eventName = line.slice("event:".length).trim();
    } else if (line.startsWith("data:")) {
      event.dataLines.push(line.slice("data:".length).trimStart());
    }
  }

  return {
    eventName: event.eventName,
    data: event.dataLines.join("\n"),
  };
}

export async function readServerSentEventsResponseAdapter({
  response,
  callbacks,
  onServerSentEvent,
}) {
  const responseReader = response.body.getReader();
  const textDecoder = new TextDecoder();
  let bufferedText = "";

  while (true) {
    const { value, done } = await responseReader.read();

    if (done) {
      break;
    }

    bufferedText += textDecoder.decode(value, { stream: true });

    let separatorMatch = bufferedText.match(/\r?\n\r?\n/);
    while (separatorMatch?.index !== undefined) {
      const separatorIndex = separatorMatch.index;
      const eventBlock = bufferedText.slice(0, separatorIndex).trim();
      bufferedText = bufferedText.slice(
        separatorIndex + separatorMatch[0].length,
      );

      if (!eventBlock) {
        continue;
      }

      const parsedEvent = parseServerSentEventBlock(eventBlock);
      callbacks?.onServerSentEventReceived?.(parsedEvent);
      onServerSentEvent(parsedEvent);
      separatorMatch = bufferedText.match(/\r?\n\r?\n/);
    }
  }

  const finalBufferedText = bufferedText.trim();
  if (finalBufferedText) {
    const parsedEvent = parseServerSentEventBlock(finalBufferedText);
    callbacks?.onServerSentEventReceived?.(parsedEvent);
    onServerSentEvent(parsedEvent);
  }
}
