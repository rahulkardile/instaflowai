import { ReactNode } from "react";

interface Props {
  icon: ReactNode;
  title: string;
  description: string;
}

export default function FeatureCard({
  icon,
  title,
  description,
}: Props) {
  return (
    <div className="rounded-2xl border bg-white p-8 transition hover:-translate-y-1 hover:shadow-xl">

      <div className="mb-5 inline-flex rounded-xl bg-purple-100 p-3 text-purple-600">
        {icon}
      </div>

      <h3 className="text-xl font-semibold">
        {title}
      </h3>

      <p className="mt-3 text-slate-500">
        {description}
      </p>

    </div>
  );
}