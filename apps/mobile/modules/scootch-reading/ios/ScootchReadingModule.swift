import ExpoModulesCore
import Foundation

/// On-device reading for the camera (modules/scootch-reading/index.ts): `recognizeText` returns
/// raw lines and quality signals (the JS side orders the lines and names the problem), and
/// `findThings` returns the separate things in a photo with their names. The image work lives in
/// `OcrReader`, `OcrSignals` and `ThingFinder` (host-tested). Nothing here touches the network.
public class ScootchReadingModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ScootchReading")

    AsyncFunction("recognizeText") {
      (uri: String, languages: [String]) async throws -> [String: Any] in
      let image = try OcrReader.loadUpright(url: try ScootchReadingModule.source(uri))
      let result = try OcrReader.recognize(image: image, languages: languages)
      return [
        "observations": result.lines.map { line -> [String: Any] in
          [
            "text": line.text, "bbox": [line.box.x, line.box.y, line.box.w, line.box.h],
            "conf": line.conf,
          ]
        },
        "signals": [
          "blur": result.signals.blur, "glare": result.signals.glare,
          "curvature": result.signals.curvature, "clipped": result.signals.clipped,
        ],
        "width": result.width,
        "height": result.height,
      ]
    }

    AsyncFunction("findThings") { (uri: String) async throws -> [String: Any] in
      let image = try OcrReader.loadUpright(
        url: try ScootchReadingModule.source(uri), maxSide: ScootchReadingModule.thingsMaxSide)
      let found = try ThingFinder.find(image: image)
      return [
        "things": found.things.map { thing -> [String: Any] in
          [
            "bbox": [thing.box.x, thing.box.y, thing.box.w, thing.box.h], "labels": thing.labels,
          ]
        },
        "brightness": found.brightness,
        "width": found.width,
        "height": found.height,
      ]
    }
  }

  /// Things are found on a smaller picture than words are read from: shapes need no fine print.
  fileprivate static let thingsMaxSide = 1536

  fileprivate static func source(_ uri: String) throws -> URL {
    guard let url = OcrReader.fileURL(from: uri) else { throw OcrReaderError.unreadable }
    return url
  }
}
