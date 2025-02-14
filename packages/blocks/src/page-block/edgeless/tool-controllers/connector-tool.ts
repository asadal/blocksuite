import type { PointerEventState } from '@blocksuite/block-std';
import { Rectangle } from '@blocksuite/connector';
import { assertExists } from '@blocksuite/global/utils';
import { deserializeXYWH, StrokeStyle } from '@blocksuite/phasor';

import type { ConnectorTool } from '../../../__internal__/index.js';
import { noop } from '../../../__internal__/index.js';
import {
  generateConnectorPath,
  getAttachedPoint,
} from '../components/connector/utils.js';
import { getXYWH, pickBy } from '../utils/query.js';
import type { Selectable, SelectionArea } from '../utils/selection-manager.js';
import { EdgelessToolController } from './index.js';

export class ConnectorToolController extends EdgelessToolController<ConnectorTool> {
  readonly tool = <ConnectorTool>{
    type: 'connector',
  };

  private _draggingElementId: string | null = null;

  protected override _draggingArea: SelectionArea | null = null;
  private _draggingStartElement: Selectable | null = null;
  private _draggingStartRect: Rectangle | null = null;
  // must assign value when dragging start
  private _draggingStartPoint!: { x: number; y: number };

  private _pickBy(
    x: number,
    y: number,
    filter: (element: Selectable) => boolean
  ) {
    const { surface } = this._edgeless;
    return pickBy(surface, this._page, x, y, filter);
  }

  onContainerClick(e: PointerEventState): void {
    noop();
  }

  onContainerContextMenu(e: PointerEventState): void {
    noop();
  }

  onContainerDblClick(e: PointerEventState): void {
    noop();
  }

  onContainerTripleClick(e: PointerEventState) {
    noop();
  }

  onContainerDragStart(e: PointerEventState) {
    if (!this._page.awarenessStore.getFlag('enable_surface')) return;

    this._page.captureSync();
    const { viewport } = this._edgeless.surface;
    const { mode, color } = this.tool;

    // create a block when drag start
    const [modelX, modelY] = viewport.toModelCoord(e.x, e.y);

    this._draggingStartElement = this._pickBy(
      e.x,
      e.y,
      ele => ele.type !== 'connector'
    );
    this._draggingStartRect = this._draggingStartElement
      ? new Rectangle(...deserializeXYWH(getXYWH(this._draggingStartElement)))
      : null;

    const { point: startPoint, position: startPosition } = getAttachedPoint(
      modelX,
      modelY,
      this._draggingStartRect
    );

    this._draggingStartPoint = startPoint;

    const id = this._surface.addElement('connector', {
      color,
      mode,
      controllers: [
        { x: modelX, y: modelY },
        { x: modelX + 1, y: modelY + 1 },
      ],
      lineWidth: 4,
      strokeStyle: StrokeStyle.Solid,
      startElement:
        this._draggingStartElement && startPosition
          ? {
              id: this._draggingStartElement.id,
              position: startPosition,
            }
          : undefined,
    });
    this._draggingElementId = id;

    this._draggingArea = {
      start: new DOMPoint(e.x, e.y),
      end: new DOMPoint(e.x, e.y),
    };

    this._edgeless.slots.surfaceUpdated.emit();
  }

  onContainerDragMove(e: PointerEventState) {
    if (!this._page.awarenessStore.getFlag('enable_surface')) return;

    assertExists(this._draggingElementId);
    assertExists(this._draggingArea);

    const { viewport } = this._edgeless.surface;
    const { mode } = this.tool;

    this._draggingArea.end = new DOMPoint(e.x, e.y);

    const id = this._draggingElementId;

    const startX = this._draggingStartPoint.x;
    const startY = this._draggingStartPoint.y;

    const [endModelX, endModelY] = viewport.toModelCoord(e.x, e.y);
    const end = this._pickBy(
      e.x,
      e.y,
      ele => ele.id !== id && ele.type !== 'connector'
    );
    const endRect =
      end && end.id !== id
        ? new Rectangle(...deserializeXYWH(getXYWH(end)))
        : null;

    const {
      point: { x: endX, y: endY },
      position: endPosition,
    } = getAttachedPoint(endModelX, endModelY, endRect);

    const routes = generateConnectorPath(
      this._draggingStartRect,
      endRect,
      { x: startX, y: startY },
      { x: endX, y: endY },
      [],
      mode
    );

    this._surface.updateElement<'connector'>(id, {
      controllers: routes,
      endElement:
        end && endPosition ? { id: end.id, position: endPosition } : undefined,
    });

    this._edgeless.slots.surfaceUpdated.emit();
  }

  onContainerDragEnd(e: PointerEventState) {
    const id = this._draggingElementId;
    assertExists(id);

    this._draggingElementId = null;
    this._draggingArea = null;

    this._page.captureSync();

    const element = this._surface.pickById(id);
    assertExists(element);
    this._edgeless.selection.switchToDefaultMode({
      selected: [element],
      active: false,
    });
  }

  onContainerMouseMove(e: PointerEventState) {
    noop();
  }

  onContainerMouseOut(e: PointerEventState) {
    noop();
  }

  onPressShiftKey(_: boolean) {
    noop();
  }

  beforeModeSwitch() {
    noop();
  }

  afterModeSwitch() {
    noop();
  }
}
