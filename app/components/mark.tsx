export function Mark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M4 7.2 12 3l8 4.2v6.3c0 4.4-3.4 7.2-8 8.5-4.6-1.3-8-4.1-8-8.5V7.2Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M8 12.2h8M12 8.8v6.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="square"
      />
    </svg>
  );
}
