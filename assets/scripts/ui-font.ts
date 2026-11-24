import { Label, Node, TTFFont } from 'cc';

type UiFonts = { regular: TTFFont; medium: TTFFont };
const fontsByRoot = new WeakMap<Node, UiFonts>();

function styleLabel(label: Label, emphasized: boolean, fonts?: UiFonts): void {
  if (fonts) label.font = emphasized ? fonts.medium : fonts.regular;
  label.isBold = emphasized && (!fonts || fonts.regular === fonts.medium);
}

export function installUiFonts(root: Node, regular?: TTFFont, medium?: TTFFont): void {
  const primary = regular ?? medium;
  if (!primary) return;
  const fonts = { regular: primary, medium: medium ?? primary };
  fontsByRoot.set(root, fonts);
  // HUD and loading labels are created before the local font bundle is available.
  for (const label of root.getComponentsInChildren(Label)) styleLabel(label, label.isBold, fonts);
}

// Call after setting the text and overflow. Assigning a font immediately lays out the label.
export function applyUiFont(label: Label, emphasized = false): Label {
  let root: Node | null = label.node;
  while (root) {
    const fonts = fontsByRoot.get(root);
    if (fonts) {
      styleLabel(label, emphasized, fonts);
      return label;
    }
    root = root.parent;
  }
  label.isBold = emphasized;
  return label;
}
