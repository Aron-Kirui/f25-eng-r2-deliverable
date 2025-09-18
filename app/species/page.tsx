import { Separator } from "@/components/ui/separator";
import { TypographyH2 } from "@/components/ui/typography";
import { createServerSupabaseClient } from "@/lib/server-utils";
import { redirect } from "next/navigation";
import AddSpeciesDialog from "./add-species-dialog";
import SearchInput from "./search-input";
import SpeciesCard from "./species-card";

interface SpeciesListProps {
  searchParams: { search?: string };
}

export default async function SpeciesList({ searchParams }: SpeciesListProps) {
  const supabase = createServerSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) redirect("/");

  const sessionId = session.user.id;
  const searchTerm = searchParams.search ?? "";

  let query = supabase.from("species").select(`*, profiles (*)`).order("id", { ascending: false });

  if (searchTerm.trim()) {
    query = query.or(
      `scientific_name.ilike.%${searchTerm}%,common_name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`,
    );
  }

  const { data: species } = await query;

  return (
    // make a page-local scroller with a sticky header
    <section className="flex min-h-dvh flex-col">
      {/* Sticky header block (title + search) */}
      <div className="sticky top-0 z-40 bg-background pb-4 pt-2">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <TypographyH2>Species List</TypographyH2>
          <AddSpeciesDialog userId={sessionId} />
        </div>

        <Separator className="my-4" />

        <div className="mb-2">
          <SearchInput defaultValue={searchTerm} />
        </div>
      </div>

      {/* Only this area scrolls; the scrollbar starts here on mobile */}
      <div className="flex-1 overflow-y-auto pb-10">
        <div className="flex flex-wrap justify-center">
          {species && species.length > 0 ? (
            species.map((s) => <SpeciesCard key={s.id} species={s} sessionId={sessionId} />)
          ) : (
            <div className="mt-8 text-center text-gray-500">
              {searchTerm ? `No species found matching "${searchTerm}"` : "No species found"}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
