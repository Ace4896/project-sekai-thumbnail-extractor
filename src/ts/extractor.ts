import cv from "@techstark/opencv-js";

// NOTE: Type annotations for MatVector seem to be incorrect - definitely returns a number
function getMatVectorSize(matVector: cv.MatVector): number {
  return matVector.size() as unknown as number;
}

function extractFromScreenshot(imgElement: HTMLImageElement) {
  const imgList = cv.imread(imgElement);
  const imgBox = extractCharacterBox(imgList);

  cv.imshow("canvasOutput", imgBox);

  // Clear intermediate resources
  imgList.delete();
  imgBox.delete();
}

function extractCharacterBox(imgList: cv.Mat): cv.Mat {
  // The white box surrounding the character thumbnails can be found by searching for the largest external contour
  // Convert to grayscale
  const imgListGray = new cv.Mat();
  cv.cvtColor(imgList, imgListGray, cv.COLOR_BGR2GRAY);

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
  const imgBox = imgList.roi(boundingRect);

  // Release intermediate resources
  imgListGray.delete();

  imgListThresholded.delete();
  contoursList.delete();
  hierarchyList.delete();

  maxContourApprox.delete();

  return imgBox;
}

export { extractFromScreenshot };
