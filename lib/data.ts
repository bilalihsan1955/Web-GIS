export interface PhotoNode {
  id: string;
  locationGroup: string;
  locationName: string;
  imagePath: string;
  coordinates: [number, number];
  captureDate: string;
}

const files = [
  "20260620_224112_607.jpg",
  "20260620_224232_420.jpg",
  "20260620_224314_584.jpg",
  "20260620_224445_816.jpg",
  "20260620_224511_088.jpg",
  "20260620_224545_979.jpg",
  "20260620_224610_521.jpg",
  "20260620_224634_605.jpg",
  "20260620_224707_721.jpg",
  "20260620_224735_999.jpg",
  "20260620_224757_584.jpg",
  "20260620_224818_581.jpg",
  "20260620_224842_126.jpg",
  "20260620_224903_290.jpg",
  "20260620_224926_198.jpg",
  "20260620_224949_388.jpg",
  "20260620_225011_481.jpg",
  "20260620_225032_448.jpg",
  "20260620_225052_124.jpg",
  "20260620_225110_292.jpg",
  "20260620_225130_616.jpg",
  "20260620_225149_999.jpg",
  "20260620_225209_511.jpg"
];

export const spatialNodes: PhotoNode[] = files.map((file, i) => {
  // Parse date from filename: 20260620_224112_607.jpg
  // Format to e.g. 2026-06-20 22:41:12
  const dateStr = file.substring(0, 8);
  const timeStr = file.substring(9, 15);
  const formattedDate = `${dateStr.slice(0,4)}-${dateStr.slice(4,6)}-${dateStr.slice(6,8)} ${timeStr.slice(0,2)}:${timeStr.slice(2,4)}:${timeStr.slice(4,6)}`;
  
  // Randomly scatter coordinates around base [116.8, -1.2]
  const baseLng = 116.8;
  const baseLat = -1.2;
  const lng = baseLng + (Math.random() - 0.5) * 0.05;
  const lat = baseLat + (Math.random() - 0.5) * 0.05;

  return {
    id: `node-${i + 1}`,
    locationGroup: 'MUARA_SUNGAI_PANTAI_NENANG',
    locationName: 'Muara Sungai Pantai Nenang',
    imagePath: `/images/360/MUARA SUANGAI PANTAI NENANG/${file}`,
    coordinates: [lng, lat],
    captureDate: formattedDate,
  };
});
