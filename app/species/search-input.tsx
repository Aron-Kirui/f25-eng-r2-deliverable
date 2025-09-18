"use client";

import { Input } from "@/components/ui/input";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

interface SearchInputProps {
  defaultValue?: string;
}

export default function SearchInput({ defaultValue = "" }: SearchInputProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(defaultValue);

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      const params = new URLSearchParams(searchParams);

      if (search.trim()) {
        params.set("search", search.trim());
      } else {
        params.delete("search");
      }

      const newUrl = params.toString() ? `?${params.toString()}` : "";
      router.push(`/species${newUrl}`);
    }, 300);

    return () => clearTimeout(delayedSearch);
  }, [search, router, searchParams]);

  return (
    <Input
      type="text"
      placeholder="Search species by scientific name, common name, or description..."
      value={search}
      onChange={(e) => setSearch(e.target.value)}
      className="max-w-md"
    />
  );
}
