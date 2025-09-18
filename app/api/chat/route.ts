import { generateResponse } from "@/lib/services/species-chat";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

const MsgSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
});

const BodySchema = z.object({
  message: z.string(),
  history: z.array(MsgSchema).optional(), // NEW
});

export async function POST(request: NextRequest) {
  try {
    const json = await request.json();
    const parsed = BodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid or missing message" }, { status: 400 });
    }

    const message = parsed.data.message.trim();
    if (message.length === 0) {
      return NextResponse.json({ error: "Message cannot be empty" }, { status: 400 });
    }

    const history = parsed.data.history ?? [];

    const response = await generateResponse(message, history); // pass history

    return NextResponse.json({ response });
  } catch (err) {
    console.error("Chat API error:", err);
    return NextResponse.json({ error: "Internal server error. Please try again later." }, { status: 502 });
  }
}
