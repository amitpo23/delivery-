"use client";

import { useState } from "react";
import { MapPin, Package, Truck, CreditCard, CheckCircle2, ArrowRight, ArrowLeft, User, Phone } from "lucide-react";
import { SERVICE_TYPES, PACKAGE_TYPES, WEIGHT_RANGES } from "@/constants/services";
import { formatPrice, generateOrderNumber } from "@/lib/utils";
import Link from "next/link";

type Step = 1 | 2 | 3 | 4;

interface OrderFormData {
  // Step 1: Pickup
  pickupAddress: string;
  pickupContactName: string;
  pickupContactPhone: string;
  pickupNotes: string;
  // Step 2: Delivery
  deliveryAddress: string;
  deliveryContactName: string;
  deliveryContactPhone: string;
  deliveryNotes: string;
  // Step 3: Package & Service
  packageType: string;
  weight: string;
  serviceType: string;
  specialInstructions: string;
}

const steps = [
  { number: 1, label: "כתובת איסוף", icon: MapPin },
  { number: 2, label: "כתובת יעד", icon: MapPin },
  { number: 3, label: "פרטי משלוח", icon: Package },
  { number: 4, label: "סיכום ואישור", icon: CreditCard },
];

export default function OrderPage() {
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [submitted, setSubmitted] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");
  const [formData, setFormData] = useState<OrderFormData>({
    pickupAddress: "",
    pickupContactName: "",
    pickupContactPhone: "",
    pickupNotes: "",
    deliveryAddress: "",
    deliveryContactName: "",
    deliveryContactPhone: "",
    deliveryNotes: "",
    packageType: "small_package",
    weight: "light",
    serviceType: "next_day",
    specialInstructions: "",
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function calculatePrice() {
    const service = SERVICE_TYPES.find((s) => s.id === formData.serviceType)!;
    const pkg = PACKAGE_TYPES.find((p) => p.id === formData.packageType)!;
    const weightRange = WEIGHT_RANGES.find((w) => w.id === formData.weight)!;
    const base = service.basePrice + pkg.surcharge + weightRange.surcharge;
    const distance = 15 + Math.random() * 30;
    const total = Math.round((base + distance * 1.2) * 1.17);
    return total;
  }

  function nextStep() {
    if (currentStep < 4) setCurrentStep((s) => (s + 1) as Step);
  }

  function prevStep() {
    if (currentStep > 1) setCurrentStep((s) => (s - 1) as Step);
  }

  function handleSubmit() {
    const num = generateOrderNumber();
    setOrderNumber(num);
    setSubmitted(true);
    // TODO: Save to Supabase
  }

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto text-center py-12">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-10 h-10 text-green-600" />
        </div>
        <h1 className="text-3xl font-bold text-primary mb-2">ההזמנה נשלחה!</h1>
        <p className="text-muted mb-2">ההזמנה שלך התקבלה בהצלחה</p>
        <div className="card !p-6 my-6">
          <div className="text-sm text-muted mb-1">מספר הזמנה</div>
          <div className="text-2xl font-bold text-primary" dir="ltr">{orderNumber}</div>
          <p className="text-sm text-muted mt-3">
            שלחנו לכם SMS עם פרטי ההזמנה וקישור למעקב
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/dashboard" className="btn-primary">
            לדשבורד
          </Link>
          <Link href="/tracking" className="btn-secondary">
            מעקב משלוח
          </Link>
        </div>
      </div>
    );
  }

  const price = currentStep >= 3 ? calculatePrice() : 0;

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-primary mb-6">הזמנת משלוח חדש</h1>

      {/* Steps Indicator */}
      <div className="flex items-center justify-between mb-8">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = step.number === currentStep;
          const isCompleted = step.number < currentStep;
          return (
            <div key={step.number} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                    isCompleted
                      ? "bg-accent text-white"
                      : isActive
                      ? "bg-secondary text-white"
                      : "bg-gray-200 text-gray-400"
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    <Icon className="w-5 h-5" />
                  )}
                </div>
                <span
                  className={`text-xs mt-1 hidden sm:block ${
                    isActive ? "text-secondary font-medium" : "text-muted"
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-2 ${
                    step.number < currentStep ? "bg-accent" : "bg-gray-200"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      <div className="card !p-8">
        {/* Step 1: Pickup */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-primary flex items-center gap-2">
              <MapPin className="w-5 h-5 text-secondary" />
              מאיפה לאסוף?
            </h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">כתובת איסוף *</label>
              <input
                type="text"
                name="pickupAddress"
                value={formData.pickupAddress}
                onChange={handleChange}
                className="input-field"
                placeholder="עיר, רחוב, מספר בית"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <User className="w-3 h-3 inline ml-1" />
                  שם איש קשר *
                </label>
                <input
                  type="text"
                  name="pickupContactName"
                  value={formData.pickupContactName}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="שם מלא"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Phone className="w-3 h-3 inline ml-1" />
                  טלפון *
                </label>
                <input
                  type="tel"
                  name="pickupContactPhone"
                  value={formData.pickupContactPhone}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="050-0000000"
                  dir="ltr"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">הערות לשליח</label>
              <input
                type="text"
                name="pickupNotes"
                value={formData.pickupNotes}
                onChange={handleChange}
                className="input-field"
                placeholder="קומה, דירה, קוד כניסה..."
              />
            </div>
          </div>
        )}

        {/* Step 2: Delivery */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-primary flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              לאיפה לשלוח?
            </h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">כתובת יעד *</label>
              <input
                type="text"
                name="deliveryAddress"
                value={formData.deliveryAddress}
                onChange={handleChange}
                className="input-field"
                placeholder="עיר, רחוב, מספר בית"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <User className="w-3 h-3 inline ml-1" />
                  שם מקבל *
                </label>
                <input
                  type="text"
                  name="deliveryContactName"
                  value={formData.deliveryContactName}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="שם מלא"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Phone className="w-3 h-3 inline ml-1" />
                  טלפון מקבל *
                </label>
                <input
                  type="tel"
                  name="deliveryContactPhone"
                  value={formData.deliveryContactPhone}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="050-0000000"
                  dir="ltr"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">הערות למסירה</label>
              <input
                type="text"
                name="deliveryNotes"
                value={formData.deliveryNotes}
                onChange={handleChange}
                className="input-field"
                placeholder="קומה, דירה, הוראות מיוחדות..."
              />
            </div>
          </div>
        )}

        {/* Step 3: Package & Service */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-primary flex items-center gap-2">
              <Package className="w-5 h-5 text-secondary" />
              פרטי המשלוח
            </h2>

            {/* Service Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Truck className="w-4 h-4 inline ml-1" />
                סוג שירות *
              </label>
              <div className="grid grid-cols-2 gap-3">
                {SERVICE_TYPES.map((s) => {
                  const Icon = s.icon;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, serviceType: s.id }))}
                      className={`p-4 rounded-xl border-2 text-right transition-all ${
                        formData.serviceType === s.id
                          ? "border-secondary bg-secondary/5"
                          : "border-border hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className="w-5 h-5" style={{ color: s.color }} />
                        <span className="font-bold text-sm">{s.name}</span>
                      </div>
                      <div className="text-xs text-muted">{s.timeframe}</div>
                      <div className="text-sm font-bold mt-1" style={{ color: s.color }}>
                        החל מ-{s.basePrice}₪
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Package Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">סוג חבילה *</label>
                <select
                  name="packageType"
                  value={formData.packageType}
                  onChange={handleChange}
                  className="input-field"
                >
                  {PACKAGE_TYPES.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.icon} {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">משקל משוער *</label>
                <select
                  name="weight"
                  value={formData.weight}
                  onChange={handleChange}
                  className="input-field"
                >
                  {WEIGHT_RANGES.map((w) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">הוראות מיוחדות</label>
              <textarea
                name="specialInstructions"
                value={formData.specialInstructions}
                onChange={handleChange}
                className="input-field resize-none"
                rows={3}
                placeholder="הוראות מיוחדות לטיפול בחבילה..."
              />
            </div>

            {/* Price Preview */}
            <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
              <div className="flex justify-between items-center">
                <span className="text-green-700 font-medium">מחיר משוער (כולל מע&quot;מ)</span>
                <span className="text-2xl font-bold text-green-800">{formatPrice(price)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Summary */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-primary flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-accent" />
              סיכום הזמנה
            </h2>

            <div className="space-y-4">
              {/* Pickup Summary */}
              <div className="p-4 bg-gray-50 rounded-xl">
                <div className="text-sm font-medium text-muted mb-2">איסוף מ:</div>
                <div className="font-medium text-primary">{formData.pickupAddress}</div>
                <div className="text-sm text-muted">
                  {formData.pickupContactName} | {formData.pickupContactPhone}
                </div>
                {formData.pickupNotes && (
                  <div className="text-sm text-muted mt-1">{formData.pickupNotes}</div>
                )}
              </div>

              {/* Delivery Summary */}
              <div className="p-4 bg-gray-50 rounded-xl">
                <div className="text-sm font-medium text-muted mb-2">מסירה ל:</div>
                <div className="font-medium text-primary">{formData.deliveryAddress}</div>
                <div className="text-sm text-muted">
                  {formData.deliveryContactName} | {formData.deliveryContactPhone}
                </div>
                {formData.deliveryNotes && (
                  <div className="text-sm text-muted mt-1">{formData.deliveryNotes}</div>
                )}
              </div>

              {/* Package Summary */}
              <div className="p-4 bg-gray-50 rounded-xl">
                <div className="text-sm font-medium text-muted mb-2">פרטי משלוח:</div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted">שירות: </span>
                    <span className="font-medium">{SERVICE_TYPES.find((s) => s.id === formData.serviceType)?.name}</span>
                  </div>
                  <div>
                    <span className="text-muted">סוג: </span>
                    <span className="font-medium">{PACKAGE_TYPES.find((p) => p.id === formData.packageType)?.name}</span>
                  </div>
                  <div>
                    <span className="text-muted">משקל: </span>
                    <span className="font-medium">{WEIGHT_RANGES.find((w) => w.id === formData.weight)?.name}</span>
                  </div>
                  <div>
                    <span className="text-muted">זמן: </span>
                    <span className="font-medium">{SERVICE_TYPES.find((s) => s.id === formData.serviceType)?.timeframe}</span>
                  </div>
                </div>
                {formData.specialInstructions && (
                  <div className="text-sm text-muted mt-2">
                    הוראות: {formData.specialInstructions}
                  </div>
                )}
              </div>

              {/* Price */}
              <div className="p-4 bg-green-50 border-2 border-green-200 rounded-xl">
                <div className="flex justify-between items-center">
                  <span className="text-green-800 font-bold text-lg">סה&quot;כ לתשלום</span>
                  <span className="text-3xl font-bold text-green-800">{formatPrice(price)}</span>
                </div>
                <p className="text-xs text-green-600 mt-1">כולל מע&quot;מ 17%</p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-8 pt-6 border-t border-border">
          {currentStep > 1 ? (
            <button onClick={prevStep} className="btn-secondary">
              <ArrowRight className="w-4 h-4" />
              חזרה
            </button>
          ) : (
            <div />
          )}

          {currentStep < 4 ? (
            <button onClick={nextStep} className="btn-primary">
              הבא
              <ArrowLeft className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={handleSubmit} className="btn-primary !bg-green-600 hover:!bg-green-700 text-lg !py-3 !px-8">
              <CheckCircle2 className="w-5 h-5" />
              אישור הזמנה
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
