export function LumenCredit({ className }: { className?: string }) {
  return (
    <p className={className}>
      <a
        href="https://lumenlabs.site"
        target="_blank"
        rel="noopener noreferrer"
        className="text-muted-foreground/70 transition-colors hover:text-muted-foreground"
      >
        Made by Lumen Labs
      </a>
    </p>
  );
}
