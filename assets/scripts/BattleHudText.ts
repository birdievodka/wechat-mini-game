import {Label,Node,Rect,Sprite,SpriteFrame,Texture2D,UITransform} from 'cc';

const FONT_SIZE = 25;
const CELL = 32;
const COLUMNS = 16;
const MAX_GLYPHS = 192;
const MAX_TEXT_LENGTH = 64;

interface Glyph {
  advance: number;
  frame?: SpriteFrame;
}

/** One small glyph texture for the live WeChat HUD, drawn before battle starts. */
export class BattleHudAtlas {
  private texture?: Texture2D;
  private readonly glyphs = new Map<number,Glyph>();

  static create(characters: string, font: string): BattleHudAtlas | undefined {
    if (typeof document === 'undefined') return;
    const atlas = new BattleHudAtlas();
    try {
      atlas.bake(characters, font);
      return atlas;
    } catch (error) {
      atlas.destroy();
      console.warn('战斗 HUD 字形缓存不可用，保留文字组件', error);
    }
  }

  private bake(characters: string, font: string): void {
    const symbols = Array.from(new Set(characters.split('')));
    if (!symbols.length || symbols.length > MAX_GLYPHS) throw new Error('战斗 HUD 字形数超限');
    const canvas = document.createElement('canvas');
    canvas.width = COLUMNS * CELL;
    canvas.height = Math.ceil(symbols.length / COLUMNS) * CELL;
    try {
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('无法创建战斗 HUD 字形画布');
      ctx.font = FONT_SIZE + 'px ' + font;
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      for (let i = 0; i < symbols.length; i++) {
        const symbol = symbols[i];
        const advance = ctx.measureText(symbol)?.width;
        if (!(advance > 0 && advance <= CELL - 4)) throw new Error('战斗 HUD 字形宽度不可用');
        const x = i % COLUMNS * CELL, y = Math.floor(i / COLUMNS) * CELL;
        this.glyphs.set(symbol.charCodeAt(0), {advance});
        if (symbol !== ' ') ctx.fillText(symbol, x + 2, y + CELL / 2);
      }
      const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      const texture = this.texture = new Texture2D();
      texture.reset({width:canvas.width,height:canvas.height});
      texture.uploadData(new Uint8Array(pixels.buffer, pixels.byteOffset, pixels.byteLength));
      for (let i = 0; i < symbols.length; i++) {
        if (symbols[i] === ' ') continue;
        const frame = new SpriteFrame();
        this.glyphs.get(symbols[i].charCodeAt(0))!.frame = frame;
        frame.texture = texture;
        frame.rect = new Rect(i % COLUMNS * CELL, Math.floor(i / COLUMNS) * CELL, CELL, CELL);
      }
    } finally {
      canvas.width = canvas.height = 0;
    }
  }

  glyph(code: number): Glyph | undefined { return this.glyphs.get(code); }

  destroy(): void {
    for (const {frame} of this.glyphs.values()) frame?.destroy();
    this.glyphs.clear();
    this.texture?.destroy();
    this.texture = undefined;
  }
}

/** Preserves the label's layout node and falls back for unexpected text. */
export class BattleHudText {
  readonly node: Node;
  private readonly sprites: Sprite[] = [];
  private value: string | undefined;

  constructor(private label: Label, private atlas: BattleHudAtlas) {
    this.node = label.node;
    this.string = label.string;
  }

  get string(): string { return this.value ?? ''; }
  set string(value: string) {
    if (value === this.value) return;
    this.value = value;
    let width = 0;
    if (value.length > MAX_TEXT_LENGTH) { this.fallback(value); return; }
    for (let i = 0; i < value.length; i++) {
      const glyph = this.atlas.glyph(value.charCodeAt(i));
      if (!glyph) { this.fallback(value); return; }
      width += glyph.advance;
    }

    this.label.enabled = false;
    const scale = this.label.fontSize / FONT_SIZE;
    let x = -width / 2, count = 0;
    for (let i = 0; i < value.length; i++) {
      const glyph = this.atlas.glyph(value.charCodeAt(i))!;
      if (glyph.frame) {
        const sprite = this.sprites[count] ?? this.addSprite(scale);
        if (sprite.spriteFrame !== glyph.frame) sprite.spriteFrame = glyph.frame;
        sprite.node.active = true;
        sprite.node.setPosition((x + CELL / 2 - 2) * scale, 0);
        count++;
      }
      x += glyph.advance;
    }
    for (let i = count; i < this.sprites.length; i++) this.sprites[i].node.active = false;
  }

  private addSprite(scale: number): Sprite {
    const node = new Node('HudGlyph');
    node.layer = this.node.layer;
    this.node.addChild(node);
    const sprite = node.addComponent(Sprite);
    sprite.sizeMode = Sprite.SizeMode.CUSTOM;
    sprite.color = this.label.color;
    node.getComponent(UITransform)!.setContentSize(CELL * scale, CELL * scale);
    this.sprites.push(sprite);
    return sprite;
  }

  private fallback(value: string): void {
    for (const sprite of this.sprites) sprite.node.active = false;
    this.label.string = value;
    this.label.enabled = true;
  }
}
