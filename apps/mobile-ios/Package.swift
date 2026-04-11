// swift-tools-version: 5.10
import PackageDescription

let package = Package(
    name: "UDDCompanion",
    platforms: [.iOS(.v17)],
    products: [
        .library(name: "UDDCompanion", targets: ["UDDCompanion"])
    ],
    targets: [
        .target(
            name: "UDDCompanion",
            path: "Sources/App"
        )
    ]
)
