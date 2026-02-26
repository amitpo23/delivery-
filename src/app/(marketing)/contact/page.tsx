"use client";

import { useState } from "react";
import { Phone, Mail, MapPin, MessageCircle, Send, CheckCircle2 } from "lucide-react";
import { COMPANY_NAME, COMPANY_PHONE, COMPANY_EMAIL, COMPANY_WHATSAPP } from "@/constants/services";

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    subject: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // TODO: Submit to Supabase or API
    setSubmitted(true);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  return (
    <>
      {/* Hero */}
      <section className="bg-primary py-16 md:py-20">
        <div className="container-custom">
          <h1 className="text-3xl md:text-5xl font-extrabold text-white mb-4">צור קשר</h1>
          <p className="text-white/70 text-lg max-w-xl">
            נשמח לשמוע מכם! צרו קשר בכל דרך שנוחה לכם
          </p>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="container-custom">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Contact Info */}
            <div className="space-y-6">
              <div className="card">
                <a
                  href={`tel:${COMPANY_PHONE}`}
                  className="flex items-center gap-4 group"
                >
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                    <Phone className="w-6 h-6 text-primary group-hover:text-white" />
                  </div>
                  <div>
                    <div className="font-bold text-primary">טלפון</div>
                    <div className="text-muted">{COMPANY_PHONE}</div>
                  </div>
                </a>
              </div>

              <div className="card">
                <a
                  href={`https://wa.me/${COMPANY_WHATSAPP}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 group"
                >
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center group-hover:bg-green-500 transition-colors">
                    <MessageCircle className="w-6 h-6 text-green-600 group-hover:text-white" />
                  </div>
                  <div>
                    <div className="font-bold text-primary">WhatsApp</div>
                    <div className="text-muted">שלחו לנו הודעה</div>
                  </div>
                </a>
              </div>

              <div className="card">
                <a
                  href={`mailto:${COMPANY_EMAIL}`}
                  className="flex items-center gap-4 group"
                >
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center group-hover:bg-blue-500 transition-colors">
                    <Mail className="w-6 h-6 text-blue-600 group-hover:text-white" />
                  </div>
                  <div>
                    <div className="font-bold text-primary">אימייל</div>
                    <div className="text-muted">{COMPANY_EMAIL}</div>
                  </div>
                </a>
              </div>

              <div className="card">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-secondary/10 rounded-xl flex items-center justify-center">
                    <MapPin className="w-6 h-6 text-secondary" />
                  </div>
                  <div>
                    <div className="font-bold text-primary">כתובת</div>
                    <div className="text-muted">אזור הצפון, ישראל</div>
                  </div>
                </div>
              </div>

              <div className="card !bg-primary text-white">
                <h3 className="font-bold text-lg mb-2">שעות פעילות</h3>
                <div className="space-y-1 text-white/80 text-sm">
                  <div className="flex justify-between">
                    <span>ראשון - חמישי</span>
                    <span>08:00 - 20:00</span>
                  </div>
                  <div className="flex justify-between">
                    <span>שישי</span>
                    <span>08:00 - 14:00</span>
                  </div>
                  <div className="flex justify-between">
                    <span>שבת</span>
                    <span>סגור</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div className="lg:col-span-2">
              <div className="card !p-8">
                {submitted ? (
                  <div className="text-center py-12">
                    <CheckCircle2 className="w-16 h-16 text-accent mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-primary mb-2">ההודעה נשלחה!</h2>
                    <p className="text-muted">תודה שפניתם אלינו. ניצור אתכם קשר בהקדם.</p>
                    <button
                      onClick={() => {
                        setSubmitted(false);
                        setFormData({ name: "", phone: "", email: "", subject: "", message: "" });
                      }}
                      className="btn-secondary mt-6"
                    >
                      שליחת הודעה נוספת
                    </button>
                  </div>
                ) : (
                  <>
                    <h2 className="text-xl font-bold text-primary mb-6">שלחו לנו הודעה</h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            שם מלא *
                          </label>
                          <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            required
                            className="input-field"
                            placeholder="השם שלכם"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            טלפון *
                          </label>
                          <input
                            type="tel"
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            required
                            className="input-field"
                            placeholder="050-0000000"
                            dir="ltr"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          אימייל
                        </label>
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          className="input-field"
                          placeholder="your@email.com"
                          dir="ltr"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          נושא
                        </label>
                        <select
                          name="subject"
                          value={formData.subject}
                          onChange={handleChange}
                          className="input-field"
                        >
                          <option value="">בחרו נושא</option>
                          <option value="general">שאלה כללית</option>
                          <option value="quote">בקשת הצעת מחיר</option>
                          <option value="business">שיתוף פעולה עסקי</option>
                          <option value="complaint">תלונה</option>
                          <option value="other">אחר</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          הודעה *
                        </label>
                        <textarea
                          name="message"
                          value={formData.message}
                          onChange={handleChange}
                          required
                          rows={5}
                          className="input-field resize-none"
                          placeholder="כתבו את ההודעה שלכם..."
                        />
                      </div>

                      <button type="submit" className="btn-primary w-full text-lg !py-3">
                        <Send className="w-5 h-5" />
                        שלח הודעה
                      </button>
                    </form>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
