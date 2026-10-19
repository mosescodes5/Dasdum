import { MediaLibrary } from "@/components/admin/MediaLibrary";

export default function AdminMediaPage() {
  return (
    <div>
      <h1 className="font-display text-2xl text-primary-deep">Media Library</h1>
      <p className="mt-2 text-sm text-muted max-w-md">
        Images uploaded here are stored on the server and can be reused across products and blog posts.
      </p>
      <div className="mt-6">
        <MediaLibrary />
      </div>
    </div>
  );
}
