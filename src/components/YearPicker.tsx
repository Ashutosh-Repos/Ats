import { useState } from "react";

import "react-day-picker/dist/style.css";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const YearPicker = ({
  value,
  onChange,
  className,
  triggerClassName,
}: {
  value?: number;
  onChange: (year: number) => void;
  className?: string;
  triggerClassName?: string;
}) => {
  const [open, setOpen] = useState(false);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 8 }, (_, i) => currentYear + i);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          className={cn(
            "w-full justify-start text-left font-normal",
            triggerClassName
          )}
        >
          {value || "Select year"}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={cn("w-max max-h-96 overflow-y-auto", className)}
      >
        <div className="flex flex-col gap-1">
          {years.map((year) => (
            <Button
              key={year}
              variant={value === year ? "default" : "ghost"}
              onClick={() => {
                onChange(year);
                setOpen(false);
              }}
            >
              {year}
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};
