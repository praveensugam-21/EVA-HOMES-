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
        <h2 className="text-2xl font-bold tracking-tight text-zinc-900">Why Choose EVA Homes?</h2>
        <p className="text-zinc-500 text-sm mt-1">We make the home search process simple and reliable.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {data.map((item, index) => (
          <div
            key={index}
            className="bg-white border border-zinc-100 rounded-xl p-8 text-center shadow-sm"
          >
            <div className="text-zinc-900 text-3xl mb-4 flex justify-center">
              {item.icon}
            </div>
            <h3 className="font-bold text-zinc-900 text-lg mb-2">
              {item.title}
            </h3>
            <p className="text-zinc-500 text-sm leading-relaxed">
              {item.desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}