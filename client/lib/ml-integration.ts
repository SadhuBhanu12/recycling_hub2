// src/lib/ml-integration.ts
import { defaults } from "@/lib/config";
import * as React from "react";

export type ClassificationResult = {
  type: "biodegradable" | "recyclable" | "hazardous";
  confidence: number; // percent 0-100
  processingTime?: number; // ms
};

/**
 * Classify an image file by calling the backend /predict endpoint.
 * Expects backend response: { class: string, confidence: float(0..1), processingTime: ms }
 */
export async function classifyWaste(file: File): Promise<ClassificationResult> {
  const API_URL = "https://recycling-hub-model-backend-1.onrender.com/predict";

  const formData = new FormData();
  formData.append("file", file);

  const t0 = performance.now();

  const res = await fetch(API_URL, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Prediction failed (${res.status}): ${text || res.statusText}`,
    );
  }

  const data = await res.json();

  // expected: data.class (string), data.confidence (0..1)
  const backendClass: string = data.class;
  const backendConfidence: number = Number(data.confidence);

  const mappedType = mapBackendClass(backendClass);

  const t1 = performance.now();

  return {
    type: mappedType,
    confidence: Math.round(
      (isNaN(backendConfidence) ? 0 : backendConfidence) * 100,
    ),
    processingTime: Math.round(t1 - t0),
  };
}

function mapBackendClass(predicted: string): ClassificationResult["type"] {
  const key = (predicted || "").toLowerCase().trim();
  switch (key) {
    case "organic":
      return "biodegradable";
    case "recyclable":
      return "recyclable";
    case "hazardous":
      return "hazardous";
    case "non-recyclable":
      return "hazardous";
    default:
      return "recyclable";
  }
}

export function validateImageForClassification(file: File) {
  if (!defaults.supportedImageTypes.includes(file.type as "image/jpeg" | "image/png" | "image/webp")) {
    return {
      isValid: false,
      error: "Only JPG, PNG or WEBP images are allowed.",
    };
  }
  if (file.size > defaults.maxUploadSize) {
    return {
      isValid: false,
      error: `File size must be under ${Math.round(defaults.maxUploadSize / (1024 * 1024))}MB.`,
    };
  }
  return { isValid: true, error: null as null | string };
}

export function useWasteClassification() {
  const [loading, setLoading] = React.useState(false);

  const run = async (file: File) => {
    setLoading(true);
    try {
      const result = await classifyWaste(file);
      const recommendations =
        result.type === "biodegradable"
          ? [
              "Compost where available",
              "Use biodegradable liners",
              "Avoid mixing with recyclables",
            ]
          : result.type === "recyclable"
            ? [
                "Rinse containers before recycling",
                "Flatten boxes to save space",
                "Follow local sorting rules",
              ]
            : [
                "Handle with care and avoid contact",
                "Deliver to a hazardous waste facility",
                "Do not dispose with household trash",
              ];

      return { ...result, details: { recommendations } } as any;
    } finally {
      setLoading(false);
    }
  };

  return { classifyWaste: run, loading };
}
