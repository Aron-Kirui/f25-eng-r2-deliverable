"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Database } from "@/lib/schema";
import { Edit, MoreVertical, Trash } from "lucide-react";
import Image from "next/image";
import EditSpeciesDialog from "./edit-species-dialog";
import SpeciesDetailsDialog from "./species-details-dialog";

type Species = Database["public"]["Tables"]["species"]["Row"];

interface SpeciesCardProps {
  species: Species;
  sessionId: string;
}

export default function SpeciesCard({ species, sessionId }: SpeciesCardProps) {
  const isAuthor = species.author === sessionId;

  return (
    <div className="relative m-4 flex w-72 min-w-72 flex-none flex-col rounded border-2 p-3 shadow">
      {species.image && (
        <div className="relative h-40 w-full flex-shrink-0">
          <Image
            src={species.image}
            alt={species.scientific_name}
            fill
            style={{ objectFit: "cover" }}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = "none";
            }}
          />
        </div>
      )}

      <h3 className="mt-3 text-2xl font-semibold">{species.scientific_name}</h3>
      <h4 className="text-lg font-light italic">{species.common_name}</h4>
      <p className="mb-3">{species.description ? species.description.slice(0, 150).trim() + "..." : ""}</p>

      {/* Bottom action area with Learn More and three dots menu */}
      <div className="mt-auto flex gap-2">
        <SpeciesDetailsDialog species={species}>
          <Button className="flex-1">Learn More</Button>
        </SpeciesDetailsDialog>

        {isAuthor && (
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="px-2">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" sideOffset={4} className="w-48">
              <EditSpeciesDialog species={species}>
                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="cursor-pointer">
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
              </EditSpeciesDialog>

              <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="cursor-pointer text-red-600">
                <Trash className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}
/*
Note: "use client" is a Next.js App Router directive that tells React to render the component as
a client component rather than a server component. This establishes the server-client boundary,
providing access to client-side functionality such as hooks and event handlers to this component and
any of its imported children. Although the SpeciesCard component itself does not use any client-side
functionality, it is beneficial to move it to the client because it is rendered in a list with a unique
key prop in species/page.tsx. When multiple component instances are rendered from a list, React uses the unique key prop
on the client-side to correctly match component state and props should the order of the list ever change.
React server components don't track state between rerenders, so leaving the uniquely identified components (e.g. SpeciesCard)
can cause errors with matching props and state in child components if the list order changes.
*/
