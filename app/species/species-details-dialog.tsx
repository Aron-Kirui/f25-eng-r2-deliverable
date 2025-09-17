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
import type { Database } from "@/lib/schema";
import Image from "next/image";

type Species = Database["public"]["Tables"]["species"]["Row"];

interface SpeciesDetailsDialogProps {
  species: Species;
  children: React.ReactNode; // This will be the "Learn More" button
}

export default function SpeciesDetailsDialog({ species, children }: SpeciesDetailsDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-screen overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{species.scientific_name}</DialogTitle>
          <DialogDescription>Detailed information about this species</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {species.image && (
            <div className="relative h-60 w-full overflow-hidden rounded-lg">
              <Image src={species.image} alt={species.scientific_name} fill style={{ objectFit: "cover" }} />
            </div>
          )}

          <div className="space-y-3">
            <div>
              <h4 className="text-sm font-semibold text-gray-600">Scientific Name</h4>
              <p className="text-lg">{species.scientific_name}</p>
            </div>

            {species.common_name && (
              <div>
                <h4 className="text-sm font-semibold text-gray-600">Common Name</h4>
                <p className="text-lg italic">{species.common_name}</p>
              </div>
            )}

            <div>
              <h4 className="text-sm font-semibold text-gray-600">Kingdom</h4>
              <p>{species.kingdom}</p>
            </div>

            {species.total_population && (
              <div>
                <h4 className="text-sm font-semibold text-gray-600">Total Population</h4>
                <p>{species.total_population.toLocaleString()}</p>
              </div>
            )}

            {species.description && (
              <div>
                <h4 className="text-sm font-semibold text-gray-600">Description</h4>
                <p className="text-sm leading-relaxed">{species.description}</p>
              </div>
            )}
          </div>

          <div className="flex justify-end pt-4">
            <DialogClose asChild>
              <Button variant="secondary">Close</Button>
            </DialogClose>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
