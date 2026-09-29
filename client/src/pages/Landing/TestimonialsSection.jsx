import TestimonialCard from "./TestimonialCard";

const TestimonialsSection = () => (
  <section className="relative z-10 max-w-6xl mx-auto px-8 pb-32">
    <h2 className="text-3xl font-bold font-serif text-center text-white mb-12">
      What people say
    </h2>
    <div className="grid md:grid-cols-3 gap-6">
      <TestimonialCard
        quote="It remembered my interview and texted me after. I cried. No app has ever felt that human."
        name="Priya, 24"
        mood="🌸"
      />
      <TestimonialCard
        quote="I told it I was anxious about a call at 3pm. At 5pm it asked how it went. That follow-up meant everything."
        name="Arjun, 28"
        mood="☀️"
      />
      <TestimonialCard
        quote="After a terrible day, Sahaay suggested ordering from my favourite restaurant. I didn't know I needed that."
        name="Sneha, 22"
        mood="🌙"
      />
    </div>
  </section>
);

export default TestimonialsSection;