import CoreGraphics
import XCTest

@testable import ScootchReadingCore

final class ThingFinderTests: XCTestCase {
  private let space = CGColorSpace(name: CGColorSpace.sRGB)!

  private func picture(grey: CGFloat, width: Int = 640, height: Int = 480) throws -> CGImage {
    let context = try XCTUnwrap(
      CGContext(
        data: nil, width: width, height: height, bitsPerComponent: 8, bytesPerRow: 0, space: space,
        bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue))
    context.setFillColor(CGColor(red: grey, green: grey, blue: grey, alpha: 1))
    context.fill(CGRect(x: 0, y: 0, width: width, height: height))
    return try XCTUnwrap(context.makeImage())
  }

  func testTheBoxOfAMaskHugsItsSetPixels() {
    // 4 by 3, top row first: set at (1,1), (2,1) and (2,2).
    let mask: [Float] = [
      0, 0, 0, 0,
      0, 1, 1, 0,
      0, 0, 1, 0,
    ]
    XCTAssertEqual(
      ThingFinder.maskBox(mask, width: 4, height: 3),
      LineBox(x: 0.25, y: 1.0 / 3, w: 0.5, h: 2.0 / 3))
  }

  func testAnEmptyOrShortMaskHasNoBox() {
    XCTAssertNil(ThingFinder.maskBox([0, 0, 0, 0], width: 2, height: 2))
    XCTAssertNil(ThingFinder.maskBox([1], width: 2, height: 2))
    XCTAssertNil(ThingFinder.maskBox([], width: 0, height: 0))
  }

  func testAnEmptyTableHoldsNothingAndIsMeasuredForLight() throws {
    let dark = try ThingFinder.find(image: try picture(grey: 0.05))
    XCTAssertTrue(dark.things.isEmpty)
    XCTAssertLessThan(dark.brightness, 0.1)
    let light = try ThingFinder.find(image: try picture(grey: 0.9))
    XCTAssertTrue(light.things.isEmpty)
    XCTAssertGreaterThan(light.brightness, 0.8)
    XCTAssertEqual(light.width, 640)
  }

  func testEveryThingFoundSitsInsideThePhoto() throws {
    // A dark slab on a pale table: whatever Vision makes of it, a box never leaves the frame.
    let context = try XCTUnwrap(
      CGContext(
        data: nil, width: 640, height: 480, bitsPerComponent: 8, bytesPerRow: 0, space: space,
        bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue))
    context.setFillColor(CGColor(red: 0.9, green: 0.88, blue: 0.82, alpha: 1))
    context.fill(CGRect(x: 0, y: 0, width: 640, height: 480))
    context.setFillColor(CGColor(red: 0.2, green: 0.1, blue: 0.5, alpha: 1))
    context.fillEllipse(in: CGRect(x: 240, y: 160, width: 140, height: 140))
    let found = try ThingFinder.find(image: try XCTUnwrap(context.makeImage()))
    XCTAssertLessThanOrEqual(found.things.count, ThingFinder.maxThings)
    for thing in found.things {
      XCTAssertGreaterThanOrEqual(thing.box.x, 0)
      XCTAssertGreaterThanOrEqual(thing.box.y, 0)
      XCTAssertLessThanOrEqual(thing.box.x + thing.box.w, 1.0001)
      XCTAssertLessThanOrEqual(thing.box.y + thing.box.h, 1.0001)
      XCTAssertLessThanOrEqual(thing.labels.count, ThingFinder.labelsPerThing)
    }
  }
}
