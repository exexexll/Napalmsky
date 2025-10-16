'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import Image from 'next/image';
import { Container } from '@/components/Container';

export default function ManifestoPage() {
  const { scrollYProgress } = useScroll();
  
  // Parallax effect for background (reversed direction)
  const y = useTransform(scrollYProgress, [0, 1], ['0%', '-20%']);

  const fadeInVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        delay: i * 0.15,
        ease: [0.25, 0.1, 0.25, 1],
      },
    }),
  };

  return (
    <main id="main" className="relative min-h-screen">
      {/* Background Image with Parallax */}
      <div className="fixed inset-0 -z-10">
        <motion.div
          style={{ y }}
          className="relative h-[120vh] w-full motion-reduce:transform-none"
        >
          <Image
            src="/image2.jpg"
            alt="Vertical city street view at dusk"
            fill
            sizes="100vw"
            className="object-cover"
            quality={90}
            priority
          />
        </motion.div>
        {/* Dark overlay for readability */}
        <div className="absolute inset-0 bg-black/70" />
      </div>

      {/* Content */}
      <div className="relative z-10 py-32 sm:py-40 lg:py-48">
        <Container>
          <div className="max-w-3xl">
            {/* Title */}
            <motion.h1
              custom={0}
              variants={fadeInVariants}
              initial="hidden"
              animate="visible"
              className="mb-12 font-playfair text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl motion-reduce:opacity-100 motion-reduce:translate-y-0"
            >
              Manifesto
            </motion.h1>

            {/* Manifesto Content - Left-aligned with bold text */}
            <div className="space-y-8 text-left">
              <motion.p
                custom={1}
                variants={fadeInVariants}
                initial="hidden"
                animate="visible"
                className="font-inter text-lg font-bold leading-relaxed text-white/95 sm:text-xl motion-reduce:opacity-100 motion-reduce:translate-y-0"
              >
                It is true:
                <br />
                <span className="italic">&quot;Most days of the year are unremarkable. They begin and they end with no lasting 
                memory made in between. Most days have no impact on the course of a life.&quot;</span>
                <br />
                — 500 Days of Summer
              </motion.p>

              <motion.p
                custom={2}
                variants={fadeInVariants}
                initial="hidden"
                animate="visible"
                className="font-inter text-lg font-bold leading-relaxed text-white/95 sm:text-xl motion-reduce:opacity-100 motion-reduce:translate-y-0"
              >
                But:
                <br />
                Somedays do. They appear in no particular order, and it&apos;s not like there are signs written all over it, but those are the days that make you feel the sun finally shine through.
              </motion.p>

              <motion.p
                custom={3}
                variants={fadeInVariants}
                initial="hidden"
                animate="visible"
                className="font-inter text-lg font-bold leading-relaxed text-white/95 sm:text-xl motion-reduce:opacity-100 motion-reduce:translate-y-0"
              >
                Like Tom Hansen, I spent years waiting for my soulmate, only to learn love isn&apos;t fate nor a game you 
                can beat; it&apos;s coincidence — and it will only happen if you keep trying, again and again, until someone comes 
                around who loves you for who you are.
              </motion.p>

              <motion.p
                custom={4}
                variants={fadeInVariants}
                initial="hidden"
                animate="visible"
                className="font-inter text-lg font-bold leading-relaxed text-white/95 sm:text-xl motion-reduce:opacity-100 motion-reduce:translate-y-0"
              >
                Like everything that has happened in life, nobody is promised success. Even if you end up finding nobody, do cherish the moments, the laughter, and the time you told others how you really felt on this platform. Forget the rules, rationale or that stupid mental checklist everyone swears by. Live in the present. Carpe Diem! Hurry up and pick up your next call, because you only get one lifetime to find the person you love.
              </motion.p>

              <motion.p
                custom={5}
                variants={fadeInVariants}
                initial="hidden"
                animate="visible"
                className="font-inter text-lg font-bold leading-relaxed text-white/95 sm:text-xl motion-reduce:opacity-100 motion-reduce:translate-y-0"
              >
                Happy Speed-dating
              </motion.p>

              <motion.p
                custom={6}
                variants={fadeInVariants}
                initial="hidden"
                animate="visible"
                className="font-inter text-base italic leading-relaxed text-white/80 sm:text-lg motion-reduce:opacity-100 motion-reduce:translate-y-0"
              >
                (P.S: My wish is you make this website an ally in your pursuit of happiness, not a tool. Also, go watch 500 
                days of summer if you haven&apos;t:)
              </motion.p>
            </div>

            {/* Spacer for scroll */}
            <div className="h-32" />
          </div>
        </Container>
      </div>
    </main>
  );
}

