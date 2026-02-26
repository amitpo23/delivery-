import Link from "next/link";
import { ArrowLeft, Package, MapPin, Shield, Star } from "lucide-react";
import {
  COMPANY_SHORT,
  SERVICE_TYPES,
  COVERAGE_AREAS,
  ADVANTAGES,
  TESTIMONIALS,
} from "@/constants/services";
import PriceCalculatorMini from "@/components/marketing/PriceCalculatorMini";

export default function HomePage() {
  return (
    <>
      {/* Hero Section */}
      <section className="relative bg-gradient-to-bl from-primary via-primary-dark to-primary overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 right-20 w-72 h-72 bg-secondary rounded-full blur-3xl" />
          <div className="absolute bottom-20 left-20 w-96 h-96 bg-blue-400 rounded-full blur-3xl" />
        </div>
        <div className="container-custom relative py-16 md:py-24 lg:py-32">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white leading-tight mb-6">
              משלוחים מהירים ואמינים
              <span className="block text-secondary">באזור הצפון</span>
            </h1>
            <p className="text-lg md:text-xl text-white/80 mb-8 max-w-xl leading-relaxed">
              {COMPANY_SHORT} מספקים שירותי משלוחים מקצועיים מחיפה ועד קריית שמונה.
              משלוח אקספרס תוך שעות, מעקב בזמן אמת ומחירים הוגנים.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href="/order" className="btn-primary text-lg !py-3 !px-8">
                הזמן משלוח עכשיו
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <Link href="/pricing" className="btn-secondary !border-white !text-white hover:!bg-white hover:!text-primary text-lg !py-3 !px-8">
                חשב מחיר
              </Link>
            </div>

            {/* Stats */}
            <div className="flex flex-wrap gap-8 mt-12">
              <div>
                <div className="text-3xl font-bold text-secondary">5,000+</div>
                <div className="text-white/60 text-sm">משלוחים בחודש</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-secondary">95%</div>
                <div className="text-white/60 text-sm">הגעה בזמן</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-secondary">4.9</div>
                <div className="text-white/60 text-sm flex items-center gap-1">
                  <Star className="w-3 h-3 fill-secondary text-secondary" />
                  דירוג לקוחות
                </div>
              </div>
              <div>
                <div className="text-3xl font-bold text-secondary">50+</div>
                <div className="text-white/60 text-sm">ישובים בכיסוי</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Price Calculator */}
      <section className="relative -mt-8 z-10">
        <div className="container-custom">
          <PriceCalculatorMini />
        </div>
      </section>

      {/* Services */}
      <section className="py-16 md:py-24">
        <div className="container-custom">
          <h2 className="section-title">השירותים שלנו</h2>
          <p className="section-subtitle">בחרו את סוג המשלוח המתאים לכם</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {SERVICE_TYPES.map((service) => {
              const Icon = service.icon;
              return (
                <div key={service.id} className="card text-center group">
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-transform group-hover:scale-110"
                    style={{ backgroundColor: `${service.color}15` }}
                  >
                    <Icon className="w-8 h-8" style={{ color: service.color }} />
                  </div>
                  <h3 className="text-xl font-bold text-primary mb-2">{service.name}</h3>
                  <p className="text-muted text-sm mb-3">{service.description}</p>
                  <div className="text-sm font-medium" style={{ color: service.color }}>
                    {service.timeframe}
                  </div>
                  <div className="mt-3 text-2xl font-bold text-primary">
                    {service.basePrice}₪
                    <span className="text-sm font-normal text-muted mr-1">החל מ-</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="text-center mt-8">
            <Link href="/services" className="btn-secondary">
              לכל השירותים
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Advantages */}
      <section className="py-16 md:py-24 bg-white">
        <div className="container-custom">
          <h2 className="section-title">למה לבחור בנו?</h2>
          <p className="section-subtitle">היתרונות שהופכים אותנו לבחירה הנכונה</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {ADVANTAGES.map((advantage, index) => (
              <div key={index} className="card flex gap-4">
                <div className="text-4xl shrink-0">{advantage.icon}</div>
                <div>
                  <h3 className="text-lg font-bold text-primary mb-1">{advantage.title}</h3>
                  <p className="text-muted text-sm">{advantage.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Coverage Areas */}
      <section className="py-16 md:py-24">
        <div className="container-custom">
          <h2 className="section-title">אזורי כיסוי</h2>
          <p className="section-subtitle">אנחנו מגיעים לכל הצפון</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {COVERAGE_AREAS.map((area) => (
              <div key={area.name} className="card">
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="w-5 h-5 text-secondary" />
                  <h3 className="text-lg font-bold text-primary">{area.name}</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {area.cities.map((city) => (
                    <span
                      key={city}
                      className="px-3 py-1 bg-primary/5 text-primary text-sm rounded-full"
                    >
                      {city}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 md:py-24 bg-white">
        <div className="container-custom">
          <h2 className="section-title">מה הלקוחות אומרים</h2>
          <p className="section-subtitle">אלפי לקוחות מרוצים באזור הצפון</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((testimonial, index) => (
              <div key={index} className="card">
                <div className="flex gap-1 mb-3">
                  {Array.from({ length: testimonial.rating }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-secondary text-secondary" />
                  ))}
                </div>
                <p className="text-gray-700 mb-4 leading-relaxed">&ldquo;{testimonial.text}&rdquo;</p>
                <div>
                  <div className="font-bold text-primary">{testimonial.name}</div>
                  <div className="text-muted text-sm">{testimonial.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-24 bg-gradient-to-l from-secondary to-secondary-dark">
        <div className="container-custom text-center">
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4">
            מוכנים לשלוח?
          </h2>
          <p className="text-white/80 text-lg mb-8 max-w-lg mx-auto">
            הזמינו משלוח עכשיו ותיהנו משירות מהיר, אמין ובמחיר הוגן
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/order"
              className="inline-flex items-center gap-2 px-8 py-3 bg-white text-secondary font-bold rounded-xl hover:bg-gray-100 transition-all text-lg"
            >
              הזמן משלוח
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 px-8 py-3 border-2 border-white text-white font-bold rounded-xl hover:bg-white hover:text-secondary transition-all text-lg"
            >
              דברו איתנו
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
