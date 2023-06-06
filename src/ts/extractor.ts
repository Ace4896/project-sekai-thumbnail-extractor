import cv from "@techstark/opencv-js";

// NOTE: Type annotations for MatVector seem to be incorrect - definitely returns a number
function getMatVectorSize(matVector: cv.MatVector): number {
  return matVector.size() as unknown as number;
}

function median(numbers: number[]): number {
  const sorted = Array.from(numbers).sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }

  return sorted[middle];
}

function extractFromScreenshot(imgElement: HTMLImageElement): cv.Rect[] {
  const imgList = cv.imread(imgElement);

  // Convert to grayscale
  const imgListGray = new cv.Mat();
  cv.cvtColor(imgList, imgListGray, cv.COLOR_BGR2GRAY);
  
  // Extract character box
  const characterBox = extractCharacterBox(imgListGray);
  const imgBox = imgList.roi(characterBox);
  const imgBoxGray = imgListGray.roi(characterBox);
  cv.imshow("canvasOutput", imgBox);

  // Extract thumbnail boxes
  const thumbnailBoxes = extractThumbnailBoxes(imgBoxGray);

  // Clear intermediate resources
  imgList.delete();
  imgListGray.delete();
  imgBox.delete();
  imgBoxGray.delete();

  // return thumbnailBoxes;
  return [];
}

function extractCharacterBox(imgListGray: cv.Mat): cv.Rect {
  // The white box surrounding the character thumbnails can be found by searching for the largest external contour

  // Threshold to only show pixels that are close to white
  const imgListThresholded = new cv.Mat();
  cv.threshold(imgListGray, imgListThresholded, 250, 255, cv.THRESH_BINARY);

  // Find external contours from thresholded image
  const contoursList = new cv.MatVector();
  const hierarchyList = new cv.Mat();
  cv.findContours(
    imgListThresholded,
    contoursList,
    hierarchyList,
    cv.RETR_EXTERNAL,
    cv.CHAIN_APPROX_SIMPLE
  );

  const contoursCount = getMatVectorSize(contoursList);
  if (contoursCount === 0) {
    throw new Error("Cannot locate character box - no contours found");
  }

  let maxContour = contoursList.get(0);
  let maxArea = cv.contourArea(maxContour);

  for (let index = 1; index < contoursCount; index++) {
    const contour = contoursList.get(index);
    const area = cv.contourArea(contour);

    if (area > maxArea) {
      maxContour = contour;
      maxArea = area;
    }
  }

  // Approximate this contour into a regular polygon
  const maxContourApprox = new cv.Mat();
  cv.approxPolyDP(
    maxContour,
    maxContourApprox,
    0.1 * cv.arcLength(maxContour, true),
    true
  );

  // Get bounding rectangle for approximated contour
  const boundingRect = cv.boundingRect(maxContourApprox);

  // Release intermediate resources
  imgListThresholded.delete();
  contoursList.delete();
  hierarchyList.delete();

  maxContourApprox.delete();

  return boundingRect;
}

function extractThumbnailBoxes(imgBoxGray: cv.Mat): cv.Rect[] {
  // Each of the thumbnails has a rounded square border
  // We can find them by searching for square-like contours

  // Inversely threshold to show near-white pixels as black
  const imgBoxThresholded = new cv.Mat();
  cv.threshold(imgBoxGray, imgBoxThresholded, 250, 255, cv.THRESH_BINARY_INV);

  // Find external contours - this avoids capturing the contents of the thumbnails
  // This has to be done twice, as the first set of contours are usually disjointed
  const imgBoxContours = cv.Mat.zeros(imgBoxGray.rows, imgBoxGray.cols, imgBoxGray.type());
  const contoursBox1 = new cv.MatVector();
  const hierarchyBox1 = new cv.Mat();
  cv.findContours(imgBoxThresholded, contoursBox1, hierarchyBox1, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

  const contoursCount1 = getMatVectorSize(contoursBox1);
  for (let i = 0; i < contoursCount1; i++) {
    const contour = contoursBox1.get(i);
    const boundingRect = cv.boundingRect(contour);

    // TODO: The colour parameter isn't correct - doesn't seem to accept 255
    cv.rectangle(
      imgBoxContours,
      boundingRect,
      255,
      -1
    );
  }

  const contoursBox2 = new cv.MatVector();
  const hierarchyBox2 = new cv.Mat();
  cv.findContours(imgBoxContours, contoursBox2, hierarchyBox2, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

  // After finding second set of contours, get the bounding boxes for each contour
  // Pick the ones that are square-ish
  // The most common width comes from the thumbnails; can use ones that are close to median value
  let thumbnailBoundingBoxes: cv.Rect[] = []
  const contoursCount2 = getMatVectorSize(contoursBox2);
  for (let i = 0; i < contoursCount2; i++) {
    const contour = contoursBox2.get(i);
    thumbnailBoundingBoxes.push(cv.boundingRect(contour));
  }

  const lengthThreshold = 0.9 * median(thumbnailBoundingBoxes.map(rect => rect.width));
  thumbnailBoundingBoxes = thumbnailBoundingBoxes.filter(rect => rect.width > lengthThreshold && rect.height > lengthThreshold);

  // Release intermediate resources
  imgBoxThresholded.delete();
  
  imgBoxContours.delete();
  contoursBox1.delete();
  hierarchyBox1.delete();

  contoursBox2.delete();
  hierarchyBox2.delete();

  return thumbnailBoundingBoxes;
}

export { extractFromScreenshot };
