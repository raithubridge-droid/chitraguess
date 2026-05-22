type SketchItLogoProps = {
  size?: "xs" | "sm" | "hero";
  className?: string;
};

export default function SketchItLogo({ size = "sm", className = "" }: SketchItLogoProps) {
  const isHero = size === "hero";
  const imageSize = size === "xs" ? "h-6 w-auto sm:h-12" : "h-10 w-auto sm:h-12";

  return (
    <img
      src="/sketchit-logo.jpg"
      alt="SketchIt Logo"
      className={`${isHero ? "mx-auto h-auto w-full max-w-2xl" : imageSize} ${className}`}
    />
  );
}
