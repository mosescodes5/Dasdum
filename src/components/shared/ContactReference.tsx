import Link from "next/link";
import { SITE } from "@/lib/site";

/** "hello@yourshop.com" as a mailto link when NEXT_PUBLIC_CONTACT_EMAIL is
 * set, otherwise a link to the contact page — never a made-up address. */
export function ContactReference() {
  if (SITE.contactEmail) {
    return <a href={`mailto:${SITE.contactEmail}`} className="link-underline">{SITE.contactEmail}</a>;
  }
  return <Link href="/contact" className="link-underline">our contact page</Link>;
}
