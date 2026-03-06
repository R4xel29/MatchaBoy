'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface HeroSlide {
  id: number;
  image: string;
  alt: string;
  headline: string;
  subheadline: string;
}

const SLIDES: HeroSlide[] = [
  {
    id: 1,
    image: '/hero/hero-1.jpg',
    alt: 'Matcha being poured into a glass',
    headline: 'Maybe You Need\nMatcha Drink',
    subheadline: 'Premium ceremonial-grade matcha, delivered fresh.',
  },
  {
    id: 2,
    image: '/hero/hero-2.jpg',
    alt: 'Mattchaboy signature collection',
    headline: 'New Culture\nMatcha',
    subheadline: 'Bold flavors for the new generation.',
  },
  {
    id: 3,
    image: '/hero/hero-3.jpg',
    alt: 'Matcha pastries collection',
    headline: 'More Than Just\nA Drink',
    subheadline: 'Croissants, cookies & tiramisu — all matcha.',
  },
];

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? '100%' : '-100%',
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? '-100%' : '100%',
    opacity: 0,
  }),
};

export function Hero() {
  const [[current, direction], setCurrent] = useState([0, 0]);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  const paginate = useCallback(
    (newDirection: number) => {
      setCurrent(([prev]) => {
        const next =
          newDirection > 0
            ? (prev + 1) % SLIDES.length
            : (prev - 1 + SLIDES.length) % SLIDES.length;
        return [next, newDirection];
      });
    },
    []
  );

  // Auto-play
  useEffect(() => {
    if (!isAutoPlaying) return;
    const timer = setInterval(() => paginate(1), 4500);
    return () => clearInterval(timer);
  }, [isAutoPlaying, paginate]);

  const scrollToMenu = () => {
    document.getElementById('menu-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative w-full h-[70vh] min-h-[420px] max-h-[600px] overflow-hidden rounded-b-3xl">
      {/* Slides */}
      <AnimatePresence initial={false} custom={direction} mode="popLayout">
        <motion.div
          key={current}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="absolute inset-0"
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.1}
          onDragEnd={(_, { offset, velocity }) => {
            const swipe = Math.abs(offset.x) * velocity.x;
            if (swipe < -5000) paginate(1);
            else if (swipe > 5000) paginate(-1);
          }}
          onPointerDown={() => setIsAutoPlaying(false)}
          onPointerUp={() => setIsAutoPlaying(true)}
        >
          {/* Background image placeholder */}
          <div className="absolute inset-0 bg-gradient-to-br from-matcha-800 via-matcha-700 to-matcha-600">
            <Image
              src={SLIDES[current].image}
              alt={SLIDES[current].alt}
              fill
              className="object-cover"
              priority={current === 0}
              sizes="100vw"
              onError={(e) => {
                // Hide broken image, gradient shows through
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            {/* Overlay gradient for text readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          </div>

          {/* Content */}
          <div className="relative z-10 flex flex-col justify-end h-full p-6 pb-20">
            <motion.h1
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold text-white whitespace-pre-line leading-[1.1] tracking-tight"
            >
              {SLIDES[current].headline}
            </motion.h1>
            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.35, duration: 0.5 }}
              className="mt-3 text-white/80 text-base md:text-lg max-w-md"
            >
              {SLIDES[current].subheadline}
            </motion.p>
            <motion.button
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.4 }}
              onClick={scrollToMenu}
              className="mt-5 self-start px-8 py-3.5 bg-matcha-500 hover:bg-matcha-400 
                text-matcha-900 font-semibold rounded-full text-sm tracking-wide
                transition-colors touch-target shadow-lg shadow-matcha-500/30
                active:scale-[0.97]"
            >
              Order Now
            </motion.button>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Nav arrows — hidden on mobile */}
      <button
        onClick={() => {
          paginate(-1);
          setIsAutoPlaying(false);
        }}
        className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 z-20 
          w-10 h-10 items-center justify-center rounded-full bg-white/20 
          hover:bg-white/40 backdrop-blur-sm text-white transition-colors"
        aria-label="Previous slide"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      <button
        onClick={() => {
          paginate(1);
          setIsAutoPlaying(false);
        }}
        className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 z-20 
          w-10 h-10 items-center justify-center rounded-full bg-white/20 
          hover:bg-white/40 backdrop-blur-sm text-white transition-colors"
        aria-label="Next slide"
      >
        <ChevronRight className="w-5 h-5" />
      </button>

      {/* Dot indicators */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 flex gap-2">
        {SLIDES.map((slide, i) => (
          <button
            key={slide.id}
            onClick={() => {
              setCurrent([i, i > current ? 1 : -1]);
              setIsAutoPlaying(false);
            }}
            className={`h-2 rounded-full transition-all duration-300 ${
              i === current
                ? 'w-7 bg-matcha-500'
                : 'w-2 bg-white/50 hover:bg-white/70'
            }`}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </section>
  );
}
