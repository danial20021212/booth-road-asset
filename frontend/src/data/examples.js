// Example pictures shown inside each type's box when a visitor picks what to draw.
// Put the images in /public/examples. For each type below the app looks for
//   <name>-1.png, <name>-2.png, <name>-3.png
// For example public/examples/warning-1.png. A missing file is simply skipped,
// so you can add images a few at a time and the rest of the box looks as it did before.

const EXT = "png"; // change to "jpg" if that is what you saved
const COUNT = 3; // how many examples to look for per type, unless a type says otherwise below

// A type with exactly 1 example gets that picture stretched across its whole box.
const files = (name, count = COUNT) =>
  Array.from({ length: count }, (_, i) => `/examples/${name}-${i + 1}.${EXT}`);

// key = the type's group (as used by the app), value = the file name stem
export const EXAMPLES = {
  // Road assets
  "sign:warning": files("warning"),
  "sign:regulatory_prohibitive": files("prohibitive"),
  "sign:regulatory_mandatory": files("mandatory"),
  "sign:informative": files("informative"),
  "sign:construction_temporary": files("roadwork"),
  "expressway sign": files("expressway", 1),
  "traffic light": files("traffic-light", 1),
  arrow: files("road-arrow"),
  "yellow box junction": files("yellow-box-junction", 1),
  "feeder pillar": files("feeder-pillar", 1),
  "bus stop": files("bus-stop", 1),
  "traffic island": files("traffic-island", 1),

  // Road defects
  potholes: files("pothole"),
  "longitudinal crack": files("longitudinal-crack"),
  "transverse crack": files("transverse-crack"),
  "crocodile crack": files("crocodile-crack"),
  "road patch": files("road-patch"),
  "crack seals": files("crack-seal"),
};