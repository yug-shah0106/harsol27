import { cn } from "cn";
import { Fragment } from "react";

// Markup for effects run by components/motion.tsx. All of it is ordinary text until it runs, so
// search engines, screen readers and visitors without JavaScript get the plain words and numbers.

function words(text: string) {
  return text.split(" ").map((word, i) => (
    <Fragment key={i}>
      {i > 0 && " "}
      <span data-word className="inline-block">
        {word}
      </span>
    </Fragment>
  ));
}

/** React Bits BlurText (rebuilt): the words blur in one after another when the heading is scrolled to. */
export function BlurText({ as: Tag = "h2", text, ...props }: { as?: "h1" | "h2" | "h3"; text: string } & React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <Tag data-blur-text {...props}>
      {words(text)}
    </Tag>
  );
}

/** A statement whose words light up one after another as you scroll through it (as on lenis.dev). */
export function ScrollText({ text, className }: { text: string; className?: string }) {
  return (
    <p data-scroll-text className={className}>
      {words(text)}
    </p>
  );
}

const numbers = new Intl.NumberFormat("en-IN");

/** React Bits CountUp (rebuilt): counts up from 0 when it comes into view. */
export function CountUp({ value, className }: { value: number; className?: string }) {
  return (
    <span data-count={value} className={cn("tabular-nums", className)}>
      {numbers.format(value)}
    </span>
  );
}
