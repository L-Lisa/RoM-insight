export function Tooltip({
  label,
  text,
  className,
}: {
  label: string;
  text: string;
  className?: string;
}) {
  return (
    <span className={`relative group inline-flex items-center gap-1 cursor-help ${className ?? ""}`}>
      {label}
      <span className="text-gray-300 group-hover:text-gray-400 transition-colors">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
          <circle cx="6" cy="6" r="5.5" stroke="currentColor" strokeWidth="1" fill="none" />
          <text x="6" y="9" textAnchor="middle" fontSize="7" fontFamily="sans-serif">i</text>
        </svg>
      </span>
      <span className="
        pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50
        w-64 rounded-md bg-gray-900 px-3 py-2 text-xs text-white font-normal normal-case tracking-normal
        opacity-0 group-hover:opacity-100 transition-opacity duration-150 shadow-lg
        whitespace-normal text-left leading-relaxed
      ">
        {text}
        <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
      </span>
    </span>
  );
}
