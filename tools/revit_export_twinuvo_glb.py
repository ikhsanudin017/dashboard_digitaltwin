# encoding: utf-8
"""Export the active Twinuvo Revit model to four web-ready GLB files.

Run inside Revit through the local MCP ``execute_revit_code`` tool.  The
script is deliberately self-contained and compatible with IronPython 2.7.
It reads native Revit geometry without modifying or saving the document.
"""

from __future__ import division

import json
import math
import os
import struct

from pyrevit import DB


OUTPUT_DIR = os.path.join(
    r"C:\Users\MSI\OneDrive\Documents\dashboard_digitaltwin-3",
    "view_virtual",
    "public",
    "models",
    "twinuvo",
)

LOD_CATEGORIES = {
    2: [
        DB.BuiltInCategory.OST_Walls,
        DB.BuiltInCategory.OST_Roofs,
        DB.BuiltInCategory.OST_Ceilings,
        DB.BuiltInCategory.OST_Doors,
        DB.BuiltInCategory.OST_Windows,
        DB.BuiltInCategory.OST_StructuralColumns,
        DB.BuiltInCategory.OST_StructuralFoundation,
    ],
    3: [DB.BuiltInCategory.OST_StructuralFraming],
    4: [
        DB.BuiltInCategory.OST_DataDevices,
        DB.BuiltInCategory.OST_ElectricalEquipment,
        DB.BuiltInCategory.OST_ElectricalFixtures,
        DB.BuiltInCategory.OST_LightingFixtures,
    ],
}

DETAIL_LEVELS = {
    1: DB.ViewDetailLevel.Coarse,
    2: DB.ViewDetailLevel.Medium,
    3: DB.ViewDetailLevel.Fine,
    4: DB.ViewDetailLevel.Fine,
}

CATEGORY_COLORS = {
    "Generic Models": (0.78, 0.80, 0.82, 1.0),
    "Walls": (0.91, 0.89, 0.84, 1.0),
    "Roofs": (0.58, 0.61, 0.64, 1.0),
    "Ceilings": (0.94, 0.94, 0.91, 1.0),
    "Doors": (0.43, 0.25, 0.14, 1.0),
    "Windows": (0.38, 0.66, 0.78, 0.42),
    "Structural Columns": (0.56, 0.58, 0.59, 1.0),
    "Structural Foundations": (0.48, 0.47, 0.44, 1.0),
    "Structural Framing": (0.28, 0.31, 0.34, 1.0),
    "Data Devices": (0.12, 0.55, 0.82, 1.0),
    "Electrical Equipment": (0.20, 0.24, 0.28, 1.0),
    "Electrical Fixtures": (0.86, 0.86, 0.82, 1.0),
    "Lighting Fixtures": (0.98, 0.84, 0.42, 1.0),
}


def safe_text(value):
    if value is None:
        return ""
    try:
        return unicode(value)
    except NameError:
        return str(value)
    except Exception:
        return ""


def element_type_name(element):
    element_type = doc.GetElement(element.GetTypeId())
    if not element_type:
        return ""
    parameter = element_type.get_Parameter(DB.BuiltInParameter.ALL_MODEL_TYPE_NAME)
    if parameter:
        return safe_text(parameter.AsString())
    return safe_text(getattr(element_type, "Name", ""))


def element_family_name(element):
    element_type = doc.GetElement(element.GetTypeId())
    return safe_text(getattr(element_type, "FamilyName", "")) if element_type else ""


def parameter_text(element, built_in_parameter):
    parameter = element.get_Parameter(built_in_parameter)
    if not parameter:
        return ""
    try:
        return safe_text(parameter.AsString() or parameter.AsValueString())
    except Exception:
        return ""


def element_metadata(element, lod):
    category = safe_text(element.Category.Name) if element.Category else "Uncategorized"
    return {
        "revitElementId": element.Id.IntegerValue,
        "category": category,
        "family": element_family_name(element),
        "type": element_type_name(element),
        "mark": parameter_text(element, DB.BuiltInParameter.ALL_MODEL_MARK),
        "comments": parameter_text(element, DB.BuiltInParameter.ALL_MODEL_INSTANCE_COMMENTS),
        "lod": lod,
    }


def collect_elements(lod):
    if lod == 1:
        items = DB.FilteredElementCollector(doc).OfCategory(
            DB.BuiltInCategory.OST_GenericModel
        ).WhereElementIsNotElementType()
        return [item for item in items if safe_text(getattr(item, "Name", "")) == "DT_LoD1_Block"]

    categories = list(LOD_CATEGORIES[2])
    if lod >= 3:
        categories.extend(LOD_CATEGORIES[3])
    if lod >= 4:
        categories.extend(LOD_CATEGORIES[4])

    result = []
    seen = set()
    for category in categories:
        for item in DB.FilteredElementCollector(doc).OfCategory(category).WhereElementIsNotElementType():
            item_id = item.Id.IntegerValue
            if item_id not in seen:
                result.append(item)
                seen.add(item_id)
    return result


def xyz_to_gltf(point):
    # Revit is Z-up and stores feet. glTF is Y-up and the web scene uses metres.
    return (point.X * 0.3048, point.Z * 0.3048, -point.Y * 0.3048)


def vector_normal(a, b, c):
    ux, uy, uz = b[0] - a[0], b[1] - a[1], b[2] - a[2]
    vx, vy, vz = c[0] - a[0], c[1] - a[1], c[2] - a[2]
    nx = uy * vz - uz * vy
    ny = uz * vx - ux * vz
    nz = ux * vy - uy * vx
    length = math.sqrt(nx * nx + ny * ny + nz * nz)
    if length < 1e-12:
        return (0.0, 1.0, 0.0)
    return (nx / length, ny / length, nz / length)


def material_id_or_invalid(value):
    try:
        return value.IntegerValue
    except Exception:
        return -1


def default_element_material(element):
    try:
        material_ids = list(element.GetMaterialIds(False))
        if material_ids:
            return material_ids[0]
    except Exception:
        pass
    return DB.ElementId.InvalidElementId


def append_mesh_triangles(mesh, material_id, buckets):
    key = material_id_or_invalid(material_id)
    triangles = buckets.setdefault(key, [])
    for index in range(mesh.NumTriangles):
        triangle = mesh.get_Triangle(index)
        a = xyz_to_gltf(triangle.get_Vertex(0))
        b = xyz_to_gltf(triangle.get_Vertex(1))
        c = xyz_to_gltf(triangle.get_Vertex(2))
        normal = vector_normal(a, b, c)
        triangles.append((a, b, c, normal))


def walk_geometry(geometry, fallback_material, buckets):
    if not geometry:
        return
    for geometry_object in geometry:
        if isinstance(geometry_object, DB.Solid):
            if geometry_object.Faces.Size == 0:
                continue
            for face in geometry_object.Faces:
                face_material = face.MaterialElementId
                if material_id_or_invalid(face_material) < 0:
                    face_material = fallback_material
                append_mesh_triangles(face.Triangulate(), face_material, buckets)
        elif isinstance(geometry_object, DB.Mesh):
            mesh_material = getattr(geometry_object, "MaterialElementId", fallback_material)
            if material_id_or_invalid(mesh_material) < 0:
                mesh_material = fallback_material
            append_mesh_triangles(geometry_object, mesh_material, buckets)
        elif isinstance(geometry_object, DB.GeometryInstance):
            walk_geometry(geometry_object.GetInstanceGeometry(), fallback_material, buckets)


def extract_element(element, detail_level):
    options = DB.Options()
    options.ComputeReferences = False
    options.IncludeNonVisibleObjects = False
    options.DetailLevel = detail_level
    buckets = {}
    walk_geometry(element.get_Geometry(options), default_element_material(element), buckets)
    return buckets


def material_definition(material_integer_id, category_name):
    fallback = CATEGORY_COLORS.get(category_name, (0.72, 0.72, 0.72, 1.0))
    name = "{0} material".format(category_name)
    base = fallback
    metallic = 0.0
    roughness = 0.74

    if material_integer_id >= 0:
        material = doc.GetElement(DB.ElementId(material_integer_id))
        if material:
            name = safe_text(getattr(material, "Name", name))
            try:
                color = material.Color
                alpha = max(0.08, 1.0 - (float(material.Transparency) / 100.0))
                if color and color.IsValid:
                    base = (color.Red / 255.0, color.Green / 255.0, color.Blue / 255.0, alpha)
            except Exception:
                pass

    lowered = name.lower()
    if any(word in lowered for word in ["metal", "steel", "alum", "zinc", "ssr"]):
        metallic = 0.72
        roughness = 0.34
    elif any(word in lowered for word in ["glass", "glazing", "kaca"]):
        base = (base[0], base[1], base[2], min(base[3], 0.38))
        roughness = 0.12
    elif any(word in lowered for word in ["wood", "timber", "kayu"]):
        roughness = 0.62

    definition = {
        "name": name,
        "pbrMetallicRoughness": {
            "baseColorFactor": [round(value, 5) for value in base],
            "metallicFactor": metallic,
            "roughnessFactor": roughness,
        },
        "doubleSided": True,
    }
    if base[3] < 0.995:
        definition["alphaMode"] = "BLEND"
    if category_name == "Lighting Fixtures":
        definition["emissiveFactor"] = [0.45, 0.34, 0.12]
    return definition


def align4(buffer_bytes, pad_byte):
    while len(buffer_bytes) % 4:
        buffer_bytes.extend(pad_byte)


def append_buffer(binary, payload):
    align4(binary, bytearray([0]))
    offset = len(binary)
    binary.extend(payload)
    return offset, len(payload)


def floats_payload(values):
    return bytearray(struct.pack("<" + "f" * len(values), *values))


def uints_payload(values):
    return bytearray(struct.pack("<" + "I" * len(values), *values))


def export_lod(lod):
    elements = collect_elements(lod)
    extracted = []
    all_positions = []

    for element in elements:
        buckets = extract_element(element, DETAIL_LEVELS[lod])
        if not buckets:
            continue
        metadata = element_metadata(element, lod)
        extracted.append((element, metadata, buckets))
        for triangles in buckets.values():
            for triangle in triangles:
                all_positions.extend(triangle[:3])

    if not all_positions:
        raise Exception("No renderable geometry found for LoD {0}".format(lod))

    minimum = [min(point[axis] for point in all_positions) for axis in range(3)]
    maximum = [max(point[axis] for point in all_positions) for axis in range(3)]
    center = ((minimum[0] + maximum[0]) / 2.0, minimum[1], (minimum[2] + maximum[2]) / 2.0)

    gltf = {
        "asset": {"version": "2.0", "generator": "Twinuvo Revit native GLB exporter"},
        "scene": 0,
        "scenes": [{"name": "Twinuvo LoD {0}".format(lod), "nodes": []}],
        "nodes": [],
        "meshes": [],
        "materials": [],
        "bufferViews": [],
        "accessors": [],
        "buffers": [{"byteLength": 0}],
        "extras": {
            "source": safe_text(doc.PathName),
            "revitDocument": safe_text(doc.Title),
            "lod": lod,
            "units": "metres",
            "coordinateSystem": "Y-up, centred on building ground",
        },
    }
    binary = bytearray()
    material_cache = {}
    total_triangles = 0

    def add_material(material_integer_id, category_name):
        cache_key = (material_integer_id, category_name)
        if cache_key not in material_cache:
            material_cache[cache_key] = len(gltf["materials"])
            gltf["materials"].append(material_definition(material_integer_id, category_name))
        return material_cache[cache_key]

    def add_accessor(values, value_type, accessor_type, component_type, minimum_value=None, maximum_value=None):
        payload = floats_payload(values) if value_type == "float" else uints_payload(values)
        offset, length = append_buffer(binary, payload)
        view_index = len(gltf["bufferViews"])
        gltf["bufferViews"].append({"buffer": 0, "byteOffset": offset, "byteLength": length})
        accessor = {
            "bufferView": view_index,
            "byteOffset": 0,
            "componentType": component_type,
            "count": len(values) // (3 if accessor_type == "VEC3" else 1),
            "type": accessor_type,
        }
        if minimum_value is not None:
            accessor["min"] = minimum_value
        if maximum_value is not None:
            accessor["max"] = maximum_value
        accessor_index = len(gltf["accessors"])
        gltf["accessors"].append(accessor)
        return accessor_index

    for element, metadata, buckets in extracted:
        primitives = []
        category_name = metadata["category"]
        for material_integer_id, triangles in buckets.items():
            positions = []
            normals = []
            indices = []
            vertex_cache = {}

            for triangle in triangles:
                normal = triangle[3]
                for point in triangle[:3]:
                    shifted = (point[0] - center[0], point[1] - center[1], point[2] - center[2])
                    key = tuple(round(value, 6) for value in shifted + normal)
                    vertex_index = vertex_cache.get(key)
                    if vertex_index is None:
                        vertex_index = len(positions) // 3
                        vertex_cache[key] = vertex_index
                        positions.extend(shifted)
                        normals.extend(normal)
                    indices.append(vertex_index)

            if not indices:
                continue

            position_vectors = [positions[index:index + 3] for index in range(0, len(positions), 3)]
            position_accessor = add_accessor(
                positions,
                "float",
                "VEC3",
                5126,
                [min(point[axis] for point in position_vectors) for axis in range(3)],
                [max(point[axis] for point in position_vectors) for axis in range(3)],
            )
            normal_accessor = add_accessor(normals, "float", "VEC3", 5126)
            index_accessor = add_accessor(indices, "uint", "SCALAR", 5125, [min(indices)], [max(indices)])
            primitives.append({
                "attributes": {"POSITION": position_accessor, "NORMAL": normal_accessor},
                "indices": index_accessor,
                "material": add_material(material_integer_id, category_name),
                "mode": 4,
            })
            total_triangles += len(indices) // 3

        if not primitives:
            continue

        mesh_index = len(gltf["meshes"])
        node_index = len(gltf["nodes"])
        display_name = metadata["mark"] or safe_text(getattr(element, "Name", "")) or "Revit element"
        gltf["meshes"].append({"name": display_name, "primitives": primitives, "extras": metadata})
        gltf["nodes"].append({"name": display_name, "mesh": mesh_index, "extras": metadata})
        gltf["scenes"][0]["nodes"].append(node_index)

    align4(binary, bytearray([0]))
    gltf["buffers"][0]["byteLength"] = len(binary)
    gltf["extras"]["statistics"] = {
        "elements": len(gltf["nodes"]),
        "triangles": total_triangles,
        "materials": len(gltf["materials"]),
        "boundsMeters": {
            "min": [round(minimum[index] - center[index], 4) for index in range(3)],
            "max": [round(maximum[index] - center[index], 4) for index in range(3)],
            "size": [round(maximum[index] - minimum[index], 4) for index in range(3)],
        },
    }

    json_bytes = bytearray(json.dumps(gltf, separators=(",", ":"), ensure_ascii=True).encode("utf-8"))
    align4(json_bytes, bytearray([32]))
    total_length = 12 + 8 + len(json_bytes) + 8 + len(binary)
    output_path = os.path.join(OUTPUT_DIR, "twinuvo_lod{0}.glb".format(lod))

    with open(output_path, "wb") as output:
        output.write(struct.pack("<4sII", b"glTF", 2, total_length))
        output.write(struct.pack("<I4s", len(json_bytes), b"JSON"))
        output.write(json_bytes)
        output.write(struct.pack("<I4s", len(binary), b"BIN\x00"))
        output.write(binary)

    return {
        "lod": lod,
        "path": output_path,
        "bytes": os.path.getsize(output_path),
        "elements": len(gltf["nodes"]),
        "triangles": total_triangles,
        "materials": len(gltf["materials"]),
        "boundsMeters": gltf["extras"]["statistics"]["boundsMeters"],
    }


if not os.path.isdir(OUTPUT_DIR):
    os.makedirs(OUTPUT_DIR)

results = [export_lod(lod) for lod in [1, 2, 3, 4]]
print("TWUNIVO_GLB_EXPORT|" + json.dumps(results, sort_keys=True))
