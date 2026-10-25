import { motion } from "framer-motion";
import {
  ArrowLeft,
  Shield,
  Lock,
  Eye,
  UserCheck,
  Database,
  Mail,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Link } from "wouter";
import { BRAND } from "@/lib/brand";

export default function Privacy() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 to-gray-100">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 py-8 md:py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-4xl mx-auto"
        >
          <Link
            href="/"
            className="inline-flex items-center text-primary hover:text-primary/80 mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Нүүр хуудас руу буцах
          </Link>

          <div className="bg-white rounded-2xl shadow-xl p-6 md:p-10">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                  Нууцлалын бодлого
                </h1>
                <p className="text-gray-500 text-sm">
                  Сүүлд шинэчлэгдсэн: 2026 оны 1 сарын 26
                </p>
              </div>
            </div>

            <div className="space-y-8 text-gray-700">
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Database className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-semibold text-gray-900">
                    1. Цуглуулж буй мэдээлэл
                  </h2>
                </div>
                <p className="mb-3">
                  Бид таны дараах мэдээллийг цуглуулж болно:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Нэр, имэйл хаяг, утасны дугаар</li>
                  <li>Хүргэлтийн хаяг</li>
                  <li>Худалдан авалтын түүх</li>
                  <li>
                    Google акаунтаар нэвтрэх үед: Google профайлын мэдээлэл
                    (нэр, имэйл, профайл зураг)
                  </li>
                </ul>
              </section>

              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Eye className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-semibold text-gray-900">
                    2. Мэдээллийг хэрхэн ашиглах
                  </h2>
                </div>
                <p className="mb-3">
                  Бид таны мэдээллийг дараах зорилгоор ашиглана:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Захиалгыг боловсруулах, хүргэх</li>
                  <li>Хэрэглэгчийн дансыг удирдах</li>
                  <li>Үйлчилгээний талаар мэдэгдэл илгээх</li>
                  <li>Хэрэглэгчийн туршлагыг сайжруулах</li>
                </ul>
              </section>

              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Lock className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-semibold text-gray-900">
                    3. Мэдээллийн хамгаалалт
                  </h2>
                </div>
                <p>
                  Бид таны хувийн мэдээллийг хамгаалахын тулд техникийн болон
                  зохион байгуулалтын арга хэмжээ авдаг. Үүнд нууц үгийг
                  шифрлэх, аюулгүй холболт (HTTPS), мэдээллийн сангийн
                  хамгаалалт зэрэг орно.
                </p>
              </section>

              <section>
                <div className="flex items-center gap-2 mb-3">
                  <UserCheck className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-semibold text-gray-900">
                    4. Google OAuth
                  </h2>
                </div>
                <p className="mb-3">
                  Та Google акаунтаар нэвтрэхийг сонговол бид дараах мэдээллийг
                  авна:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Google ID</li>
                  <li>Нэр</li>
                  <li>Имэйл хаяг</li>
                  <li>Профайл зураг</li>
                </ul>
                <p className="mt-3">
                  Бид таны Google нууц үгэнд хандах эрхгүй бөгөөд зөвхөн дээрх
                  мэдээллийг таны данс үүсгэх, таныг таних зорилгоор ашиглана.
                </p>
              </section>

              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-semibold text-gray-900">
                    5. Гуравдагч этгээдэд мэдээлэл дамжуулах
                  </h2>
                </div>
                <p>
                  Бид таны хувийн мэдээллийг таны зөвшөөрөлгүйгээр гуравдагч
                  этгээдэд худалдахгүй, түрээслэхгүй, солилцохгүй. Гэхдээ
                  хуулийн шаардлагын дагуу эрх бүхий байгууллагад мэдээлэл өгөх
                  үүрэгтэй.
                </p>
              </section>

              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Mail className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-semibold text-gray-900">
                    6. Холбоо барих
                  </h2>
                </div>
                <p>
                  Нууцлалын бодлоготой холбоотой асуулт байвал бидэнтэй
                  холбогдоно уу:
                </p>
                <p className="mt-2">
                  <strong>Имэйл:</strong> <a href={`mailto:${BRAND.email}`}>{BRAND.email}</a>
                  <br />
                  <strong>Утас:</strong> 010-8082-9929
                </p>
              </section>
            </div>
          </div>
        </motion.div>
      </main>
      <Footer />
    </div>
  );
}
