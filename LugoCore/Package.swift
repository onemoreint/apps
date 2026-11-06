// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "LugoCore",
    platforms: [.macOS(.v13)],
    products: [
        .library(name: "LugoCore", targets: ["LugoCore"])
    ],
    targets: [
        .target(name: "LugoCore"),
        .executableTarget(name: "LugoDevServer", dependencies: ["LugoCore"]),
        .testTarget(name: "LugoCoreTests", dependencies: ["LugoCore"])
    ]
)
