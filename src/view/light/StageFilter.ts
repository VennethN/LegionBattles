// The light as one filter on the field's camera. Phaser hands it the field
// as the camera drew it, and it hands back the field lit, glowing and seen
// through a lens:
//
//   1. light   the whole picture, multiplied by the hour and the lights
//   2. bright  what is bright enough to glow, at a quarter of the size
//   3. blur    that, blurred across and down, twice
//   4. lens    the whole picture again: the glow added, the grade, the rim
//
// Two passes over the whole picture and five over a sixteenth of it. The
// built-in tilt shift alone reads the picture a hundred times for every
// pixel, which a school laptop cannot do sixty times a second.

import Phaser from 'phaser';
import { BLUR_FRAG, BRIGHT_FRAG, LENS_FRAG, LIGHT_FRAG, MAX_LIGHTS } from './shaders';

type Context = Phaser.Renderer.WebGL.DrawingContext;
type Manager = Phaser.Renderer.WebGL.RenderNodes.RenderNodeManager;
type Programs = Phaser.Renderer.WebGL.ProgramManager;
type GlTexture = Phaser.Renderer.WebGL.Wrappers.WebGLTextureWrapper;

const NODE = 'HoldoutStage';
const NONE = new Phaser.Geom.Rectangle(0, 0, 0, 0);

/** What one pass needs set before it draws. A pass is told by a plain object, as Phaser's own blur tells its steps. */
interface PassTold {
  uniforms: (p: Programs) => void;
  second?: GlTexture | null;
}

/** A pass's telling, dressed as the controller Phaser expects to hand it. */
function told(t: PassTold): Phaser.Filters.Controller {
  return t as unknown as Phaser.Filters.Controller;
}

/** One of the four programs. */
class Pass extends Phaser.Renderer.WebGL.RenderNodes.BaseFilterShader {
  constructor(name: string, manager: Manager, source: string) {
    super(name, manager, undefined, source);
  }

  override setupTextures(told: unknown, textures: GlTexture[]): void {
    const second = (told as PassTold).second;
    if (second) textures[1] = second;
  }

  override setupUniforms(told: unknown): void {
    (told as PassTold).uniforms(this.programManager);
  }
}

/** Everything the light is told each frame. The field's own light (FieldLight.ts) fills it in. */
export class StageFilter extends Phaser.Filters.Controller {
  /** The view in the field's units, and where its top left corner is on the field. */
  view: [number, number] = [800, 600];
  scroll: [number, number] = [0, 0];
  time = 0;
  ambient: [number, number, number] = [1, 1, 1];
  sun: [number, number, number] = [0, 0, 0];
  /** Which way the sun's light goes over the ground, as a direction of length one. */
  sunDir: [number, number] = [1, 0];
  clouds = 0;
  /** What is drawn past the field's edge, where the camera drew nothing. */
  back: [number, number, number] = [0, 0, 0];
  /** x, y, radius and strength of each light, in the view's units; and their colors. */
  readonly lights = new Float32Array(MAX_LIGHTS * 4);
  readonly colors = new Float32Array(MAX_LIGHTS * 3);
  /** What shines by itself, drawn apart. Null when nothing does. */
  emit: GlTexture | null = null;
  emitAmount = 1;

  /** False leaves the glow and the soft top and bottom out: the cheap light. */
  full = true;
  /** How bright a lit thing must be before it glows, and where it glows fully. One is white as drawn. */
  glow: [number, number] = [1.0, 1.55];
  bloom = 0.62;
  vignette = 0.42;
  shade: [number, number, number] = [0.9, 0.94, 1.08];
  contrast = 0.34;
  saturation = 1.12;
  grain = 0.022;

  constructor(camera: Phaser.Cameras.Scene2D.Camera) {
    super(camera, NODE);
  }
}

class StageNode extends Phaser.Renderer.WebGL.RenderNodes.BaseFilter {
  private readonly light: Pass;
  private readonly bright: Pass;
  private readonly blur: Pass;
  private readonly lens: Pass;
  private readonly black: GlTexture;

  constructor(manager: Manager) {
    super(NODE, manager);
    this.light = new Pass('HoldoutLight', manager, LIGHT_FRAG);
    this.bright = new Pass('HoldoutBright', manager, BRIGHT_FRAG);
    this.blur = new Pass('HoldoutBlur', manager, BLUR_FRAG);
    this.lens = new Pass('HoldoutLens', manager, LENS_FRAG);
    // What a pass reads where there is no emit picture or no glow: nothing.
    const textures = manager.renderer.game.textures;
    if (!textures.exists('light:black')) {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 4;
      const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, 4, 4);
      textures.addCanvas('light:black', canvas);
    }
    this.black = textures.get('light:black').source[0].glTexture as GlTexture;
  }

  override run(controller: Phaser.Filters.Controller, input: Context, output?: Context): Context {
    const c = controller as StageFilter;
    const pool = this.manager.renderer.drawingContextPool;
    this.onRunBegin(output as Context);

    const lit = this.light.run(
      told({
        second: c.emit ?? this.black,
        uniforms: (p) => {
          p.setUniform('uEmit', 1);
          p.setUniform('uView', c.view);
          p.setUniform('uScroll', c.scroll);
          p.setUniform('uTime', c.time);
          p.setUniform('uAmbient', c.ambient);
          p.setUniform('uSun', c.sun);
          p.setUniform('uSunDir', c.sunDir);
          p.setUniform('uBack', c.back);
          // The cheap light has the shade too: without it the hour is only a tint.
          p.setUniform('uClouds', c.clouds);
          p.setUniform('uEmitAmount', c.emit ? c.emitAmount : 0);
          p.setUniform('uGlow', c.glow);
          p.setUniform('uLights[0]', c.lights);
          p.setUniform('uColors[0]', c.colors);
        },
      }),
      input,
      undefined,
      NONE,
    );

    let glow: Context | null = null;
    if (c.full && c.bloom > 0) {
      // The lit picture is read twice more, so it is kept from going back to the pool until the lens has had it.
      lit.lock(this);
      const w = Math.max(8, lit.width >> 2);
      const h = Math.max(8, lit.height >> 2);
      glow = this.bright.run(
        told({
          uniforms: (p) => {
            p.setUniform('uTexel', [1 / lit.width, 1 / lit.height]);
          },
        }),
        lit,
        pool.get(w, h),
        NONE,
      );
      for (const spread of [1, 2.2]) {
        for (const across of [true, false]) {
          glow = this.blur.run(
            told({ uniforms: (p) => p.setUniform('uStep', across ? [spread / w, 0] : [0, spread / h]) }),
            glow,
            pool.get(w, h),
            NONE,
          );
        }
      }
      lit.unlock(this);
    }

    const out = this.lens.run(
      told({
        second: glow ? glow.texture : this.black,
        uniforms: (p) => {
          p.setUniform('uBloom', 1);
          p.setUniform('uBloomAmount', glow ? c.bloom : 0);
          p.setUniform('uVignette', c.vignette);
          p.setUniform('uShade', c.shade);
          p.setUniform('uContrast', c.contrast);
          p.setUniform('uSaturation', c.saturation);
          p.setUniform('uGrain', c.full ? c.grain : 0);
          p.setUniform('uTime', c.time);
          p.setUniform('uAspect', lit.width / lit.height);
        },
      }),
      lit,
      output,
      NONE,
    );
    glow?.release();

    this.onRunEnd(out);
    return out;
  }
}

/** True where the light can be made at all: the game draws with WebGL. */
export function lightPossible(game: Phaser.Game): boolean {
  return game.renderer.type === Phaser.WEBGL;
}

/** Tells the renderer how the light is made. Asked for by whoever is about to put it on a camera. */
export function registerStage(game: Phaser.Game): void {
  const nodes = (game.renderer as Phaser.Renderer.WebGL.WebGLRenderer).renderNodes;
  if (!nodes.hasNode(NODE)) nodes.addNodeConstructor(NODE, StageNode as unknown as Parameters<typeof nodes.addNodeConstructor>[1]);
}
