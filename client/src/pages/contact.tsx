import { ArrowLeft, MapPin } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer, useFooterSettings } from "@/components/footer";
import { Link } from "wouter";
import { BRAND } from "@/lib/brand";
import { useLanguage } from "@/contexts/language-context";

export default function Contact() {
  const { data: footerSettings } = useFooterSettings();
  const { t } = useLanguage();
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Navigation */}
      <Navbar />

      {/* Back Button */}
      <div className="bg-brand py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link href="/">
            <button className="inline-flex items-center px-4 py-2 bg-white/20 backdrop-blur-sm rounded-lg text-white hover:bg-white/30 transition-all duration-200 group">
              <ArrowLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform duration-200" />
              Буцах
            </button>
          </Link>
        </div>
      </div>

      <section className="w-full max-w-6xl mx-auto px-4 py-8 md:px-8">
        <div className="flex items-start gap-4 rounded-2xl border border-gray-200 bg-white p-6">
          <MapPin className="mt-1 h-6 w-6 shrink-0 text-brand" aria-hidden="true" />
          <div>
            <h1 className="text-xl font-bold text-ink">{t.address}</h1>
            <address className="mt-2 not-italic whitespace-pre-line break-words text-base leading-relaxed text-ink">
              {footerSettings?.address || BRAND.address}
            </address>
          </div>
        </div>
      </section>

      {/* Image Section */}
      <div className="flex-1 bg-white">
        <img
          src="/contact.webp"
          alt="Компанийн танилцуулга"
          className="w-full h-auto"
          onError={(e) => {
            // Fallback to placeholder if contact.jpg doesn't exist
            e.currentTarget.src = "https://placehold.co/1200x400?text=Компанийн+танилцуулга+зураг+оруулна+уу";
          }}
        />
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}
