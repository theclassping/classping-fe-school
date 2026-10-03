"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

type SchoolClass = { id: number; name?: string; code?: string };
type Student = {
  id: number;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  nickname?: string;
  name?: string;
  full_name?: string;
};
type FeeType = { id: number; name: string; amount?: string | number };

function recordsFrom(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== "object") return [];
  const response = data as { results?: unknown; data?: unknown };
  if (Array.isArray(response.results)) return response.results;
  return Array.isArray(response.data) ? response.data : [];
}

function studentName(student: Student) {
  if (student.full_name || student.name) return student.full_name ?? student.name;
  return [student.first_name, student.middle_name, student.last_name]
    .filter(Boolean)
    .join(" ") || student.nickname || `Siswa #${student.id}`;
}

export default function AddPaymentPage() {
  const router = useRouter();
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [feeTypes, setFeeTypes] = useState<FeeType[]>([]);
  const [classId, setClassId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [feeTypeId, setFeeTypeId] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(true);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadOptions() {
      try {
        const [classesResponse, feeTypesResponse] = await Promise.all([
          fetch("/api/proxy/classes/", {
            credentials: "include",
            cache: "no-store",
            signal: controller.signal,
          }),
          fetch("/api/proxy/fee-types/", {
            credentials: "include",
            cache: "no-store",
            signal: controller.signal,
          }),
        ]);

        if (classesResponse.status === 401 || feeTypesResponse.status === 401) {
          router.push("/login");
          return;
        }
        if (!classesResponse.ok || !feeTypesResponse.ok) {
          throw new Error("Gagal memuat pilihan pembayaran.");
        }

        const [classData, feeTypeData] = await Promise.all([
          classesResponse.json(),
          feeTypesResponse.json(),
        ]);
        setClasses(recordsFrom(classData) as SchoolClass[]);
        setFeeTypes(recordsFrom(feeTypeData) as FeeType[]);
      } catch (loadError) {
        if (loadError instanceof DOMException && loadError.name === "AbortError") return;
        console.error(loadError);
        setError("Gagal memuat pilihan pembayaran.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadOptions();
    return () => controller.abort();
  }, [router]);

  useEffect(() => {
    if (!classId) return;

    const controller = new AbortController();
    async function loadStudents() {
      setStudentsLoading(true);
      try {
        const response = await fetch(
          `/api/proxy/students/?class_id=${encodeURIComponent(classId)}`,
          { credentials: "include", cache: "no-store", signal: controller.signal },
        );
        if (response.status === 401) {
          router.push("/login");
          return;
        }
        if (!response.ok) throw new Error("Gagal memuat siswa.");
        setStudents(recordsFrom(await response.json()) as Student[]);
      } catch (loadError) {
        if (loadError instanceof DOMException && loadError.name === "AbortError") return;
        console.error(loadError);
        setError("Gagal memuat siswa untuk kelas ini.");
      } finally {
        if (!controller.signal.aborted) setStudentsLoading(false);
      }
    }
    void loadStudents();
    return () => controller.abort();
  }, [classId, router]);

  function selectClass(value: string) {
    setClassId(value);
    setStudentId("");
    setStudents([]);
  }

  function selectFeeType(value: string) {
    setFeeTypeId(value);
    const selected = feeTypes.find((feeType) => String(feeType.id) === value);
    if (selected?.amount !== undefined) setAmount(String(selected.amount));
  }

  async function uploadProof(file: File) {
    const response = await fetch("/api/proxy/media/presign", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: file.name,
        content_type: file.type,
        expires_in: 3600,
      }),
    });
    if (!response.ok) throw new Error("Gagal menyiapkan unggahan bukti pembayaran.");
    const upload = (await response.json()) as {
      file_key?: string;
      presigned_url?: string;
    };
    if (!upload.file_key || !upload.presigned_url) {
      throw new Error("URL unggahan bukti pembayaran tidak tersedia.");
    }
    const uploadResponse = await fetch(upload.presigned_url, {
      method: "PUT",
      headers: { "Content-Type": file.type || "application/octet-stream" },
      body: file,
    });
    if (!uploadResponse.ok) throw new Error("Gagal mengunggah bukti pembayaran.");
    return upload.file_key;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const formData = new FormData(event.currentTarget);
      const proof = formData.get("proof");
      const proofKey =
        proof instanceof File && proof.size > 0 ? await uploadProof(proof) : null;
      const payload = {
        class_id: Number(classId),
        student_id: Number(studentId),
        fee_type_id: Number(feeTypeId),
        amount: Number(formData.get("amount")),
        payment_method: String(formData.get("payment_method")),
        status: String(formData.get("status")),
        proofs: proofKey ? [{ image_data: proofKey }] : [],
      };
      const response = await fetch("/api/proxy/payments/", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (response.status === 401) {
        router.push("/login");
        return;
      }
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(
          typeof data?.detail === "string" ? data.detail : "Gagal menyimpan pembayaran.",
        );
      }
      router.push("/dashboard/payments");
      router.refresh();
    } catch (submitError) {
      console.error(submitError);
      setError(
        submitError instanceof Error ? submitError.message : "Gagal menyimpan pembayaran.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main>
      <section className="panel student-manage">
        <div className="panel-heading">
          <div>
            <h2>Catat Pembayaran</h2>
            <p>Tambahkan pembayaran siswa dan bukti pembayarannya.</p>
          </div>
          <Link className="secondary-button" href="/dashboard/payments">
            Kembali
          </Link>
        </div>

        <form className="student-form" onSubmit={submit}>
          <div className="form-grid">
            <div className="field-group">
              <label htmlFor="paymentClass">Kelas</label>
              <select
                id="paymentClass"
                value={classId}
                onChange={(event) => selectClass(event.target.value)}
                disabled={loading}
                required
              >
                <option value="">{loading ? "Memuat kelas..." : "Pilih kelas"}</option>
                {classes.map((schoolClass) => (
                  <option key={schoolClass.id} value={schoolClass.id}>
                    {schoolClass.code && schoolClass.name
                      ? `${schoolClass.code} - ${schoolClass.name}`
                      : schoolClass.name ?? schoolClass.code ?? `Kelas #${schoolClass.id}`}
                  </option>
                ))}
              </select>
            </div>

            <div className="field-group">
              <label htmlFor="paymentStudent">Siswa</label>
              <select
                id="paymentStudent"
                value={studentId}
                onChange={(event) => setStudentId(event.target.value)}
                disabled={!classId || studentsLoading}
                required
              >
                <option value="">
                  {studentsLoading ? "Memuat siswa..." : "Pilih siswa"}
                </option>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {studentName(student)}
                  </option>
                ))}
              </select>
            </div>

            <div className="field-group">
              <label htmlFor="paymentFeeType">Jenis biaya</label>
              <select
                id="paymentFeeType"
                value={feeTypeId}
                onChange={(event) => selectFeeType(event.target.value)}
                disabled={loading}
                required
              >
                <option value="">Pilih jenis biaya</option>
                {feeTypes.map((feeType) => (
                  <option key={feeType.id} value={feeType.id}>
                    {feeType.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="field-group">
              <label htmlFor="paymentAmount">Jumlah</label>
              <input
                id="paymentAmount"
                name="amount"
                type="number"
                min="1"
                step="1"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                required
              />
            </div>

            <div className="field-group">
              <label htmlFor="paymentMethod">Metode pembayaran</label>
              <select id="paymentMethod" name="payment_method" required>
                <option value="">Pilih metode pembayaran</option>
                <option value="bank_transfer">Transfer Bank</option>
                <option value="qris">QRIS</option>
                <option value="cash">Tunai</option>
              </select>
            </div>

            <div className="field-group">
              <label htmlFor="paymentStatus">Status</label>
              <select id="paymentStatus" name="status" defaultValue="paid" required>
                <option value="pending">Pending</option>
                <option value="submitted">Submitted</option>
                <option value="paid">Paid</option>
                <option value="verified">Verified</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            <div className="field-group full">
              <label htmlFor="paymentProof">Bukti pembayaran</label>
              <input
                id="paymentProof"
                name="proof"
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
              />
              <small>Format JPG, PNG, WebP, atau PDF.</small>
            </div>
          </div>

          <div className="student-form-actions">
            <Link className="secondary-button" href="/dashboard/payments">
              Batal
            </Link>
            <button className="primary-button" type="submit" disabled={submitting}>
              {submitting ? "Menyimpan..." : "Simpan Pembayaran"}
            </button>
          </div>
          {error && (
            <p className="settings-save-message form-error" role="alert">
              {error}
            </p>
          )}
        </form>
      </section>
    </main>
  );
}
