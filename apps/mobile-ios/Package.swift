// swift-tools-version: 5.10
import PackageDescription

let package = Package(
    name: "UDDCompanion",
    platforms: [.iOS(.v17)],
    targets: [
        .executableTarget(
            name: "UDDCompanion",
            path: "Sources/App"
        ),
        .testTarget(
            name: "UDDCompanionTests",
            dependencies: ["UDDCompanion"],
            path: "Tests"
        )
    ]
)
