export default function Steps() {
  const steps = [
    { title: "Search Property", desc: "Browse through hundreds of verified options." },
    { title: "Connect with Owner", desc: "Talk directly to schedule a walkthrough." },
    { title: "Visit & Inspect", desc: "Take a physical or virtual tour of the listing." },
    { title: "Finalize Deal", desc: "Buy or rent your new home hassle-free." }
  ];

  return (
    <section className="bg-surface border-y border-line-soft py-20">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-14">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-accent">Process</span>
          <h2 className="font-display text-2xl font-semibold tracking-tight text-ink mt-1.5">How It Works</h2>
          <p className="text-muted text-sm mt-1">Get keys to your dream home in four simple steps.</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 relative">
          <div className="hidden lg:block absolute top-6 left-[12.5%] right-[12.5%] h-px bg-line" />
          {steps.map((step, index) => {
            const delay = `${index * 0.35}s`;
            return (
              <div key={index} className="text-center relative">
                <div className="relative w-12 h-12 mx-auto">
                  <div
                    className="step-circle relative w-12 h-12 rounded-full bg-ink border-2 border-ink text-white font-display font-semibold text-base flex items-center justify-center"
                    style={{ animationDelay: delay }}
                  >
                    <span className="relative z-10">{index + 1}</span>
                    <div className="step-shine-mask" style={{ animationDelay: delay }} />
                  </div>
                  <span
                    className="step-sparkle text-xs -top-1.5 -right-1.5"
                    style={{ animationDelay: `${index * 0.35 + 0.5}s` }}
                  >
                    ✦
                  </span>
                  <span
                    className="step-sparkle text-[9px] -bottom-1 -left-2"
                    style={{ animationDelay: `${index * 0.35 + 1.1}s` }}
                  >
                    ✦
                  </span>
                </div>
                <h4 className="mt-5 font-semibold text-ink text-base">{step.title}</h4>
                <p className="mt-1.5 text-muted text-xs leading-relaxed max-w-[200px] mx-auto">
                  {step.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
