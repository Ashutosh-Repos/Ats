"use client";
export const Modal = ({
  children,
}: Readonly<{ children: React.ReactNode }>) => {
  return (
    <div className="w-full h-full grid place-items-center z-20 absolute backdrop-blur-[2px] sm:p-10 p-0">
      <div className="h-max w-max grid place-items-center">{children}</div>
    </div>
  );
};
