/**
 * MockExocortexApi — reusable mock for all BDD scenarios.
 * Simulates asset creation, class manipulation, property setting,
 * and simple filtering queries against an in-memory store.
 */

import { randomUUID } from 'node:crypto';

export interface Asset {
  id: string;
  label: string;
  classes: string[];
  status: string;
  prototype?: string;
  properties: Record<string, unknown>;
  body?: string;
  createdAt: Date;
}

export interface CreateAssetOptions {
  label: string;
  classes: string[];
  status?: string;
  prototype?: string;
  properties?: Record<string, unknown>;
  body?: string;
}

export class MockExocortexApi {
  private store: Map<string, Asset> = new Map();

  /** Create a new asset in the store */
  createAsset(opts: CreateAssetOptions): Asset {
    const asset: Asset = {
      id: randomUUID(),
      label: opts.label,
      classes: [...opts.classes],
      status: opts.status ?? 'ems__EffortStatusBacklog',
      prototype: opts.prototype,
      properties: { ...opts.properties },
      body: opts.body,
      createdAt: new Date(),
    };
    this.store.set(asset.id, asset);
    return asset;
  }

  /** Get asset by ID */
  getAsset(id: string): Asset | undefined {
    return this.store.get(id);
  }

  /** Get all assets in the store */
  getAllAssets(): Asset[] {
    return Array.from(this.store.values());
  }

  /** Query assets by class membership */
  queryByClass(className: string): Asset[] {
    return this.getAllAssets().filter(a => a.classes.includes(className));
  }

  /** Query assets by multiple classes (AND — asset must have ALL) */
  queryByClasses(classNames: string[]): Asset[] {
    return this.getAllAssets().filter(a =>
      classNames.every(c => a.classes.includes(c)),
    );
  }

  /** Query assets by status */
  queryByStatus(status: string): Asset[] {
    return this.getAllAssets().filter(a => a.status === status);
  }

  /** Add a class to an asset */
  addClass(assetId: string, className: string): void {
    const asset = this.store.get(assetId);
    if (!asset) throw new Error(`Asset ${assetId} not found`);
    if (!asset.classes.includes(className)) {
      asset.classes.push(className);
    }
  }

  /** Remove a class from an asset */
  removeClass(assetId: string, className: string): void {
    const asset = this.store.get(assetId);
    if (!asset) throw new Error(`Asset ${assetId} not found`);
    asset.classes = asset.classes.filter(c => c !== className);
  }

  /** Set a property on an asset */
  setProperty(assetId: string, key: string, value: unknown): void {
    const asset = this.store.get(assetId);
    if (!asset) throw new Error(`Asset ${assetId} not found`);
    if (key === 'ems__Effort_status') {
      asset.status = value as string;
    } else {
      asset.properties[key] = value;
    }
  }

  /**
   * Simulate button click: executes the grounding steps for a given button.
   * Maps button labels to their grounding actions as defined in the plugin.
   */
  triggerButton(
    buttonLabel: string,
    assetId: string,
    params?: Record<string, string>,
  ): void {
    const asset = this.store.get(assetId);
    if (!asset) throw new Error(`Asset ${assetId} not found`);

    switch (buttonLabel) {
      case 'Next Action':
        this.removeClass(assetId, 'gtd__InboxItem');
        this.addClass(assetId, 'gtd__NextAction');
        this.setProperty(assetId, 'ems__Effort_status', 'ems__EffortStatusDoing');
        break;

      case 'Delegate':
        this.removeClass(assetId, 'gtd__InboxItem');
        this.removeClass(assetId, 'gtd__NextAction');
        this.addClass(assetId, 'gtd__WaitingFor');
        if (params?.delegatee) {
          this.setProperty(assetId, 'gtd__Effort_delegatee', params.delegatee);
        }
        this.setProperty(assetId, 'ems__Effort_status', 'ems__EffortStatusDoing');
        break;

      case 'Someday/Maybe':
        this.removeClass(assetId, 'gtd__InboxItem');
        this.removeClass(assetId, 'gtd__NextAction');
        this.addClass(assetId, 'gtd__SomedayMaybe');
        this.setProperty(assetId, 'ems__Effort_status', 'ems__EffortStatusBacklog');
        break;

      case 'Reference':
        this.removeClass(assetId, 'gtd__InboxItem');
        this.removeClass(assetId, 'gtd__NextAction');
        this.addClass(assetId, 'gtd__Reference');
        this.setProperty(assetId, 'ems__Effort_status', 'ems__EffortStatusDone');
        break;

      default:
        throw new Error(`Unknown button: ${buttonLabel}`);
    }
  }

  /** Clear entire store (use between scenarios) */
  reset(): void {
    this.store.clear();
  }

  /** Number of assets in store */
  get size(): number {
    return this.store.size;
  }
}
