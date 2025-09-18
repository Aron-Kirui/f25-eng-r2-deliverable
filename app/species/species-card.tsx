"use client";

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

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Edit, MoreVertical, Trash } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import DeleteSpeciesDialog from "./delete-species-dialog";
import EditSpeciesDialog from "./edit-species-dialog";
import SpeciesDetailsDialog from "./species-details-dialog";
import type { SpeciesWithAuthor } from "./types";

interface SpeciesCardProps {
  species: SpeciesWithAuthor;
  sessionId: string;
}

export default function SpeciesCard({ species, sessionId }: SpeciesCardProps) {
  const isAuthor = species.author === sessionId;

  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    // Full width on mobile; fixed card width from sm and up.
    <div className="relative m-0 flex w-full flex-none flex-col rounded border-2 p-3 shadow sm:m-4 sm:w-72 sm:min-w-72">
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

      <div className="mt-auto flex gap-2">
        <SpeciesDetailsDialog species={species}>
          <Button className="flex-1">Learn More</Button>
        </SpeciesDetailsDialog>

        {isAuthor && (
          <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="px-2">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" sideOffset={4} className="w-48">
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(false);
                  setTimeout(() => setEditOpen(true), 0);
                }}
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>

              <DropdownMenuItem
                className="cursor-pointer text-red-600"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(false);
                  setTimeout(() => setDeleteOpen(true), 0);
                }}
              >
                <Trash className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <EditSpeciesDialog
        species={species}
        open={editOpen}
        onOpenChange={(v) => {
          setEditOpen(v);
          if (!v) setMenuOpen(false);
        }}
      >
        <span />
      </EditSpeciesDialog>

      <DeleteSpeciesDialog
        species={species}
        open={deleteOpen}
        onOpenChange={(v) => {
          setDeleteOpen(v);
          if (!v) setMenuOpen(false);
        }}
      >
        <span />
      </DeleteSpeciesDialog>
    </div>
  );
}
