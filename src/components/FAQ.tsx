import { Plus } from "lucide-react";

const questions = [
  {
    question: "What size are the pizzas?",
    answer: "Every pizza on our menu is 12 inches. Pick your own favorite, or add a few different pizzas to the cart to build a lineup for the table.",
  },
  {
    question: "Are there vegetarian options?",
    answer: "Yes. Look for the leaf icon on the menu, or choose the Vegetarian filter to see Margherita, Truffle Mushroom, Garden Party, and Burrata Bliss.",
  },
  {
    question: "How do delivery and pickup compare?",
    answer: "Use the Delivery and Pickup controls to compare your cart. Delivery is $3.50 and is free when the pizza subtotal reaches $35. Pickup has no delivery charge. This practice site does not place real orders.",
  },
  {
    question: "What if I have a food allergy?",
    answer: "Ingredient descriptions appear on each pizza card. Our sample pizzas include wheat and milk. This practice menu does not provide verified allergen or cross-contact information.",
  },
];

export default function FAQ({ compact = false }: { compact?: boolean }) {
  return (
    <section className={`faq-section section-shell${compact ? " faq-compact" : ""}`} id="faq" aria-labelledby="faq-heading">
      <div className="faq-heading">
        <p className="eyebrow">A LITTLE GOOD TO KNOW</p>
        <h2 id="faq-heading" tabIndex={-1}>A few questions.{" "}<br /><span>Some tasty answers.</span></h2>
        <p>From finding your favorite to building your cart, here are a few useful details.</p>
      </div>
      <div className="faq-list">
        {questions.map(({ question, answer }) => (
          <details className="faq-item" key={question}>
            <summary>{question}<Plus size={18} aria-hidden="true" /></summary>
            <p>{answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
