const PageHeader = ({
  title,
  leading,
  actions,
  children,
}: {
  title: React.ReactNode;
  leading?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}) => (
  <header className="sticky top-0 z-20 border-b border-line bg-panel">
    <div className="mx-auto grid h-14 max-w-2xl grid-cols-[minmax(2.5rem,1fr)_minmax(0,auto)_minmax(2.5rem,1fr)] items-center gap-2 px-4">
      <div className="flex justify-start">{leading}</div>
      <h1 className="flex min-w-0 items-center justify-center gap-2 text-center text-lg font-medium">
        {title}
      </h1>
      <div className="flex justify-end">{actions}</div>
    </div>
    {children && <div className="mx-auto max-w-2xl px-1">{children}</div>}
  </header>
);

export default PageHeader;
