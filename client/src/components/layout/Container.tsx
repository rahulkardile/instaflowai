import { ReactNode } from "react";

interface Props {
  children: ReactNode;
  className?: string;
}

export default function Container({
  children,
  className = "",
}: Props) {
  return (
    <div
      className={`mx-auto max-w-7xl px-6 lg:px-8 ${className}`}
    >
      {children}
    </div>
  );
}