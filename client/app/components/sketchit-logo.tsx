type SketchItLogoProps = {
  size?: "sm" | "hero";
  className?: string;
};

export default function SketchItLogo({ size = "sm", className = "" }: SketchItLogoProps) {
  const isHero = size === "hero";

  return (
    <img
      src="/sketchit-logo.jpg"
      alt="SketchIt Logo"
      className={`${isHero ? "mx-auto h-auto w-full max-w-2xl" : "h-10 w-auto sm:h-12"} ${className}`}
    />
  );
}
