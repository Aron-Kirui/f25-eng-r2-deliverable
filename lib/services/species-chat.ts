import OpenAI from "openai";

const apiKey = process.env.OPENAI_API_KEY?.trim();
if (!apiKey) {
  // Fail fast (server-only). Make sure OPENAI_API_KEY is set without quotes or trailing junk.
  throw new Error("Missing OPENAI_API_KEY");
}

const openai = new OpenAI({ apiKey });

// Switch models without touching code
const MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

const SYSTEM_PROMPT = `You are a specialized chatbot that only answers questions about animals and species. You are knowledgeable about:

- Animal habitats and ecosystems
- Diet and feeding behavior
- Conservation status and threats
- Physical characteristics and adaptations
- Behavior and social structures
- Reproduction and life cycles
- Classification and taxonomy
- Animal facts and interesting information

If a user asks about anything unrelated to animals or species, politely remind them that you only handle species-related queries and suggest they ask about an animal instead.

Keep your responses informative but concise. Use a friendly, educational tone.`;

/*  Helpers  */

function containsAnimalKeywords(message: string): boolean {
  const animalKeywords = [
    "animal",
    "species",
    "wildlife",
    "habitat",
    "diet",
    "behavior",
    "conservation",
    "mammal",
    "bird",
    "fish",
    "reptile",
    "amphibian",
    "insect",
    "endangered",
    "extinct",
    "predator",
    "prey",
    "ecosystem",
    "migration",
    "breeding",
    "nocturnal",
    "diurnal",
    "camouflage",
    "adaptation",
    "taxonomy",
    "carnivore",
    "herbivore",
    "omnivore",
    "invertebrate",
    "vertebrate",
  ];
  const words = message.toLowerCase().split(/\s+/);
  return animalKeywords.some((k) => words.some((w) => w.includes(k)));
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Use an interface (ESLint preference) */
interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

/** Clamp conversation history to a simple character budget.
 *  Guard for `noUncheckedIndexedAccess` (history[i] can be undefined). */
function clampHistory(history: readonly ChatTurn[], maxChars = 6000): ChatTurn[] {
  let used = 0;
  const out: ChatTurn[] = [];

  for (let i = history.length - 1; i >= 0; i--) {
    const turn = history[i];
    if (!turn) continue; // satisfies noUncheckedIndexedAccess

    const len = turn.content?.length ?? 0;
    if (used + len > maxChars) break;

    used += len;
    out.unshift(turn);
  }
  return out;
}

/** Generate a response from the species chatbot, given a user message and optional chat history.
 *  Returns a string reply or an error message. */

export async function generateResponse(message: string, history: ChatTurn[] = []): Promise<string> {
  // Guardrail for obviously non-animal questions
  const nonAnimalKeywords = [
    "weather",
    "politics",
    "sports",
    "cooking",
    "recipe",
    "music",
    "movie",
    "book",
    "math",
    "programming",
    "code",
    "computer",
    "phone",
    "car",
    "house",
    "job",
    "school",
    "university",
    "travel",
    "vacation",
    "money",
    "finance",
    "stock",
  ];
  const words = message.toLowerCase().split(/\s+/);
  const looksNonAnimal = nonAnimalKeywords.some((k) => words.some((w) => w.includes(k)));
  if (looksNonAnimal && !containsAnimalKeywords(message)) {
    return "I'm a species chatbot specialized in animals and wildlife. Please ask about an animal or species!";
  }

  const clipped = clampHistory(history);
  const maxAttempts = 3;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const completion = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...clipped, // memory
          { role: "user", content: message },
        ],
        max_tokens: 300,
        temperature: 0.7,
      });

      const response = completion.choices[0]?.message?.content?.trim();
      if (!response) throw new Error("No response generated");
      return response;
    } catch (error: unknown) {
      const err = error as { code?: string; status?: number; message?: string };

      if (err?.code === "invalid_api_key" || err?.status === 401) {
        return "API key looks invalid. Double-check OPENAI_API_KEY (no quotes, no trailing characters) and restart the server.";
      }
      if (err?.code === "insufficient_quota") {
        return "Your OpenAI account is out of credit. Add billing or prepaid credits and try again.";
      }

      const retryable = err?.status === 429 || err?.code === "rate_limit_exceeded";
      if (retryable && attempt < maxAttempts - 1) {
        await sleep(400 * (attempt + 1)); // backoff: 400ms, 800ms
        continue;
      }

      console.error("OpenAI API error:", error);
      return "I'm having trouble right now. Please try again in a moment.";
    }
  }

  return "I'm having trouble right now. Please try again in a moment.";
}
