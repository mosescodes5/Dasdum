import { BlogPostForm } from "@/components/admin/BlogPostForm";

export default function NewBlogPostPage() {
  return (
    <div>
      <h1 className="font-display text-2xl text-primary-deep">New Post</h1>
      <BlogPostForm />
    </div>
  );
}
