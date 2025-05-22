"use client";
import React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
const Logo = () => {
  const router = useRouter();
  return (
    <span
      className="flex items-center gap-1 z-10 group cursor-pointer"
      onClick={() => {
        router.replace("/");
      }}
    >
      <Image
        src="/logo.png"
        alt="logo"
        width={36}
        height={36}
        className="group-hover:rotate-[360deg] transition-all ease-in-out"
      />
      <h1 className="font-bold">Video Encoder</h1>
    </span>
  );
};

export default Logo;
