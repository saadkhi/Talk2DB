import type { ComponentType, SVGProps } from "react";
import { IconArrowRight } from "./icons";

type FeatureCardProps = {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  tone: "violet" | "blue" | "amber" | "teal" | "pink";
  title: string;
  description: string;
  href: string;
};

export default function FeatureCard({
  icon: Icon,
  tone,
  title,
  description,
  href,
}: FeatureCardProps) {
  return (
    <a href={href} className={`feature-card feature-card--${tone}`}>
      <span className="feature-card-icon">
        <Icon width={20} height={20} />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      <span className="feature-card-arrow">
        <IconArrowRight width={16} height={16} />
      </span>
    </a>
  );
}
