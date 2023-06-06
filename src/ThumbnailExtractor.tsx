import { Component, Signal, createSignal } from "solid-js";

const ThumbnailExtractor: Component = () => {
  const [imageSource, setImageSource]: Signal<string> = createSignal();

  return (
    <>
      <div class="mb-3">
        <label for="inputImgSource" class="form-label">
          Load screenshot of character list...
        </label>
        <input
          id="inputImgSource"
          class="form-control"
          type="file"
          onchange={(e) =>
            setImageSource(URL.createObjectURL(e.target.files[0]))
          }
        ></input>
      </div>

      <img id="imgSource" alt="No Source Image Loaded" class="img-fluid" src={imageSource()} />
    </>
  );
};

export default ThumbnailExtractor;
