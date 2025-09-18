"use client";

import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { createBrowserSupabaseClient } from "@/lib/client-utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type BaseSyntheticEvent } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

/*Schema & Types*/

const kingdoms = z.enum(["Animalia", "Plantae", "Fungi", "Protista", "Archaea", "Bacteria"]);

const speciesSchema = z.object({
  scientific_name: z
    .string()
    .trim()
    .min(1)
    .transform((v) => v?.trim()),
  common_name: z
    .string()
    .nullable()
    .transform((v) => (!v || v.trim() === "" ? null : v.trim())),
  kingdom: kingdoms,
  total_population: z.number().int().positive().min(1).nullable(),
  image: z
    .string()
    .url()
    .nullable()
    .transform((v) => (!v || v.trim() === "" ? null : v.trim())),
  description: z
    .string()
    .nullable()
    .transform((v) => (!v || v.trim() === "" ? null : v.trim())),
  endangered: z.boolean().default(false),
});

type FormData = z.infer<typeof speciesSchema>;

const defaultValues: Partial<FormData> = {
  scientific_name: "",
  common_name: null,
  kingdom: "Animalia",
  total_population: null,
  image: null,
  description: null,
  endangered: false,
};

// REST v1 search result
interface WikipediaSearchResult {
  id: number;
  key: string; // normalized slug for follow-ups
  title: string;
  excerpt: string; // sanitized HTML
  description?: string | null;
  thumbnail?: { url?: string | null; width?: number | null; height?: number | null; mimetype?: string | null } | null;
}

// REST v1 summary (both /w/rest.php and /api/rest_v1 return this shape)
interface RestSummary {
  type?: string; // "standard" | "disambiguation" | "redirect" | etc
  extract?: string;
  description?: string;
  thumbnail?: { source?: string };
}

// Action API: query.pages map
interface ActionPage {
  missing?: boolean;
  extract?: string;
  description?: string;
  thumbnail?: { source?: string };
}
interface ActionQueryPagesResponse {
  query?: { pages?: Record<string, ActionPage> };
}

/*Small helpers*/

const ensureHttps = (maybeProtoRelative?: string | null) => {
  if (!maybeProtoRelative) return undefined;
  return maybeProtoRelative.startsWith("//") ? `https:${maybeProtoRelative}` : maybeProtoRelative;
};

const tidySummary = (text: string) => {
  let t = text
    .replace(/\([^)]*\)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (t.length > 200) {
    const s = t.split(". ");
    t = s[0] ?? "";
    if (t.length < 100 && s[1]) t += ". " + s[1];
    if (!t.endsWith(".")) t += ".";
  }
  return t;
};

/* Component*/

export default function AddSpeciesDialog({ userId }: { userId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [wikipediaSearch, setWikipediaSearch] = useState("");
  const [searchResults, setSearchResults] = useState<WikipediaSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(speciesSchema),
    defaultValues,
    mode: "onChange",
  });

  /*  SEARCH (REST v1) */
  const searchWikipedia = async (query: string): Promise<void> => {
    if (!query.trim()) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }
    setIsSearching(true);
    try {
      const url = `https://en.wikipedia.org/w/rest.php/v1/search/page?q=${encodeURIComponent(query)}&limit=6`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { pages?: WikipediaSearchResult[] };
      const pages = data.pages ?? [];
      setSearchResults(pages);
      setShowResults(true);
      if (pages.length === 0) {
        toast({ title: "No matches", description: "No Wikipedia pages matched your search." });
      }
    } catch (err) {
      console.error("Wikipedia search error:", err);
      toast({
        title: "Search failed",
        description: "Could not search Wikipedia. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  /* SUMMARY with fallbacks*/
  const fetchWikipediaArticle = async (
    pageKey: string,
    displayTitle?: string,
    fallbackThumb?: string,
  ): Promise<void> => {
    setIsSearching(true);
    try {
      let description = "";
      let imageUrl: string | undefined;
      let summaryOk = false as boolean | "disambig";

      const tryRestSummary = async (base: "w" | "api") => {
        const prefix = base === "w" ? "https://en.wikipedia.org/w/rest.php/v1" : "https://en.wikipedia.org/api/rest_v1";
        const res = await fetch(`${prefix}/page/summary/${encodeURIComponent(pageKey)}`);
        if (!res.ok) return false;
        const data = (await res.json()) as RestSummary;
        if (data.type === "disambiguation") return "disambig";
        const extract = data.extract ?? data.description;
        if (!extract) return false;
        description = tidySummary(extract);
        imageUrl = data.thumbnail?.source ? String(data.thumbnail.source) : undefined;
        return true;
      };

      const r1 = await tryRestSummary("w");
      summaryOk = r1;
      if (r1 !== true && r1 !== "disambig") {
        const r2 = await tryRestSummary("api");
        summaryOk = r2;
      }

      if (summaryOk !== true) {
        // Action API fallback (extract + pageimages)
        const action =
          `https://en.wikipedia.org/w/api.php?format=json&origin=*` +
          `&action=query&redirects=1&prop=extracts|pageimages|description` +
          `&exintro=1&explaintext=1&pithumbsize=400&titles=${encodeURIComponent(pageKey)}`;
        const ares = await fetch(action);
        if (ares.ok) {
          const aj = (await ares.json()) as ActionQueryPagesResponse;
          const pagesObj = aj.query?.pages;
          const first = pagesObj ? Object.values(pagesObj).find((p) => !p.missing) : undefined;
          if (first) {
            const extracted = (first.extract ?? first.description ?? "").trim();
            if (extracted) {
              description = tidySummary(extracted);
              imageUrl = first.thumbnail?.source ?? imageUrl;
              summaryOk = true;
            }
          }
        }
      }

      if (summaryOk !== true) {
        toast({
          title: "Failed to load article",
          description: "Could not load Wikipedia article content.",
          variant: "destructive",
        });
        return;
      }

      if (!imageUrl && fallbackThumb) imageUrl = ensureHttps(fallbackThumb);

      form.setValue("description", description);
      if (imageUrl) form.setValue("image", imageUrl.replace(/\/\d+px-/, "/400px-"));

      toast({
        title: "Information loaded!",
        description: `Loaded data for "${displayTitle ?? pageKey}" from Wikipedia.`,
      });
    } catch (err) {
      console.error("Wikipedia fetch error:", err);
      toast({
        title: "Failed to load article",
        description: "Could not load Wikipedia article content.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
      setShowResults(false);
      setWikipediaSearch("");
    }
  };

  /*  Submit  */
  const onSubmit = async (input: FormData) => {
    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase.from("species").insert([
      {
        author: userId,
        common_name: input.common_name,
        description: input.description,
        kingdom: input.kingdom,
        scientific_name: input.scientific_name,
        total_population: input.total_population,
        image: input.image,
        endangered: input.endangered,
      },
    ]);

    if (error) {
      return toast({ title: "Something went wrong.", description: error.message, variant: "destructive" });
    }

    form.reset(defaultValues);
    setOpen(false);
    router.refresh();

    return toast({ title: "New species added!", description: "Successfully added " + input.scientific_name + "." });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary">
          <Icons.add className="mr-3 h-5 w-5" />
          Add Species
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-screen overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add Species</DialogTitle>
          <DialogDescription>
            Add a new species here. Click &quot;Add Species&quot; below when you&apos;re done.
          </DialogDescription>
        </DialogHeader>

        {/* Wikipedia Search */}
        <div className="mb-4 rounded-lg border bg-blue-50 p-4">
          <div className="mb-2 flex items-center gap-2">
            <Search className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">Search Wikipedia for Species Info</span>
          </div>

          <div className="relative">
            <Input
              placeholder="Search for species on Wikipedia..."
              value={wikipediaSearch}
              onChange={(e) => setWikipediaSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void searchWikipedia(wikipediaSearch);
                }
              }}
            />
            <Button
              type="button"
              size="sm"
              className="absolute right-1 top-1 h-8"
              onClick={() => void searchWikipedia(wikipediaSearch)}
              disabled={isSearching}
            >
              {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </div>

          {/* Results */}
          {showResults && (
            <div className="mt-2 max-h-40 overflow-y-auto rounded border bg-white">
              {searchResults.length > 0 ? (
                searchResults.map((result) => (
                  <button
                    key={result.id}
                    type="button"
                    className="w-full border-b p-2 text-left text-sm last:border-b-0 hover:bg-gray-50"
                    onClick={() =>
                      void fetchWikipediaArticle(
                        result.key,
                        result.title,
                        ensureHttps(result.thumbnail?.url ?? undefined),
                      )
                    }
                  >
                    <div className="font-medium">{result.title}</div>
                    <div className="text-xs text-gray-600" dangerouslySetInnerHTML={{ __html: result.excerpt }} />
                  </button>
                ))
              ) : (
                <div className="p-2 text-sm text-gray-600">No results.</div>
              )}
            </div>
          )}
        </div>

        {/* Form */}
        <Form {...form}>
          <form onSubmit={(e: BaseSyntheticEvent) => void form.handleSubmit(onSubmit)(e)}>
            <div className="grid w-full items-center gap-4">
              <FormField
                control={form.control}
                name="scientific_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Scientific Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Cavia porcellus" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="common_name"
                render={({ field }) => {
                  const { value, ...rest } = field;
                  return (
                    <FormItem>
                      <FormLabel>Common Name</FormLabel>
                      <FormControl>
                        <Input value={value ?? ""} placeholder="Guinea pig" {...rest} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />

              <FormField
                control={form.control}
                name="kingdom"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kingdom</FormLabel>
                    <Select onValueChange={(v) => field.onChange(kingdoms.parse(v))} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a kingdom" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectGroup>
                          {kingdoms.options.map((k) => (
                            <SelectItem key={k} value={k}>
                              {k}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="total_population"
                render={({ field }) => {
                  const { value, ...rest } = field;
                  return (
                    <FormItem>
                      <FormLabel>Total population</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          value={value ?? ""}
                          placeholder="300000"
                          {...rest}
                          onChange={(e) => {
                            const v = e.target.value;
                            field.onChange(v === "" ? null : Number(v));
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />

              <FormField
                control={form.control}
                name="image"
                render={({ field }) => {
                  const { value, ...rest } = field;
                  return (
                    <FormItem>
                      <FormLabel>Image URL</FormLabel>
                      <FormControl>
                        <Input
                          value={value ?? ""}
                          placeholder="https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/George_the_amazing_guinea_pig.jpg/440px-George_the_amazing_guinea_pig.jpg"
                          {...rest}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => {
                  const { value, ...rest } = field;
                  return (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          value={value ?? ""}
                          placeholder="The guinea pig or domestic guinea pig, also known as the cavy or domestic cavy, is a species of rodent belonging to the genus Cavia in the family Caviidae."
                          {...rest}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />

              <FormField
                control={form.control}
                name="endangered"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Endangered Species</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Check this box if the species is classified as endangered.
                      </p>
                    </div>
                  </FormItem>
                )}
              />

              <div className="flex">
                <Button type="submit" className="ml-1 mr-1 flex-auto">
                  Add Species
                </Button>
                <DialogClose asChild>
                  <Button type="button" className="ml-1 mr-1 flex-auto" variant="secondary">
                    Cancel
                  </Button>
                </DialogClose>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
