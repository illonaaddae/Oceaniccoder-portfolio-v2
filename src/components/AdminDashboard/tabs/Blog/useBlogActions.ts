import React from "react";
import { BlogPost } from "@/types";
import { useToast } from "../../Toast";
import { useConfirm } from "../../ConfirmContext";
import { generateSlug } from "./utils";
import { shouldSendNewsletter } from "./newsletterTrigger";
import { apiUrl } from "@/utils/apiUrl";
import { account } from "@/lib/appwrite";

interface UseBlogActionsProps {
  blogPosts: BlogPost[];
  onAdd: (post: Partial<BlogPost>) => Promise<void>;
  onEdit: (id: string, post: Partial<BlogPost>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function useBlogActions({ blogPosts, onAdd, onEdit, onDelete }: UseBlogActionsProps) {
  const toast = useToast();
  const confirm = useConfirm();

  const handleSubmit = async (
    e: React.FormEvent,
    formData: Partial<BlogPost>,
    editingPost: BlogPost | null,
    onSuccess: () => void,
    setSubmitting: (v: boolean) => void,
  ) => {
    e.preventDefault();
    setSubmitting(true);
    const slug = formData.slug || generateSlug(formData.title);
    // Decided before the write, while editingPost still holds the pre-save
    // published state.
    let sendNewsletter = shouldSendNewsletter(editingPost, formData);

    // Going out to the list is irreversible, so it is never a side effect of
    // ticking a checkbox. Publishing without emailing stays available, and
    // cancelling abandons the save entirely rather than half-applying it.
    if (sendNewsletter) {
      const choice = await confirm({
        message: "Email this post to your subscribers?",
        description: `"${formData.title}" will be sent to everyone on your newsletter list. Emails cannot be recalled once sent.`,
        variant: "success",
        confirmLabel: "Continue",
        choiceLabel: "What should happen when this post is saved?",
        choices: [
          { value: "send", label: "Publish and email subscribers" },
          { value: "skip", label: "Publish without emailing" },
        ],
        defaultChoice: "send",
      });
      if (!choice) {
        setSubmitting(false);
        return;
      }
      sendNewsletter = choice === "send";
    }

    try {
      if (editingPost) {
        await onEdit(editingPost.$id, { ...formData, slug });
        toast.success(`Blog post "${formData.title}" updated successfully!`);
      } else {
        await onAdd({ ...formData, slug });
        toast.success(`Blog post "${formData.title}" created successfully!`);
      }

      if (sendNewsletter) {
        // Not awaited: the post is already saved and a slow broadcast should
        // not hold the modal open. The result is still surfaced — this used to
        // be console.warn only, so a failed send looked exactly like a
        // successful one.
        void broadcastNewPost({ ...formData, slug });
      }

      onSuccess();
    } catch (error) {
      console.error("Error saving blog post:", error);
      toast.error(
        editingPost
          ? "Failed to update blog post. Please try again."
          : "Failed to create blog post. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Calls the newsletter endpoint with a short-lived Appwrite JWT.
   *
   * The endpoint mails a real subscriber list from a verified domain, so it
   * now requires a signed-in admin; the JWT is what proves that.
   */
  const postNewsletter = async (post: Partial<BlogPost> & { slug: string }, mode?: "test") => {
    const { jwt } = await account.createJWT();
    const res = await fetch(apiUrl("/api/send-newsletter"), {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
      body: JSON.stringify({
        title: post.title,
        excerpt: post.excerpt,
        slug: post.slug,
        category: post.category,
        image: post.image,
        ...(mode ? { mode } : {}),
      }),
    });
    if (!res.ok) {
      const detail = await res.json().catch(() => ({}));
      throw new Error(detail.error || `Newsletter API returned ${res.status}`);
    }
    return res.json().catch(() => ({}));
  };

  /** Fires the Resend broadcast and reports the outcome. */
  const broadcastNewPost = async (post: Partial<BlogPost> & { slug: string }) => {
    try {
      await postNewsletter(post);
      toast.success("Newsletter sent to your subscribers.");
    } catch (err) {
      console.error("Newsletter send failed:", err);
      toast.error(
        err instanceof Error && err.message
          ? `Post saved, but the newsletter did not go out — ${err.message}`
          : "Post saved, but the newsletter did not go out.",
      );
    }
  };

  /**
   * Sends the post as it currently stands to the admin address only, so the
   * real email can be checked in an inbox before it reaches the list. The
   * recipient is chosen server-side and is never taken from the browser.
   */
  const sendTestNewsletter = async (formData: Partial<BlogPost>) => {
    if (!formData.title) {
      toast.error("Give the post a title before sending a test.");
      return;
    }
    try {
      const result = await postNewsletter(
        { ...formData, slug: formData.slug || generateSlug(formData.title) },
        "test",
      );
      toast.success(
        result?.sentTo ? `Test email sent to ${result.sentTo}.` : "Test email sent to you.",
      );
    } catch (err) {
      console.error("Newsletter test failed:", err);
      toast.error(err instanceof Error ? err.message : "Could not send the test email.");
    }
  };

  const handleDelete = async (id: string) => {
    const p = blogPosts.find((post) => post.$id === id);
    const ok = await confirm({
      message: "Delete blog post?",
      description: "This will permanently remove the post.",
    });
    if (!ok) return;
    try {
      await onDelete(id);
      toast.success(`Blog post "${p?.title}" deleted successfully!`);
    } catch (error) {
      console.error("Error deleting blog post:", error);
      toast.error("Failed to delete blog post. Please try again.");
    }
  };

  return { toast, handleSubmit, handleDelete, sendTestNewsletter };
}
