import { motion } from "framer-motion";
import {
  ArrowLeft,
  FileText,
  ShoppingCart,
  Truck,
  CreditCard,
  AlertCircle,
  Mail,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Link } from "wouter";
import { BRAND } from "@/lib/brand";

export default function Terms() {
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
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                  Үйлчилгээний нөхцөл
                </h1>
                <p className="text-gray-500 text-sm">
                  Сүүлд шинэчлэгдсэн: 2026 оны 1 сарын 26
                </p>
              </div>
            </div>

            <div className="space-y-8 text-gray-700">
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-semibold text-gray-900">
                    1. Ерөнхий нөхцөл
                  </h2>
                </div>
                <p>
                  Энэхүү вэбсайтыг ашигласнаар та эдгээр үйлчилгээний нөхцөлийг
                  хүлээн зөвшөөрч байна гэж үзнэ. Хэрэв та эдгээр нөхцөлтэй
                  санал нийлэхгүй бол вэбсайтыг ашиглахаа зогсооно уу.
                </p>
              </section>

              <section>
                <div className="flex items-center gap-2 mb-3">
                  <ShoppingCart className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-semibold text-gray-900">
                    2. Захиалга өгөх
                  </h2>
                </div>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Захиалга өгөхдөө үнэн зөв мэдээлэл оруулах үүрэгтэй</li>
                  <li>
                    Захиалга баталгаажсны дараа өөрчлөлт хийх боломжгүй байж
                    болно
                  </li>
                  <li>
                    Бид захиалгыг цуцлах эрхтэй (нөөц дуусах, техникийн асуудал
                    гэх мэт)
                  </li>
                  <li>
                    Хамгийн бага захиалгын хэмжээ бүтээгдэхүүн тус бүрт
                    тодорхойлогдсон
                  </li>
                </ul>
              </section>

              <section>
                <div className="flex items-center gap-2 mb-3">
                  <CreditCard className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-semibold text-gray-900">
                    3. Төлбөр
                  </h2>
                </div>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Төлбөрийг банкны шилжүүлгээр хийнэ</li>
                  <li>
                    Захиалга баталгаажуулахын өмнө төлбөр төлөгдсөн байх ёстой
                  </li>
                  <li>
                    Үнэ нь өөрчлөгдөх боломжтой (захиалга хийсэн үеийн үнэ
                    хүчинтэй)
                  </li>
                </ul>
              </section>

              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Truck className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-semibold text-gray-900">
                    4. Хүргэлт
                  </h2>
                </div>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Хүргэлтийн хугацаа нь байршлаас хамаарна</li>
                  <li>
                    Хүргэлт хийгдэхгүй өдрүүд байж болно (баярын өдрүүд гэх мэт)
                  </li>
                  <li>Хүргэлтийн хаяг буруу байвал нэмэлт төлбөр гарч болно</li>
                  <li>
                    Хүлээн авагч байхгүй тохиолдолд дахин хүргэлтийн төлбөр
                    гарна
                  </li>
                </ul>
              </section>

              <section>
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-semibold text-gray-900">
                    5. Буцаалт, солилт
                  </h2>
                </div>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>
                    Махан бүтээгдэхүүний онцлогоос шалтгаалан буцаалт
                    хязгаарлагдмал
                  </li>
                  <li>
                    Чанарын асуудалтай бүтээгдэхүүнийг 24 цагийн дотор мэдэгдэх
                    шаардлагатай
                  </li>
                  <li>
                    Буцаалт хийхдээ бүтээгдэхүүний зураг болон баримтыг илгээх
                    ёстой
                  </li>
                  <li>
                    Зөвшөөрөгдсөн буцаалтын төлбөрийг 3-5 ажлын өдрийн дотор
                    шилжүүлнэ
                  </li>
                </ul>
              </section>

              <section>
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-semibold text-gray-900">
                    6. Хэрэглэгчийн данс
                  </h2>
                </div>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Та дансны мэдээллийг нууцлах үүрэгтэй</li>
                  <li>
                    Данс руу зөвшөөрөлгүй нэвтрэлтийг нэн даруй мэдэгдэх ёстой
                  </li>
                  <li>
                    Google акаунтаар нэвтрэх тохиолдолд Google-ийн нөхцөлүүд мөн
                    хамаарна
                  </li>
                </ul>
              </section>

              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Mail className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-semibold text-gray-900">
                    7. Холбоо барих
                  </h2>
                </div>
                <p>
                  Үйлчилгээний нөхцөлтэй холбоотой асуулт байвал бидэнтэй
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
