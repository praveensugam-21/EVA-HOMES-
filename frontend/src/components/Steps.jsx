export default function Steps() {
  const steps = [
    { title: "Search Property", desc: "Browse through hundreds of verified options." },
    { title: "Connect with Owner", desc: "Talk directly to schedule a walkthrough." },
    { title: "Visit & Inspect", desc: "Take a physical or virtual tour of the listing." },
    { title: "Finalize Deal", desc: "Buy or rent your new home hassle-free." }
  ];

  return (
    <section className="bg-zinc-50 border-y border-zinc-100 py-20">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900">How It Works</h2>
          <p className="text-zinc-500 text-sm mt-1">Get keys to your dream home in four simple steps.</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <div key={index} className="text-center relative">
              <div className="w-12 h-12 rounded-full border border-zinc-200 bg-white text-zinc-900 mx-auto flex items-center justify-center font-bold text-base shadow-sm">
                {index + 1}
              </div>
              <h4 className="mt-4 font-bold text-zinc-900 text-base">{step.title}</h4>
              <p className="mt-1 text-zinc-550 text-xs leading-relaxed max-w-[200px] mx-auto">
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}