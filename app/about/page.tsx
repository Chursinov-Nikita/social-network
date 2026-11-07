"use client";

import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";
import NeblMark from "@/app/components/shell/NeblMark";
import { getFeatures, getValues } from "./values";
import { useLang } from "@/app/context/language";
import { t } from "@/app/translation/translation";
import chatScreenshot from "@/public/about/chat.jpg";
import feedScreenshot from "@/public/about/feed-phone.jpg";

const About = () => {
  const { data: session } = useSession();
  const { lang } = useLang();
  const tr = t[lang];
  const features = getFeatures(tr);
  const values = getValues(tr);
  const startHref = session?.user ? "/" : "/login";

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-6 md:py-12">
      <section className="text-center">
        <NeblMark className="mx-auto mb-5 h-7 w-9" />
        <h1 className="text-2xl font-medium md:text-3xl">
          {tr.weBuild} {tr.connections}
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-base text-muted">
          {tr.aboutDesc}
        </p>
        <Link href={startHref} className="btn btn-primary mt-5">
          {tr.getStarted}
        </Link>
        <Image
          src={chatScreenshot}
          alt={tr.chats}
          priority
          sizes="(max-width: 896px) 100vw, 848px"
          className="mt-8 w-full rounded-2xl"
        />
      </section>

      <section className="mt-12 md:mt-16">
        <h2 className="text-xl font-medium">
          {tr.technologyFor} {tr.humanConnection}
        </h2>
        <p className="mt-2 max-w-2xl text-base text-muted">{tr.missionDesc}</p>
      </section>

      <section className="mt-12 grid items-center gap-8 md:mt-16 md:grid-cols-[1fr_280px]">
        <div>
          <h2 className="text-xl font-medium">{tr.featuresTitle}</h2>
          <ul className="mt-4 space-y-5">
            {features.map(({ icon: Icon, title, description }) => (
              <li key={title} className="flex gap-4">
                <Icon
                  className="mt-0.5 size-5 shrink-0 text-muted"
                  strokeWidth={1.75}
                />
                <div>
                  <h3 className="text-base font-medium">{title}</h3>
                  <p className="mt-0.5 text-base text-muted">{description}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <Image
          src={feedScreenshot}
          alt={tr.feed}
          sizes="280px"
          className="mx-auto w-full max-w-70 rounded-2xl"
        />
      </section>

      <section className="mt-12 md:mt-16">
        <h2 className="text-xl font-medium">{tr.valuesTitle}</h2>
        <dl className="mt-4 grid gap-x-8 gap-y-5 sm:grid-cols-2">
          {values.map(({ title, description }) => (
            <div key={title}>
              <dt className="text-base font-medium">{title}</dt>
              <dd className="mt-0.5 text-base text-muted">{description}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-12 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-panel p-5 md:mt-16">
        <h2 className="text-xl font-medium">{tr.joinUs}</h2>
        <Link href={startHref} className="btn btn-primary">
          {tr.getStarted}
        </Link>
      </section>
    </div>
  );
};

export default About;
