// Put your road defect photos in /public/defects and list them here.
// `id` is what the Express server receives: POST /api/detect/defects/:id
// The file name (without extension) must match the id, for example defect-01.jpg.
export const DEFECT_IMAGES = [
  { id: "defect-01", title: "Road 01", src: "/defects/defect-01.jpg" },
  { id: "defect-02", title: "Road 02", src: "/defects/defect-02.jpg" },
  { id: "defect-03", title: "Road 03", src: "/defects/defect-03.jpg" },
  { id: "defect-04", title: "Road 04", src: "/defects/defect-04.jpg" },
  { id: "defect-05", title: "Road 05", src: "/defects/defect-05.jpg" },
  { id: "defect-06", title: "Road 06", src: "/defects/defect-06.jpg" },
];