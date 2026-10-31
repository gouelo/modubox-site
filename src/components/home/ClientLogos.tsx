import clientsFile from "../../../data/clients.json";
import { asset } from "@/lib/paths";
import { Reveal } from "../Reveal";

/**
 * "Among our clients": the logos from the old site, in one quiet grey,
 * drifting across like the reviews (a row to scroll by hand with reduced motion).
 */
export function ClientLogos() {
  const clients = clientsFile.clients;
  return (
    <section className="mt-14 sm:mt-20" aria-labelledby="clients-title">
      <Reveal className="container-x text-center">
        <p className="eyebrow justify-center">לקוחות קיימים</p>
        <h2 id="clients-title" className="mt-1 text-2xl font-extrabold sm:text-3xl">בין לקוחותינו</h2>
        <p className="mt-2 text-ink-soft">חברות, רשויות ומוסדות שבחרו במבנים של מודובוקס</p>
      </Reveal>
      <div className="group relative mt-6 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)] motion-reduce:overflow-x-auto sm:mt-8">
        <ul className="flex w-max animate-[marquee_40s_linear_infinite] items-center group-hover:[animation-play-state:paused] motion-reduce:animate-none">
          {[0, 1].map((copy) =>
            clients.map((c) => (
              <li key={`${copy}-${c.file}`} className="shrink-0 px-6 sm:px-9" aria-hidden={copy === 1 || undefined}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={asset(c.file)}
                  alt={copy === 0 ? c.name : ""}
                  title={c.name}
                  width={c.width}
                  height={c.height}
                  loading="lazy"
                  className="h-12 w-auto opacity-55 transition duration-300 hover:opacity-90 sm:h-16"
                />
              </li>
            )),
          )}
        </ul>
      </div>
    </section>
  );
}
