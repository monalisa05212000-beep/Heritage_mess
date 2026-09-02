import { MvpPreview } from "@/components/preview/mvp-preview";

export const metadata = {
  title: "MVP UX preview · Heritage",
};

/**
 * A deliberately isolated, client-only UX prototype. It does not call an API,
 * write a database record, or replace the authenticated production routes.
 */
export default function PreviewPage() {
  return <MvpPreview />;
}
