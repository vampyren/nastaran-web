type Props = {
  className?: string;
};

export default function PaisleyArch({ className }: Props) {
  return (
    <svg
      aria-hidden
      className={className}
      viewBox="0 0 160 28"
      preserveAspectRatio="none"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8 20C34 5 58 5 80 20c22-15 46-15 72 0" />
      <path d="M80 20c6-10 16-13 25-8 5 3 6 9 1 12" />
      <circle cx="80" cy="20" r="2.4" fill="currentColor" stroke="none" />
    </svg>
  );
}
