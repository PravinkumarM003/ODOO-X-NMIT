export default function Loading() {
  return (
    <div className="w-full h-1 bg-[var(--sidebar-secondary)] overflow-hidden">
      <div className="h-full bg-[var(--primary)] animate-[threadMove_1s_linear_infinite] w-1/3 rounded-r-full"></div>
    </div>
  );
}
