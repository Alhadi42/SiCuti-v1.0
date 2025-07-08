import React from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

const Combobox = ({ 
  options, 
  value, 
  onValueChange, 
  placeholder = "Select an option...", 
  searchPlaceholder = "Search...",
  notFoundMessage = "No results found.",
  triggerClassName 
}) => {
  const [open, setOpen] = React.useState(false);
  const selectedOption = options.find(option => option.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between font-normal", triggerClassName)}
        >
          {selectedOption?.label || placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0 bg-slate-800 border-slate-700" align="start">
        <Command className="w-full bg-transparent">
          <CommandInput 
            placeholder={searchPlaceholder}
            className="text-white bg-transparent border-slate-700"
          />
          <CommandList className="text-white bg-transparent">
            <CommandEmpty>{notFoundMessage}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  onSelect={() => {
                    const newValue = option.value === value ? '' : option.value;
                    onValueChange(newValue);
                    setOpen(false);
                  }}
                  className="cursor-pointer text-slate-200 hover:bg-slate-700 hover:text-white"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4 text-green-500",
                      value === option.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export { Combobox };
