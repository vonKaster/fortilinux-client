interface TopBarProps {
  title: string;
}

export function TopBar({ title }: TopBarProps) {
  return (
    <div className="flex h-16 items-center justify-between border-b px-8">
      <h1 className="text-xl font-semibold">{title}</h1>
    </div>
  );
}

