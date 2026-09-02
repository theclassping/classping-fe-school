export type Payment = {
    name: string;
    initials: string;
    className: string;
    month: string;
    date: string;
    amount: string;
    color: string;
    invoice: string;
    guardian: string;
    phone: string;
    method: string;
    note: string;
    history: string;
};

export const payments: Payment[] = [
    { name: "Alya Putri Ramadhani", initials: "AP", className: "A1", month: "Agustus 2026", date: "27 Agu 2026", amount: "Rp 250.000", color: "", invoice: "INV-2026-0827-001", guardian: "Ibu Rina Ramadhani", phone: "0812-3456-7801", method: "Transfer Bank", note: "Pembayaran SPP bulan Agustus 2026", history: "2 kali bayar" },
    { name: "Raka Aditya Pratama", initials: "RA", className: "B1", month: "Agustus 2026", date: "27 Agu 2026", amount: "Rp 250.000", color: "alt", invoice: "INV-2026-0827-002", guardian: "Ibu Maya Lestari", phone: "0821-7789-4421", method: "E-Wallet", note: "Pembayaran SPP bulan Agustus 2026", history: "3 kali bayar" },
    { name: "Nayla Zahra Aulia", initials: "NZ", className: "A2", month: "Agustus 2026", date: "26 Agu 2026", amount: "Rp 250.000", color: "blue", invoice: "INV-2026-0826-003", guardian: "Ibu Siti Aulia", phone: "0857-2234-1180", method: "Transfer Bank", note: "Pembayaran SPP bulan Agustus 2026", history: "2 kali bayar" },
    { name: "Daffa Alfarizi", initials: "DA", className: "B2", month: "Agustus 2026", date: "26 Agu 2026", amount: "Rp 250.000", color: "purple", invoice: "INV-2026-0826-004", guardian: "Ibu Nurul Hikmah", phone: "0852-1109-6832", method: "Transfer Bank", note: "Pembayaran SPP bulan Agustus 2026", history: "1 kali bayar" },
    { name: "Keisha Amalia Putri", initials: "KA", className: "A1", month: "Agustus 2026", date: "25 Agu 2026", amount: "Rp 250.000", color: "alt", invoice: "INV-2026-0825-005", guardian: "Bapak Arif Setiawan", phone: "0812-9065-7730", method: "E-Wallet", note: "Pembayaran SPP bulan Agustus 2026", history: "3 kali bayar" },
    { name: "Zafran Hidayat", initials: "ZH", className: "A2", month: "Agustus 2026", date: "25 Agu 2026", amount: "Rp 250.000", color: "blue", invoice: "INV-2026-0825-006", guardian: "Ibu Sari Hidayat", phone: "0812-5512-9034", method: "Transfer Bank", note: "Pembayaran SPP bulan Agustus 2026", history: "2 kali bayar" },
    { name: "Mira Putri", initials: "MP", className: "B1", month: "Agustus 2026", date: "24 Agu 2026", amount: "Rp 250.000", color: "", invoice: "INV-2026-0824-007", guardian: "Ibu Mira Lestari", phone: "0813-2211-0099", method: "Transfer Bank", note: "Pembayaran SPP bulan Agustus 2026", history: "2 kali bayar" },
    { name: "Hafiz Ardiansyah", initials: "HA", className: "B2", month: "Agustus 2026", date: "24 Agu 2026", amount: "Rp 250.000", color: "purple", invoice: "INV-2026-0824-008", guardian: "Bapak Ardiansyah", phone: "0819-4422-1188", method: "E-Wallet", note: "Pembayaran SPP bulan Agustus 2026", history: "1 kali bayar" },
    { name: "Nadya Salsabila", initials: "NS", className: "A1", month: "Agustus 2026", date: "23 Agu 2026", amount: "Rp 250.000", color: "alt", invoice: "INV-2026-0823-009", guardian: "Ibu Salsabila", phone: "0812-1100-7788", method: "Transfer Bank", note: "Pembayaran SPP bulan Agustus 2026", history: "2 kali bayar" },
    { name: "Ariq Hadi Wijaya", initials: "AH", className: "A2", month: "Agustus 2026", date: "23 Agu 2026", amount: "Rp 250.000", color: "blue", invoice: "INV-2026-0823-010", guardian: "Bapak Hadi Wijaya", phone: "0813-8811-2200", method: "Transfer Bank", note: "Pembayaran SPP bulan Agustus 2026", history: "2 kali bayar" },
];

export function getPayment(key: string | null) {
    return payments.find((payment) => payment.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") === key) ?? payments[0];
}