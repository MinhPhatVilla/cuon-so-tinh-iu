import type { ReactNode } from "react";

export function EmptyPanel({ icon, title, description, children }: { icon: ReactNode; title: string; description: string; children?: ReactNode }) {
  return (
    <section className="empty-panel">
      <div className="empty-icon" aria-hidden="true">{icon}</div>
      <h2>{title}</h2>
      <p>{description}</p>
      {children}
    </section>
  );
}
