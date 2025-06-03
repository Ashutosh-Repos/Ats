import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import React from "react";

const SelectBox = ({
  selectValues,
  selectLabel,
  handler,
}: {
  selectValues: string[];
  selectLabel: string;
  handler: () => void;
}) => {
  return (
    <Select>
      <SelectTrigger className="w-max h-max px-2 rounded-2xl border-2 text-zinc-300 text-sm bg-zinc-800 border-zinc-800">
        <SelectValue
          placeholder={selectLabel}
          className="border-2 border-zinc-800 bg-zinc-800 text-sm"
        />
      </SelectTrigger>
      <SelectContent className="bg-zinc-800 border-0 border-zinc-800">
        {selectValues.map((val, idx) => (
          <SelectItem value={val} key={`select-${idx}`}>
            {val === "name"
              ? "A-z"
              : val
                  .toLowerCase()
                  .split(" ")
                  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(" ")}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default SelectBox;
