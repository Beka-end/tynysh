/** Кружок с первой буквой имени. Цвет считается из имени, чтобы был всегда один и тот же. */
export function Avatar({
  name,
  isAI = false,
  size = 44,
}: {
  name: string;
  isAI?: boolean;
  size?: number;
}) {
  const letter = name.trim()[0]?.toUpperCase() ?? "?";
  const hue = (name.charCodeAt(0) * 37) % 360;

  return (
    <div
      className="grid shrink-0 place-items-center rounded-full font-bold text-white"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        background: isAI
          ? "linear-gradient(135deg,#FFB547,#FF7A59)"
          : `hsl(${hue} 55% 55%)`,
      }}
    >
      {isAI ? "☼" : letter}
    </div>
  );
}
