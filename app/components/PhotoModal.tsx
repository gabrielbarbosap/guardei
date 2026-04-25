"use client";

import Image from "next/image";
import type { LocationPhoto } from "@/types/location";

type PhotoModalProps = {
  photo: LocationPhoto | null;
  onClose: () => void;
};

export default function PhotoModal({ photo, onClose }: PhotoModalProps) {
  if (!photo) return null;

  return (
    <div className="absolute right-4 top-4 z-10 w-80 rounded-xl bg-black/85 p-4 text-white shadow-xl backdrop-blur">
      <button
        type="button"
        onClick={onClose}
        className="mb-3 ml-auto block rounded-md bg-white/20 px-2 py-1 text-xs hover:bg-white/30"
      >
        Fechar
      </button>
      <div className="relative h-48 w-full overflow-hidden rounded-lg">
        <Image src={photo.imageUrl} alt={photo.description} fill className="object-cover" />
      </div>
      <p className="mt-3 text-sm text-zinc-200">{photo.description}</p>
    </div>
  );
}
