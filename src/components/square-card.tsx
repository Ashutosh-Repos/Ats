"use client";
import { useRouter } from "next/navigation";
import React from "react";
import {
  IconBuildings,
  IconWorld,
  IconCurrencyDollar,
} from "@tabler/icons-react";

// TypeScript interface for header/subheader items
interface CardItem {
  label: string;
  value: string | number;
  icon?: React.ComponentType<{ size?: number }>;
  className?: string; // For custom styling (e.g., status badge)
}

// TypeScript interface for Card props
interface CardProps {
  id: string;
  header: CardItem[];
  subheader: CardItem[];
  info: CardItem[];
}

const Card = ({ id, header, subheader, info }: CardProps) => {
  const router = useRouter();

  // Calculate number of rows needed for the grid (2 columns, dynamic rows)
  const gridRows = Math.ceil(info.length / 2);

  // Icon mapping function
  const getIcon = (label: string, value: string | number) => {
    if (
      label.toLowerCase() === "worktype" ||
      label.toLowerCase() === "work type"
    ) {
      if (value === "on-site") {
        return <IconBuildings size={14} />;
      } else if (value === "hybrid") {
        return (
          <>
            <IconBuildings size={14} />
            <IconWorld size={14} />
          </>
        );
      } else if (value === "remote") {
        return <IconWorld size={14} />;
      }
    } else if (
      label.toLowerCase() === "pay" ||
      label.toLowerCase() === "salary"
    ) {
      return <IconCurrencyDollar size={14} />;
    }
    return null;
  };

  return (
    <div
      className="w-full max-w-96 mx-auto rounded-2xl bg-zinc-900 text-white aspect-video flex flex-col p-4 cursor-pointer"
      onClick={() => {
        router.push(`jobs/${id}`);
      }}
    >
      <div className="flex items-center justify-between">
        {header.map((item, index) => (
          <span key={index} className={item.className || "w-max font-bold"}>
            {item.label === "position" || item.label === "title" ? (
              <h1 className="w-max font-bold">{item.value}</h1>
            ) : item.className ? (
              <span className="w-max p-2 rounded-xl text-xs bg-zinc-800">
                <p>{item.value}</p>
              </span>
            ) : (
              <p>{item.value}</p>
            )}
          </span>
        ))}
      </div>
      <div className="flex items-center justify-between w-max gap-8 text-sm">
        {subheader.map((item, index) => (
          <span key={index} className="flex gap-0.5 items-center text-xs">
            {item.icon ? (
              <item.icon size={14} />
            ) : (
              getIcon(item.label, item.value)
            )}
            {item.label.toLowerCase() === "pay" ||
            item.label.toLowerCase() === "salary" ? (
              item.value === 0 ? (
                "un-paid"
              ) : (
                <p>{item.value} Lpa</p>
              )
            ) : (
              <p>{item.value}</p>
            )}
          </span>
        ))}
      </div>
      <br />
      <div
        className={`grid grid-cols-2 grid-rows-[repeat(${gridRows},auto)] place-items-start gap-2 text-center`}
      >
        {info.map((item, index) => (
          <span
            key={index}
            className="w-full h-full rounded place-items-center grid relative p-4"
          >
            <p className="absolute top-0 text-xs text-zinc-500">{item.label}</p>
            <h6 className="text-sm">{item.value}</h6>
          </span>
        ))}
      </div>
    </div>
  );
};

export default Card;
