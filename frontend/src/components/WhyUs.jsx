import { FaShieldAlt, FaSearchLocation, FaHandshake } from "react-icons/fa";

export default function WhyUs() {
  const data = [
    {
      icon: <FaShieldAlt />,
      title: "Verified Listings",
      desc: "Every listing on our platform undergoes a thorough verification process."
    },
    {
      icon: <FaSearchLocation />,
      title: "Smart Search",
      desc: "Filter properties easily by location, price, type, and configurations."
    },
    {
      icon: <FaHandshake />,
      title: "Trusted Agents",
      desc: "Connect directly with trusted and certified property owners and agents."
    }
  ];

  return (
    <section className="py-20 max-w-7xl mx-auto px-6">
      <div className="text-center mb-12">
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-accent">Why us</span>
        <h2 className="font-display text-2xl font-semibold tracking-tight text-ink mt-1.5">Why Choose EVA Homes?</h2>
        <p className="text-muted text-sm mt-1">We make the home search process simple and reliable.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {data.map((item, index) => (
          <div
            key={index}
            className="bg-white border-2 border-ink rounded-xl p-8 text-center hover:-translate-y-1 hover:shadow-[0_12px_28px_-14px_rgba(16,17,20,0.35)] transition-all duration-200"
          >
            <div className="w-14 h-14 rounded-xl bg-accent-soft text-accent text-xl mb-5 mx-auto flex items-center justify-center">
              {item.icon}
            </div>
            <h3 className="font-display font-semibold text-ink text-lg mb-2">
              {item.title}
            </h3>
            <p className="text-muted text-sm leading-relaxed">
              {item.desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
