import { Component, onMount, splitProps } from "solid-js";

interface CanvasHostProps {
  imageData: ImageData;
  [propName: string]: any;
}

const CanvasHost: Component<CanvasHostProps> = (props: CanvasHostProps) => {
  let canvas: HTMLCanvasElement;

  onMount(() => {
    if (props.imageData) {
      canvas.width = props.imageData.width;
      canvas.height = props.imageData.height;
      
      const ctx = canvas.getContext("2d");
      ctx.putImageData(props.imageData, 0, 0);
    }
  });

  return (
    <>
      <canvas ref={canvas} {...props}></canvas>
    </>
  )
};

export default CanvasHost;
