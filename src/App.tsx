import { Component, For, Signal, createSignal } from "solid-js";

import { Theme, activeTheme, setTheme } from "./ts/colorModes";
import { extractFromScreenshot } from "./ts/extractor";
import CanvasHost from "./CanvasHost";

const availableThemes = [
  { value: Theme.Auto, text: "System", icon: "bi-circle-half" },
  { value: Theme.Light, text: "Light", icon: "bi-brightness-high-fill" },
  { value: Theme.Dark, text: "Dark", icon: "bi-moon-stars-fill" },
];

const App: Component = () => {
  const [imageSource, setImageSource]: Signal<string> = createSignal();
  const [thumbnailImages, setThumbnailImages]: Signal<ImageData[]> = createSignal([]);

  const extractThumbnailImages = (imgElement: HTMLImageElement) => {
    const extractedThumbnailImages = extractFromScreenshot(imgElement);
    setThumbnailImages(extractedThumbnailImages);
  };

  return (
    <>
      <nav class="navbar navbar-expand-lg bg-body-tertiary mb-4">
        <div class="container-md">
          <span class="navbar-brand mb-0 h1">
            Project Sekai Thumbnail Extractor
          </span>

          <ul class="navbar-nav">
            <li class="nav-item">
              <a
                class="nav-link"
                href="https://github.com/Ace4896/project-sekai-thumbnail-extractor"
                target="_blank"
                rel="noopener"
              >
                <i class="bi-github"></i>
              </a>
            </li>

            <li class="nav-item">
              <div class="vr d-none d-lg-flex h-100 mx-lg-2"></div>
            </li>

            <li class="nav-item dropdown">
              <button
                class="btn btn-link nav-link dropdown-toggle"
                type="button"
                data-bs-toggle="dropdown"
              >
                Theme
              </button>

              <ul class="dropdown-menu dropdown-menu-end">
                <For each={availableThemes}>
                  {(theme) => (
                    <li>
                      <button
                        type="button"
                        onclick={() => setTheme(theme.value)}
                        class={`dropdown-item ${
                          theme.value === activeTheme() ? "active" : ""
                        }`}
                      >
                        <i class={`${theme.icon} me-2`}></i>
                        {theme.text}
                      </button>
                    </li>
                  )}
                </For>
              </ul>
            </li>
          </ul>
        </div>
      </nav>

      <div class="container-md">
        <div class="mb-4">
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
          />
        </div>

        {/*
          NOTE: It looks like the size of the image element affects the size of the extracted thumbnails
          It may be worth using a canvas to avoid this
        */}
        <div class="container-md overflow-scroll">
          <img
            id="imgSource"
            class="mb-4"
            src={imageSource()}
            onload={(e) => extractThumbnailImages(e.target as HTMLImageElement)}
          />
        </div>
        
        <canvas id="canvasOutput" style="display: none" class="img-fluid" />

        <For each={thumbnailImages()}>
          {(thumbnailImage) => (
            <CanvasHost class="img-fluid" imageData={thumbnailImage} />
          )}
        </For>
      </div>
    </>
  );
};

export default App;
