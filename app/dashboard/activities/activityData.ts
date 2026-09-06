export type Activity = {
  slug: string;
  title: string;
  avatar: string;
  className: string;
  classLabel: string;
  time: string;
  date: string;
  status: "Dipublikasi" | "Draf";
  caption: string;
  photos: number;
  participants: string[];
  note: string;
};

export const activities: Activity[] = [
  {
    slug: "melukis-dengan-jari",
    title: "Melukis dengan Jari",
    avatar: "🎨",
    className: "A1",
    classLabel: "Matahari",
    time: "09.00",
    date: "2026-08-27",
    status: "Dipublikasi",
    caption:
      "Anak-anak mengenal warna primer dan mencampurnya menjadi warna baru.",
    photos: 4,
    participants: [
      "Alya Putri Ramadhani",
      "Raka Akbar Maulana",
      "Nayla Zahra Aulia",
      "Fathan Rizky Pratama",
      "Keisha Amalia Putri",
      "Ariq Hadi Wijaya",
      "Laila Nabila",
      "Zaki Pratama",
    ],
    note: "Semua foto dan tag sudah sesuai dengan kelas dan hanya orang tua yang terlibat yang dapat melihatnya.",
  },
  {
    slug: "menanam-kacang-hijau",
    title: "Menanam Kacang Hijau",
    avatar: "🌱",
    className: "A1",
    classLabel: "Matahari",
    time: "10.15",
    date: "2026-08-27",
    status: "Dipublikasi",
    caption: "Belajar merawat tanaman dan mengamati proses pertumbuhan biji.",
    photos: 5,
    participants: [
      "Alya Putri Ramadhani",
      "Rafi Akbar Maulana",
      "Nayla Zahra Aulia",
      "Fathan Rizky Pratama",
      "Raka Aditya Pratama",
      "Keisha Amalia Putri",
      "Daffa Alfarizi",
      "Citra Maharani",
      "Zafran Hidayat",
      "Nadya Salsabila",
      "Hafiz Ardiansyah",
      "Mira Putri",
    ],
    note: "Proses pertumbuhan tanaman didokumentasikan agar orang tua dapat melihat perkembangan harian anak.",
  },
  {
    slug: "bermain-alat-musik",
    title: "Bermain Alat Musik",
    avatar: "🎵",
    className: "A2",
    classLabel: "Pelangi",
    time: "11.00",
    date: "2026-08-27",
    status: "Draf",
    caption: "Eksplorasi ritme sederhana menggunakan tamborin dan marakas.",
    photos: 3,
    participants: ["Nayla Zahra Aulia", "Fathan Rizky Pratama"],
    note: "Masih dalam tahap draf, foto yang belum ditag perlu ditinjau ulang sebelum dipublikasikan.",
  },
];

export function getActivity(slug: string | null) {
  return activities.find((activity) => activity.slug === slug) ?? activities[0];
}

export const students = [
  "Alya Putri Ramadhani",
  "Rafi Akbar Maulana",
  "Nayla Zahra Aulia",
  "Fathan Rizky Pratama",
  "Daffa Alfarizi",
  "Keisha Amalia Putri",
];
