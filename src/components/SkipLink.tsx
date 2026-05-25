type Props = {
  href: string;
  children: string;
};

export default function SkipLink({ href, children }: Props) {
  return (
    <a
      href={href}
      className="fixed left-5 top-3 z-[80] -translate-y-[140%] bg-ink px-3.5 py-2.5 text-sm text-paper focus:translate-y-0 focus:outline-2 focus:outline-accent focus:outline-offset-[3px]"
    >
      {children}
    </a>
  );
}
