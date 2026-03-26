import { LoginForm } from "@/modules/auth/login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="grid w-full max-w-6xl gap-10 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-[2rem] border border-border/80 bg-[#233126] p-10 text-white shadow-[0_30px_80px_-40px_rgba(31,45,29,0.55)]">
          <div className="font-mono text-xs uppercase tracking-[0.35em] text-[#c8ddb9]">
            Besawit
          </div>
          <h1 className="mt-6 max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
            Palm agent, inventory, toko pertanian, dan finance dalam satu sistem.
          </h1>
          <p className="mt-6 max-w-xl text-sm leading-7 text-white/72">
            Fokus pada operasional cepat, akurasi margin, kontrol stock, dan jejak audit
            yang jelas untuk bisnis sawit dan toko.
          </p>
        </section>
        <div className="flex items-center justify-center">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
