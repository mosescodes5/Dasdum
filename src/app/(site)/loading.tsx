// Shown instantly while any storefront page is fetched, so a click never
// feels like nothing happened.
export default function Loading() {
  return (
    <div aria-hidden="true">
      <div className="load-bar" />
      <div className="container-editorial py-16">
        <div className="skeleton-pulse h-8 w-48 rounded" />
        <div className="skeleton-pulse mt-4 h-4 w-72 max-w-full rounded" />
      </div>
    </div>
  );
}
