(function (root) {
  "use strict";
  const maxDataLength = 140000;
  const isValid = value => typeof value === "string" && value.length <= maxDataLength &&
    /^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(value);

  async function prepare(file) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error("Choisis une image JPEG, PNG ou WebP.");
    if (!file.size || file.size > 5 * 1024 * 1024) throw new Error("Choisis une image de 5 Mo maximum.");
    const url = URL.createObjectURL(file);
    try {
      const image = new Image();
      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = () => reject(new Error("Cette image ne peut pas être ouverte."));
        image.src = url;
      });
      if (!image.naturalWidth || !image.naturalHeight || image.naturalWidth * image.naturalHeight > 40000000) throw new Error("Dimensions de l’image trop grandes.");
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 256;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Le traitement des images est indisponible.");
      const size = Math.min(image.naturalWidth, image.naturalHeight);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, 256, 256);
      ctx.drawImage(image, (image.naturalWidth - size) / 2, (image.naturalHeight - size) / 2, size, size, 0, 0, 256, 256);
      const result = canvas.toDataURL("image/jpeg", 0.8);
      if (!isValid(result)) throw new Error("La photo préparée est trop volumineuse ou invalide.");
      return result;
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  const api = { isValid, prepare };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.PingProfilePhoto = api;
})(globalThis);
