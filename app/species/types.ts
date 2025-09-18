import type { Database } from "@/lib/schema";

export type Species = Database["public"]["Tables"]["species"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export interface SpeciesWithAuthor extends Species {
  profiles?: Profile | null;
}
