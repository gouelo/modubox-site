import { dict, type Locale } from "@/i18n";
import { catalog } from "@/lib/catalog";
import { asset } from "@/lib/paths";
import { Marquee } from "../Marquee";
import { Reveal } from "../Reveal";

/**
 * "Among our clients": the logos from the old site, in one quiet grey,
 * drifting across like the reviews (a row to scroll by hand with reduced motion).
 */
export function ClientLogos({ locale }: { locale: Locale }) {
  const { clients } = catalog(locale);
  const t = dict(locale).clients;
  return (
    <section className="mt-14 sm:mt-20" aria-labelledby="clients-title">
      <Reveal className="container-x text-center">
        <p className="eyebrow justify-center">{t.eyebrow}</p>
        <h2 id="clients-title" className="mt-1 text-2xl font-extrabold sm:text-3xl">{t.title}</h2>
        <p className="mt-2 text-ink-soft">{t.text}</p>
      </Reveal>
      <div className="mt-6 sm:mt-8">
        <Marquee label={t.title} mask="[mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]" speed="animate-[marquee_40s_linear_infinite] ltr:animate-[marquee-ltr_40s_linear_infinite]" className="items-center">
          {clients.map((c) => (
            <div key={c.file} className="shrink-0 px-6 sm:px-9">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={asset(c.file)} alt={c.name} title={c.name} width={c.width} height={c.height} loading="lazy" className="h-12 w-auto opacity-55 transition duration-300 hover:opacity-90 sm:h-16" />
            </div>
          ))}
        </Marquee>
      </div>
    </section>
  );
}
