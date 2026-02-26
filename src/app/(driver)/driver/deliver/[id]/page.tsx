"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Camera, Pen, CheckCircle2, ArrowRight, X, RotateCcw } from "lucide-react";

interface DeliverPageProps {
  params: Promise<{ id: string }>;
}

export default function DeliverPage({ params }: DeliverPageProps) {
  const router = useRouter();
  const [photo, setPhoto] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [isDrawing, setIsDrawing] = useState(false);
  const [showSignature, setShowSignature] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const orderInfo = {
    orderNumber: "DEL-A1B2C3-X1",
    address: "כרמיאל, רח' הגליל 22",
    contactName: "מירי לוי",
    contactPhone: "050-8888888",
    packageType: "חבילה קטנה",
  };

  // Canvas drawing for signature
  useEffect(() => {
    if (showSignature && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        canvas.width = canvas.offsetWidth;
        canvas.height = 200;
        ctx.strokeStyle = "#1E3A5F";
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }
  }, [showSignature]);

  function handleMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  }

  function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  }

  function handleMouseUp() {
    setIsDrawing(false);
  }

  function handleTouchStart(e: React.TouchEvent<HTMLCanvasElement>) {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    ctx.beginPath();
    ctx.moveTo(touch.clientX - rect.left, touch.clientY - rect.top);
    setIsDrawing(true);
  }

  function handleTouchMove(e: React.TouchEvent<HTMLCanvasElement>) {
    e.preventDefault();
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    ctx.lineTo(touch.clientX - rect.left, touch.clientY - rect.top);
    ctx.stroke();
  }

  function handleTouchEnd() {
    setIsDrawing(false);
  }

  function saveSignature() {
    if (canvasRef.current) {
      setSignature(canvasRef.current.toDataURL());
      setShowSignature(false);
    }
  }

  function clearSignature() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setSignature(null);
  }

  function handlePhotoCapture(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  function handleSubmit() {
    // TODO: Upload to Supabase Storage + update order status
    setSubmitted(true);
    setTimeout(() => {
      router.push("/driver/tasks");
    }, 2000);
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4 animate-pulse">
          <CheckCircle2 className="w-10 h-10 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-primary mb-2">המשלוח נמסר!</h1>
        <p className="text-muted">מעביר למשימה הבאה...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowRight className="w-5 h-5 text-gray-500" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-primary">אישור מסירה</h1>
          <p className="text-sm text-muted" dir="ltr">#{orderInfo.orderNumber}</p>
        </div>
      </div>

      {/* Order Info */}
      <div className="card !p-4 mb-4">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted">כתובת:</span>
            <span className="font-medium">{orderInfo.address}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">מקבל:</span>
            <span className="font-medium">{orderInfo.contactName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">חבילה:</span>
            <span className="font-medium">{orderInfo.packageType}</span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {/* Photo Capture */}
        <div className="card !p-4">
          <h3 className="text-sm font-bold text-primary mb-3 flex items-center gap-2">
            <Camera className="w-4 h-4 text-secondary" />
            תמונת הוכחת מסירה
          </h3>

          {photo ? (
            <div className="relative">
              <img src={photo} alt="POD" className="w-full h-48 object-cover rounded-xl" />
              <button
                onClick={() => setPhoto(null)}
                className="absolute top-2 left-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-36 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-2 text-muted hover:border-secondary hover:text-secondary transition-colors"
            >
              <Camera className="w-8 h-8" />
              <span className="text-sm">צלמו תמונה של החבילה</span>
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhotoCapture}
            className="hidden"
          />
        </div>

        {/* Signature */}
        <div className="card !p-4">
          <h3 className="text-sm font-bold text-primary mb-3 flex items-center gap-2">
            <Pen className="w-4 h-4 text-secondary" />
            חתימת המקבל
          </h3>

          {signature ? (
            <div className="relative">
              <img src={signature} alt="Signature" className="w-full h-24 object-contain bg-white rounded-xl border border-border" />
              <button
                onClick={() => { setSignature(null); setShowSignature(true); }}
                className="absolute top-2 left-2 w-8 h-8 bg-gray-500 text-white rounded-full flex items-center justify-center"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          ) : !showSignature ? (
            <button
              onClick={() => setShowSignature(true)}
              className="w-full h-24 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-1 text-muted hover:border-secondary hover:text-secondary transition-colors"
            >
              <Pen className="w-6 h-6" />
              <span className="text-sm">לחצו לחתימה</span>
            </button>
          ) : (
            <div>
              <div className="border-2 border-primary rounded-xl overflow-hidden">
                <canvas
                  ref={canvasRef}
                  className="w-full cursor-crosshair touch-none"
                  style={{ height: 200 }}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                />
              </div>
              <div className="flex gap-2 mt-2">
                <button onClick={saveSignature} className="btn-primary flex-1 text-sm !py-2">
                  שמור חתימה
                </button>
                <button onClick={clearSignature} className="btn-secondary text-sm !py-2">
                  <RotateCcw className="w-4 h-4" />
                  נקה
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="card !p-4">
          <label className="text-sm font-bold text-primary mb-2 block">הערות (אופציונלי)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="input-field resize-none"
            rows={2}
            placeholder="הערות למסירה..."
          />
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!photo && !signature}
          className="btn-primary w-full text-lg !py-4 !bg-green-600 hover:!bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <CheckCircle2 className="w-5 h-5" />
          אישור מסירה
        </button>
        <p className="text-xs text-muted text-center">
          יש לצלם תמונה או לקבל חתימה לפני אישור המסירה
        </p>
      </div>
    </div>
  );
}
