"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import Image from "next/image";
import type { SpeciesWithAuthor } from "./types";

interface SpeciesDetailsDialogProps {
  species: SpeciesWithAuthor;
  children: React.ReactNode; // This will be the "Learn More" button
}

export default function SpeciesDetailsDialog({ species, children }: SpeciesDetailsDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {species.scientific_name}
            {species.endangered && (
              <span className="rounded bg-red-100 px-2 py-1 text-xs text-red-700">Endangered</span>
            )}
          </DialogTitle>
          <DialogDescription>Detailed information about this species</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {species.image && (
            <div className="relative h-48 w-full overflow-hidden rounded-lg">
              <Image
                src={species.image}
                alt={species.common_name ?? species.scientific_name}
                fill
                className="object-cover"
              />
            </div>
          )}

          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-600">Scientific Name</h4>
                <p className="mt-1 text-gray-900">{species.scientific_name}</p>
              </div>

              {species.common_name && (
                <div>
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-600">Common Name</h4>
                  <p className="mt-1 text-gray-900">{species.common_name}</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-600">Kingdom</h4>
                <p className="mt-1 text-gray-900">{species.kingdom}</p>
              </div>

              {species.profiles && (
                <div>
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-600">Added By</h4>
                  <p className="mt-1 text-gray-900">{species.profiles.display_name || species.profiles.email}</p>
                </div>
              )}
            </div>

            {species.total_population && (
              <div>
                <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-600">Total Population</h4>
                <p className="mt-1 text-gray-900">{species.total_population.toLocaleString()}</p>
              </div>
            )}

            {species.description && (
              <div>
                <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-600">Description</h4>
                <p className="mt-1 leading-relaxed text-gray-700">{species.description}</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end border-t pt-4">
          <DialogClose asChild>
            <Button variant="outline">Close</Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}
