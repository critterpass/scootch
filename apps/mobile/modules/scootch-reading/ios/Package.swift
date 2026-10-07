// swift-tools-version:5.9
// Host-side tests for the quality signals and the Vision reading (macOS has the same Vision
// requests as iOS, so no simulator is needed):
//   swift test --package-path apps/mobile/modules/scootch-reading/ios
// The CocoaPods pod (ScootchReading.podspec) excludes this file and Tests/.
import PackageDescription

let package = Package(
  name: "ScootchReadingCore",
  platforms: [.macOS(.v13), .iOS(.v16)],
  targets: [
    .target(
      name: "ScootchReadingCore",
      path: ".",
      exclude: ["ScootchReading.podspec", "ScootchReadingModule.swift", "Tests"],
      sources: ["OcrSignals.swift", "OcrReader.swift", "ThingFinder.swift"]
    ),
    .testTarget(
      name: "ScootchReadingCoreTests",
      dependencies: ["ScootchReadingCore"],
      path: "Tests"
    ),
  ]
)
