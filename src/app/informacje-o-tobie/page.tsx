"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/ui/custom/Logo";
import { FormProgress } from "@/components/ui/custom/FormProgress";
import { InfoTooltip } from "@/components/ui/custom/InfoTooltip";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useFormStore } from "@/lib/store/form-store";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export default function InformacjeOTobie() {
  const router = useRouter();
  const { formData, updateFormData } = useFormStore();

  // Stany dla pól formularza - użytkownik
  const [plecUzytkownika, setPlecUzytkownika] = useState<string>(
    formData.plecUzytkownika || ""
  );
  const [wiekUzytkownika, setWiekUzytkownika] = useState<string>(
    formData.wiekUzytkownika || ""
  );
  const [wojewodztwoUzytkownika, setWojewodztwoUzytkownika] = useState<string>(
    formData.wojewodztwoUzytkownika || ""
  );
  const [miejscowoscUzytkownika, setMiejscowoscUzytkownika] = useState<string>(
    formData.miejscowoscUzytkownika || ""
  );
  const [stanCywilnyUzytkownika, setStanCywilnyUzytkownika] = useState<string>(
    formData.stanCywilnyUzytkownika || ""
  );

  // Stany dla pól formularza - drugi rodzic
  const [plecDrugiegoRodzica, setPlecDrugiegoRodzica] = useState<string>(
    formData.plecDrugiegoRodzica || ""
  );
  const [wiekDrugiegoRodzica, setWiekDrugiegoRodzica] = useState<string>(
    formData.wiekDrugiegoRodzica || ""
  );
  const [wojewodztwoDrugiegoRodzica, setWojewodztwoDrugiegoRodzica] =
    useState<string>(formData.wojewodztwoDrugiegoRodzica || "");
  const [miejscowoscDrugiegoRodzica, setMiejscowoscDrugiegoRodzica] =
    useState<string>(formData.miejscowoscDrugiegoRodzica || "");

  // Funkcja obsługująca przejście do następnego kroku
  const handleNext = () => {
    // Zapisujemy dane do store'a
    updateFormData({
      plecUzytkownika,
      wiekUzytkownika,
      wojewodztwoUzytkownika,
      miejscowoscUzytkownika,
      stanCywilnyUzytkownika,
      plecDrugiegoRodzica,
      wiekDrugiegoRodzica,
      wojewodztwoDrugiegoRodzica,
      miejscowoscDrugiegoRodzica,
    });

    // Przekierowanie do następnego kroku
    router.push("/wysylka");
  };

  // Funkcja obsługująca powrót do poprzedniego kroku
  const handleBack = () => {
    // W zależności od wariantPostepu wybieramy odpowiednią ścieżkę powrotu
    const wariantPostepu = formData.wariantPostepu;
    if (wariantPostepu === "court") {
      router.push("/postepowanie/sadowe");
    } else if (wariantPostepu === "agreement") {
      router.push("/postepowanie/porozumienie");
    } else {
      router.push("/postepowanie/inne");
    }
  };

  return (
    <main className="flex justify-center p-3">
      <Card className="w-full max-w-lg shadow-lg border-sky-100">
        <CardContent className="pt-2">
          <div className="text-center pb-4">
            <Logo className="inline-block" size="large" />
          </div>
          <FormProgress currentStep={10} totalSteps={12} />

          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">
                Informacje o Tobie i drugim rodzicu
              </h1>
              <InfoTooltip
                content={
                  <div className="space-y-2 text-sm">
                    <p>
                      Ta część formularza pozwoli nam lepiej dopasować analizę
                      do Twojej sytuacji i zwiększyć wiarygodność raportów.
                      Zbieramy wyłącznie podstawowe dane demograficzne – nie
                      pytamy o nazwiska, adresy ani inne dane umożliwiające
                      identyfikację.
                    </p>
                    <p>
                      Dzięki temu możliwa będzie analiza wpływu kontekstu
                      społecznego i geograficznego na kwestie alimentacyjne.
                    </p>
                  </div>
                }
              />
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-3">O Tobie</h3>
                <div className="space-y-4">
                  <div>
                    <Label className="block mb-2">Płeć</Label>
                    <Select
                      value={plecUzytkownika}
                      onValueChange={setPlecUzytkownika}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Wybierz..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="kobieta">Kobieta</SelectItem>
                        <SelectItem value="mezczyzna">Mężczyzna</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="block mb-2">Wiek</Label>
                    <Select
                      value={wiekUzytkownika}
                      onValueChange={setWiekUzytkownika}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Wybierz..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ponizej_25">
                          Poniżej 25 lat
                        </SelectItem>
                        <SelectItem value="25_34">25-34 lata</SelectItem>
                        <SelectItem value="35_44">35-44 lata</SelectItem>
                        <SelectItem value="45_54">45-54 lata</SelectItem>
                        <SelectItem value="powyzej_55">
                          55 lat i więcej
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="block mb-2">
                      Województwo zamieszkania
                    </Label>
                    <Select
                      value={wojewodztwoUzytkownika}
                      onValueChange={setWojewodztwoUzytkownika}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Wybierz..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dolnoslaskie">
                          Dolnośląskie
                        </SelectItem>
                        <SelectItem value="kujawsko-pomorskie">
                          Kujawsko-pomorskie
                        </SelectItem>
                        <SelectItem value="lubelskie">Lubelskie</SelectItem>
                        <SelectItem value="lubuskie">Lubuskie</SelectItem>
                        <SelectItem value="lodzkie">Łódzkie</SelectItem>
                        <SelectItem value="malopolskie">Małopolskie</SelectItem>
                        <SelectItem value="mazowieckie">Mazowieckie</SelectItem>
                        <SelectItem value="opolskie">Opolskie</SelectItem>
                        <SelectItem value="podkarpackie">
                          Podkarpackie
                        </SelectItem>
                        <SelectItem value="podlaskie">Podlaskie</SelectItem>
                        <SelectItem value="pomorskie">Pomorskie</SelectItem>
                        <SelectItem value="slaskie">Śląskie</SelectItem>
                        <SelectItem value="swietokrzyskie">
                          Świętokrzyskie
                        </SelectItem>
                        <SelectItem value="warminsko-mazurskie">
                          Warmińsko-mazurskie
                        </SelectItem>
                        <SelectItem value="wielkopolskie">
                          Wielkopolskie
                        </SelectItem>
                        <SelectItem value="zachodniopomorskie">
                          Zachodniopomorskie
                        </SelectItem>
                        <SelectItem value="nie_dotyczy">
                          Nie wiem / Nie chcę podawać
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="block mb-2">
                      Rodzaj miejscowości zamieszkania
                    </Label>
                    <Select
                      value={miejscowoscUzytkownika}
                      onValueChange={setMiejscowoscUzytkownika}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Wybierz..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="wies">Wieś</SelectItem>
                        <SelectItem value="miasto_do_50">
                          Miasto do 50 tys. mieszkańców
                        </SelectItem>
                        <SelectItem value="miasto_50_200">
                          Miasto 50-200 tys. mieszkańców
                        </SelectItem>
                        <SelectItem value="miasto_powyzej_200">
                          Miasto powyżej 200 tys. mieszkańców
                        </SelectItem>
                        <SelectItem value="nie_dotyczy">
                          Nie wiem / Nie chcę podawać
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="block mb-2">
                      Stan cywilny
                      <InfoTooltip
                        content={
                          <div className="text-sm">
                            <p>
                              Te informacje pomagają lepiej osadzić dane w
                              realiach prawnych – np. czy użytkownik już
                              przeszedł przez proces rozwodowy, czy dopiero
                              przed nim stoi. To ważne w analizach, które mają
                              dać możliwie najbardziej precyzyjny kontekst
                              sytuacji.
                            </p>
                          </div>
                        }
                      />
                    </Label>
                    <Select
                      value={stanCywilnyUzytkownika}
                      onValueChange={setStanCywilnyUzytkownika}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Wybierz..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="malzenstwo">Małżeństwo</SelectItem>
                        <SelectItem value="separacja">W separacji</SelectItem>
                        <SelectItem value="rozwod_w_trakcie">
                          W trakcie postępowania rozwodowego
                        </SelectItem>
                        <SelectItem value="rozwod_bez_winy">
                          Rozwód bez orzeczenia o winie
                        </SelectItem>
                        <SelectItem value="rozwod_z_wina">
                          Rozwód z orzeczeniem o winie
                        </SelectItem>
                        <SelectItem value="inne">Inne</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">O drugim rodzicu</h3>
                <div className="space-y-4">
                  <div>
                    <Label className="block mb-2">Płeć</Label>
                    <Select
                      value={plecDrugiegoRodzica}
                      onValueChange={setPlecDrugiegoRodzica}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Wybierz..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="kobieta">Kobieta</SelectItem>
                        <SelectItem value="mezczyzna">Mężczyzna</SelectItem>
                        <SelectItem value="nie_dotyczy">
                          Nie wiem / Nie chcę podawać
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="block mb-2">Wiek</Label>
                    <Select
                      value={wiekDrugiegoRodzica}
                      onValueChange={setWiekDrugiegoRodzica}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Wybierz..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ponizej_25">
                          Poniżej 25 lat
                        </SelectItem>
                        <SelectItem value="25_34">25-34 lata</SelectItem>
                        <SelectItem value="35_44">35-44 lata</SelectItem>
                        <SelectItem value="45_54">45-54 lata</SelectItem>
                        <SelectItem value="powyzej_55">
                          55 lat i więcej
                        </SelectItem>
                        <SelectItem value="nie_dotyczy">
                          Nie wiem / Nie chcę podawać
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="block mb-2">
                      Województwo zamieszkania
                    </Label>
                    <Select
                      value={wojewodztwoDrugiegoRodzica}
                      onValueChange={setWojewodztwoDrugiegoRodzica}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Wybierz..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dolnoslaskie">
                          Dolnośląskie
                        </SelectItem>
                        <SelectItem value="kujawsko-pomorskie">
                          Kujawsko-pomorskie
                        </SelectItem>
                        <SelectItem value="lubelskie">Lubelskie</SelectItem>
                        <SelectItem value="lubuskie">Lubuskie</SelectItem>
                        <SelectItem value="lodzkie">Łódzkie</SelectItem>
                        <SelectItem value="malopolskie">Małopolskie</SelectItem>
                        <SelectItem value="mazowieckie">Mazowieckie</SelectItem>
                        <SelectItem value="opolskie">Opolskie</SelectItem>
                        <SelectItem value="podkarpackie">
                          Podkarpackie
                        </SelectItem>
                        <SelectItem value="podlaskie">Podlaskie</SelectItem>
                        <SelectItem value="pomorskie">Pomorskie</SelectItem>
                        <SelectItem value="slaskie">Śląskie</SelectItem>
                        <SelectItem value="swietokrzyskie">
                          Świętokrzyskie
                        </SelectItem>
                        <SelectItem value="warminsko-mazurskie">
                          Warmińsko-mazurskie
                        </SelectItem>
                        <SelectItem value="wielkopolskie">
                          Wielkopolskie
                        </SelectItem>
                        <SelectItem value="zachodniopomorskie">
                          Zachodniopomorskie
                        </SelectItem>
                        <SelectItem value="nie_dotyczy">
                          Nie wiem / Nie chcę podawać
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="block mb-2">
                      Rodzaj miejscowości zamieszkania
                    </Label>
                    <Select
                      value={miejscowoscDrugiegoRodzica}
                      onValueChange={setMiejscowoscDrugiegoRodzica}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Wybierz..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="wies">Wieś</SelectItem>
                        <SelectItem value="miasto_do_50">
                          Miasto do 50 tys. mieszkańców
                        </SelectItem>
                        <SelectItem value="miasto_50_200">
                          Miasto 50-200 tys. mieszkańców
                        </SelectItem>
                        <SelectItem value="miasto_powyzej_200">
                          Miasto powyżej 200 tys. mieszkańców
                        </SelectItem>
                        <SelectItem value="nie_dotyczy">
                          Nie wiem / Nie chcę podawać
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button variant="outline" className="flex-1" onClick={handleBack}>
                Wstecz
              </Button>
              <Button className="flex-1" onClick={handleNext}>
                Dalej
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
