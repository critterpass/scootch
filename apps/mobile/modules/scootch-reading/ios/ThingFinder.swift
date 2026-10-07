import CoreGraphics
import CoreVideo
import Foundation
import Vision

/// One separate thing in a photo: where it is (normalised, top-left origin) and what Vision's
/// classifier calls it, best first. `labels` is empty when it can be seen but not named.
public struct FoundThing: Sendable, Equatable {
  public let box: LineBox
  public let labels: [String]
}

public struct ThingsFound: Sendable {
  public let things: [FoundThing]
  /// Mean grey level of the photo, 0 (black) to 1 (white); NaN when it could not be measured.
  public let brightness: Double
  public let width: Int
  public let height: Int
}

/// Finds the separate things in a still photo, free of Expo so it runs in host tests. Where the
/// system can lift subjects out of a picture (iOS 17) each lifted subject is a thing; before that,
/// and when nothing is lifted, the boxes come from objectness saliency.
public enum ThingFinder {
  /// More than this and a ring around one of them stops meaning anything.
  public static let maxThings = 12
  public static let labelsPerThing = 3
  /// A name the classifier is less sure of than this is not offered.
  public static let minLabelConfidence: Float = 0.25
  /// A box smaller than this share of the photo is noise; one larger is the surface, not a thing.
  public static let minArea = 0.002
  public static let maxArea = 0.7

  public static func find(image: CGImage) throws -> ThingsFound {
    let handler = VNImageRequestHandler(cgImage: image, options: [:])
    var boxes = try liftedSubjects(handler)
    if boxes.isEmpty { boxes = try salientObjects(handler) }
    let kept = boxes.filter { (minArea...maxArea).contains($0.w * $0.h) }.prefix(maxThings)
    let things = kept.map { box in FoundThing(box: box, labels: labels(for: box, in: image)) }
    return ThingsFound(
      things: things, brightness: OcrReader.grey(image).map(meanLevel) ?? .nan,
      width: image.width, height: image.height)
  }

  static func meanLevel(_ grey: GreyImage) -> Double {
    guard !grey.pixels.isEmpty else { return .nan }
    let sum = grey.pixels.reduce(0) { $0 + Int($1) }
    return Double(sum) / Double(grey.pixels.count) / 255
  }

  /// The box around every pixel of a mask that is set, or nil when none is. `mask` holds `width`
  /// by `height` values, top row first.
  public static func maskBox(_ mask: [Float], width: Int, height: Int) -> LineBox? {
    guard width > 0, height > 0, mask.count >= width * height else { return nil }
    var minX = width
    var minY = height
    var maxX = -1
    var maxY = -1
    for y in 0..<height {
      for x in 0..<width where mask[y * width + x] > 0.5 {
        if x < minX { minX = x }
        if x > maxX { maxX = x }
        if y < minY { minY = y }
        if y > maxY { maxY = y }
      }
    }
    guard maxX >= minX, maxY >= minY else { return nil }
    return LineBox(
      x: Double(minX) / Double(width), y: Double(minY) / Double(height),
      w: Double(maxX - minX + 1) / Double(width), h: Double(maxY - minY + 1) / Double(height))
  }

  private static func liftedSubjects(_ handler: VNImageRequestHandler) throws -> [LineBox] {
    guard #available(iOS 17.0, macOS 14.0, *) else { return [] }
    let request = VNGenerateForegroundInstanceMaskRequest()
    do {
      try handler.perform([request])
    } catch {
      // Not every device can lift subjects; saliency still answers.
      return []
    }
    guard let observation = request.results?.first else { return [] }
    var boxes: [LineBox] = []
    for instance in observation.allInstances {
      guard
        let buffer = try? observation.generateMask(forInstances: IndexSet(integer: instance)),
        let box = box(ofMask: buffer)
      else { continue }
      boxes.append(box)
    }
    return boxes
  }

  private static func box(ofMask buffer: CVPixelBuffer) -> LineBox? {
    guard CVPixelBufferGetPixelFormatType(buffer) == kCVPixelFormatType_OneComponent32Float else {
      return nil
    }
    CVPixelBufferLockBaseAddress(buffer, .readOnly)
    defer { CVPixelBufferUnlockBaseAddress(buffer, .readOnly) }
    guard let base = CVPixelBufferGetBaseAddress(buffer) else { return nil }
    let width = CVPixelBufferGetWidth(buffer)
    let height = CVPixelBufferGetHeight(buffer)
    let rowBytes = CVPixelBufferGetBytesPerRow(buffer)
    var mask = [Float](repeating: 0, count: width * height)
    for y in 0..<height {
      let row = base.advanced(by: y * rowBytes).assumingMemoryBound(to: Float.self)
      for x in 0..<width { mask[y * width + x] = row[x] }
    }
    return maskBox(mask, width: width, height: height)
  }

  private static func salientObjects(_ handler: VNImageRequestHandler) throws -> [LineBox] {
    let request = VNGenerateObjectnessBasedSaliencyImageRequest()
    try handler.perform([request])
    return (request.results?.first?.salientObjects ?? []).map { object in
      let b = object.boundingBox
      return LineBox(x: b.minX, y: 1 - b.maxY, w: b.width, h: b.height)
    }
  }

  /// What the classifier calls the part of the photo inside `box`. Empty when it will not say.
  private static func labels(for box: LineBox, in image: CGImage) -> [String] {
    let rect = CGRect(
      x: box.x * Double(image.width), y: box.y * Double(image.height),
      width: box.w * Double(image.width), height: box.h * Double(image.height)
    ).integral
    guard rect.width >= 16, rect.height >= 16, let crop = image.cropping(to: rect) else {
      return []
    }
    let request = VNClassifyImageRequest()
    guard (try? VNImageRequestHandler(cgImage: crop, options: [:]).perform([request])) != nil
    else { return [] }
    return (request.results ?? [])
      .filter { $0.confidence >= minLabelConfidence }
      .prefix(labelsPerThing)
      .map(\.identifier)
  }
}
