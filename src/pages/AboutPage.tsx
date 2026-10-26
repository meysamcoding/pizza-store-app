import { ArrowRight, Clock3, Flame, Heart, Leaf } from "lucide-react";

export default function AboutPage({
  assetUrl,
}: {
  assetUrl: (path: string) => string;
}) {
  return (
    <div className="content-page about-page">
      <section className="page-intro about-intro section-shell" aria-labelledby="about-heading">
        <div className="page-intro-copy">
          <a className="page-breadcrumb" href="#menu">Back to the menu <ArrowRight size={14} /></a>
          <p className="eyebrow">THE FORNO STORY</p>
          <h1 id="about-heading">A little flour.{" "}<br /><span>A lot of heart.</span></h1>
          <p className="page-lead">We make pizza for the moments that bring people together. Nothing complicated. Just good ingredients, patient dough, and a generous helping of care.</p>
          <div className="page-inline-note"><Heart size={16} /><span>Good pizza. Great company. Always.</span></div>
        </div>
        <div className="about-art">
          <img src={assetUrl("images/burrata.svg")} alt="Illustrated burrata pizza with tomatoes and fresh basil" />
          <span className="about-art-label"><Flame size={17} /> Simple ingredients. A little oven magic.</span>
          <span className="about-art-star" aria-hidden="true">✳</span>
        </div>
      </section>

      <section className="page-story section-shell" aria-labelledby="about-story-heading">
        <div>
          <p className="eyebrow">THE THINGS WE BELIEVE</p>
          <h2 id="about-story-heading">A good pizza starts{" "}<br />with the little things.</h2>
        </div>
        <div className="page-story-copy">
          <p>At Forno, the idea is simple: make the kind of pizza you want to put in the middle of the table. A light, golden crust. Bright tomatoes. Creamy mozzarella. Toppings that each have a reason to be there.</p>
          <p>We keep the classics close and leave a little room for a new favorite. Whether you reach for Margherita every time or come for the hot honey, there is a place for you here.</p>
        </div>
      </section>

      <section className="page-values section-shell" aria-label="What matters at Forno">
        <article className="page-value-card">
          <span className="page-value-icon"><Clock3 size={24} /></span>
          <span className="page-value-number" aria-hidden="true">01</span>
          <h3>A little patience</h3>
          <p>Slow-risen dough gives our pizza its light texture and familiar character. Good things deserve a little time.</p>
        </article>
        <article className="page-value-card">
          <span className="page-value-icon"><Leaf size={24} /></span>
          <span className="page-value-number" aria-hidden="true">02</span>
          <h3>Every ingredient counts</h3>
          <p>From the tomato sauce to the last leaf of basil, we choose combinations that let simple flavors shine.</p>
        </article>
        <article className="page-value-card">
          <span className="page-value-icon"><Heart size={24} /></span>
          <span className="page-value-number" aria-hidden="true">03</span>
          <h3>A table for everyone</h3>
          <p>Classic comforts, something with a little heat, and plenty of vegetarian favorites. Different tastes, one good table.</p>
        </article>
      </section>

      <section className="page-ingredients section-shell" aria-labelledby="ingredients-heading">
        <div className="page-ingredients-note"><Flame size={24} /><span>FROM THE FIRST STRETCH{" "}<br />TO THE LAST SLICE</span></div>
        <div>
          <p className="eyebrow">LESS FUSS. MORE FLAVOR.</p>
          <h2 id="ingredients-heading">Nothing to hide.{" "}<br />Everything to enjoy.</h2>
          <p>Our menu tells you what is on every pizza, with clear vegetarian and spicy markers to help you find your favorite. No guesswork. Just a lineup worth getting to know.</p>
          <a className="text-link page-story-link" href="#/contact">Have a question? Let’s talk <ArrowRight size={17} /></a>
        </div>
      </section>

      <section className="page-cta section-shell" aria-labelledby="about-cta-heading">
        <div><p className="eyebrow">YOUR NEXT FAVORITE IS WAITING</p><h2 id="about-cta-heading">Enough about us.{" "}<br />Let’s talk pizza.</h2></div>
        <a className="primary-button" href="#menu">Explore the menu <ArrowRight size={19} /></a>
      </section>
    </div>
  );
}
