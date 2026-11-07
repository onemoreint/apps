import type { ReactNode } from "react";
import { Reveal } from "./Reveal";

interface Props {
  eyebrow: string;
  title: ReactNode;
  intro?: ReactNode;
  align?: "left" | "center";
  id?: string;
}

export function SectionHeading({ eyebrow, title, intro, align = "center", id }: Props) {
  const center = align === "center";
  return (
    <div className={`${center ? "mx-auto text-center" : ""} max-w-3xl`}>
      <Reveal>
        <span className="eyebrow">{eyebrow}</span>
      </Reveal>
      <Reveal delay={0.08}>
        <h2 id={id} className="mt-5 text-[clamp(1.9rem,4.6vw,3.3rem)] font-bold leading-[1.08]">
          {title}
        </h2>
      </Reveal>
      {intro && (
        <Reveal delay={0.16}>
          <p className={`mt-5 text-[17px] text-mist sm:text-lg ${center ? "mx-auto" : ""} max-w-2xl`}>{intro}</p>
        </Reveal>
      )}
    </div>
  );
}
