import Image from "next/image";
import { CreditCard } from "lucide-react";

export function CardArt({
  name,
  small = false,
}: {
  name: string;
  small?: boolean;
}) {
  const normalized = name.toLowerCase();
  const image = normalized.includes("platinum")
    ? "platinum"
    : normalized.includes("aspire")
      ? "aspire"
      : normalized.includes("sapphire")
        ? "reserve"
        : null;
  return (
    <span className={`card-art ${small ? "card-art-small" : ""}`}>
      {image ? (
        <Image
          src={`/cards/${image}.png`}
          alt={`${name} card`}
          width={240}
          height={152}
          sizes={small ? "56px" : "150px"}
        />
      ) : (
        <CreditCard aria-hidden="true" />
      )}
    </span>
  );
}
