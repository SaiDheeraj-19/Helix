export function LogoSpinner() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-4">
      <div className="relative flex items-center justify-center size-10">
        <div className="absolute inset-0 rounded-full border-2 border-t-indigo-500 border-r-transparent border-b-purple-500 border-l-transparent animate-spin" />
        <div className="absolute inset-1 rounded-full border-2 border-t-transparent border-r-indigo-400 border-b-transparent border-l-purple-400 animate-[spin_1.5s_linear_infinite_reverse]" />
        <span className="text-sm font-bold tracking-tight text-primary">H</span>
      </div>
      <span className="text-xs font-semibold tracking-widest text-placeholder animate-pulse uppercase">
        Helix
      </span>
    </div>
  );
}
