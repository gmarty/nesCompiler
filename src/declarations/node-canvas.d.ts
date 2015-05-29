declare
var Canvas: {
  prototype: Canvas;
  new (width: number, height: number): Canvas;
  constructor(width: number, height: number): Canvas;
};

// Canvas interface
interface Canvas {
  getContext(contextId: string): NodeCanvasRenderingContext2D;
  toBuffer(): NodeBuffer;
}

declare
var NodeCanvasRenderingContext2D: {
  prototype: NodeCanvasRenderingContext2D;
  new(): NodeCanvasRenderingContext2D;
};

// NodeCanvasRenderingContext2D interface
interface NodeCanvasRenderingContext2D {
  canvas: Canvas;
  fillStyle: any;
  font: string;
  globalAlpha: number;
  globalCompositeOperation: string;
  lineCap: string;
  lineDashOffset: number;
  lineJoin: string;
  lineWidth: number;
  miterLimit: number;
  msFillRule: string;
  msImageSmoothingEnabled: boolean;
  shadowBlur: number;
  shadowColor: string;
  shadowOffsetX: number;
  shadowOffsetY: number;
  strokeStyle: any;
  textAlign: string;
  textBaseline: string;
  arc(x: number, y: number, radius: number, startAngle: number, endAngle: number, anticlockwise?: boolean): void;
  arcTo(x1: number, y1: number, x2: number, y2: number, radius: number): void;
  beginPath(): void;
  bezierCurveTo(cp1x: number, cp1y: number, cp2x: number, cp2y: number, x: number, y: number): void;
  clearRect(x: number, y: number, w: number, h: number): void;
  clip(fillRule?: string): void;
  closePath(): void;
  createImageData(imageDataOrSw: number, sh?: number): ImageData;
  createImageData(imageDataOrSw: ImageData, sh?: number): ImageData;
  createLinearGradient(x0: number, y0: number, x1: number, y1: number): CanvasGradient;
  createPattern(image: HTMLImageElement, repetition: string): CanvasPattern;
  createPattern(image: HTMLCanvasElement, repetition: string): CanvasPattern;
  createPattern(image: HTMLVideoElement, repetition: string): CanvasPattern;
  createRadialGradient(x0: number, y0: number, r0: number, x1: number, y1: number, r1: number): CanvasGradient;
  drawImage(image: HTMLImageElement, offsetX: number, offsetY: number, width?: number, height?: number, canvasOffsetX?: number, canvasOffsetY?: number, canvasImageWidth?: number, canvasImageHeight?: number): void;
  drawImage(image: HTMLCanvasElement, offsetX: number, offsetY: number, width?: number, height?: number, canvasOffsetX?: number, canvasOffsetY?: number, canvasImageWidth?: number, canvasImageHeight?: number): void;
  drawImage(image: HTMLVideoElement, offsetX: number, offsetY: number, width?: number, height?: number, canvasOffsetX?: number, canvasOffsetY?: number, canvasImageWidth?: number, canvasImageHeight?: number): void;
  fill(fillRule?: string): void;
  fillRect(x: number, y: number, w: number, h: number): void;
  fillText(text: string, x: number, y: number, maxWidth?: number): void;
  getImageData(sx: number, sy: number, sw: number, sh: number): ImageData;
  getLineDash(): number[];
  isPointInPath(x: number, y: number, fillRule?: string): boolean;
  lineTo(x: number, y: number): void;
  measureText(text: string): TextMetrics;
  moveTo(x: number, y: number): void;
  putImageData(imagedata: ImageData, dx: number, dy: number, dirtyX?: number, dirtyY?: number, dirtyWidth?: number, dirtyHeight?: number): void;
  quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void;
  rect(x: number, y: number, w: number, h: number): void;
  restore(): void;
  rotate(angle: number): void;
  save(): void;
  scale(x: number, y: number): void;
  setLineDash(segments: number[]): void;
  setTransform(m11: number, m12: number, m21: number, m22: number, dx: number, dy: number): void;
  stroke(): void;
  strokeRect(x: number, y: number, w: number, h: number): void;
  strokeText(text: string, x: number, y: number, maxWidth?: number): void;
  transform(m11: number, m12: number, m21: number, m22: number, dx: number, dy: number): void;
  translate(x: number, y: number): void;
}

declare module 'canvas' {
  export var version: string;
  export var cairoVersion: string;
  export var jpegVersion: string;
  export var gifVersion: string;
}
