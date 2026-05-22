type EmptyStateProps = {
  title: string;
  description: string;
};

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="rounded-3xl border border-stone-200 bg-stone-50/80 p-6 text-sm text-stone-600">
      <p className="text-base font-medium text-stone-800">{title}</p>
      <p className="mt-2 leading-7">{description}</p>
    </div>
  );
}
