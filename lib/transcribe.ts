import { fetch } from "expo/fetch";
import { getApiUrl } from "@/lib/query-client";

export async function transcribeAudio(
  base64Audio: string,
  onProgress?: (text: string) => void
): Promise<string> {
  const baseUrl = getApiUrl();

    const response = await fetch(`${baseUrl}api/conversations/1/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify({ audio: base64Audio }),
  });

  if (!response.ok) {
    throw new Error("Transcription failed");
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("No response body");
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let fullText = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6);

      try {
        const parsed = JSON.parse(data);
        if (parsed.type === "delta" && parsed.text) {
          fullText += parsed.text;
          onProgress?.(fullText);
        } else if (parsed.type === "done") {
          fullText = parsed.text;
        } else if (parsed.type === "error") {
          throw new Error(parsed.error);
        }
      } catch (e) {
        if (!(e instanceof SyntaxError)) {
          throw e;
        }
      }
    }
  }

  return fullText;
}

export async function transcribeAudioSimple(base64Audio: string): Promise<string> {
  const baseUrl = getApiUrl();

  const response = await fetch(`${baseUrl}api/transcribe`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ audio: base64Audio }),
  });

  if (!response.ok) {
    throw new Error("Transcription failed");
  }

  const result = await response.json();
  return result.text;
}
