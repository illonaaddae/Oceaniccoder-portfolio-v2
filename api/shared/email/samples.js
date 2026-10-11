// Sample data for every quote email: drives the Emails preview tab, the
// "send test to me" button and the template tests.

const T = require("./quoteEmails");

const invoice = {
  invoiceNumber: "Q-2026-0007-INV-1",
  label: "Deposit (60%)",
  amount: "GHS 6,000.00",
  dueDate: "17 Oct 2026",
  payLink: "https://oceaniccoder.dev/q/sample-token/pay/deposit",
  invoiceLink: "https://oceaniccoder.dev/q/sample-token/invoice/deposit",
};

// Each entry names the template it renders and the view model it is given.
const SAMPLE_VIEWS = {
  quoteSent: {
    template: "quoteSent",
    view: {
      clientFirstName: "Kofi",
      quoteNumber: "Q-2026-0007",
      revision: 1,
      title: "Online store with Paystack checkout",
      total: "GHS 10,000.00",
      validUntil: "24 Oct 2026",
      planSummary: "60% deposit, 40% balance",
      link: "https://oceaniccoder.dev/q/sample-token",
    },
  },
  quoteAccepted: {
    template: "quoteAccepted",
    view: {
      clientFirstName: "Kofi",
      quoteNumber: "Q-2026-0007",
      title: "Online store with Paystack checkout",
      acceptedName: "Kofi Mensah",
      invoice,
      link: "https://oceaniccoder.dev/q/sample-token",
    },
  },
  quoteDecisionAlert: {
    template: "quoteDecisionAlert",
    view: {
      decision: "accepted",
      clientName: "Kofi Mensah",
      clientEmail: "kofi@example.com",
      quoteNumber: "Q-2026-0007",
      title: "Online store with Paystack checkout",
      total: "GHS 10,000.00",
      acceptedName: "Kofi Mensah",
      reason: "",
      adminLink: "https://oceaniccoder.dev/admin/dashboard",
    },
  },
  paymentRequest: {
    template: "paymentRequest",
    view: {
      clientFirstName: "Kofi",
      quoteNumber: "Q-2026-0007",
      title: "Online store with Paystack checkout",
      invoice: {
        ...invoice,
        invoiceNumber: "Q-2026-0007-INV-2",
        label: "Balance (40%)",
        amount: "GHS 4,000.00",
      },
      paidSoFar: "GHS 6,000.00",
      balanceAfter: "GHS 0.00",
    },
  },
  paymentReceipt: {
    template: "paymentReceipt",
    view: {
      clientFirstName: "Kofi",
      quoteNumber: "Q-2026-0007",
      title: "Online store with Paystack checkout",
      stageLabel: "Deposit",
      amount: "GHS 6,000.00",
      method: "Mobile Money",
      reference: "Q-2026-0007-1-K7Q2X9PL",
      paidAt: "11 Oct 2026",
      receiptLink: "https://oceaniccoder.dev/receipt/Q-2026-0007-1-K7Q2X9PL?s=sample",
      balance: "GHS 4,000.00",
      complete: false,
    },
  },
  paymentAlert: {
    template: "paymentAlert",
    view: {
      kind: "paid",
      problem: "",
      clientName: "Kofi Mensah",
      quoteNumber: "Q-2026-0007",
      title: "Online store with Paystack checkout",
      stageLabel: "Deposit",
      amount: "GHS 6,000.00",
      method: "Mobile Money",
      reference: "Q-2026-0007-1-K7Q2X9PL",
      balance: "GHS 4,000.00",
      adminLink: "https://oceaniccoder.dev/admin/dashboard",
    },
  },
  paymentAlertProblem: {
    template: "paymentAlert",
    view: {
      kind: "problem",
      problem: "A second payment arrived for a stage that was already paid. Refund it in Paystack.",
      clientName: "Kofi Mensah",
      quoteNumber: "Q-2026-0007",
      title: "Online store with Paystack checkout",
      stageLabel: "Deposit",
      amount: "GHS 6,000.00",
      method: "Card",
      reference: "Q-2026-0007-1-ZZZZZZZZ",
      balance: "",
      adminLink: "https://oceaniccoder.dev/admin/dashboard",
    },
  },
};

const SAMPLES = Object.fromEntries(
  Object.entries(SAMPLE_VIEWS).map(([name, { template, view }]) => [name, () => T[template](view)]),
);

module.exports = { SAMPLES, SAMPLE_VIEWS };
