// Shared shirt-geometry builder. This is the EXACT proven working geometry
// from the 3D preview modal (single continuous outline — body + both
// sleeves + collar traced as one Shape, so nothing can float apart) —
// now reused by the main editor canvas too, so both stay visually identical.

export function buildShirtGroup(THREE: any, style: string) {
  const group = new THREE.Group();

  const mat = new THREE.MeshStandardMaterial({
    roughness: 0.85,
    metalness: 0.02,
    side: THREE.DoubleSide,
  });

  // 2D t-shirt silhouette in a local coordinate system, traced as ONE
  // continuous outline (body + both sleeves + collar) so nothing floats apart.
  const shape = new THREE.Shape();
  const isVNeck = style === "vneck";

  shape.moveTo(-22, 96);              // left shoulder top
  shape.lineTo(-10, 96);              // toward collar
  if (isVNeck) {
    shape.lineTo(0, 70);               // V dip
    shape.lineTo(10, 96);
  } else {
    shape.quadraticCurveTo(0, 82, 10, 96); // crew curve
  }
  shape.lineTo(22, 96);                // right shoulder top
  shape.lineTo(58, 60);                // right sleeve outer-top
  shape.lineTo(46, 46);                // right sleeve outer-bottom (armpit notch)
  shape.lineTo(34, 70);                // back toward body under arm
  shape.lineTo(34, -96);               // down right side seam
  shape.lineTo(-34, -96);              // bottom hem
  shape.lineTo(-34, 70);               // up left side seam
  shape.lineTo(-46, 46);               // left sleeve outer-bottom
  shape.lineTo(-58, 60);               // left sleeve outer-top
  shape.closePath();

  const extrudeSettings = {
    depth: 14,
    bevelEnabled: true,
    bevelThickness: 2.2,
    bevelSize: 1.8,
    bevelSegments: 6,
    curveSegments: 28,
  };

  const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  geo.center();
  geo.computeVertexNormals();

  // Generate clean planar UVs (front-facing projection) so the design
  // texture maps predictably onto the front face without distortion.
  geo.computeBoundingBox();
  const bb = geo.boundingBox;
  const uvAttr = geo.attributes.uv;
  const posAttr = geo.attributes.position;
  const w = bb.max.x - bb.min.x;
  const h = bb.max.y - bb.min.y;
  for (let i = 0; i < posAttr.count; i++) {
    const x = posAttr.getX(i), y = posAttr.getY(i);
    uvAttr.setXY(i, (x - bb.min.x) / w, (y - bb.min.y) / h);
  }
  uvAttr.needsUpdate = true;

  // Scale to scene units
  const finalScale = 0.011;
  geo.scale(finalScale, finalScale, finalScale);

  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = "body";
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);

  // Real top-of-mesh Y, computed from actual geometry (not a guessed constant)
  const neckTopY = bb.max.y * finalScale;

  // Collar ring detail sitting flush at the actual neck opening
  if (!isVNeck) {
    const collarRadius = 0.105;
    const collarGeo = new THREE.TorusGeometry(collarRadius, collarRadius * 0.09, 8, 32, Math.PI * 1.5);
    const collarMesh = new THREE.Mesh(collarGeo, mat.clone());
    collarMesh.name = "collar";
    collarMesh.position.set(0, neckTopY - collarRadius * 0.5, 0.075);
    collarMesh.rotation.z = Math.PI * 1.25;
    collarMesh.rotation.x = 0.15;
    collarMesh.castShadow = true;
    group.add(collarMesh);
  }

  return { group, bodyMesh: mesh };
}