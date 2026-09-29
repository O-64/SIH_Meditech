import FeatureCard from "./FeatureCard";

const features = [
  {
    image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80",
    tag: "Daily Ritual",
    title: "Start your morning grounded",
    desc: "A gentle check-in each morning helps you name your mood, set an intention, and face the day with clarity instead of chaos.",
  },
  {
    image: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=600&q=80",
    tag: "Mindfulness",
    title: "Breathe through the hard moments",
    desc: "When stress spikes, Sahaay guides you through breathing exercises and grounding techniques proven to calm the nervous system fast.",
  },
  {
    image: "https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=600&q=80",
    tag: "Rest & Recovery",
    title: "Wind down and sleep better",
    desc: "Sahaay tracks your energy through the day and meets you at night with calming rituals, journaling prompts, or just a quiet presence.",
  },
];

const FeaturesSection = ({ onNavigate }) => (
  <section className="relative z-10 max-w-6xl mx-auto px-8 pb-32">
    <h2 className="text-4xl font-bold font-serif text-center text-white mb-4">
      More than a chatbot
    </h2>
    <p className="text-slate-400 text-center mb-16 max-w-xl mx-auto">
      Sahaay doesn't wait for you to come to it. It reaches out, remembers, and cares.
    </p>
    <div className="grid md:grid-cols-3 gap-6">
      {features.map((f) => (
        <FeatureCard key={f.title} {...f} onNavigate={onNavigate} />
      ))}
    </div>
  </section>
);

export default FeaturesSection;