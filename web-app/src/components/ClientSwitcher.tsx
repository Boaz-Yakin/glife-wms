"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Check, ChevronsUpDown, Building2 } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { setActiveClientAction } from "@/app/actions/client.actions"

interface Client {
  id: string
  name: string
  code: string
}

interface ClientSwitcherProps {
  clients: Client[]
  activeClientId: string | null
}

export function ClientSwitcher({ clients, activeClientId }: ClientSwitcherProps) {
  const [open, setOpen] = React.useState(false)
  const router = useRouter()
  
  // Default to "All Clients" if activeClientId is null
  const selectedClient = clients.find((c) => c.id === activeClientId)
  
  const handleSelect = async (clientId: string | null) => {
    setOpen(false)
    await setActiveClientAction(clientId)
    router.refresh()
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger 
        className="inline-flex items-center justify-between whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2 w-[200px] border-dashed"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2 truncate">
          <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="truncate">
            {selectedClient ? selectedClient.name : "All Clients"}
          </span>
        </div>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput placeholder="Search client..." />
          <CommandList>
            <CommandEmpty>No client found.</CommandEmpty>
            <CommandGroup heading="Clients">
              <CommandItem
                onSelect={() => handleSelect(null)}
                className="text-sm"
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    activeClientId === null ? "opacity-100" : "opacity-0"
                  )}
                />
                All Clients
              </CommandItem>
              {clients.map((client) => (
                <CommandItem
                  key={client.id}
                  value={client.name}
                  onSelect={() => handleSelect(client.id)}
                  className="text-sm"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      activeClientId === client.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {client.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
