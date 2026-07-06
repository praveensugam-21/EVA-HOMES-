export default function Testimonials() {
  const reviews = [
    { name: "Rahul Sharma", text: "Finding my apartment in Mumbai was exceptionally smooth. Verified listings made the difference." },
    { name: "Sneha Patel", text: "Directly connecting with verified owners saved me broker commissions and weeks of effort." },
    { name: "Amit Verma", text: "Professional agents and verified listings. Highly recommend EVA Homes for property searching." }
  ];

  return (
    <section className="py-20 max-w-7xl mx-auto px-6">
      <div className="text-center mb-12">
        <h2 className="text-2xl font-bold tracking-tight text-zinc-900">Happy Clients</h2>
        <p className="text-zinc-500 text-sm mt-1">Hear what our clients have to say about us.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {reviews.map((review, i) => (
          <div key={i} className="bg-white p-6 border border-zinc-100 rounded-xl shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex text-amber-400 text-sm mb-3">★★★★★</div>
              <p className="text-zinc-650 text-sm italic leading-relaxed">
                "{review.text}"
              </p>
            </div>
            <h4 className="mt-4 font-semibold text-zinc-900 text-sm">
              {review.name}
            </h4>
          </div>
        ))}
      </div>
    </section>
  );
}