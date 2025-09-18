"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";
import { createBrowserSupabaseClient } from "@/lib/client-utils";
import type { Database } from "@/lib/schema";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Species = Database["public"]["Tables"]["species"]["Row"];

interface DeleteSpeciesDialogProps {
  species: Species;
  /** Optional: you can still pass children, but this controlled version doesn't render them */
  children?: React.ReactNode;
  onOpenChange?: (open: boolean) => void;
  open?: boolean; // controlled open
}

export default function DeleteSpeciesDialog(props: DeleteSpeciesDialogProps) {
  const { species, onOpenChange, open } = props; // <-- do NOT destructure `children`
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isControlled = typeof open === "boolean";
  const dialogOpen = isControlled ? open : internalOpen;

  const setOpen = (v: boolean) => {
    if (!isControlled) setInternalOpen(v);
    onOpenChange?.(v);
  };

  const handleDelete = async () => {
    setIsDeleting(true);

    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase.from("species").delete().eq("id", species.id);

    if (error) {
      setIsDeleting(false);
      return toast({
        title: "Something went wrong.",
        description: error.message,
        variant: "destructive",
      });
    }

    setOpen(false);
    setIsDeleting(false);
    router.refresh();

    return toast({
      title: "Species deleted!",
      description: `Successfully deleted ${species.scientific_name}.`,
    });
  };

  const handleCancel = () => {
    setOpen(false);
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={(v) => setOpen(v)}>
      {/* no trigger when controlled */}
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Delete Species</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this species? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">Species to delete:</p>
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="font-semibold">{species.scientific_name}</p>
              {species.common_name && <p className="text-sm italic text-gray-600">{species.common_name}</p>}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={handleCancel} disabled={isDeleting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={() => void handleDelete()} disabled={isDeleting}>
            {isDeleting ? "Deleting..." : "Delete Species"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
