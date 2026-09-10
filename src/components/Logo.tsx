export function Logo({ big = false }: { big?: boolean }) {
  return (
    <span
      className={`font-extrabold tracking-tight text-tynysh ${big ? "text-5xl" : "text-2xl"}`}
    >
      tynysh
    </span>
  );
}
