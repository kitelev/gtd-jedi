import { test, expect } from "@playwright/test";
import { ObsidianLauncher } from "../utils/obsidian-launcher";
import * as path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * E2E UI: GTD Workflow in real Obsidian + Exocortex plugin.
 *
 * Launches Obsidian with Exocortex plugin and gtd-jedi ontology files,
 * opens test task fixtures, verifies plugin loads, ontology is recognized,
 * and semantic metadata is correctly parsed for each GTD state.
 *
 * Test vault contains:
 * - Full gtd-jedi ontology (buttons, commands, dashboards, prototypes, workflow-classes)
 * - 4 task fixtures (InboxItem x2, NextAction, WaitingFor)
 */
test.describe("GTD Workflow E2E", () => {
  let launcher: ObsidianLauncher;

  test.beforeEach(async () => {
    const vaultPath =
      process.env.OBSIDIAN_VAULT ||
      path.join(__dirname, "../test-vault");
    launcher = new ObsidianLauncher(vaultPath);
    await launcher.launch();
  });

  test.afterEach(async () => {
    await launcher.close();
  });

  test("plugin loads and recognizes gtd-jedi ontology files", async () => {
    await launcher.openFile("Tasks/inbox-task-1.md");
    const window = await launcher.getWindow();

    const result = await window.evaluate(async () => {
      const app = (window as any).app;

      // Wait for Exocortex plugin to load
      for (let i = 0; i < 30; i++) {
        if (app?.plugins?.plugins?.exocortex) break;
        await new Promise((r) => setTimeout(r, 1000));
      }

      const plugin = app?.plugins?.plugins?.exocortex;

      // Verify gtd-jedi ontology files are in the vault
      const gtdManifest = app.vault.getAbstractFileByPath("!gtd-jedi.md");
      const buttonFile = app.vault.getAbstractFileByPath(
        "buttons/663c42da-11f6-4453-bd41-b37baf5bee9b.md",
      );
      const commandFile = app.vault.getAbstractFileByPath(
        "commands/6dc7560d-20e8-4aea-88c5-f22691fb2130.md",
      );

      return {
        pluginLoaded: !!plugin,
        vaultName: app?.vault?.getName?.() ?? "unknown",
        hasGtdManifest: !!gtdManifest,
        hasNextActionButton: !!buttonFile,
        hasQuickCaptureCommand: !!commandFile,
      };
    });

    expect(result.pluginLoaded).toBe(true);
    expect(result.hasGtdManifest).toBe(true);
    expect(result.hasNextActionButton).toBe(true);
    expect(result.hasQuickCaptureCommand).toBe(true);
  });

  test("InboxItem task has correct GTD semantic metadata", async () => {
    await launcher.openFile("Tasks/inbox-task-1.md");
    const window = await launcher.getWindow();

    await launcher.waitForModalsToClose(10000);

    const result = await window.evaluate(async () => {
      const app = (window as any).app;

      // Wait for plugin and metadata
      for (let i = 0; i < 30; i++) {
        if (app?.plugins?.plugins?.exocortex) break;
        await new Promise((r) => setTimeout(r, 1000));
      }

      const activeFile = app.workspace.getActiveFile();
      if (!activeFile) throw new Error("No active file");

      const metadata = app.metadataCache.getFileCache(activeFile);
      const fm = metadata?.frontmatter;

      return {
        label: fm?.exo__Asset_label,
        classes: JSON.stringify(fm?.exo__Instance_class),
        status: fm?.ems__Effort_status,
        prototype: fm?.exo__Asset_prototype,
        isDefinedBy: fm?.exo__Asset_isDefinedBy,
      };
    });

    expect(result.label).toBe("Write quarterly report");
    expect(result.classes).toContain("ems__Task");
    expect(result.classes).toContain("gtd__InboxItem");
    expect(result.status).toContain("ems__EffortStatusBacklog");
    expect(result.isDefinedBy).toContain("!gtd-jedi");
  });

  test("NextAction task has correct class and differs from InboxItem", async () => {
    await launcher.openFile("Tasks/next-action-task.md");
    const window = await launcher.getWindow();

    await launcher.waitForModalsToClose(10000);

    const result = await window.evaluate(async () => {
      const app = (window as any).app;

      for (let i = 0; i < 30; i++) {
        if (app?.plugins?.plugins?.exocortex) break;
        await new Promise((r) => setTimeout(r, 1000));
      }

      const activeFile = app.workspace.getActiveFile();
      if (!activeFile) throw new Error("No active file");

      const metadata = app.metadataCache.getFileCache(activeFile);
      const fm = metadata?.frontmatter;

      return {
        label: fm?.exo__Asset_label,
        classes: JSON.stringify(fm?.exo__Instance_class),
        status: fm?.ems__Effort_status,
      };
    });

    expect(result.classes).toContain("ems__Task");
    expect(result.classes).toContain("gtd__NextAction");
    // NextAction should NOT contain InboxItem
    expect(result.classes).not.toContain("gtd__InboxItem");
    expect(result.status).toContain("Doing");
  });

  test("WaitingFor task has delegation metadata", async () => {
    await launcher.openFile("Tasks/delegated-task.md");
    const window = await launcher.getWindow();

    await launcher.waitForModalsToClose(10000);

    const result = await window.evaluate(async () => {
      const app = (window as any).app;

      for (let i = 0; i < 30; i++) {
        if (app?.plugins?.plugins?.exocortex) break;
        await new Promise((r) => setTimeout(r, 1000));
      }

      const activeFile = app.workspace.getActiveFile();
      if (!activeFile) throw new Error("No active file");

      const metadata = app.metadataCache.getFileCache(activeFile);
      const fm = metadata?.frontmatter;

      return {
        label: fm?.exo__Asset_label,
        delegatee: fm?.gtd__Effort_delegatee,
        classes: JSON.stringify(fm?.exo__Instance_class),
      };
    });

    expect(result.label).toBe("Review PR from Alice");
    expect(result.delegatee).toBe("Alice");
    expect(result.classes).toContain("WaitingFor");
    // WaitingFor should NOT contain InboxItem or NextAction
    expect(result.classes).not.toContain("gtd__InboxItem");
    expect(result.classes).not.toContain("gtd__NextAction");
  });

  test("plugin renders Exocortex UI sections for task files", async () => {
    await launcher.openFile("Tasks/inbox-task-1.md");
    const window = await launcher.getWindow();

    await launcher.waitForModalsToClose(10000);

    // Wait for plugin to render — check for any Exocortex UI container
    // The plugin may render properties, assets, or other sections
    const pluginRendered = await window.evaluate(async () => {
      const app = (window as any).app;

      // Wait for plugin initialization
      for (let i = 0; i < 30; i++) {
        if (app?.plugins?.plugins?.exocortex) break;
        await new Promise((r) => setTimeout(r, 1000));
      }

      // Give plugin time to render layout
      await new Promise((r) => setTimeout(r, 5000));

      // Collect all Exocortex-related elements in the DOM
      const exoElements = document.querySelectorAll("[class*='exocortex']");
      const classes = Array.from(exoElements).map((el) => el.className);

      return {
        hasExocortexElements: exoElements.length > 0,
        exocortexClasses: classes,
        elementCount: exoElements.length,
      };
    });

    // Plugin should render at least some UI for a task file
    expect(pluginRendered.hasExocortexElements).toBe(true);
    expect(pluginRendered.elementCount).toBeGreaterThan(0);
  });

  test("all GTD states have distinct semantic classes", async () => {
    const window = await launcher.getWindow();

    // Open each task and verify its class is unique
    const states: Record<string, string[]> = {};

    for (const task of [
      "Tasks/inbox-task-1.md",
      "Tasks/next-action-task.md",
      "Tasks/delegated-task.md",
    ]) {
      await launcher.openFile(task);
      await launcher.waitForModalsToClose(5000);

      const classes = await window.evaluate(async () => {
        const app = (window as any).app;
        const activeFile = app.workspace.getActiveFile();
        if (!activeFile) return [];
        const metadata = app.metadataCache.getFileCache(activeFile);
        return metadata?.frontmatter?.exo__Instance_class || [];
      });

      states[task] = Array.isArray(classes) ? classes : [String(classes)];
    }

    // Each GTD state must have a unique class
    const inboxClasses = JSON.stringify(states["Tasks/inbox-task-1.md"]);
    const nextActionClasses = JSON.stringify(states["Tasks/next-action-task.md"]);
    const waitingForClasses = JSON.stringify(states["Tasks/delegated-task.md"]);

    expect(inboxClasses).toContain("InboxItem");
    expect(nextActionClasses).toContain("NextAction");
    expect(waitingForClasses).toContain("WaitingFor");

    // No two states share the same GTD-specific class
    expect(inboxClasses).not.toContain("NextAction");
    expect(inboxClasses).not.toContain("WaitingFor");
    expect(nextActionClasses).not.toContain("InboxItem");
  });
});
