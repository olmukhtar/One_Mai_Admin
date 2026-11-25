import { useEffect, useRef, useState } from "react";
import { Check, ChevronsUpDown, Loader2, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api";
import { API_BASE_URL } from "@/lib/constants";

type UserResult = {
  _id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
};

const USERS_URL = `${API_BASE_URL}/admin/users`;

/**
 * Search-and-select for an affiliate ID, backed by the same
 * GET /api/admin/users?search= the Users page already uses. Replaces asking
 * the admin to paste a raw user ID by hand.
 */
export function AffiliatePicker({
  value,
  onChange,
  placeholder = "Search by name or email...",
  initialLabel,
}: {
  value: string;
  onChange: (id: string, user?: UserResult) => void;
  placeholder?: string;
  /** Shown for `value` before any search runs — e.g. the affiliate's name
   *  already known from the campaign row being edited. */
  initialLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<UserResult | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      setLoading(true);
      const url = new URL(USERS_URL);
      url.searchParams.set("page", "1");
      url.searchParams.set("type", "normal");
      if (query.trim()) url.searchParams.set("search", query.trim());

      apiFetch(url.toString())
        .then((r) => (r.ok ? r.json() : Promise.reject(r)))
        .then((j) => {
          const data = j.data || j;
          setResults(data.users || []);
        })
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, open]);

  const label = (u?: UserResult | null) =>
    u ? [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email || u._id : "";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full h-10 justify-between font-normal text-xs"
        >
          <span className={cn("truncate text-left", !value && "text-muted-foreground")}>
            {value ? label(selected) || initialLabel || value : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Type a name or email…" value={query} onValueChange={setQuery} />
          <CommandList>
            {loading && (
              <div className="flex items-center justify-center gap-2 py-4 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Searching…
              </div>
            )}
            {!loading && (
              <CommandEmpty className="py-4 text-center text-xs text-muted-foreground">
                No users found.
              </CommandEmpty>
            )}
            <CommandGroup>
              {results.map((u) => (
                <CommandItem
                  key={u._id}
                  value={u._id}
                  onSelect={() => {
                    setSelected(u);
                    onChange(u._id, u);
                    setOpen(false);
                  }}
                  className="text-xs"
                >
                  <UserIcon className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                  <span className="flex-1 truncate">
                    {[u.firstName, u.lastName].filter(Boolean).join(" ") || "Unnamed"}
                    {u.email && <span className="text-muted-foreground"> · {u.email}</span>}
                  </span>
                  {value === u._id && <Check className="ml-2 h-3.5 w-3.5" />}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default AffiliatePicker;
