type Props = {
  className?: string;
  "aria-hidden"?: boolean;
};

export default function LotusRosette({ className, ...rest }: Props) {
  return (
    <svg
      aria-hidden={rest["aria-hidden"] ?? true}
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.35"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M32 5c6.5 7.4 6.5 14.7 0 22C25.5 19.7 25.5 12.4 32 5Z" />
      <path d="M16.5 11.5c9.9.8 15.1 5.8 15.5 15.5-9.7-.4-14.7-5.6-15.5-15.5Z" />
      <path d="M47.5 11.5c-9.9.8-15.1 5.8-15.5 15.5 9.7-.4 14.7-5.6 15.5-15.5Z" />
      <path d="M9.2 32c8-5.5 15.6-5.5 22.8 0-7.2 5.5-14.8 5.5-22.8 0Z" />
      <path d="M54.8 32c-8-5.5-15.6-5.5-22.8 0 7.2 5.5 14.8 5.5 22.8 0Z" />
      <path d="M16.5 52.5c.8-9.9 5.8-15.1 15.5-15.5-.4 9.7-5.6 14.7-15.5 15.5Z" />
      <path d="M47.5 52.5c-.8-9.9-5.8-15.1-15.5-15.5.4 9.7 5.6 14.7 15.5 15.5Z" />
      <circle cx="32" cy="32" r="4.8" fill="currentColor" stroke="none" />
    </svg>
  );
}
