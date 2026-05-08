import { addLocation } from "./firestore";
import { getCountryCodeFromCoordinates } from "./mapbox";

type UploadPhotoInput = {
  file: File;
  lat: number;
  lng: number;
  description: string;
  userId: string;
  isPublic?: boolean;
};

function compressToBase64(file: File, maxPx = 800, quality = 0.78): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { width, height } = img;
      if (width > height) {
        if (width > maxPx) { height = Math.round(height * maxPx / width); width = maxPx; }
      } else {
        if (height > maxPx) { width = Math.round(width * maxPx / height); height = maxPx; }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);

      resolve(canvas.toDataURL("image/jpeg", quality));
    };

    img.onerror = reject;
    img.src = objectUrl;
  });
}

export async function uploadPhoto({
  file,
  lat,
  lng,
  description,
  userId,
  isPublic = false,
}: UploadPhotoInput) {
  const [imageUrl, countryCode] = await Promise.all([
    compressToBase64(file),
    getCountryCodeFromCoordinates(lat, lng),
  ]);

  await addLocation({ userId, lat, lng, countryCode, imageUrl, description, isPublic });
}
