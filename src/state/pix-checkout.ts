import { useCallback, useEffect, useState } from "react";

import { isValidCpf } from "@/domain/cpf";
import { orderCode } from "@/domain/pix";
import type { Checkout } from "@/domain/payments";
import { getPaymentConfig, myTaxId, paymentStatus, saveTaxId, startManualPayment, startPixCheckout } from "@/services/payments";

type Auto = Extract<Checkout, { mode: "automatic" }>;
export type PixStep = "idle" | "loading" | "cpf" | "manual" | "auto";
export type PixOutcome = "pending" | "paid" | "expired";

const POLL_MS = 5000;

/** The Pix payment of one plan: manual (static Pix + order code), automatic (PagBank QR, polled until paid or expired) or the CPF step before it. */
export function usePixCheckout() {
  const [step, setStep] = useState<PixStep>("idle");
  const [order, setOrder] = useState<string | null>(null);
  const [auto, setAuto] = useState<Auto | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cpf, setCpf] = useState("");
  const [savedCpf, setSavedCpf] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<PixOutcome>("pending");
  const [now, setNow] = useState(() => Date.now());

  const manual = useCallback(async (planId: string, why: string | null) => {
    // Never stuck: a failed RPC still leaves a local code to pay with.
    setOrder(await startManualPayment(planId).catch(() => orderCode()));
    setNotice(why);
    setStep("manual");
  }, []);

  const checkout = useCallback(
    async (planId: string) => {
      setStep("loading");
      setError(null);
      const result = await startPixCheckout(planId);
      if (result.mode === "automatic") {
        setAuto(result);
        setOutcome("pending");
        setNow(Date.now());
        setSavedCpf(await myTaxId().catch(() => null));
        setStep("auto");
      } else if (result.mode === "needs_cpf") setStep("cpf");
      else await manual(planId, result.mode === "fallback" ? "Não deu para gerar o Pix automático agora. Pague por este Pix e envie o comprovante." : null);
    },
    [manual],
  );

  const start = useCallback(
    async (planId: string) => {
      setStep("loading");
      const config = await getPaymentConfig().catch(() => null);
      if (config?.mode === "automatic") await checkout(planId);
      else await manual(planId, null);
    },
    [checkout, manual],
  );

  /** Saves the typed CPF, then asks for the Pix again. */
  const submitCpf = useCallback(
    async (planId: string) => {
      if (!isValidCpf(cpf)) return setError("CPF inválido");
      try {
        await saveTaxId(cpf);
      } catch (e) {
        return setError(e instanceof Error ? e.message : "Não deu para salvar o CPF.");
      }
      setCpf("");
      await checkout(planId);
    },
    [cpf, checkout],
  );

  const reset = useCallback(() => {
    setStep("idle");
    setOrder(null);
    setAuto(null);
    setNotice(null);
    setError(null);
    setCpf("");
  }, []);

  const changeCpf = useCallback(() => {
    setAuto(null);
    setCpf("");
    setStep("cpf");
  }, []);

  const paymentId = auto?.paymentId;
  useEffect(() => {
    if (!paymentId || outcome !== "pending") return;
    const tick = setInterval(() => setNow(Date.now()), 1000);
    const poll = setInterval(() => {
      paymentStatus(paymentId)
        .then((s) => s !== "pending" && setOutcome(s === "paid" ? "paid" : "expired"))
        .catch(() => undefined); // a dropped request just waits for the next poll
    }, POLL_MS);
    return () => {
      clearInterval(tick);
      clearInterval(poll);
    };
  }, [paymentId, outcome]);

  const secondsLeft = auto ? Math.max(0, Math.ceil((Date.parse(auto.expiresAt) - now) / 1000)) : 0;
  const shown: PixOutcome = outcome === "pending" && auto && secondsLeft === 0 ? "expired" : outcome;
  return { step, order, auto, notice, error, cpf, setCpf, savedCpf, outcome: shown, secondsLeft, start, submitCpf, changeCpf, reset };
}
