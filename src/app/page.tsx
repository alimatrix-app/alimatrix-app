"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  motion,
  useScroll,
  useTransform,
  AnimatePresence,
} from "framer-motion";
import {
  FileText,
  ShieldCheck,
  BarChart3,
  Users,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Logo } from "@/components/ui/custom/Logo";

export default function StartPage() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  // References for scroll animations
  const heroRef = useRef(null);
  const howItWorksRef = useRef(null);
  const statsRef = useRef(null);

  // Setup scroll-based animations
  const { scrollYProgress } = useScroll();
  const heroOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0.8]);
  const heroScale = useTransform(scrollYProgress, [0, 0.2], [1, 0.95]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll);

    // Interval for statistics animation
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev === 0 ? 1 : 0));
    }, 3000);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      clearInterval(interval);
    };
  }, []);

  const fadeIn = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6 },
  };

  const staggerContainer = {
    initial: {},
    animate: {
      transition: {
        staggerChildren: 0.2,
      },
    },
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white overflow-x-hidden">
      {/* Header */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 py-2 px-4 transition-all duration-300 ${
          isScrolled ? "bg-white/40 backdrop-blur-md" : "bg-transparent"
        }`}
      >
        <div className="container mx-auto max-w-6xl flex justify-center items-center">
          <div className="relative">
            <Logo size="large" />

            {/* Stamp overlay */}
            <div className="absolute top-1 -right-8 bg-blue-400/20 backdrop-blur-sm text-xs text-blue-900 py-1 px-3 rounded">
              Serwis w fazie rozwoju
            </div>
          </div>
        </div>
      </header>{" "}
      {/* Hero Section with enhanced visuals */}
      <motion.section
        ref={heroRef}
        style={{ opacity: heroOpacity, scale: heroScale }}
        className="relative pt-32 pb-16 px-4 md:pt-40 md:pb-24 overflow-hidden"
      >
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-5">
          <svg
            className="h-full w-full"
            viewBox="0 0 100 100"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <pattern
                id="grid"
                width="8"
                height="8"
                patternUnits="userSpaceOnUse"
              >
                <circle cx="4" cy="4" r="1" fill="currentColor" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        <div className="container mx-auto max-w-4xl text-center relative z-10">
          <motion.div
            initial="initial"
            animate="animate"
            variants={staggerContainer}
            className="space-y-6"
          >
            <motion.div variants={fadeIn} className="inline-flex mx-auto mb-2">
              <span className="bg-blue-100 text-blue-700 text-xs font-medium px-2.5 py-0.5 rounded-full flex items-center">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-600 mr-1.5"></span>
                Inicjatywa społeczna
              </span>
            </motion.div>

            <motion.h1
              variants={fadeIn}
              className="text-3xl md:text-4xl lg:text-5xl font-bold bg-clip-text bg-gradient-to-r from-sky-950 to-sky-750 leading-tight"
            >
              Alimenty bez tajemnic
            </motion.h1>

            <motion.p
              variants={fadeIn}
              className="text-lg md:text-xl text-gray-700 max-w-3xl mx-auto"
            >
              AliMatrix to inicjatywa tworzona przez rodziców, którzy dzielą się
              swoją sytuacją alimentacyjną, by wspólnie budować{" "}
              <span className="font-semibold text-blue-600">
                bardziej przejrzysty system w Polsce
              </span>
              .
            </motion.p>

            <motion.div
              variants={fadeIn}
              className="flex flex-col sm:flex-row justify-center gap-4"
            >
              <Button
                asChild
                size="lg"
                className="hover:bg-blue-700 text-white text-lg px-8 py-6 shadow-lg hover:shadow-xl transition-all"
              >
                <Link href="/formularz">
                  <span className="flex items-center justify-center">
                    Wypełnij formularz
                    <ArrowRight className="ml-2" size={18} />
                  </span>
                </Link>
              </Button>

              <Button asChild variant="outline" size="lg" className="text-lg">
                <a href="#jak-to-dziala">Dowiedz się więcej</a>
              </Button>
            </motion.div>

            <motion.div
              variants={fadeIn}
              className="flex flex-wrap justify-center mt-4 gap-x-8 gap-y-3 text-sm text-gray-600"
            >
              <div className="flex items-center gap-1.5">
                <CheckCircle2 size={16} className="text-green-500" />
                <span>Pełna anonimowość</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 size={16} className="text-green-500" />
                <span>Zgodność z RODO</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 size={16} className="text-green-500" />
                <span>Bezpieczne przetwarzanie</span>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </motion.section>
      {/* Main Content */}
      <div className="text-center pb-4">
        <Image
          className="inline-block"
          src="/kct.png"
          alt="AliMatrix Logo"
          width={320}
          height={80}
          priority
        />
      </div>
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.3 }}
        className="pb-12 px-4"
      >
        <div className="container mx-auto max-w-4xl">
          <div className="space-y-8 md:space-y-12">
            {/* Intro Text */}
            <div className="bg-white rounded-2xl p-6 md:p-8 shadow-md">
              <p className="text-gray-700 mb-4">
                Jesteśmy na wczesnym etapie rozwoju – zbieramy rzeczywiste dane
                o ustalonych alimentach, by już za kilka tygodni udostępnić
                rzetelne raporty i analizy.
              </p>
              <p className="text-gray-700 font-medium">
                Twoje zgłoszenie ma znaczenie – im więcej danych, tym większa
                przejrzystość i lepsze decyzje.
              </p>
            </div>{" "}
            {/* How It Works - Enhanced */}
            <div id="jak-to-dziala" ref={howItWorksRef} className="space-y-4">
              <div className="mb-8 text-center">
                <span className="bg-blue-100 text-blue-700 text-xs font-medium px-3 py-1 rounded-full">
                  Prosty proces
                </span>
                <h2 className="text-2xl md:text-3xl font-bold text-sky-950 mt-3">
                  Jak to działa?
                </h2>
                <p className="text-gray-600 mt-2 max-w-2xl mx-auto">
                  Prosty proces, który pomoże zwiększyć transparentność systemu
                  alimentacyjnego w Polsce
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Step 1 */}
                <Card className="overflow-hidden border-none shadow-md hover:shadow-lg transition-all hover:translate-y-[-4px]">
                  <CardContent className="p-6 flex flex-col items-center text-center h-full">
                    <div className="h-14 w-14 bg-blue-100 rounded-2xl flex items-center justify-center mb-5">
                      <FileText className="h-7 w-7 text-blue-600" />
                    </div>
                    <h3 className="text-xl font-semibold mb-3 flex items-center">
                      Wypełniasz formularz
                    </h3>
                    <p className="text-gray-600 mb-4 flex-grow">
                      Jeśli masz już ustalone alimenty (sądowo, ugodowo lub na
                      podstawie porozumienia).
                    </p>
                    <div className="pt-2">
                      <Button
                        asChild
                        variant="ghost"
                        className="text-blue-600 hover:bg-blue-50 p-0 h-auto flex items-center gap-1.5 group"
                      >
                        <Link href="/formularz">
                          <span>Rozpocznij</span>
                          <ArrowRight
                            size={14}
                            className="group-hover:translate-x-1 transition-transform"
                          />
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Step 2 */}
                <Card className="overflow-hidden border-none shadow-md hover:shadow-lg transition-all hover:translate-y-[-4px]">
                  <CardContent className="p-6 flex flex-col items-center text-center h-full">
                    <div className="h-14 w-14 bg-green-100 rounded-2xl flex items-center justify-center mb-5">
                      <ShieldCheck className="h-7 w-7 text-green-600" />
                    </div>
                    <h3 className="text-xl font-semibold mb-3 flex items-center">
                      Twoje dane trafiają do bazy
                    </h3>
                    <p className="text-gray-600 mb-4 flex-grow">
                      Dane są bezpieczne i anonimowe – zgodnie z RODO i
                      zabezpieczone technologicznie.
                    </p>
                  </CardContent>
                </Card>

                {/* Step 3 */}
                <Card className="overflow-hidden border-none shadow-md hover:shadow-lg transition-all hover:translate-y-[-4px]">
                  <CardContent className="p-6 flex flex-col items-center text-center h-full">
                    <div className="h-14 w-14 bg-purple-100 rounded-2xl flex items-center justify-center mb-5">
                      <BarChart3 className="h-7 w-7 text-purple-600" />
                    </div>
                    <h3 className="text-xl font-semibold mb-3 flex items-center">
                      Analizujemy zebrane przypadki
                    </h3>
                    <p className="text-gray-600 mb-4 flex-grow">
                      Wkrótce udostępnimy rzetelne raporty i statystyki dla
                      Ciebie i innych użytkowników.
                    </p>
                  </CardContent>
                </Card>

                {/* Step 4 */}
                <Card className="overflow-hidden border-none shadow-md hover:shadow-lg transition-all hover:translate-y-[-4px]">
                  <CardContent className="p-6 flex flex-col items-center text-center h-full">
                    <div className="h-14 w-14 bg-amber-100 rounded-2xl flex items-center justify-center mb-5">
                      <Users className="h-7 w-7 text-amber-600" />
                    </div>
                    <h3 className="text-xl font-semibold mb-3 flex items-center">
                      Pomagasz innym
                    </h3>
                    <p className="text-gray-600 mb-4 flex-grow">
                      Twoje zgłoszenie zwiększa przejrzystość i przewidywalność
                      systemu alimentacyjnego w Polsce.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>{" "}
            {/* Statistics - Enhanced */}
            <div ref={statsRef} className="py-12">
              <div className="mb-8 text-center">
                <h2 className="text-2xl md:text-3xl font-bold text-sky-950 flex items-center justify-center">
                  Statystyki na dziś
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                <Card className="overflow-hidden border-none shadow-lg bg-white/80 backdrop-blur-sm">
                  <CardContent className="p-6 relative h-full">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-400/10 to-purple-500/10 rounded-bl-3xl -mr-6 -mt-6"></div>

                    <h3 className="text-lg font-semibold text-gray-800 mb-6 flex items-center">
                      <BarChart3 className="mr-2 text-blue-600" size={18} />
                      Analiza danych
                    </h3>

                    <div className="relative h-36 md:h-48 flex items-center justify-center">
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={activeIndex}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          transition={{ duration: 0.5 }}
                          className="absolute inset-0 flex flex-col items-center justify-center"
                        >
                          {activeIndex === 0 ? (
                            <>
                              <span className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
                                124
                              </span>
                              <span className="text-center mt-4 text-gray-600">
                                osoby podzieliły się swoją sytuacją
                                alimentacyjną
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
                                43
                              </span>
                              <span className="text-center mt-4 text-gray-600">
                                minuty średni czas dokładnego wypełnienia
                                formularza
                              </span>
                            </>
                          )}
                        </motion.div>
                      </AnimatePresence>
                    </div>

                    {/* Indicator dots */}
                    <div className="flex justify-center gap-2 mt-4">
                      <button
                        onClick={() => setActiveIndex(0)}
                        className={`h-2 rounded-full transition-all ${
                          activeIndex === 0
                            ? "w-6 bg-blue-500"
                            : "w-2 bg-gray-300"
                        }`}
                        aria-label="Zobacz statystykę 1"
                      />
                      <button
                        onClick={() => setActiveIndex(1)}
                        className={`h-2 rounded-full transition-all ${
                          activeIndex === 1
                            ? "w-6 bg-blue-500"
                            : "w-2 bg-gray-300"
                        }`}
                        aria-label="Zobacz statystykę 2"
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card className="overflow-hidden border-none shadow-lg bg-gradient-to-br from-blue-600 to-blue-700">
                  <CardContent className="p-6 relative h-full">
                    {/* Background Pattern */}
                    <div className="absolute inset-0 opacity-5">
                      <svg
                        className="h-full w-full"
                        viewBox="0 0 80 80"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <pattern
                          id="grid"
                          x="0"
                          y="0"
                          width="20"
                          height="20"
                          patternUnits="userSpaceOnUse"
                        >
                          <rect
                            x="0"
                            y="0"
                            width="10"
                            height="10"
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
                          fill="url(#grid)"
                        />
                      </svg>
                    </div>

                    <div className="relative z-10 flex flex-col h-full">
                      <div className="inline-flex items-center px-3 py-1.5 bg-white/10 text-white rounded-full text-sm mb-6">
                        <span className="h-2 w-2 rounded-full bg-white mr-2 animate-pulse"></span>
                        Projekt wspierany społecznie
                      </div>

                      <h3 className="text-white text-2xl font-bold mb-5">
                        Dołącz teraz
                      </h3>
                      <p className="text-blue-100 mb-8">
                        Twoje dane są bezpieczne i nie wymagają podawania danych
                        osobowych.
                      </p>
                      <div className="mt-auto">
                        <Button
                          asChild
                          size="lg"
                          variant="secondary"
                          className="bg-white text-blue-700 hover:bg-blue-50 text-lg px-6 py-5 rounded-full shadow-lg w-full"
                        >
                          <Link href="/formularz">
                            <span className="flex items-center justify-center">
                              Wypełnij formularz
                              <ArrowRight className="ml-2" size={16} />
                            </span>
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </motion.section>{" "}
      {/* Footer - Enhanced */}
      <footer className="py-10 px-4 bg-gray-50 border-t border-gray-200">
        <div className="container mx-auto max-w-4xl">
          <div className="flex flex-col md:flex-row justify-between items-center mb-6">
            <div className="mb-4 md:mb-0">
              <Image
                src="/logo.svg"
                alt="AliMatrix Logo"
                width={120}
                height={30}
                className="h-7 w-auto"
              />
            </div>
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
              <Link
                href="/"
                className="text-gray-600 hover:text-blue-600 transition-colors"
              >
                Strona główna
              </Link>
              <Link
                href="/podstawa-ustalen"
                className="text-gray-600 hover:text-blue-600 transition-colors"
              >
                Formularz
              </Link>
              <Link
                href="/polityka-prywatnosci"
                className="text-gray-600 hover:text-blue-600 transition-colors"
              >
                Polityka prywatności
              </Link>
              <Link
                href="/regulamin"
                className="text-gray-600 hover:text-blue-600 transition-colors"
              >
                Regulamin
              </Link>
              <Link
                href="/kontakt"
                className="text-gray-600 hover:text-blue-600 transition-colors"
              >
                Kontakt
              </Link>
            </div>
          </div>
          <div className="border-t border-gray-200 pt-6 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-500 text-sm">
              © {new Date().getFullYear()} AliMatrix. Wszelkie prawa
              zastrzeżone.
            </p>
            <p className="text-gray-400 text-xs mt-2 md:mt-0">
              Serwis w fazie rozwoju
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
