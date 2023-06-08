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

function extractFromScreenshot(imgElement: HTMLImageElement): ImageData[] {
  const imgList = cv.imread(imgElement);

  // Convert to grayscale
  const imgListGray = new cv.Mat();
  cv.cvtColor(imgList, imgListGray, cv.COLOR_BGR2GRAY);
  
  // Extract character box and thumbnail boxes
  const characterBox = extractCharacterBox(imgListGray);
  const imgBoxGray = imgListGray.roi(characterBox);
  const thumbnailBoxes = extractThumbnailBoxes(imgBoxGray);

  // Generate image data from thumbnail boxes
  // ImageData requires the data to be in RGBA format as Uint8
  // The data we've loaded is already in BGRA format as Uint8, so just need to swap the channels
  const imgBox = imgList.roi(characterBox);
  // const imgBoxRgba = new cv.Mat(imgBox.size(), imgBox.type());
  // cv.cvtColor(imgBox, imgBoxRgba, cv.COLOR_BGR2RGBA);

  const thumbnailImages: ImageData[] = [];
  const canvasOutput = document.getElementById("canvasOutput") as HTMLCanvasElement;
  const canvasCtx = canvasOutput.getContext("2d");

  for (const thumbnailBox of thumbnailBoxes) {
    const imgThumbnail = imgBox.roi(thumbnailBox);

    // TODO: Can't seem to get the conversion to ImageData working...
    // - cv.imshow(imgThumbnail) is fine
    // - ctx.putImageData(imageData, 0, 0) has garbled output
    // - Converting imageData back to cv.Mat, then using cv.imshow() also has garbled output
    //
    // The converted data is the same, so not sure what's wrong
    // For now, I'm working around this by rendering to a hidden canvas, then re-retrieving the image data
    // const imageData = new ImageData(new Uint8ClampedArray(imgThumbnail.data), imgThumbnail.cols, imgThumbnail.rows);

    cv.imshow(canvasOutput, imgThumbnail);
    const imageData = canvasCtx.getImageData(0, 0, thumbnailBox.width, thumbnailBox.height);

    thumbnailImages.push(imageData);
    imgThumbnail.delete();
  }

  // Clear intermediate resources
  imgList.delete();
  imgListGray.delete();
  imgBoxGray.delete();

  imgBox.delete();
  // imgBoxRgba.delete();

  return thumbnailImages;
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
  const imgBoxContours = cv.Mat.zeros(imgBoxThresholded.size(), imgBoxThresholded.type());
  const contoursBox1 = new cv.MatVector();
  const hierarchyBox1 = new cv.Mat();
  cv.findContours(imgBoxThresholded, contoursBox1, hierarchyBox1, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

  const contoursCount1 = getMatVectorSize(contoursBox1);

  for (let i = 0; i < contoursCount1; i++) {
    const contour = contoursBox1.get(i);
    const boundingRect = cv.boundingRect(contour);

    // NOTE:
    // - Couldn't get the overload that uses in cv.Rect to work
    // - For the colour, it looks like we have to specify the values for all channels
    cv.rectangle(
      imgBoxContours, 
      new cv.Point(boundingRect.x, boundingRect.y),
      new cv.Point(boundingRect.x + boundingRect.width, boundingRect.y + boundingRect.height),
      new cv.Scalar(255, 255, 255),
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
