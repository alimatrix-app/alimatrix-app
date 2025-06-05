"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  motion,
  useScroll,
  useTransform,
  AnimatePresence,
  useInView,
} from "framer-motion";
import {
  FileText,
  ShieldCheck,
  BarChart3,
  Users,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  TrendingUp,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Logo } from "@/components/ui/custom/Logo";

export default function StartPage() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [currentYear, setCurrentYear] = useState(2024);
  const [mounted, setMounted] = useState(false);

  // References for scroll animations
  const heroRef = useRef(null);
  const howItWorksRef = useRef(null);
  const statsRef = useRef(null);
  const isStatsInView = useInView(statsRef, { once: true });
  const isHowItWorksInView = useInView(howItWorksRef, { once: true });

  // Setup scroll-based animations
  const { scrollYProgress } = useScroll();
  const heroOpacity = useTransform(scrollYProgress, [0, 0.3], [1, 0.7]);
  const heroScale = useTransform(scrollYProgress, [0, 0.3], [1, 0.98]);
  const backgroundY = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
  useEffect(() => {
    // Set mounted flag and current year on client side to avoid hydration mismatch
    setMounted(true);
    setCurrentYear(new Date().getFullYear());

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener("scroll", handleScroll);
    window.addEventListener("mousemove", handleMouseMove);

    // Interval for statistics animation
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev === 0 ? 1 : 0));
    }, 4000);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("mousemove", handleMouseMove);
      clearInterval(interval);
    };
  }, []);

  const fadeInUp = {
    initial: { opacity: 0, y: 30 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.8, ease: [0.25, 0.1, 0.25, 1] },
  };

  const staggerContainer = {
    initial: {},
    animate: {
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.2,
      },
    },
  };

  const scaleIn = {
    initial: { opacity: 0, scale: 0.9 },
    animate: { opacity: 1, scale: 1 },
    transition: { duration: 0.6, ease: "easeOut" },
  };
  return (
    <div
      className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 overflow-x-hidden relative"
      suppressHydrationWarning
    >
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          style={{ y: backgroundY }}
          className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-r from-blue-400/10 to-purple-400/10 rounded-full blur-3xl"
        />
        <motion.div
          style={{ y: backgroundY }}
          className="absolute top-1/3 right-1/4 w-80 h-80 bg-gradient-to-r from-indigo-400/10 to-cyan-400/10 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.1, 1],
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      </div>{" "}
      {/* Header with glassmorphism */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 py-4 px-4 transition-all duration-500 ${
          mounted && isScrolled
            ? "bg-white/70 backdrop-blur-xl border-b border-white/20 shadow-lg shadow-black/5"
            : "bg-transparent"
        }`}
      >
        <div className="container mx-auto max-w-6xl flex justify-center items-center">
          <motion.div
            className="relative"
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <Logo size="large" />
            {/* Enhanced stamp overlay */}
            <motion.div
              className="absolute top-1 -right-8 bg-gradient-to-r from-blue-500/20 to-purple-500/20 backdrop-blur-sm text-xs text-blue-900 py-1.5 px-4 rounded-full border border-blue-200/30"
              animate={{ rotate: [-1, 1, -1] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              <span className="flex items-center gap-1">
                <Sparkles size={10} />
                Serwis w fazie rozwoju
              </span>
            </motion.div>
          </motion.div>
        </div>
      </header>
      {/* Enhanced Hero Section */}
      <motion.section
        ref={heroRef}
        style={{ opacity: heroOpacity, scale: heroScale }}
        className="relative pt-32 pb-20 px-4 md:pt-40 md:pb-32 overflow-hidden"
      >
        {/* Dynamic background pattern */}
        <div className="absolute inset-0 opacity-[0.02]">
          <svg
            className="h-full w-full"
            viewBox="0 0 100 100"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <pattern
                id="grid"
                width="10"
                height="10"
                patternUnits="userSpaceOnUse"
              >
                <circle cx="5" cy="5" r="1.5" fill="currentColor" />
                <circle
                  cx="5"
                  cy="5"
                  r="0.5"
                  fill="currentColor"
                  opacity="0.5"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        <div className="container mx-auto max-w-5xl text-center relative z-10">
          <motion.div
            initial="initial"
            animate="animate"
            variants={staggerContainer}
            className="space-y-8"
          >
            <motion.div
              variants={fadeInUp}
              className="inline-flex mx-auto mb-4"
            >
              <span className="bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 text-sm font-medium px-4 py-2 rounded-full flex items-center border border-blue-200/30 shadow-lg shadow-blue-500/10">
                <motion.span
                  className="h-2 w-2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 mr-2"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                Inicjatywa społeczna
              </span>
            </motion.div>

            <motion.h1
              variants={fadeInUp}
              className="text-4xl md:text-5xl lg:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 leading-tight tracking-tight"
            >
              Alimenty bez tajemnic
            </motion.h1>

            <motion.p
              variants={fadeInUp}
              className="text-xl md:text-2xl text-slate-600 max-w-4xl mx-auto leading-relaxed font-light"
            >
              AliMatrix to inicjatywa tworzona przez rodziców, którzy dzielą się
              swoją sytuacją alimentacyjną, by wspólnie budować{" "}
              <span className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                bardziej przejrzysty system w Polsce
              </span>
              .
            </motion.p>

            <motion.div
              variants={fadeInUp}
              className="flex flex-col sm:flex-row justify-center gap-6 pt-4"
            >
              <Button
                asChild
                size="lg"
                className="group relative bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-lg px-10 py-7 shadow-xl shadow-blue-500/25 hover:shadow-2xl hover:shadow-blue-500/40 transition-all duration-300 border-0 rounded-2xl overflow-hidden"
              >
                <Link href="/formularz">
                  <span className="relative z-10 flex items-center justify-center">
                    Wypełnij formularz
                    <ArrowRight
                      className="ml-3 group-hover:translate-x-1 transition-transform duration-300"
                      size={20}
                    />
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                </Link>
              </Button>

              <Button
                asChild
                variant="outline"
                size="lg"
                className="text-lg py-7 px-10 rounded-2xl border-2 border-slate-200 hover:border-blue-300 bg-white/50 backdrop-blur-sm hover:bg-white/80 transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                <a href="#jak-to-dziala">Dowiedz się więcej</a>
              </Button>
            </motion.div>

            <motion.div
              variants={fadeInUp}
              className="flex flex-wrap justify-center mt-8 gap-x-10 gap-y-4 text-sm text-slate-600"
            >
              {[
                { icon: Shield, text: "Pełna anonimowość" },
                { icon: CheckCircle2, text: "Zgodność z RODO" },
                { icon: ShieldCheck, text: "Bezpieczne przetwarzanie" },
              ].map((item, index) => (
                <motion.div
                  key={index}
                  className="flex items-center gap-2 bg-white/50 backdrop-blur-sm px-4 py-2 rounded-full border border-slate-200/50"
                  whileHover={{ scale: 1.05, y: -2 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <item.icon size={16} className="text-green-500" />
                  <span className="font-medium">{item.text}</span>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </motion.section>
      {/* Enhanced Logo Section */}
      <motion.div
        className="text-center pb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.8 }}
      >
        <motion.div
          whileHover={{ scale: 1.05 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <Image
            className="inline-block drop-shadow-xl"
            src="/kct.png"
            alt="AliMatrix Logo"
            width={340}
            height={85}
            priority
          />
        </motion.div>
      </motion.div>
      {/* Enhanced Main Content */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 0.5 }}
        className="pb-16 px-4"
      >
        <div className="container mx-auto max-w-5xl">
          <div className="space-y-16 md:space-y-24">
            {/* Enhanced Intro Text */}
            <motion.div
              className="relative bg-gradient-to-br from-white via-white to-blue-50/30 rounded-3xl p-8 md:p-12 shadow-xl border border-white/50 backdrop-blur-sm"
              whileHover={{ y: -5, scale: 1.01 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-400/10 to-purple-400/10 rounded-full blur-2xl -mr-8 -mt-8" />
              <div className="relative z-10">
                <p className="text-slate-700 mb-6 text-lg leading-relaxed">
                  Jesteśmy na wczesnym etapie rozwoju – zbieramy rzeczywiste
                  dane o ustalonych alimentach, by już za kilka tygodni
                  udostępnić rzetelne raporty i analizy.
                </p>
                <p className="text-slate-800 font-semibold text-lg">
                  Twoje zgłoszenie ma znaczenie – im więcej danych, tym większa
                  przejrzystość i lepsze decyzje.
                </p>
              </div>
            </motion.div>

            {/* Enhanced How It Works Section */}
            <div id="jak-to-dziala" ref={howItWorksRef} className="space-y-12">
              <motion.div
                className="mb-12 text-center"
                initial={{ opacity: 0, y: 30 }}
                animate={isHowItWorksInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.8 }}
              >
                <span className="bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 text-sm font-medium px-5 py-2 rounded-full border border-blue-200/30">
                  Prosty proces
                </span>
                <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mt-6 tracking-tight">
                  Jak to działa?
                </h2>
                <p className="text-slate-600 mt-4 max-w-3xl mx-auto text-lg leading-relaxed">
                  Prosty proces, który pomoże zwiększyć transparentność systemu
                  alimentacyjnego w Polsce
                </p>
              </motion.div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {[
                  {
                    icon: FileText,
                    title: "Wypełniasz formularz",
                    description:
                      "Jeśli masz już ustalone alimenty (sądowo, ugodowo lub na podstawie porozumienia).",
                    color: "blue",
                    hasButton: true,
                  },
                  {
                    icon: ShieldCheck,
                    title: "Twoje dane trafiają do bazy",
                    description:
                      "Dane są bezpieczne i anonimowe – zgodnie z RODO i zabezpieczone technologicznie.",
                    color: "green",
                  },
                  {
                    icon: BarChart3,
                    title: "Analizujemy zebrane przypadki",
                    description:
                      "Wkrótce udostępnimy rzetelne raporty i statystyki dla Ciebie i innych użytkowników.",
                    color: "purple",
                  },
                  {
                    icon: Users,
                    title: "Pomagasz innym",
                    description:
                      "Twoje zgłoszenie zwiększa przejrzystość i przewidywalność systemu alimentacyjnego w Polsce.",
                    color: "amber",
                  },
                ].map((step, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 30 }}
                    animate={isHowItWorksInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                  >
                    <Card className="group relative overflow-hidden border-0 shadow-lg hover:shadow-2xl transition-all duration-500 hover:translate-y-[-8px] bg-gradient-to-br from-white to-slate-50/50 backdrop-blur-sm h-full">
                      <div className="absolute inset-0 bg-gradient-to-br from-transparent to-slate-100/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      <CardContent className="p-8 flex flex-col items-center text-center h-full relative z-10">
                        <motion.div
                          className={`h-16 w-16 bg-gradient-to-br ${
                            step.color === "blue"
                              ? "from-blue-100 to-blue-200"
                              : step.color === "green"
                              ? "from-green-100 to-green-200"
                              : step.color === "purple"
                              ? "from-purple-100 to-purple-200"
                              : "from-amber-100 to-amber-200"
                          } rounded-3xl flex items-center justify-center mb-6 shadow-lg`}
                          whileHover={{ scale: 1.1, rotate: 5 }}
                          transition={{ type: "spring", stiffness: 300 }}
                        >
                          <step.icon
                            className={`h-8 w-8 ${
                              step.color === "blue"
                                ? "text-blue-600"
                                : step.color === "green"
                                ? "text-green-600"
                                : step.color === "purple"
                                ? "text-purple-600"
                                : "text-amber-600"
                            }`}
                          />
                        </motion.div>

                        <h3 className="text-xl font-semibold mb-4 text-slate-900 tracking-tight">
                          {step.title}
                        </h3>

                        <p className="text-slate-600 mb-6 flex-grow leading-relaxed">
                          {step.description}
                        </p>

                        {step.hasButton && (
                          <div className="pt-4">
                            <Button
                              asChild
                              variant="ghost"
                              className="text-blue-600 hover:bg-blue-50 p-0 h-auto flex items-center gap-2 group/btn"
                            >
                              <Link href="/formularz">
                                <span className="font-medium">Rozpocznij</span>
                                <ArrowRight
                                  size={16}
                                  className="group-hover/btn:translate-x-1 transition-transform duration-300"
                                />
                              </Link>
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Enhanced Statistics Section */}
            <motion.div
              ref={statsRef}
              className="py-16"
              initial={{ opacity: 0 }}
              animate={isStatsInView ? { opacity: 1 } : {}}
              transition={{ duration: 1 }}
            >
              <div className="mb-12 text-center">
                <h2 className="text-3xl md:text-4xl font-bold text-slate-900 flex items-center justify-center tracking-tight">
                  <TrendingUp className="mr-3 text-blue-600" size={36} />
                  Statystyki na dziś
                </h2>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Enhanced Stats Card */}
                <motion.div
                  initial={{ opacity: 0, x: -30 }}
                  animate={isStatsInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.8, delay: 0.2 }}
                >
                  <Card className="relative overflow-hidden border-0 shadow-2xl bg-gradient-to-br from-white via-white to-blue-50/30 backdrop-blur-sm h-full">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-blue-400/10 via-purple-400/10 to-transparent rounded-full blur-2xl -mr-10 -mt-10" />

                    <CardContent className="p-8 relative h-full">
                      <h3 className="text-xl font-semibold text-slate-800 mb-8 flex items-center">
                        <BarChart3 className="mr-3 text-blue-600" size={24} />
                        Analiza danych
                      </h3>

                      <div className="relative h-48 md:h-56 flex items-center justify-center">
                        <AnimatePresence mode="wait">
                          <motion.div
                            key={activeIndex}
                            initial={{ opacity: 0, y: 30, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -30, scale: 0.9 }}
                            transition={{ duration: 0.7, ease: "easeOut" }}
                            className="absolute inset-0 flex flex-col items-center justify-center"
                          >
                            {activeIndex === 0 ? (
                              <>
                                <motion.span
                                  className="text-6xl md:text-7xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600"
                                  animate={{ scale: [1, 1.05, 1] }}
                                  transition={{ duration: 2, repeat: Infinity }}
                                >
                                  124
                                </motion.span>
                                <span className="text-center mt-6 text-slate-600 text-lg leading-relaxed max-w-xs">
                                  osoby podzieliły się swoją sytuacją
                                  alimentacyjną
                                </span>
                              </>
                            ) : (
                              <>
                                <motion.span
                                  className="text-6xl md:text-7xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600"
                                  animate={{ scale: [1, 1.05, 1] }}
                                  transition={{ duration: 2, repeat: Infinity }}
                                >
                                  43
                                </motion.span>
                                <span className="text-center mt-6 text-slate-600 text-lg leading-relaxed max-w-xs">
                                  minuty średni czas dokładnego wypełnienia
                                  formularza
                                </span>
                              </>
                            )}
                          </motion.div>
                        </AnimatePresence>
                      </div>

                      {/* Enhanced indicator dots */}
                      <div className="flex justify-center gap-3 mt-6">
                        {[0, 1].map((index) => (
                          <button
                            key={index}
                            onClick={() => setActiveIndex(index)}
                            className={`h-3 rounded-full transition-all duration-300 ${
                              activeIndex === index
                                ? "w-8 bg-gradient-to-r from-blue-500 to-indigo-500"
                                : "w-3 bg-slate-300 hover:bg-slate-400"
                            }`}
                            aria-label={`Zobacz statystykę ${index + 1}`}
                          />
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Enhanced CTA Card */}
                <motion.div
                  initial={{ opacity: 0, x: 30 }}
                  animate={isStatsInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.8, delay: 0.4 }}
                >
                  <Card className="relative overflow-hidden border-0 shadow-2xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 h-full">
                    {/* Animated background pattern */}
                    <div className="absolute inset-0 opacity-10">
                      <motion.svg
                        className="h-full w-full"
                        viewBox="0 0 100 100"
                        xmlns="http://www.w3.org/2000/svg"
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 30,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                      >
                        <pattern
                          id="grid-pattern"
                          x="0"
                          y="0"
                          width="20"
                          height="20"
                          patternUnits="userSpaceOnUse"
                        >
                          <circle cx="10" cy="10" r="1" fill="currentColor" />
                          <circle
                            cx="10"
                            cy="10"
                            r="3"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="0.5"
                          />
                        </pattern>
                        <rect
                          x="0"
                          y="0"
                          width="100%"
                          height="100%"
                          fill="url(#grid-pattern)"
                        />
                      </motion.svg>
                    </div>

                    <CardContent className="p-8 relative h-full flex flex-col">
                      <motion.div
                        className="inline-flex items-center px-4 py-2 bg-white/15 backdrop-blur-sm text-white rounded-full text-sm mb-8 border border-white/20"
                        animate={{ y: [0, -2, 0] }}
                        transition={{ duration: 3, repeat: Infinity }}
                      >
                        <motion.span
                          className="h-2 w-2 rounded-full bg-white mr-3"
                          animate={{ opacity: [0.5, 1, 0.5] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        />
                        Projekt wspierany społecznie
                      </motion.div>

                      <h3 className="text-white text-3xl font-bold mb-6 tracking-tight">
                        Dołącz teraz
                      </h3>

                      <p className="text-blue-100 mb-8 text-lg leading-relaxed">
                        Twoje dane są bezpieczne i nie wymagają podawania danych
                        osobowych.
                      </p>

                      <div className="mt-auto">
                        <Button
                          asChild
                          size="lg"
                          className="group bg-white hover:bg-blue-50 text-blue-700 hover:text-blue-800 text-lg px-8 py-6 rounded-2xl shadow-xl w-full font-semibold transition-all duration-300 border-0"
                        >
                          <Link href="/formularz">
                            <span className="flex items-center justify-center">
                              Wypełnij formularz
                              <ArrowRight
                                className="ml-3 group-hover:translate-x-1 transition-transform duration-300"
                                size={20}
                              />
                            </span>
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.section>
      {/* Enhanced Footer */}
      <footer className="py-12 px-4 bg-gradient-to-r from-slate-50 to-blue-50/30 border-t border-slate-200/50 backdrop-blur-sm">
        <div className="container mx-auto max-w-5xl">
          <div className="flex flex-col md:flex-row justify-between items-center mb-8">
            <motion.div
              className="mb-6 md:mb-0"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Image
                src="/logo.svg"
                alt="AliMatrix Logo"
                width={140}
                height={35}
                className="h-8 w-auto drop-shadow-sm"
              />
            </motion.div>

            <div className="flex flex-wrap justify-center gap-x-8 gap-y-3">
              {[
                { href: "/", text: "Strona główna" },
                { href: "/podstawa-ustalen", text: "Formularz" },
                { href: "/polityka-prywatnosci", text: "Polityka prywatności" },
                { href: "/regulamin", text: "Regulamin" },
                { href: "/kontakt", text: "Kontakt" },
              ].map((link, index) => (
                <motion.div
                  key={index}
                  whileHover={{ y: -2 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <Link
                    href={link.href}
                    className="text-slate-600 hover:text-blue-600 transition-colors duration-300 font-medium"
                  >
                    {link.text}
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-200/50 pt-8 flex flex-col md:flex-row justify-between items-center">
            {" "}
            <p className="text-slate-500 text-sm">
              © {currentYear} AliMatrix. Wszelkie prawa zastrzeżone.
            </p>
            <motion.p
              className="text-slate-400 text-xs mt-3 md:mt-0 flex items-center gap-2"
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              <Sparkles size={12} />
              Serwis w fazie rozwoju
            </motion.p>
          </div>
        </div>
      </footer>
    </div>
  );
}
