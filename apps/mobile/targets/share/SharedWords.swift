import ImageIO
import UIKit
import UniformTypeIdentifiers
import Vision

/// What the share sheet was handed, read into words. Text is taken as it is; a link is its title
/// and address; a picture is read on the phone, and nothing leaves it.
enum SharedWords {
    struct Found: Equatable {
        let text: String
        let kind: SharedIn.Kind
    }

    /// The first readable thing among what was shared: words before a link, a link before a
    /// picture. Nil when there is nothing to read.
    static func read(_ items: [NSExtensionItem]) async -> Found? {
        let providers = items.flatMap { $0.attachments ?? [] }
        let written = items.compactMap { $0.attributedContentText?.string }
            .map(SharedIn.tidy).filter { !$0.isEmpty }.joined(separator: "\n")

        var texts: [String] = []
        for provider in providers where provider.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
            if let text = try? await provider.loadItem(forTypeIdentifier: UTType.plainText.identifier) as? String {
                texts.append(text)
            }
        }
        let typed = SharedIn.tidy(texts.joined(separator: "\n"))

        for provider in providers where provider.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
            guard let url = try? await provider.loadItem(forTypeIdentifier: UTType.url.identifier) as? URL,
                !url.isFileURL
            else { continue }
            // The page's title, or the words that came with it, then where it is.
            let title = typed.isEmpty ? written : typed
            let words = [title, url.absoluteString].filter { !$0.isEmpty }.joined(separator: "\n")
            return Found(text: words, kind: .link)
        }
        if !typed.isEmpty { return Found(text: typed, kind: .text) }

        for provider in providers where provider.hasItemConformingToTypeIdentifier(UTType.image.identifier) {
            guard let image = await picture(from: provider) else { continue }
            let words = await wordsIn(image)
            if !words.isEmpty { return Found(text: words, kind: .picture) }
        }
        return written.isEmpty ? nil : Found(text: written, kind: .text)
    }

    /// The picture, no larger than reading needs: an extension has little memory to spend.
    private static func picture(from provider: NSItemProvider) async -> CGImage? {
        let item = try? await provider.loadItem(forTypeIdentifier: UTType.image.identifier)
        if let image = item as? UIImage { return image.cgImage }
        let source: CGImageSource?
        if let url = item as? URL {
            source = CGImageSourceCreateWithURL(url as CFURL, nil)
        } else if let data = item as? Data {
            source = CGImageSourceCreateWithData(data as CFData, nil)
        } else {
            source = nil
        }
        guard let source else { return nil }
        let options: [CFString: Any] = [
            kCGImageSourceCreateThumbnailFromImageAlways: true,
            kCGImageSourceCreateThumbnailWithTransform: true,
            kCGImageSourceThumbnailMaxPixelSize: 2200,
        ]
        return CGImageSourceCreateThumbnailAtIndex(source, 0, options as CFDictionary)
    }

    /// The lines Vision reads in the picture, top to bottom. Empty when it reads none.
    private static func wordsIn(_ image: CGImage) async -> String {
        await withCheckedContinuation { continuation in
            DispatchQueue.global(qos: .userInitiated).async {
                let request = VNRecognizeTextRequest()
                request.recognitionLevel = .accurate
                request.usesLanguageCorrection = true
                request.automaticallyDetectsLanguage = true
                try? VNImageRequestHandler(cgImage: image, options: [:]).perform([request])
                let lines = (request.results ?? [])
                    // Vision's boxes are measured from the bottom of the picture.
                    .sorted { $0.boundingBox.maxY > $1.boundingBox.maxY }
                    .compactMap { $0.topCandidates(1).first?.string }
                continuation.resume(returning: SharedIn.tidy(lines.joined(separator: "\n")))
            }
        }
    }
}
