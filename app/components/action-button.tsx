import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

export function ActionButton({
  className,
  href,
  ...props
}: ComponentProps<typeof Button> & { href?: string }) {
  const classes = cn(
    "h-12 w-full rounded-md text-[15px] font-medium tracking-wide",
    className,
  );

  if (href) {
    const external = href.startsWith("http");
    return (
      <Button
        className={classes}
        nativeButton={false}
        render={
          <a
            href={href}
            {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
          />
        }
        {...props}
      />
    );
  }

  return <Button className={classes} {...props} />;
}
