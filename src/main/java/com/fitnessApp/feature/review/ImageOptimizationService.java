package com.fitnessApp.feature.review;

import com.sksamuel.scrimage.ImmutableImage;
import com.sksamuel.scrimage.webp.WebpWriter;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

@Service
public class ImageOptimizationService {

    private static final int MAX_WIDTH = 1080;

    /**
     * Optimiza una imagen subida:
     * 1. Redimensiona manteniendo la relación de aspecto si el ancho es mayor a 1080px.
     * 2. La convierte y comprime en formato WebP con un factor de compresión (Q=80 por defecto).
     *
     * @param file El archivo MultipartFile subido por el cliente.
     * @return Arreglo de bytes de la imagen optimizada en formato WebP.
     * @throws IOException Si ocurre un error al procesar la imagen.
     */
    public byte[] optimizeImageToWebp(MultipartFile file) throws IOException {
        if (file.isEmpty()) {
            throw new IllegalArgumentException("El archivo de imagen no puede estar vacío");
        }

        // Cargar la imagen desde el array de bytes
        ImmutableImage image = ImmutableImage.loader().fromBytes(file.getBytes());

        // Si la imagen es más ancha que el máximo permitido, redimensionarla
        if (image.width > MAX_WIDTH) {
            image = image.scaleToWidth(MAX_WIDTH);
        }

        // Escribir la imagen en formato WebP con compresión al 80% (buen equilibrio calidad/peso)
        return image.bytes(WebpWriter.DEFAULT.withQ(80));
    }
}
