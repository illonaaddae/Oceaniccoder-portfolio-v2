import { describe, expect, it } from "vitest";
import { BlogPost } from "@/types";
import { shouldSendNewsletter } from "./newsletterTrigger";

const post = (published: boolean | undefined): BlogPost =>
  ({ $id: "1", title: "A post", published }) as BlogPost;

describe("shouldSendNewsletter", () => {
  it("sends for a new post created as published", () => {
    expect(shouldSendNewsletter(null, { published: true })).toBe(true);
  });

  it("does not send for a new post saved as a draft", () => {
    expect(shouldSendNewsletter(null, { published: false })).toBe(false);
  });

  it("sends when a draft is edited into published", () => {
    // The case that was broken: the send lived only in the create branch, so
    // "save a draft, publish it later" never emailed anyone.
    expect(shouldSendNewsletter(post(false), { published: true })).toBe(true);
  });

  it("does not re-send when an already-published post is edited", () => {
    expect(shouldSendNewsletter(post(true), { published: true })).toBe(false);
  });

  it("does not send when a published post is unpublished", () => {
    expect(shouldSendNewsletter(post(true), { published: false })).toBe(false);
  });

  it("treats a legacy post with no published field as already published", () => {
    // postToFormData maps `published: post.published !== false`, so undefined
    // has always meant published; re-saving one must not blast the list.
    expect(shouldSendNewsletter(post(undefined), { published: true })).toBe(false);
  });

  it("does not send when the form omits published entirely", () => {
    expect(shouldSendNewsletter(null, {})).toBe(false);
  });
});
