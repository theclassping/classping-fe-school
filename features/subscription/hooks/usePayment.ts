"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@/lib/api/errors";
import { useResource } from "@/lib/useResource";
import { randomId } from "@/lib/uuid";
import { cancelPayment, getInvoiceChannels, getInvoicePayments, getPayment, startCheckout } from "../api";
import { PAYMENT_POLL_MS, resumablePayment, subscriptionErrorMessage } from "../rules";
import type { Channel, Payment } from "../types";

/**
 * Paying one invoice:
 *   loading → choose (pick a channel) → (POST invoices/{id}/checkout/) → pay (VA / payment page)
 *           → paid, once the provider confirms (polled through GET payments/{id}/)
 * A checkout still inside its payment window is resumed instead of starting a new one.
 * A checkout that expires, fails or is cancelled returns to `choose`.
 */
export type PayStep =
  | { name: "loading" }
  | { name: "unavailable" }
  | { name: "choose" }
  | { name: "pay"; payment: Payment }
  | { name: "paid"; payment: Payment };

const START_FAILED = "Pembayaran belum dapat dimulai. Silakan coba lagi.";
const CANCEL_FAILED = "Metode pembayaran belum dapat diganti. Silakan coba lagi.";
const WINDOW_CLOSED = "Waktu pembayaran sebelumnya sudah habis. Pilih metode pembayaran untuk memulai lagi.";

const NO_CHANNELS: Channel[] = [];

export function usePayment(invoiceId: number) {
  const loader = useCallback(async (signal: AbortSignal) => {
    const [payments, channels] = await Promise.all([getInvoicePayments(invoiceId, signal), getInvoiceChannels(invoiceId, signal)]);
    return { channels, resume: resumablePayment(payments, Date.now()) };
  }, [invoiceId]);
  const initial = useResource(loader);

  // Set by the user's actions and by polling; until then the step follows the initial load.
  const [moved, setMoved] = useState<PayStep | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // One key per channel attempt, so retrying after a network error (no answer) returns the same checkout.
  const attempt = useRef<{ channelCode: string; key: string } | null>(null);

  const step: PayStep = moved
    ?? (initial.data ? (initial.data.resume ? { name: "pay", payment: initial.data.resume } : { name: "choose" })
      : initial.error !== undefined ? { name: "unavailable" } : { name: "loading" });

  const follow = useCallback((payment: Payment) => {
    if (payment.status === "paid") setMoved({ name: "paid", payment });
    else if (payment.status === "pending") setMoved({ name: "pay", payment });
    else {
      setError(WINDOW_CLOSED);
      setMoved({ name: "choose" });
    }
  }, []);

  const pendingId = step.name === "pay" ? step.payment.id : null;
  useEffect(() => {
    if (pendingId === null) return;
    const controller = new AbortController();
    const timer = window.setInterval(() => {
      // A failed poll is retried on the next tick; the payer can also check by hand.
      getPayment(pendingId, controller.signal).then(follow, () => undefined);
    }, PAYMENT_POLL_MS);
    return () => {
      window.clearInterval(timer);
      controller.abort();
    };
  }, [pendingId, follow]);

  async function run(action: () => Promise<void>, fallback: string) {
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (actionError) {
      setError(subscriptionErrorMessage(actionError, fallback));
    } finally {
      setBusy(false);
    }
  }

  function pay(channelCode: string) {
    if (attempt.current?.channelCode !== channelCode) attempt.current = { channelCode, key: randomId() };
    const { key } = attempt.current;
    return run(async () => {
      try {
        const payment = await startCheckout(invoiceId, channelCode, key);
        attempt.current = null;
        follow(payment);
      } catch (startError) {
        // The backend answered: the key now belongs to a failed checkout, so the next try needs a new one.
        if (startError instanceof ApiError) attempt.current = null;
        throw startError;
      }
    }, START_FAILED);
  }

  /** Asks the backend (and through it the provider) whether the checkout was paid. */
  function check(payment: Payment) {
    return run(async () => follow(await getPayment(payment.id)), "Status pembayaran belum dapat diperiksa. Silakan coba lagi.");
  }

  /** Cancels the pending checkout so another channel can be chosen. */
  function changeChannel(payment: Payment) {
    return run(async () => {
      try {
        await cancelPayment(payment.id);
      } catch {
        // Only a pending checkout can be cancelled: it was paid or closed in the meantime.
        follow(await getPayment(payment.id));
        return;
      }
      setMoved({ name: "choose" });
    }, CANCEL_FAILED);
  }

  return {
    step,
    channels: initial.data?.channels ?? NO_CHANNELS,
    busy,
    error: error || (step.name === "unavailable" ? subscriptionErrorMessage(initial.error, "Metode pembayaran belum dapat dimuat.") : ""),
    reload: initial.reload,
    pay,
    check,
    changeChannel,
  };
}
