import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { ArrowRight, Check, Heart, MessageCircle, NotebookPen } from "lucide-react";
import FAQ from "../components/FAQ";

type ContactFields = { name: string; email: string; topic: string; message: string };
type ContactErrors = Partial<Record<keyof ContactFields, string>>;
const emptyFields: ContactFields = { name: "", email: "", topic: "", message: "" };
const topics = ["Menu question", "Dietary question", "General feedback", "Something else"];

export default function ContactPage() {
  const [fields, setFields] = useState<ContactFields>(emptyFields);
  const [errors, setErrors] = useState<ContactErrors>({});
  const [preview, setPreview] = useState<ContactFields | null>(null);
  const previewHeading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (preview) previewHeading.current?.focus();
  }, [preview]);

  function updateField(field: keyof ContactFields, value: string) {
    setFields((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setPreview(null);
  }

  function submitPreview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: ContactErrors = {};
    const next = Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, value.trim()])) as ContactFields;
    if (next.name.length < 2) nextErrors.name = "Please enter your name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next.email)) nextErrors.email = "Please enter a valid email address.";
    if (!topics.includes(next.topic)) nextErrors.topic = "Please choose a topic.";
    if (next.message.length < 10) nextErrors.message = "Please write a message of at least 10 characters.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      setPreview(null);
      window.requestAnimationFrame(() => document.getElementById(`contact-${Object.keys(nextErrors)[0]}`)?.focus());
      return;
    }
    setPreview(next);
  }

  function readFAQs(event: React.MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    const heading = document.getElementById("faq-heading");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    heading?.focus({ preventScroll: true });
    document.getElementById("faq")?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
  }

  return (
    <div className="content-page contact-page">
      <section className="page-intro contact-intro section-shell" aria-labelledby="contact-heading">
        <p className="eyebrow">SAY HELLO</p>
        <h1 id="contact-heading">Good conversations{" "}<br /><span>start here.</span></h1>
        <p className="page-lead">A question about a favorite, a little feedback, or just a friendly hello. There is always room for a good conversation.</p>
      </section>

      <section className="contact-layout section-shell" aria-label="Contact information and message preview">
        <aside className="contact-information">
          <div className="contact-information-icon"><MessageCircle size={28} /></div>
          <h2>Before you say hello.</h2>
          <p>This is a practice restaurant website. Real contact details and opening hours have not been added yet.</p>
          <div className="contact-information-note"><NotebookPen size={21} /><div><h3>A little preview, just for you</h3><p>Use the form to preview your message. It will not be sent or saved.</p></div></div>
          <div className="contact-information-note"><Heart size={21} /><div><h3>Looking for a quick answer?</h3><p>Our frequently asked questions cover pizza sizes, vegetarian choices, and the sample menu.</p></div></div>
          <a className="text-link" href="#faq" onClick={readFAQs}>Read the FAQs <ArrowRight size={17} /></a>
          <a className="contact-menu-link" href="#menu">Or find your next favorite on the menu <ArrowRight size={16} /></a>
        </aside>

        <div className="contact-form-card">
          <div className="contact-form-heading"><span className="eyebrow">LET’S START WITH A HELLO</span><h2>What is on your mind?</h2><p>Write a message and see how it looks. No message will be sent.</p></div>
          <form className="contact-form" onSubmit={submitPreview} noValidate>
            <div className="contact-form-row">
              <div className="contact-field">
                <label htmlFor="contact-name">Your name</label>
                <input id="contact-name" name="name" autoComplete="name" placeholder="Alex Smith" maxLength={100} value={fields.name} onChange={(event) => updateField("name", event.target.value)} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? "contact-name-error" : undefined} required />
                {errors.name && <p className="contact-field-error" id="contact-name-error">{errors.name}</p>}
              </div>
              <div className="contact-field">
                <label htmlFor="contact-email">Email address</label>
                <input id="contact-email" name="email" type="email" autoComplete="email" placeholder="you@example.com" maxLength={254} value={fields.email} onChange={(event) => updateField("email", event.target.value)} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "contact-email-error" : undefined} required />
                {errors.email && <p className="contact-field-error" id="contact-email-error">{errors.email}</p>}
              </div>
            </div>
            <div className="contact-field">
              <label htmlFor="contact-topic">Topic</label>
              <select id="contact-topic" name="topic" value={fields.topic} onChange={(event) => updateField("topic", event.target.value)} aria-invalid={Boolean(errors.topic)} aria-describedby={errors.topic ? "contact-topic-error" : undefined} required>
                <option value="">Choose a topic</option>
                {topics.map((topic) => <option key={topic} value={topic}>{topic}</option>)}
              </select>
              {errors.topic && <p className="contact-field-error" id="contact-topic-error">{errors.topic}</p>}
            </div>
            <div className="contact-field">
              <label htmlFor="contact-message">Your message</label>
              <textarea id="contact-message" name="message" placeholder="Tell us what is on your mind…" rows={5} maxLength={2000} value={fields.message} onChange={(event) => updateField("message", event.target.value)} aria-invalid={Boolean(errors.message)} aria-describedby={errors.message ? "contact-message-error contact-preview-note" : "contact-preview-note"} required />
              {errors.message && <p className="contact-field-error" id="contact-message-error">{errors.message}</p>}
            </div>
            <div className="contact-form-bottom"><p id="contact-preview-note">Preview only. Your details stay in this form and are not stored.</p><button className="primary-button" type="submit">Preview message <ArrowRight size={17} /></button></div>
          </form>
          {preview && (
            <section className="contact-message-preview" aria-labelledby="contact-preview-heading">
              <div className="contact-preview-kicker"><Check size={16} /> READY TO REVIEW</div>
              <h2 id="contact-preview-heading" ref={previewHeading} tabIndex={-1}>Message preview — not sent.</h2>
              <dl><div><dt>From</dt><dd>{preview.name} · {preview.email}</dd></div><div><dt>Topic</dt><dd>{preview.topic}</dd></div></dl>
              <p className="contact-preview-message">{preview.message}</p>
              <p className="contact-preview-note">This is a preview for this visit. It has not been sent or saved.</p>
            </section>
          )}
        </div>
      </section>
      <FAQ />
    </div>
  );
}
