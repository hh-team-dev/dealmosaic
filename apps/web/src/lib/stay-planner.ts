import { parseQuoteMoney } from "./hospitality-comparison";

export const BUDGET_ITEMS = [
  "Stay, all nights and rooms",
  "Food and dining",
  "Transport, including getting there",
  "Activities",
  "Other non-refundable costs",
] as const;
export const NEEDS = {
  general: { name: "Every stay", questions: [] },
  family: {
    name: "Family and children",
    questions: [
      "What are the child-age, extra-bed and meal charges for our exact group?",
      "Can you confirm the bed layout and whether connecting rooms are actually guaranteed?",
    ],
  },
  access: {
    name: "Accessibility and older travellers",
    questions: [
      "Is the full route from arrival to the room step-free, including the bathroom? Please confirm doorway widths and lift availability for our requirements.",
      "Is assistance available at our arrival time? Please describe it rather than promising general accessibility.",
    ],
  },
  attendant: {
    name: "Hospital attendants and long stays",
    questions: [
      "Is a kitchen or permitted food preparation available, and what do laundry and weekly stays cost?",
      "Can dates be extended or shortened, and what charges apply?",
      "What is the practical route to the hospital entrance, including late-night access? No patient or medical details are needed for this enquiry.",
    ],
  },
  group: {
    name: "Groups and wedding guests",
    questions: [
      "Can you confirm the room block, room types, occupancy and allocation in writing?",
      "What deposit, room-release deadline, partial cancellation and no-show terms apply?",
      "Are meals, event access and transport separate charges? Who handles each booking and invoice?",
    ],
  },
  pilgrimage: {
    name: "Pilgrimage and early arrivals",
    questions: [
      "What are the actual check-in time, early-arrival charge and luggage-storage arrangements?",
      "Please confirm the route to the entrance we need, any access restrictions, ground-floor/lift options and meal timings.",
    ],
  },
  work: {
    name: "Work and longer stays",
    questions: [
      "Can you confirm invoice details, workspace, internet arrangements and backup power?",
      "What are the weekly rate, laundry, deposit, extension and early-departure terms?",
    ],
  },
  policy: {
    name: "Check-in and local-ID policy",
    questions: [
      "Please confirm the current adult guest, local-ID and check-in rules for our booking in writing.",
      "Which original documents are required at reception? Do not send identity-document copies through this planning tool.",
    ],
  },
  pets: {
    name: "Travelling with pets",
    questions: [
      "Please confirm acceptance for our pet species, size and number for these exact dates.",
      "What pet fees, refundable deposits, room restrictions and dining/access rules apply?",
    ],
  },
} as const;
export type Need = keyof typeof NEEDS;
export const COMMON_QUESTIONS = [
  "Please quote the total for all guests, rooms and nights, including taxes, mandatory fees, extra beds and meals. Identify anything payable at reception separately.",
  "Please confirm room type, bed layout, inclusions, payment schedule and the exact cancellation deadline with its time zone.",
  "What deductions, refund method and stated processing time apply if I cancel? Who is responsible for booking changes and support?",
  "Can food or essentials be delivered to the exact address, and will reception accept them? A PIN code alone does not confirm delivery.",
];
export function enquiryText(need: Need, city: string) {
  return `Stay questions for ${city}\nPlanning checklist — not a booking or a submitted request.\nAdd your dates, guest count, child ages where relevant and room count before sending to a verified hotel contact.\n\n${[...COMMON_QUESTIONS, ...NEEDS[need].questions].map((q, i) => `${i + 1}. ${q}`).join("\n\n")}\n\nPlease reply in writing. Do not include payment details, ID copies or medical records.\nPrepared with DealMosaic.`;
}
export function budgetTotal(values: string[]) {
  if (values.length !== BUDGET_ITEMS.length) return null;
  const amounts = values.map(parseQuoteMoney);
  return amounts.some((n) => n === null)
    ? null
    : (amounts as number[]).reduce((a, b) => a + b, 0);
}
export function rebooking(
  values: {
    original: string;
    paid: string;
    refund: string;
    replacement: string;
    fee: string;
  },
  confirmed: boolean,
) {
  const original = parseQuoteMoney(values.original),
    paid = parseQuoteMoney(values.paid),
    refund = parseQuoteMoney(values.refund),
    replacement = parseQuoteMoney(values.replacement),
    fee = parseQuoteMoney(values.fee);
  if ([original, paid, refund, replacement, fee].some((n) => n === null))
    return {
      error:
        "Enter every amount in rupees, with at most two decimal places. Enter 0 only when confirmed.",
    } as const;
  if (!confirmed)
    return {
      error:
        "Confirm the matching stay and cancellation conditions before comparing.",
    } as const;
  if (paid! > original!)
    return {
      error:
        "Already paid cannot exceed the original full-stay total. Keep refundable security deposits outside this calculation.",
    } as const;
  if (refund! > paid!)
    return {
      error:
        "Expected cash refund cannot exceed the amount already paid. Do not include cashback, vouchers or refundable security deposits.",
    } as const;
  const loss = paid! - refund! + fee!;
  return {
    keep: original!,
    switch: loss + replacement!,
    difference: original! - loss - replacement!,
    additionalCash: replacement! + fee!,
    loss,
  } as const;
}
