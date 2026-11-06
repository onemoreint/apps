#!/usr/bin/env python3
"""Genera LugoConnect.xcodeproj/project.pbxproj a partir de la carpeta LugoConnect/.

Solo hace falta volver a ejecutarlo al añadir o quitar archivos fuera de Xcode.
Usa únicamente la biblioteca estándar. Los identificadores son deterministas, así que
ejecutarlo dos veces produce exactamente el mismo archivo.
"""
import hashlib
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "LugoConnect"
OUT = ROOT / "LugoConnect.xcodeproj" / "project.pbxproj"

PRODUCT = "LUGO CONNECT.app"
TARGET = "LugoConnect"


def uid(key):
    return hashlib.md5(key.encode()).hexdigest()[:24].upper()


def q(value):
    """Entrecomilla lo que el formato de Xcode no admite sin comillas."""
    safe = all(c.isalnum() or c in "._/$" for c in value) and value != ""
    return value if safe else '"' + value.replace('"', '\\"') + '"'


FILE_TYPES = {
    ".swift": "sourcecode.swift",
    ".plist": "text.plist.xml",
    ".entitlements": "text.plist.entitlements",
    ".xcassets": "folder.assetcatalog",
}

groups, file_refs, build_files, sources, resources = [], [], [], [], []


def walk(directory, rel):
    """Devuelve el id del grupo de `directory`, recorriéndolo en orden estable."""
    children = []
    for item in sorted(directory.iterdir(), key=lambda p: (p.is_file(), p.name.lower())):
        path = f"{rel}/{item.name}"
        if item.name.startswith("."):
            continue
        if item.is_dir() and item.suffix != ".xcassets":
            children.append((walk(item, path), item.name))
            continue
        file_type = FILE_TYPES.get(item.suffix)
        if file_type is None:
            continue
        ref = uid("ref:" + path)
        children.append((ref, item.name))
        file_refs.append(
            f"\t\t{ref} /* {item.name} */ = {{isa = PBXFileReference; "
            f"lastKnownFileType = {file_type}; path = {q(item.name)}; sourceTree = \"<group>\"; }};"
        )
        if item.suffix in (".swift", ".xcassets"):
            phase, phase_name = (sources, "Sources") if item.suffix == ".swift" else (resources, "Resources")
            build = uid("build:" + path)
            build_files.append(
                f"\t\t{build} /* {item.name} in {phase_name} */ = "
                f"{{isa = PBXBuildFile; fileRef = {ref} /* {item.name} */; }};"
            )
            phase.append(f"\t\t\t\t{build} /* {item.name} in {phase_name} */,")
    gid = uid("group:" + rel)
    lines = "\n".join(f"\t\t\t\t{i} /* {n} */," for i, n in children)
    groups.append(
        f"\t\t{gid} /* {directory.name} */ = {{\n\t\t\tisa = PBXGroup;\n\t\t\tchildren = (\n{lines}\n\t\t\t);\n"
        f"\t\t\tpath = {q(directory.name)};\n\t\t\tsourceTree = \"<group>\";\n\t\t}};"
    )
    return gid


src_group = walk(SRC, "LugoConnect")

MAIN = uid("main-group")
PRODUCTS = uid("products-group")
APP_REF = uid("product-ref")
PROJECT = uid("project")
NATIVE = uid("target")
SRC_PHASE, FW_PHASE, RES_PHASE = uid("phase-src"), uid("phase-fw"), uid("phase-res")
PROJ_LIST, TGT_LIST = uid("config-list-project"), uid("config-list-target")
PROJ_DBG, PROJ_REL = uid("config-project-debug"), uid("config-project-release")
TGT_DBG, TGT_REL = uid("config-target-debug"), uid("config-target-release")
PKG_REF, PKG_PRODUCT, PKG_BUILD = uid("pkg-ref"), uid("pkg-product"), uid("pkg-build")

groups.append(
    f"\t\t{MAIN} = {{\n\t\t\tisa = PBXGroup;\n\t\t\tchildren = (\n"
    f"\t\t\t\t{src_group} /* LugoConnect */,\n\t\t\t\t{PRODUCTS} /* Products */,\n\t\t\t);\n"
    f"\t\t\tsourceTree = \"<group>\";\n\t\t}};"
)
groups.append(
    f"\t\t{PRODUCTS} /* Products */ = {{\n\t\t\tisa = PBXGroup;\n\t\t\tchildren = (\n"
    f"\t\t\t\t{APP_REF} /* {PRODUCT} */,\n\t\t\t);\n\t\t\tname = Products;\n"
    f"\t\t\tsourceTree = \"<group>\";\n\t\t}};"
)
file_refs.append(
    f"\t\t{APP_REF} /* {PRODUCT} */ = {{isa = PBXFileReference; explicitFileType = wrapper.application; "
    f"includeInIndex = 0; path = {q(PRODUCT)}; sourceTree = BUILT_PRODUCTS_DIR; }};"
)
build_files.append(
    f"\t\t{PKG_BUILD} /* LugoCore in Frameworks */ = "
    f"{{isa = PBXBuildFile; productRef = {PKG_PRODUCT} /* LugoCore */; }};"
)


def settings(values):
    lines = []
    for key in sorted(values):
        value = values[key]
        if isinstance(value, list):
            items = "".join(f"\t\t\t\t\t{q(v)},\n" for v in value)
            lines.append(f"\t\t\t\t{key} = (\n{items}\t\t\t\t);")
        else:
            lines.append(f"\t\t\t\t{key} = {q(str(value))};")
    return "\n".join(lines)


def config(identifier, name, values):
    return (
        f"\t\t{identifier} /* {name} */ = {{\n\t\t\tisa = XCBuildConfiguration;\n"
        f"\t\t\tbuildSettings = {{\n{settings(values)}\n\t\t\t}};\n\t\t\tname = {name};\n\t\t}};"
    )


COMMON_PROJECT = {
    "ALWAYS_SEARCH_USER_PATHS": "NO",
    "CLANG_ENABLE_MODULES": "YES",
    "CLANG_ENABLE_OBJC_ARC": "YES",
    "COPY_PHASE_STRIP": "NO",
    "ENABLE_STRICT_OBJC_MSGSEND": "YES",
    "GCC_NO_COMMON_BLOCKS": "YES",
    "MACOSX_DEPLOYMENT_TARGET": "13.0",
    "SDKROOT": "macosx",
    "SWIFT_VERSION": "5.0",
}
DEBUG_PROJECT = {
    **COMMON_PROJECT,
    "DEBUG_INFORMATION_FORMAT": "dwarf",
    "ENABLE_TESTABILITY": "YES",
    "GCC_OPTIMIZATION_LEVEL": "0",
    "GCC_PREPROCESSOR_DEFINITIONS": ["DEBUG=1", "$(inherited)"],
    "ONLY_ACTIVE_ARCH": "YES",
    "SWIFT_ACTIVE_COMPILATION_CONDITIONS": "DEBUG",
    "SWIFT_OPTIMIZATION_LEVEL": "-Onone",
}
RELEASE_PROJECT = {
    **COMMON_PROJECT,
    "DEBUG_INFORMATION_FORMAT": "dwarf-with-dsym",
    "ENABLE_NS_ASSERTIONS": "NO",
    "SWIFT_COMPILATION_MODE": "wholemodule",
    "SWIFT_OPTIMIZATION_LEVEL": "-O",
}
TARGET_SETTINGS = {
    "ASSETCATALOG_COMPILER_APPICON_NAME": "AppIcon",
    "ASSETCATALOG_COMPILER_GLOBAL_ACCENT_COLOR_NAME": "AccentColor",
    "CODE_SIGN_ENTITLEMENTS": "LugoConnect/Resources/LugoConnect.entitlements",
    "CODE_SIGN_IDENTITY": "-",
    "CODE_SIGN_STYLE": "Automatic",
    "COMBINE_HIDPI_IMAGES": "YES",
    "CURRENT_PROJECT_VERSION": "1",
    "DEVELOPMENT_TEAM": "",
    "ENABLE_HARDENED_RUNTIME": "NO",
    "INFOPLIST_FILE": "LugoConnect/Resources/Info.plist",
    "LD_RUNPATH_SEARCH_PATHS": ["$(inherited)", "@executable_path/../Frameworks"],
    "MARKETING_VERSION": "0.1.0",
    "PRODUCT_BUNDLE_IDENTIFIER": "com.joselugo.lugoconnect",
    "PRODUCT_MODULE_NAME": "LugoConnect",
    "PRODUCT_NAME": "LUGO CONNECT",
}

nl = "\n"
text = f"""// !$*UTF8*$!
{{
	archiveVersion = 1;
	classes = {{
	}};
	objectVersion = 60;
	objects = {{

/* Begin PBXBuildFile section */
{nl.join(sorted(build_files))}
/* End PBXBuildFile section */

/* Begin PBXFileReference section */
{nl.join(sorted(file_refs))}
/* End PBXFileReference section */

/* Begin PBXFrameworksBuildPhase section */
		{FW_PHASE} /* Frameworks */ = {{
			isa = PBXFrameworksBuildPhase;
			buildActionMask = 2147483647;
			files = (
				{PKG_BUILD} /* LugoCore in Frameworks */,
			);
			runOnlyForDeploymentPostprocessing = 0;
		}};
/* End PBXFrameworksBuildPhase section */

/* Begin PBXGroup section */
{nl.join(sorted(groups))}
/* End PBXGroup section */

/* Begin PBXNativeTarget section */
		{NATIVE} /* {TARGET} */ = {{
			isa = PBXNativeTarget;
			buildConfigurationList = {TGT_LIST} /* Build configuration list for PBXNativeTarget "{TARGET}" */;
			buildPhases = (
				{SRC_PHASE} /* Sources */,
				{FW_PHASE} /* Frameworks */,
				{RES_PHASE} /* Resources */,
			);
			buildRules = (
			);
			dependencies = (
			);
			name = {TARGET};
			packageProductDependencies = (
				{PKG_PRODUCT} /* LugoCore */,
			);
			productName = {TARGET};
			productReference = {APP_REF} /* {PRODUCT} */;
			productType = "com.apple.product-type.application";
		}};
/* End PBXNativeTarget section */

/* Begin PBXProject section */
		{PROJECT} /* Project object */ = {{
			isa = PBXProject;
			attributes = {{
				BuildIndependentTargetsInParallel = 1;
				LastSwiftUpdateCheck = 1500;
				LastUpgradeCheck = 1500;
			}};
			buildConfigurationList = {PROJ_LIST} /* Build configuration list for PBXProject "{TARGET}" */;
			compatibilityVersion = "Xcode 15.0";
			developmentRegion = es;
			hasScannedForEncodings = 0;
			knownRegions = (
				es,
				Base,
			);
			mainGroup = {MAIN};
			packageReferences = (
				{PKG_REF} /* XCLocalSwiftPackageReference "LugoCore" */,
			);
			productRefGroup = {PRODUCTS} /* Products */;
			projectDirPath = "";
			projectRoot = "";
			targets = (
				{NATIVE} /* {TARGET} */,
			);
		}};
/* End PBXProject section */

/* Begin PBXResourcesBuildPhase section */
		{RES_PHASE} /* Resources */ = {{
			isa = PBXResourcesBuildPhase;
			buildActionMask = 2147483647;
			files = (
{nl.join(resources)}
			);
			runOnlyForDeploymentPostprocessing = 0;
		}};
/* End PBXResourcesBuildPhase section */

/* Begin PBXSourcesBuildPhase section */
		{SRC_PHASE} /* Sources */ = {{
			isa = PBXSourcesBuildPhase;
			buildActionMask = 2147483647;
			files = (
{nl.join(sources)}
			);
			runOnlyForDeploymentPostprocessing = 0;
		}};
/* End PBXSourcesBuildPhase section */

/* Begin XCBuildConfiguration section */
{config(PROJ_DBG, "Debug", DEBUG_PROJECT)}
{config(PROJ_REL, "Release", RELEASE_PROJECT)}
{config(TGT_DBG, "Debug", TARGET_SETTINGS)}
{config(TGT_REL, "Release", TARGET_SETTINGS)}
/* End XCBuildConfiguration section */

/* Begin XCConfigurationList section */
		{PROJ_LIST} /* Build configuration list for PBXProject "{TARGET}" */ = {{
			isa = XCConfigurationList;
			buildConfigurations = (
				{PROJ_DBG} /* Debug */,
				{PROJ_REL} /* Release */,
			);
			defaultConfigurationIsVisible = 0;
			defaultConfigurationName = Release;
		}};
		{TGT_LIST} /* Build configuration list for PBXNativeTarget "{TARGET}" */ = {{
			isa = XCConfigurationList;
			buildConfigurations = (
				{TGT_DBG} /* Debug */,
				{TGT_REL} /* Release */,
			);
			defaultConfigurationIsVisible = 0;
			defaultConfigurationName = Release;
		}};
/* End XCConfigurationList section */

/* Begin XCLocalSwiftPackageReference section */
		{PKG_REF} /* XCLocalSwiftPackageReference "LugoCore" */ = {{
			isa = XCLocalSwiftPackageReference;
			relativePath = LugoCore;
		}};
/* End XCLocalSwiftPackageReference section */

/* Begin XCSwiftPackageProductDependency section */
		{PKG_PRODUCT} /* LugoCore */ = {{
			isa = XCSwiftPackageProductDependency;
			productName = LugoCore;
		}};
/* End XCSwiftPackageProductDependency section */
	}};
	rootObject = {PROJECT} /* Project object */;
}}
"""

OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(text, encoding="utf-8")

SCHEME = OUT.parent / "xcshareddata" / "xcschemes" / "LugoConnect.xcscheme"
SCHEME.parent.mkdir(parents=True, exist_ok=True)
app_ref = (
    f'BuildableIdentifier = "primary" BlueprintIdentifier = "{NATIVE}" '
    f'BuildableName = "{PRODUCT}" BlueprintName = "{TARGET}" '
    f'ReferencedContainer = "container:LugoConnect.xcodeproj"'
)
SCHEME.write_text(f"""<?xml version="1.0" encoding="UTF-8"?>
<Scheme LastUpgradeVersion = "1500" version = "1.7">
   <BuildAction parallelizeBuildables = "YES" buildImplicitDependencies = "YES">
      <BuildActionEntries>
         <BuildActionEntry buildForTesting = "YES" buildForRunning = "YES" buildForProfiling = "YES" buildForArchiving = "YES" buildForAnalyzing = "YES">
            <BuildableReference {app_ref}></BuildableReference>
         </BuildActionEntry>
      </BuildActionEntries>
   </BuildAction>
   <TestAction buildConfiguration = "Debug" selectedDebuggerIdentifier = "Xcode.DebuggerFoundation.Debugger.LLDB" selectedLauncherIdentifier = "Xcode.DebuggerFoundation.Launcher.LLDB" shouldUseLaunchSchemeArgsEnv = "YES">
      <Testables>
         <TestableReference skipped = "NO">
            <BuildableReference BuildableIdentifier = "primary" BlueprintIdentifier = "LugoCoreTests" BuildableName = "LugoCoreTests" BlueprintName = "LugoCoreTests" ReferencedContainer = "container:LugoCore"></BuildableReference>
         </TestableReference>
      </Testables>
   </TestAction>
   <LaunchAction buildConfiguration = "Debug" selectedDebuggerIdentifier = "Xcode.DebuggerFoundation.Debugger.LLDB" selectedLauncherIdentifier = "Xcode.DebuggerFoundation.Launcher.LLDB" launchStyle = "0" useCustomWorkingDirectory = "NO" ignoresPersistentStateOnReset = "NO" debugDocumentVersioning = "YES" debugServiceExtension = "internal" allowLocationSimulation = "YES">
      <BuildableProductRunnable runnableDebuggingMode = "0">
         <BuildableReference {app_ref}></BuildableReference>
      </BuildableProductRunnable>
   </LaunchAction>
   <ProfileAction buildConfiguration = "Release" shouldUseLaunchSchemeArgsEnv = "YES" savedToolIdentifier = "" useCustomWorkingDirectory = "NO" debugDocumentVersioning = "YES">
      <BuildableProductRunnable runnableDebuggingMode = "0">
         <BuildableReference {app_ref}></BuildableReference>
      </BuildableProductRunnable>
   </ProfileAction>
   <AnalyzeAction buildConfiguration = "Debug"></AnalyzeAction>
   <ArchiveAction buildConfiguration = "Release" revealArchiveInOrganizer = "YES"></ArchiveAction>
</Scheme>
""", encoding="utf-8")
print(f"OK: {len(sources)} archivos Swift, {len(resources)} recursos")
