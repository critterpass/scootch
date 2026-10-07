import CoreGraphics
import CoreText
import XCTest

@testable import ScootchReadingCore

/// Vision text reading on pages drawn in the test.
final class OcrReaderTests: XCTestCase {
  private let space = CGColorSpace(name: CGColorSpace.sRGB)!

  /// Black lines of text on white paper, `lines[0]` at the top.
  private func page(_ lines: [String], width: Int = 1200, height: Int = 900) throws -> CGImage {
    let context = try XCTUnwrap(
      CGContext(
        data: nil, width: width, height: height, bitsPerComponent: 8, bytesPerRow: 0, space: space,
        bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue))
    context.setFillColor(CGColor(red: 1, green: 1, blue: 1, alpha: 1))
    context.fill(CGRect(x: 0, y: 0, width: width, height: height))
    let font = CTFontCreateWithName("Helvetica" as CFString, 64, nil)
    for (index, text) in lines.enumerated() {
      let attributed = NSAttributedString(
        string: text,
        attributes: [
          NSAttributedString.Key(kCTFontAttributeName as String): font,
          NSAttributedString.Key(kCTForegroundColorAttributeName as String): CGColor(
            red: 0, green: 0, blue: 0, alpha: 1),
        ])
      context.textPosition = CGPoint(x: 120, y: CGFloat(height - 200 - index * 160))
      CTLineDraw(CTLineCreateWithAttributedString(attributed), context)
    }
    return try XCTUnwrap(context.makeImage())
  }

  func testReadsPrintedLinesWithTopLeftBoxes() throws {
    let image = try page(["CAFE GIANG", "TOTAL 45000"])
    let result = try OcrReader.recognize(image: image, languages: ["vi"])
    XCTAssertEqual(result.width, 1200)
    let texts = result.lines.map { $0.text.uppercased() }
    let cafe = try XCTUnwrap(
      result.lines.first { $0.text.uppercased().contains("CAFE") }, "\(texts)")
    let total = try XCTUnwrap(
      result.lines.first { $0.text.uppercased().contains("TOTAL") }, "\(texts)")
    XCTAssertLessThan(cafe.box.y, total.box.y, "the first line drawn is nearer the top")
    for line in result.lines {
      XCTAssertGreaterThan(line.conf, 0.3)
      XCTAssertTrue((0...1).contains(line.box.x) && (0...1).contains(line.box.y + line.box.h))
    }
    XCTAssertGreaterThan(result.signals.blur, 40)
    XCTAssertEqual(result.signals.glare, 0)
    XCTAssertEqual(result.signals.clipped, 0)
  }

  func testLanguageHintsMatchVisionLanguages() {
    let supported = ["en-US", "fr-FR", "vi-VT"]
    XCTAssertEqual(
      OcrReader.visionLanguages(languages: ["vi"], supported: supported), ["vi-VT", "en-US"])
    XCTAssertEqual(
      OcrReader.visionLanguages(languages: ["en-US", "vi"], supported: supported),
      ["en-US", "vi-VT"])
    XCTAssertEqual(OcrReader.visionLanguages(languages: ["id"], supported: supported), ["en-US"])
    XCTAssertEqual(OcrReader.visionLanguages(languages: [], supported: supported), [])
  }

  func testABlankPageHasNoLines() throws {
    let result = try OcrReader.recognize(image: try page([]), languages: ["en"])
    XCTAssertTrue(result.lines.isEmpty)
  }
}
